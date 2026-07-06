import { Board } from '../models/Board.js';
import { presenceService } from '../services/presenceService.js';

export const registerCanvasHandlers = (io, socket) => {
  // Join Design Canvas room
  socket.on('canvas:join', async ({ boardId, workspaceId }) => {
    try {
      const room = `board:${boardId}`;
      socket.join(room);

      // Track active presence on canvas
      presenceService.setUserActive(socket.id, {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        email: socket.user.email,
        avatar: socket.user.avatar || '',
        workspaceId,
        documentId: null,
        boardId
      });

      // Broadcast collaborators update
      const collaborators = presenceService.getBoardCollaborators(boardId);
      io.to(room).emit('canvas:collaborators', collaborators);

      console.log(`Socket ${socket.id} (User: ${socket.user.name}) joined canvas board room: ${boardId}`);
    } catch (error) {
      console.error('canvas:join handler error:', error);
    }
  });

  // Real-time Figma-style object updates (Last-Write-Wins logic)
  socket.on('canvas:object-update', async ({ boardId, object }) => {
    try {
      const room = `board:${boardId}`;
      
      // Broadcast coordinates and properties change to all other collaborators
      socket.to(room).emit('canvas:object-update', { object, userId: socket.user._id });

      // Save canvas state modification in database
      if (object && object.id) {
        const board = await Board.findById(boardId);
        if (board) {
          const index = board.objects.findIndex(obj => obj.id === object.id);
          if (index !== -1) {
            if (object.isDeleted) {
              board.objects.splice(index, 1);
            } else {
              board.objects[index] = object;
            }
          } else if (!object.isDeleted) {
            board.objects.push(object);
          }
          board.markModified('objects');
          board.version += 1;
          await board.save();
        }
      }
    } catch (error) {
      console.error('canvas:object-update error:', error);
    }
  });

  // Broadcast mouse cursor pointers on canvas
  socket.on('canvas:cursor', ({ boardId, x, y }) => {
    const room = `board:${boardId}`;
    socket.to(room).emit('canvas:cursor', {
      userId: socket.user._id,
      name: socket.user.name,
      x,
      y
    });
  });
};
