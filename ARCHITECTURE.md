# QuantumWager Market - Architecture Overview

## 🏗️ Project Structure

```
coinbuzz/
├── prisma/                 # Database schema & migrations
│   ├── schema.prisma      # Database models
│   └── migrations/        # Database version control
├── src/
│   ├── controllers/       # Handle HTTP requests/responses
│   ├── services/          # Business logic layer
│   ├── routes/           # API endpoints
│   ├── middleware/       # Authentication & validation
│   ├── generated/        # Prisma auto-generated types
│   ├── prismaClient.ts   # Database connection
│   └── server.ts         # Express app setup
└── package.json          # Dependencies & scripts
```

## 🔧 Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Blockchain**: Solana (wallet authentication)
- **Documentation**: Swagger
- **Architecture**: MVC Pattern

## 🔐 Authentication Flow

```
1. User connects Solana wallet
2. Frontend signs message with wallet
3. Backend verifies signature
4. User authenticated via wallet address
```

## 🔄 Request Flow

```
Client Request → Route → Middleware → Controller → Service → Database
                  ↓         ↓          ↓         ↓        ↓
               Express    Auth      HTTP      Business  Prisma
               Router    Check    Handler     Logic     ORM
```

## 🏢 Service Layer

- **AuthService**: User authentication & profiles
- **TradingService**: Market operations & positions
- **BlockchainService**: Solana interaction
- **MarketService**: Market creation & management
- **OracleService**: Market resolution
- **UserService**: User management

## 🔑 Key Features

1. **Solana Integration**: Wallet-based auth (no passwords)
2. **Prediction Markets**: Binary outcome betting
3. **Real-time Data**: Market prices & analytics
4. **Admin Panel**: Market management
5. **API Documentation**: Swagger UI

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Start development server
npm run dev

# Access API docs
http://localhost:8000/api-docs
```

## 🔒 Security

- Signature verification for all auth
- Middleware protection for endpoints
- Input validation on all requests
- Rate limiting (TODO)
- CORS enabled for frontend

## 📝 Notes

- No JWT tokens - uses Solana wallet signatures
- Stateless authentication
- PostgreSQL for data persistence
- TypeScript for type safety
- MVC architecture for clean separation