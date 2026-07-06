import { presenceService } from '../services/presenceService.js';

export const registerChatHandlers = (io, socket) => {
  // Join Workspace communications channel
  socket.on('chat:join', ({ workspaceId }) => {
    const room = `chat:${workspaceId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} (User: ${socket.user.name}) registered in workspace chat room: ${workspaceId}`);
  });

  // Broadcast live chat messages in real time
  socket.on('chat:message', ({ workspaceId, message }) => {
    const room = `chat:${workspaceId}`;
    socket.to(room).emit('chat:message', message);
  });

  // Client heartbeat to maintain presence online status
  socket.on('presence:heartbeat', ({ workspaceId }) => {
    presenceService.setUserHeartbeat(socket.id);
    
    // Broadcast active workspace users
    const workspaceRoom = `chat:${workspaceId}`;
    const activeMembers = presenceService.getWorkspaceCollaborators(workspaceId);
    io.to(workspaceRoom).emit('presence:update', activeMembers);
  });
};
export default registerChatHandlers;
