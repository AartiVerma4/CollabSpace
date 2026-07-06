import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();

// Security and utility Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tiny native Cookie Parser middleware to avoid extra package bloat
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookiesArray = cookieHeader.split(';');
    cookiesArray.forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      req.cookies[name] = decodeURIComponent(value);
    });
  }
  next();
});

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/chat', chatRoutes);

// Base Status Route
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CollabSpace Service is operational' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
