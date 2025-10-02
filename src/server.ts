import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import analyticsRoutes from "./routes/analytics.js";
import dataRoutes from "./routes/data.js";
import positionsRoutes from "./routes/positions.js";
import oracleRoutes from "./routes/oracle.js";
import marketRoutes from "./routes/markets.js";
import tradingRoutes from "./routes/trading.js";

dotenv.config();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuantumWager Market API',
      version: '1.0.0',
      description: 'API documentation for QuantumWager Market: Meme Coin Prediction Market Platform',
      contact: {
        name: 'QuantumWager Market',
        url: 'https://quantumwager.market',
        email: 'support@quantumwager.market'
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication'
        }
      }
    },
    security: [{
      BearerAuth: []
    }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Markets', description: 'Market data and operations' },
      { name: 'Positions', description: 'Trading position management' },
      { name: 'Trading', description: 'Trading operations' },
      { name: 'Analytics', description: 'Platform analytics and statistics' },
      { name: 'Oracle', description: 'Market oracle operations' },
      { name: 'Admin', description: 'Administrative operations' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();


app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "QuantumWager Market API Documentation",
  customfavIcon: "/favicon.ico"
}));

app.get("/health", (_req, res) => res.json({ ok: true, message: "Server is healthy" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/positions", positionsRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/trading", tradingRoutes);


app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
});
