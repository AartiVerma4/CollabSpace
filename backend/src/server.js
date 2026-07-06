import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { loadKeys } from './config/keys.js';
import { initSockets } from './sockets/index.js';

const startServer = async () => {
  try {
    // 1. Ensure RSA encryption keys are loaded/generated
    loadKeys();

    // 2. Establish connection to MongoDB Atlas
    await connectDB();

    // 3. Initialize HTTP server
    const server = http.createServer(app);

    // 4. Mount WebSocket Server
    initSockets(server);

    // 5. Start listening
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`CollabSpace Backend Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server URL: http://localhost:${PORT}`);
      console.log(`WebSocket: ws://localhost:${PORT}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
