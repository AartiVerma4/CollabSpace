export const BASE_URL = "http://localhost:5000";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("collabspace_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  options.credentials = "include"; // crucial for sending cookies (refresh token)
  options.headers = headers;

  let response = await fetch(url, options);

  // Auto-refresh token on 401
  if (
    response.status === 401 &&
    !endpoint.includes("/api/auth/login") &&
    !endpoint.includes("/api/auth/register")
  ) {
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          headers.set("Authorization", `Bearer ${newToken}`);
          resolve(fetch(url, options));
        });
      }).then((res) => (res as Response).json());
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data.accessToken;
        localStorage.setItem("collabspace_token", newToken);
        isRefreshing = false;
        onRefreshed(newToken);

        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, options);
      } else {
        isRefreshing = false;
        localStorage.removeItem("collabspace_token");
        window.dispatchEvent(new Event("auth_expired"));
        throw new Error("Session expired");
      }
    } catch (err) {
      isRefreshing = false;
      localStorage.removeItem("collabspace_token");
      window.dispatchEvent(new Event("auth_expired"));
      throw err;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  login: (body: any) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: any) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  guestLogin: (body: { name?: string; email?: string }) =>
    apiFetch("/api/auth/guest-login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
  googleOAuth: (body: any) =>
    apiFetch("/api/auth/google", { method: "POST", body: JSON.stringify(body) }),
  forgotPassword: (body: any) =>
    apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body: any) =>
    apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
};

export const workspaceApi = {
  list: () => apiFetch("/api/workspaces"),
  get: (id: string) => apiFetch(`/api/workspaces/${id}`),
  create: (body: any) =>
    apiFetch("/api/workspaces", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch(`/api/workspaces/${id}`, { method: "DELETE" }),
  invite: (id: string, body: { email: string; role: string }) =>
    apiFetch(`/api/workspaces/${id}/invite`, { method: "POST", body: JSON.stringify(body) }),
  acceptInvite: (token: string) =>
    apiFetch("/api/workspaces/accept-invite", { method: "POST", body: JSON.stringify({ token }) }),
  updateMemberRole: (id: string, userId: string, role: string) =>
    apiFetch(`/api/workspaces/${id}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeMember: (id: string, userId: string) =>
    apiFetch(`/api/workspaces/${id}/members/${userId}`, { method: "DELETE" }),
  getActivityFeed: (id: string) =>
    apiFetch(`/api/workspaces/${id}/activity`),
};

// ── Share link payload ──────────────────────────────────────────────────────
export type SharePermission = "Viewer" | "Commenter" | "Editor";

export interface ShareLinkPayload {
  permission: SharePermission;
  /** Number of days until expiry. Pass 0 or omit for "never expires". */
  expiresInDays?: number;
}

export interface ShareLinkStatus {
  hasShareLink: boolean;
  shareIsActive: boolean;
  sharePermission: SharePermission;
  shareExpiresAt: string | null;
  shareCreatedAt: string | null;
  isExpired: boolean;
}

// ── Document API ────────────────────────────────────────────────────────────
export const documentApi = {
  list: (workspaceId: string) =>
    apiFetch(`/api/documents?workspaceId=${workspaceId}`),

  /** Standard authenticated get — for workspace members */
  get: (id: string, token?: string) =>
    apiFetch(`/api/documents/${id}${token ? `?token=${token}` : ""}`),

  /**
   * FIX Bug 1: Get document via share token — works for ANY user (logged-in or guest).
   * Returns full document content. Used when visiting /share/doc/:id while logged in.
   */
  getByShareToken: (id: string, token: string) =>
    apiFetch(`/api/documents/shared/${id}?token=${token}`),

  /** Public metadata only — for unauthenticated guest landing screen */
  getPublic: (id: string, token: string) =>
    apiFetch(`/api/documents/public/${id}?token=${token}`),

  create: (body: { title: string; workspaceId: string; content?: any }) =>
    apiFetch("/api/documents", { method: "POST", body: JSON.stringify(body) }),

  updateMetadata: (id: string, body: { title: string }) =>
    apiFetch(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  save: (id: string, body: { content: string }, token?: string) =>
    apiFetch(
      `/api/documents/${id}${token ? `?token=${token}` : ""}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  delete: (id: string) =>
    apiFetch(`/api/documents/${id}`, { method: "DELETE" }),

  getVersions: (id: string, token?: string) =>
    apiFetch(`/api/documents/${id}/versions${token ? `?token=${token}` : ""}`),

  restoreVersion: (id: string, versionId: string, token?: string) =>
    apiFetch(
      `/api/documents/${id}/restore/${versionId}${token ? `?token=${token}` : ""}`,
      { method: "POST" }
    ),

  /**
   * FIX Bug 4 & 6: Proper type — includes permission, expiresInDays.
   * FIX: isPublic removed (handled by shareIsActive on backend).
   */
  share: (id: string, body: ShareLinkPayload) =>
    apiFetch(`/api/documents/${id}/share`, { method: "POST", body: JSON.stringify(body) }),

  /** FIX Bug 6: Revoke a share link without deleting the document */
  revokeShare: (id: string) =>
    apiFetch(`/api/documents/${id}/share`, { method: "DELETE" }),

  /** Get the current share link status (active, expiry, permission) */
  getShareStatus: (id: string): Promise<ShareLinkStatus> =>
    apiFetch(`/api/documents/${id}/share/status`),

  /** FIX Bug 3: anchorRange is truly optional */
  addComment: (
    id: string,
    body: { text: string; anchorRange?: { index: number; length: number } | null },
    token?: string
  ) =>
    apiFetch(
      `/api/documents/${id}/comments${token ? `?token=${token}` : ""}`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  /**
   * FIX Bug 7: Use 'replyText' for threaded replies, 'text' for edits, 'resolved' to toggle.
   * Backend now accepts both for compatibility.
   */
  resolveComment: (
    id: string,
    commentId: string,
    body: { resolved?: boolean; text?: string; replyText?: string },
    token?: string
  ) =>
    apiFetch(
      `/api/documents/${id}/comments/${commentId}${token ? `?token=${token}` : ""}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
};

export const boardApi = {
  list: (workspaceId: string) =>
    apiFetch(`/api/boards?workspaceId=${workspaceId}`),
  get: (id: string) => apiFetch(`/api/boards/${id}`),
  create: (body: { title: string; workspaceId: string; objects?: any[] }) =>
    apiFetch("/api/boards", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { title?: string; objects?: any[] }) =>
    apiFetch(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch(`/api/boards/${id}`, { method: "DELETE" }),
};

export const chatApi = {
  getMessages: (workspaceId: string, channelId: string) =>
    apiFetch(`/api/chat/messages?workspaceId=${workspaceId}&channelId=${channelId}`),
  postMessage: (body: {
    workspaceId: string;
    channelId: string;
    text: string;
    attachments?: string[];
  }) =>
    apiFetch("/api/chat/messages", { method: "POST", body: JSON.stringify(body) }),
  getNotifications: () => apiFetch("/api/chat/notifications"),
  markNotificationRead: (id: string) =>
    apiFetch(`/api/chat/notifications/${id}`, { method: "PATCH" }),
};
