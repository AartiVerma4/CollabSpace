import { Server } from 'socket.io';
import { verifyToken } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { presenceService } from '../services/presenceService.js';
import { registerDocHandlers } from './docHandler.js';
import { registerCanvasHandlers } from './canvasHandler.js';
import { registerChatHandlers } from './chatHandler.js';

export const initSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid or expired authentication token'));
      }

      const user = await User.findById(decoded.userId).select('name email avatar');
      if (!user) {
        return next(new Error('User account not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Connection authentication failed'));
    }
  });

  // Handle connection
  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id} (User: ${socket.user.name})`);

    // Register module-specific socket event handlers
    registerDocHandlers(io, socket);
    registerCanvasHandlers(io, socket);
    registerChatHandlers(io, socket);

    // Handle user disconnect
    socket.on('disconnect', () => {
      const session = presenceService.removeUserSocket(socket.id);
      
      if (session) {
        // Broadcast user departure to active rooms to update cursors list immediately
        if (session.documentId) {
          const room = `doc:${session.documentId}`;
          const collaborators = presenceService.getDocumentCollaborators(session.documentId);
          io.to(room).emit('doc:collaborators', collaborators);
          io.to(room).emit('doc:cursor-remove', { userId: session.userId });
        }
        
        if (session.boardId) {
          const room = `board:${session.boardId}`;
          const collaborators = presenceService.getBoardCollaborators(session.boardId);
          io.to(room).emit('canvas:collaborators', collaborators);
          io.to(room).emit('canvas:cursor-remove', { userId: session.userId });
        }
        
        console.log(`Socket disconnected: ${socket.id}. Removed session for user: ${session.name}`);
      }
    });
  });

  return io;
};
