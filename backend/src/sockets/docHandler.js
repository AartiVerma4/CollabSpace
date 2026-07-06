import { Document } from '../models/Document.js';
import { DocVersion } from '../models/DocVersion.js';
import { presenceService } from '../services/presenceService.js';

export const registerDocHandlers = (io, socket) => {
  // Join Document room
  socket.on('doc:join', async ({ documentId, workspaceId }) => {
    try {
      const room = `doc:${documentId}`;
      socket.join(room);

      // Track active presence
      presenceService.setUserActive(socket.id, {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        email: socket.user.email,
        avatar: socket.user.avatar || '',
        workspaceId,
        documentId,
        boardId: null
      });

      // Broadcast updated list of collaborators to the room
      const collaborators = presenceService.getDocumentCollaborators(documentId);
      io.to(room).emit('doc:collaborators', collaborators);

      console.log(`Socket ${socket.id} (User: ${socket.user.name}) joined doc room: ${documentId}`);
    } catch (error) {
      console.error('doc:join handler error:', error);
    }
  });

  // Real-time editor operations delta broadcast
  socket.on('doc:operation', async ({ documentId, op, revision }) => {
    try {
      const room = `doc:${documentId}`;
      
      // Broadcast delta operations to all other clients in the room
      socket.to(room).emit('doc:operation', { op, revision, userId: socket.user._id });

      // Asynchronous background autosave to prevent blocking
      // Fetch document, update content and lastSavedAt
      const doc = await Document.findById(documentId);
      if (doc) {
        // Here, Quill Delta operations op represents changes. 
        // For simplicity, if the client sends the full content, we update it;
        // if they send incremental delta ops, we append or apply it. 
        // To be extremely robust and compatible:
        if (op && op.fullContent) {
          doc.content = op.fullContent;
        } else if (op) {
          // Fallback - if it's a list of delta operations, merge or store delta object
          doc.content = op;
        }
        
        doc.version = revision;
        doc.lastSavedAt = Date.now();
        await doc.save();
      }
    } catch (error) {
      console.error('doc:operation handler error:', error);
    }
  });

  // Live cursor tracking broadcast
  socket.on('doc:cursor', ({ documentId, range, color }) => {
    const room = `doc:${documentId}`;
    socket.to(room).emit('doc:cursor', {
      userId: socket.user._id,
      name: socket.user.name,
      range, // { index, length }
      color // collaborator's cursor visual styling color
    });
  });
};
