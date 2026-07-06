// Presence Tracking Service
// Tracks connected users, active workspace/documents/boards, and their statuses (Active, Idle, Offline)
// Support for in-memory presence tracking with Redis-ready API structures

// structure of presenceMap:
// socketId -> { userId, name, email, avatar, workspaceId, documentId, boardId, lastActive }
const presenceMap = new Map();

// 3-minute inactivity threshold for Idle status (in ms)
const INACTIVITY_LIMIT = 3 * 60 * 1000; 

export const presenceService = {
  /**
   * Tracks/registers a collaborator's active status.
   */
  setUserActive: (socketId, userDetails) => {
    const { userId, name, email, avatar, workspaceId, documentId, boardId } = userDetails;
    presenceMap.set(socketId, {
      userId,
      name,
      email,
      avatar,
      workspaceId,
      documentId,
      boardId,
      lastActive: Date.now()
    });
  },

  /**
   * Updates user heartbeat to keep status active.
   */
  setUserHeartbeat: (socketId) => {
    const session = presenceMap.get(socketId);
    if (session) {
      session.lastActive = Date.now();
      presenceMap.set(socketId, session);
    }
  },

  /**
   * Removes a socket connection (e.g. on disconnect)
   * Returns details of the session that was removed.
   */
  removeUserSocket: (socketId) => {
    const session = presenceMap.get(socketId);
    if (session) {
      presenceMap.delete(socketId);
      return session;
    }
    return null;
  },

  /**
   * Lists collaborators inside a document.
   */
  getDocumentCollaborators: (documentId) => {
    const now = Date.now();
    const list = [];
    const seenUsers = new Set();

    for (const [socketId, data] of presenceMap.entries()) {
      if (data.documentId === documentId) {
        // Prevent duplicate presence entry if user is connected via multiple tabs
        if (seenUsers.has(data.userId)) continue;
        seenUsers.add(data.userId);

        const status = (now - data.lastActive) > INACTIVITY_LIMIT ? 'Idle' : 'Active';
        list.push({
          userId: data.userId,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          status,
          socketId
        });
      }
    }
    return list;
  },

  /**
   * Lists collaborators inside a design board canvas.
   */
  getBoardCollaborators: (boardId) => {
    const now = Date.now();
    const list = [];
    const seenUsers = new Set();

    for (const [socketId, data] of presenceMap.entries()) {
      if (data.boardId === boardId) {
        if (seenUsers.has(data.userId)) continue;
        seenUsers.add(data.userId);

        const status = (now - data.lastActive) > INACTIVITY_LIMIT ? 'Idle' : 'Active';
        list.push({
          userId: data.userId,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          status,
          socketId
        });
      }
    }
    return list;
  },

  /**
   * Lists active workspace members.
   */
  getWorkspaceCollaborators: (workspaceId) => {
    const now = Date.now();
    const list = [];
    const seenUsers = new Set();

    for (const [socketId, data] of presenceMap.entries()) {
      if (data.workspaceId === workspaceId) {
        if (seenUsers.has(data.userId)) continue;
        seenUsers.add(data.userId);

        const status = (now - data.lastActive) > INACTIVITY_LIMIT ? 'Idle' : 'Active';
        list.push({
          userId: data.userId,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          status
        });
      }
    }
    return list;
  }
};
