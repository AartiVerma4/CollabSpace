import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, workspaceApi, chatApi } from "../../lib/api";
import { getSocket, disconnectSocket } from "../../lib/socket";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "member" | "viewer";
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  ownerId?: any;
  members?: any[];
}

interface AppContextType {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<Workspace[]>;
  logout: () => Promise<void>;
  notifications: number;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to retrieve user's workspaces list
  const refreshWorkspaces = async (): Promise<Workspace[]> => {
    try {
      const data = await workspaceApi.list();
      const mapped: Workspace[] = data.map((ws: any) => ({
        id: ws._id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        icon: ws.logo || "🚀",
        ownerId: ws.ownerId,
        members: ws.members
      }));
      setWorkspaces(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      return [];
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      localStorage.removeItem("collabspace_token");
      setUser(null);
      setWorkspace(null);
      setWorkspaces([]);
      setNotifications(0);
      disconnectSocket();
    }
  };

  // Perform initial token validation & load profile
  useEffect(() => {
    const initAuth = async () => {
      // First extract token from URL query params (such as for Google OAuth redirect)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        localStorage.setItem("collabspace_token", urlToken);
        params.delete("token");
        const newSearch = params.toString();
        const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({}, document.title, newPath);
      }

      const token = localStorage.getItem("collabspace_token");
      if (!token) {
        // Try refreshing if no token in local storage (silent refresh on refresh token cookie)
        try {
          // Trigger apiFetch to any route or just refresh endpoint directly to get accessToken
          const refreshRes = await fetch("http://localhost:5000/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("collabspace_token", data.accessToken);
          } else {
            setIsLoading(false);
            return;
          }
        } catch (err) {
          setIsLoading(false);
          return;
        }
      }

      // If token exists, we fetch workspaces as validation check
      try {
        const loadedWorkspaces = await refreshWorkspaces();
        
        // Extract user identity from JWT payload
        const activeToken = localStorage.getItem("collabspace_token");
        if (activeToken) {
          const payload = JSON.parse(atob(activeToken.split(".")[1]));
          
          // Establish socket connection with token
          getSocket(activeToken);

          let initialWorkspace = null;
          if (loadedWorkspaces.length > 0) {
            const savedWsId = localStorage.getItem("collabspace_workspace_id");
            initialWorkspace = loadedWorkspaces.find(w => w.id === savedWsId) || loadedWorkspaces[0];
            setWorkspace(initialWorkspace);
            localStorage.setItem("collabspace_workspace_id", initialWorkspace.id);
          }

          // Compute user role in current workspace
          let userRole: "admin" | "member" | "viewer" = "member";
          if (initialWorkspace) {
            const ownerId = initialWorkspace.ownerId?._id || initialWorkspace.ownerId;
            const isOwner = ownerId === payload.userId;
            const memberObj = initialWorkspace.members?.find((m: any) => (m.userId?._id || m.userId) === payload.userId);
            
            if (isOwner || memberObj?.role === "Admin" || memberObj?.role === "Owner") {
              userRole = "admin";
            } else if (memberObj?.role === "Viewer") {
              userRole = "viewer";
            }
          }

          setUser({
            id: payload.userId,
            name: payload.name,
            email: payload.email,
            avatar: payload.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.name)}`,
            role: userRole
          });
        }
      } catch (err) {
        console.error("Auth validation failed:", err);
        localStorage.removeItem("collabspace_token");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen to token expiration events from api.ts
    const handleExpired = () => {
      logout();
    };
    window.addEventListener("auth_expired", handleExpired);
    return () => window.removeEventListener("auth_expired", handleExpired);
  }, []);

  // Update user role dynamically when switching workspaces
  const handleSetWorkspace = (ws: Workspace | null) => {
    setWorkspace(ws);
    if (ws) {
      localStorage.setItem("collabspace_workspace_id", ws.id);
      if (user) {
        const ownerId = ws.ownerId?._id || ws.ownerId;
        const isOwner = ownerId === user.id;
        const memberObj = ws.members?.find((m: any) => (m.userId?._id || m.userId) === user.id);
        
        let userRole: "admin" | "member" | "viewer" = "member";
        if (isOwner || memberObj?.role === "Admin" || memberObj?.role === "Owner") {
          userRole = "admin";
        } else if (memberObj?.role === "Viewer") {
          userRole = "viewer";
        }

        setUser({ ...user, role: userRole });
      }
    } else {
      localStorage.removeItem("collabspace_workspace_id");
    }
  };

  // Poll or load chat notifications count
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const data = await chatApi.getNotifications();
        const unreadCount = data.filter((n: any) => !n.read).length;
        setNotifications(unreadCount);
      } catch (err) {
        console.warn("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        workspace,
        workspaces,
        setUser,
        setWorkspace: handleSetWorkspace,
        refreshWorkspaces,
        logout,
        notifications,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
