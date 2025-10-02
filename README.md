# QuantumWager Backend Technical Specification
## Meme Coin Prediction Market Platform

### 🏗️ System Architecture Overview

CoinBuzz backend is a high-performance, real-time system built to handle prediction market operations, oracle data ingestion, and user management for meme coin betting. The architecture prioritizes scalability, real-time updates, and financial transaction safety.

**Tech Stack**:
- **Runtime**: Node.js 18+ (TypeScript)
- **Framework**: Express.js with Socket.io for real-time features
- **Database**: PostgreSQL (primary) + Redis (caching/sessions)
- **Blockchain**: Solana Web3.js for smart contract interaction
- **Queue System**: Bull Queue with Redis
- **Monitoring**: DataDog/New Relic + Custom metrics
- **Deployment**: Docker containers on AWS/GCP

---

## 🗄️ Database Schema Design

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    reputation_score INTEGER DEFAULT 1000,
    total_volume DECIMAL(20, 9) DEFAULT 0,
    win_rate DECIMAL(5, 4) DEFAULT 0,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_level INTEGER DEFAULT 0,
    referral_code VARCHAR(10) UNIQUE,
    referred_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);
CREATE INDEX idx_users_volume ON users(total_volume DESC);
```

#### Markets Table
```sql
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'PRICE', 'EVENTS', 'SOCIAL'
    market_type VARCHAR(20) NOT NULL DEFAULT 'BINARY', -- 'BINARY', 'MULTIPLE_CHOICE'
    
    -- Market Configuration
    creator_id UUID REFERENCES users(id),
    oracle_source VARCHAR(50) NOT NULL,
    oracle_config JSONB NOT NULL,
    resolution_criteria TEXT NOT NULL,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    resolution_time TIMESTAMP WITH TIME ZONE,
    
    -- Market State
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'DISPUTED', 'CANCELLED'
    outcome BOOLEAN, -- NULL for unresolved, TRUE/FALSE for resolved
    
    -- Financial Data
    total_volume DECIMAL(20, 9) DEFAULT 0,
    yes_pool DECIMAL(20, 9) DEFAULT 0,
    no_pool DECIMAL(20, 9) DEFAULT 0,
    fee_percentage DECIMAL(5, 4) DEFAULT 0.03, -- 3%
    
    -- Metadata
    tags TEXT[],
    image_url VARCHAR(500),
    featured BOOLEAN DEFAULT FALSE,
    
    -- Smart Contract
    contract_address VARCHAR(44),
    program_id VARCHAR(44)
);

-- Indexes
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_end_time ON markets(end_time);
CREATE INDEX idx_markets_volume ON markets(total_volume DESC);
CREATE INDEX idx_markets_featured ON markets(featured, status);
```

#### Positions Table
```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    market_id UUID NOT NULL REFERENCES markets(id),
    
    -- Position Details
    position_type VARCHAR(10) NOT NULL, -- 'YES', 'NO'
    amount_staked DECIMAL(20, 9) NOT NULL,
    shares_owned DECIMAL(20, 9) NOT NULL,
    average_price DECIMAL(10, 6) NOT NULL,
    
    -- Settlement
    settled BOOLEAN DEFAULT FALSE,
    payout_amount DECIMAL(20, 9) DEFAULT 0,
    profit_loss DECIMAL(20, 9) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Transaction References
    stake_tx_hash VARCHAR(88),
    payout_tx_hash VARCHAR(88),
    
    UNIQUE(user_id, market_id, position_type)
);

-- Indexes
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_positions_unsettled ON positions(settled) WHERE settled = FALSE;
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    market_id UUID REFERENCES markets(id),
    position_id UUID REFERENCES positions(id),
    
    -- Transaction Details
    type VARCHAR(20) NOT NULL, -- 'STAKE', 'PAYOUT', 'FEE', 'REFUND'
    amount DECIMAL(20, 9) NOT NULL,
    token VARCHAR(10) DEFAULT 'SOL',
    
    -- Blockchain Data
    tx_hash VARCHAR(88) UNIQUE,
    block_height BIGINT,
    slot BIGINT,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'FAILED'
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
```

#### Oracle Data Table
```sql
CREATE TABLE oracle_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    
    -- Oracle Information
    source VARCHAR(50) NOT NULL,
    data_type VARCHAR(30) NOT NULL, -- 'PRICE', 'VOLUME', 'SOCIAL', 'EVENT'
    
    -- Data
    raw_data JSONB NOT NULL,
    processed_value DECIMAL(20, 9),
    string_value TEXT,
    boolean_value BOOLEAN,
    
    -- Metadata
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oracle_market ON oracle_data(market_id);
CREATE INDEX idx_oracle_timestamp ON oracle_data(timestamp DESC);
CREATE INDEX idx_oracle_source ON oracle_data(source, data_type);
```

---

## 🚀 API Architecture

### RESTful API Endpoints

#### Authentication & Users
```typescript
// User Authentication (Wallet-based)
POST   /api/auth/connect          // Connect wallet and create/login user
POST   /api/auth/verify           // Verify wallet signature
POST   /api/auth/logout           // Logout user
GET    /api/auth/me               // Get current user info

// User Management
GET    /api/users/:id             // Get user profile
PUT    /api/users/:id             // Update user profile
GET    /api/users/:id/positions   // Get user positions
GET    /api/users/:id/history     // Get user transaction history
GET    /api/users/leaderboard     // Get leaderboard data
```

#### Markets
```typescript
// Market Discovery
GET    /api/markets               // List markets with filters/pagination
GET    /api/markets/featured      // Get featured markets
GET    /api/markets/trending      // Get trending markets
GET    /api/markets/categories    // Get market categories
GET    /api/markets/:id           // Get market details
GET    /api/markets/:id/activity  // Get market activity feed

// Market Creation (Admin initially)
POST   /api/admin/markets         // Create new market
PUT    /api/admin/markets/:id     // Update market
DELETE /api/admin/markets/:id     // Cancel market

// Market Actions
POST   /api/markets/:id/bet       // Place bet on market
GET    /api/markets/:id/odds      // Get current odds
GET    /api/markets/:id/positions // Get market positions
```

#### Trading & Positions
```typescript
// Trading
POST   /api/trading/bet           // Place bet with validation
POST   /api/trading/close         // Close position (if supported)
GET    /api/trading/simulate      // Simulate bet outcomes
GET    /api/trading/limits        // Get user trading limits

// Positions
GET    /api/positions             // Get user's active positions
GET    /api/positions/:id         // Get specific position details
GET    /api/positions/history     // Get settled positions
POST   /api/positions/:id/claim   // Claim winnings
```

#### Oracle & Data
```typescript
// Oracle Data (Internal/Admin)
POST   /api/oracle/ingest         // Ingest oracle data
GET    /api/oracle/status         // Get oracle health
POST   /api/oracle/resolve        // Resolve market (admin)

// Public Data
GET    /api/data/prices           // Get current meme coin prices
GET    /api/data/social           // Get social sentiment data
GET    /api/analytics/markets     // Get market analytics
GET    /api/analytics/platform    // Get platform statistics
```

### WebSocket Events

```typescript
// Real-time Market Updates
interface SocketEvents {
  // Market Data
  'market:odds_update': { marketId: string; yesOdds: number; noOdds: number };
  'market:new_bet': { marketId: string; amount: number; position: 'YES' | 'NO' };
  'market:resolved': { marketId: string; outcome: boolean };
  'market:volume_update': { marketId: string; totalVolume: number };
  
  // User Data
  'user:position_update': { userId: string; positions: Position[] };
  'user:payout': { userId: string; amount: number; marketId: string };
  
  // Platform Events
  'platform:new_market': Market;
  'platform:featured_update': { featuredMarkets: string[] };
}

// Connection Management
io.on('connection', (socket) => {
  socket.on('subscribe:market', (marketId) => {
    socket.join(`market:${marketId}`);
  });
  
  socket.on('subscribe:user', (userId) => {
    socket.join(`user:${userId}`);
  });
});
```

---

## 🔧 Core Services Architecture

### 1. Market Service
```typescript
class MarketService {
  // Market Management
  async createMarket(marketData: CreateMarketDto): Promise<Market>;
  async getMarket(id: string): Promise<Market>;
  async listMarkets(filters: MarketFilters): Promise<PaginatedMarkets>;
  async updateMarket(id: string, updates: UpdateMarketDto): Promise<Market>;
  
  // Market Operations
  async calculateOdds(marketId: string): Promise<{ yes: number; no: number }>;
  async getMarketActivity(marketId: string): Promise<Activity[]>;
  async resolveMarket(marketId: string, outcome: boolean): Promise<void>;
  
  // Real-time Updates
  async broadcastOddsUpdate(marketId: string): Promise<void>;
  async broadcastNewBet(marketId: string, bet: Bet): Promise<void>;
}
```

### 2. Trading Service
```typescript
class TradingService {
  // Bet Placement
  async placeBet(userId: string, marketId: string, bet: BetDto): Promise<Position>;
  async validateBet(bet: BetDto): Promise<ValidationResult>;
  async calculatePayout(marketId: string, amount: number, position: 'YES' | 'NO'): Promise<number>;
  
  // Position Management
  async getUserPositions(userId: string, active?: boolean): Promise<Position[]>;
  async closePosition(positionId: string): Promise<Transaction>;
  async claimWinnings(positionId: string): Promise<Transaction>;
  
  // Risk Management
  async checkUserLimits(userId: string, amount: number): Promise<boolean>;
  async updateUserStats(userId: string): Promise<void>;
}
```

### 3. Oracle Service
```typescript
class OracleService {
  // Data Ingestion
  async ingestPriceData(source: string, data: PriceData[]): Promise<void>;
  async ingestSocialData(source: string, data: SocialData[]): Promise<void>;
  async ingestEventData(source: string, data: EventData[]): Promise<void>;
  
  // Market Resolution
  async checkMarketForResolution(marketId: string): Promise<boolean>;
  async resolveMarket(marketId: string): Promise<ResolutionResult>;
  async handleDispute(marketId: string, reason: string): Promise<void>;
  
  // Data Validation
  async validateOracleData(data: OracleData): Promise<boolean>;
  async aggregateMultipleSources(marketId: string): Promise<AggregatedData>;
}
```

### 4. Blockchain Service
```typescript
class BlockchainService {
  // Smart Contract Interaction
  async deployMarketContract(marketData: Market): Promise<string>;
  async stakeFunds(userWallet: string, amount: number, marketId: string): Promise<string>;
  async distributePayout(positions: Position[]): Promise<string[]>;
  
  // Transaction Monitoring
  async monitorTransaction(txHash: string): Promise<TransactionStatus>;
  async retryFailedTransaction(txId: string): Promise<string>;
  
  // Wallet Management
  async validateWalletSignature(address: string, signature: string, message: string): Promise<boolean>;
  async getWalletBalance(address: string): Promise<number>;
}
```

---

## 🔄 Background Job System

### Queue Configuration
```typescript
// Bull Queue Setup
import Queue from 'bull';

const oracleQueue = new Queue('oracle data processing');
const settlementQueue = new Queue('market settlement');
const notificationQueue = new Queue('user notifications');
const analyticsQueue = new Queue('analytics processing');

// Job Definitions
interface JobTypes {
  'fetch-price-data': { symbols: string[]; timestamp: number };
  'process-social-data': { marketId: string; timeRange: string };
  'settle-market': { marketId: string; outcome: boolean };
  'update-user-stats': { userId: string };
  'send-notification': { userId: string; type: string; data: any };
}
```

### Critical Background Jobs

#### Oracle Data Fetching
```typescript
// Price Data Job (Every 30 seconds)
oracleQueue.process('fetch-price-data', async (job) => {
  const { symbols } = job.data;
  
  try {
    const priceData = await Promise.all([
      coinGeckoAPI.getPrices(symbols),
      coinMarketCapAPI.getPrices(symbols),
      pythAPI.getPrices(symbols)
    ]);
    
    // Aggregate and validate
    const aggregatedData = aggregatePriceData(priceData);
    await oracleService.ingestPriceData('aggregated', aggregatedData);
    
    // Check for market resolutions
    await checkMarketsForResolution(aggregatedData);
  } catch (error) {
    logger.error('Price data fetch failed', error);
    throw error; // Retry job
  }
});

// Social Data Job (Every 5 minutes)
oracleQueue.process('process-social-data', async (job) => {
  const { marketId } = job.data;
  
  const socialMetrics = await Promise.all([
    twitterAPI.getMentions(marketId),
    redditAPI.getDiscussions(marketId),
    discordAPI.getActivity(marketId)
  ]);
  
  await oracleService.ingestSocialData(marketId, socialMetrics);
});
```

#### Market Settlement
```typescript
settlementQueue.process('settle-market', async (job) => {
  const { marketId, outcome } = job.data;
  
  const db = await getDB();
  const transaction = await db.begin();
  
  try {
    // Get all positions for market
    const positions = await getMarketPositions(marketId);
    
    // Calculate payouts
    const payouts = calculatePayouts(positions, outcome);
    
    // Execute blockchain transactions
    const txHashes = await blockchainService.distributePayout(payouts);
    
    // Update database
    await updatePositions(positions, payouts, txHashes);
    await updateUserStats(positions.map(p => p.userId));
    
    // Mark market as resolved
    await markMarketResolved(marketId, outcome);
    
    await transaction.commit();
    
    // Send notifications
    await notifyUsers(positions, payouts);
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
```

---

## 📊 Real-Time Data Pipeline

### WebSocket Manager
```typescript
class WebSocketManager {
  private io: SocketIO.Server;
  private redis: Redis;
  
  constructor(server: http.Server) {
    this.io = new SocketIO.Server(server, {
      cors: { origin: process.env.FRONTEND_URL },
      transports: ['websocket', 'polling']
    });
    
    this.setupEventHandlers();
  }
  
  // Market Updates
  async broadcastMarketUpdate(marketId: string, data: any) {
    this.io.to(`market:${marketId}`).emit('market:update', data);
    
    // Cache for reconnecting clients
    await this.redis.setex(`market:${marketId}:latest`, 300, JSON.stringify(data));
  }
  
  // User Updates
  async broadcastUserUpdate(userId: string, data: any) {
    this.io.to(`user:${userId}`).emit('user:update', data);
  }
  
  // Connection Management
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('subscribe:market', (marketId) => {
        socket.join(`market:${marketId}`);
        this.sendLatestMarketData(socket, marketId);
      });
      
      socket.on('subscribe:user', async (userId) => {
        const isValid = await this.validateUserAuth(socket, userId);
        if (isValid) {
          socket.join(`user:${userId}`);
        }
      });
    });
  }
}
```

### Event Streaming
```typescript
// Event-driven updates
class EventBus {
  private emitter = new EventEmitter();
  
  // Market Events
  onNewBet(callback: (marketId: string, bet: Bet) => void) {
    this.emitter.on('market:new_bet', callback);
  }
  
  onMarketResolved(callback: (marketId: string, outcome: boolean) => void) {
    this.emitter.on('market:resolved', callback);
  }
  
  // Emit Events
  emitNewBet(marketId: string, bet: Bet) {
    this.emitter.emit('market:new_bet', marketId, bet);
  }
}

// Wire up real-time updates
eventBus.onNewBet(async (marketId, bet) => {
  // Recalculate odds
  const newOdds = await marketService.calculateOdds(marketId);
  
  // Broadcast to all subscribers
  await wsManager.broadcastMarketUpdate(marketId, {
    type: 'odds_update',
    odds: newOdds,
    lastBet: bet
  });
});
```

---

## 🔐 Security & Validation

### Input Validation
```typescript
// Validation Schemas (using Joi)
const createMarketSchema = Joi.object({
  question: Joi.string().min(10).max(500).required(),
  description: Joi.string().max(2000),
  category: Joi.string().valid('PRICE', 'EVENTS', 'SOCIAL').required(),
  endTime: Joi.date().greater('now').required(),
  oracleConfig: Joi.object().required(),
  tags: Joi.array().items(Joi.string()).max(10)
});

const placeBetSchema = Joi.object({
  marketId: Joi.string().uuid().required(),
  amount: Joi.number().min(0.01).max(1000).required(), // SOL limits
  position: Joi.string().valid('YES', 'NO').required(),
  maxSlippage: Joi.number().min(0).max(0.1).default(0.02) // 2% max slippage
});

// Middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.body = value;
    next();
  };
};
```

### Authentication Middleware
```typescript
// Wallet-based authentication
const authenticateWallet = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await getUserByWallet(decoded.walletAddress);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

### Transaction Safety
```typescript
// Idempotency for critical operations
const ensureIdempotent = (keyGenerator: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = keyGenerator(req);
    const existing = await redis.get(`idempotent:${idempotencyKey}`);
    
    if (existing) {
      return res.json(JSON.parse(existing));
    }
    
    req.idempotencyKey = idempotencyKey;
    next();
  };
};

// Usage
app.post('/api/markets/:id/bet', 
  authenticateWallet,
  ensureIdempotent(req => `bet:${req.user.id}:${req.params.id}:${Date.now()}`),
  validateRequest(placeBetSchema),
  placeBetHandler
);
```

---

## 📈 Performance Optimizations

### Database Optimization
```sql
-- Materialized Views for Analytics
CREATE MATERIALIZED VIEW market_stats AS
SELECT 
    m.id,
    m.question,
    m.total_volume,
    COUNT(p.id) as total_positions,
    COUNT(DISTINCT p.user_id) as unique_traders,
    AVG(CASE WHEN m.outcome = (p.position_type = 'YES') THEN 1 ELSE 0 END) as accuracy
FROM markets m
LEFT JOIN positions p ON m.id = p.market_id
WHERE m.status = 'RESOLVED'
GROUP BY m.id, m.question, m.total_volume, m.outcome;

-- Refresh every hour
CREATE OR REPLACE FUNCTION refresh_market_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW market_stats;
END;
$$ LANGUAGE plpgsql;

-- Partitioning for large tables
CREATE TABLE transactions_2025 PARTITION OF transactions
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Caching Strategy
```typescript
// Redis Cache Layers
class CacheManager {
  // L1: Hot data (5 minute TTL)
  async getMarketOdds(marketId: string): Promise<Odds | null> {
    const cached = await redis.get(`odds:${marketId}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setMarketOdds(marketId: string, odds: Odds): Promise<void> {
    await redis.setex(`odds:${marketId}`, 300, JSON.stringify(odds));
  }
  
  // L2: Warm data (1 hour TTL)
  async getMarketList(filters: string): Promise<Market[] | null> {
    const cached = await redis.get(`markets:${filters}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  // L3: Cold data (24 hour TTL)
  async getUserStats(userId: string): Promise<UserStats | null> {
    const cached = await redis.get(`user:${userId}:stats`);
    return cached ? JSON.parse(cached) : null;
  }
  
  // Cache invalidation
  async invalidateMarketCache(marketId: string): Promise<void> {
    const keys = await redis.keys(`*${marketId}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Database Connection Pooling
```typescript
// PostgreSQL Pool Configuration
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Pool settings
  max: 20, // max connections
  min: 5,  // min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // Performance settings
  statement_timeout: 10000,
  query_timeout: 10000
};

const pool = new Pool(poolConfig);

// Connection health monitoring
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    logger.error('Database health check failed', error);
    // Alert monitoring system
  }
}, 30000);
```

---

## 🚨 Monitoring & Alerting

### Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  try {
    // Database check
    await pool.query('SELECT 1');
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.checks.database = { status: 'error', message: error.message };
    health.status = 'error';
  }
  
  try {
    // Redis check
    await redis.ping();
    health.checks.redis = { status: 'ok' };
  } catch (error) {
    health.checks.redis = { status: 'error', message: error.message };
    health.status = 'error';
  }
  
  // Blockchain check
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    await connection.getSlot();
    health.checks.blockchain = { status: 'ok' };
  } catch (error) {
    health.checks.blockchain = { status: 'error', message: error.message };
    health.status = 'error';
  }
  
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
```

### Custom Metrics
```typescript
// Prometheus metrics
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const activeMarketsGauge = new client.Gauge({
  name: 'active_markets_total',
  help: 'Total number of active markets'
});

const totalVolumeGauge = new client.Gauge({
  name: 'total_volume_sol',
  help: 'Total trading volume in SOL'
});

// Update metrics
setInterval(async () => {
  const activeCount = await getActiveMarketCount();
  const totalVolume = await getTotalPlatformVolume();
  
  activeMarketsGauge.set(activeCount);
  totalVolumeGauge.set(totalVolume);
}, 60000);
```

### Error Tracking
```typescript
// Structured logging with Winston
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Error handler middleware
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.id
  });
};
```

---

## 🚀 Deployment & DevOps

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Application
COPY . .
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Environment Configuration
```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DB_HOST=coinbuzz-db.cluster-xxx.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=coinbuzz_prod
DB_USER=coinbuzz_api
DB_PASSWORD=${DB_PASSWORD}

# Redis
REDIS_URL=redis://coinbuzz-redis.xxx.cache.amazonaws.com:6379

# Blockchain
SOLANA_RPC_URL=https://api.mainnet-beta.solana.
