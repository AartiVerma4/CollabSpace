import { io, Socket } from "socket.io-client";
import { BASE_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const finalToken = token || localStorage.getItem("collabspace_token");
  
  if (!socket && finalToken) {
    socket = io(BASE_URL, {
      auth: {
        token: finalToken
      },
      autoConnect: true,
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket?.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error.message);
    });
  } else if (socket && finalToken && socket.auth && (socket.auth as any).token !== finalToken) {
    // Re-authenticate if token changed
    socket.disconnect();
    socket.auth = { token: finalToken };
    socket.connect();
  }

  return socket || io(BASE_URL, { autoConnect: false });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Room operations wrappers
export const socketHelpers = {
  joinDocument: (documentId: string, workspaceId: string) => {
    getSocket().emit("doc:join", { documentId, workspaceId });
  },
  emitDocumentOp: (documentId: string, op: any, revision: number) => {
    getSocket().emit("doc:operation", { documentId, op, revision });
  },
  emitDocumentCursor: (documentId: string, range: any, color: string) => {
    getSocket().emit("doc:cursor", { documentId, range, color });
  },
  
  joinBoard: (boardId: string, workspaceId: string) => {
    getSocket().emit("canvas:join", { boardId, workspaceId });
  },
  emitBoardObjectUpdate: (boardId: string, object: any) => {
    getSocket().emit("canvas:object-update", { boardId, object });
  },
  emitBoardCursor: (boardId: string, x: number, y: number) => {
    getSocket().emit("canvas:cursor", { boardId, x, y });
  },

  joinChat: (workspaceId: string) => {
    getSocket().emit("chat:join", { workspaceId });
  },
  emitChatMessage: (workspaceId: string, message: any) => {
    getSocket().emit("chat:message", { workspaceId, message });
  },
  emitPresenceHeartbeat: (workspaceId: string) => {
    getSocket().emit("presence:heartbeat", { workspaceId });
  }
};
