# CollabSpace Backend - Express, Node.js & MongoDB Atlas

Production-ready, real-time backend API for **CollabSpace** (Google Docs + Figma inspired collaborative SaaS app). Built with Express, Node.js, Mongoose, and Socket.IO, implementing RS256 JWT Auth and fine-grained Role-Based Access Control (RBAC).

---

## Technical Features

1. **Real-time Sync Canvas & Editor (Socket.IO)**: Bi-directional socket rooms mapped to document and board IDs. Optimistic updates with Last-Write-Wins (LWW) resolution for canvas elements.
2. **Stateless RS256 Token Auth**: Public/Private key verification. Access tokens signed via RS256 with 15-minute TTL; Refresh tokens configured via httpOnly cookie storage. Includes automatic key generation on boot.
3. **Mongoose Database Schema Design**: Full schemas for user directories, teams, files workspace lists, comments threads, activity logs audit trails, and version snapshots.
4. **Workspace RBAC Guards**: Endpoints wrapped in middleware assessing permission layers (`Owner`, `Admin`, `Editor`, `Commenter`, `Viewer`).
5. **Rate Limiting & Safety**: Brute-force block policies (5 attempts / 15 minutes limit per IP) on credentials endpoints.

---

## Directory Structure

```
backend/
  ├── package.json
  ├── .env
  ├── .env.example
  ├── .keys/                 # Auto-generated RS256 RSA keys
  │   ├── private.pem
  │   └── public.pem
  ├── postman/
  │   └── CollabSpace_Backend_APIs.postman_collection.json
  └── src/
      ├── app.js            # Express application configurations
      ├── server.js         # Entry node HTTP & Socket listener
      ├── config/
      │   ├── db.js         # MongoDB connection config
      │   ├── keys.js       # Asymmetric RSA key generator utility
      │   └── constants.js  # Role arrays and definitions
      ├── middlewares/
      │   ├── auth.js       # Authenticator & RBAC limits middleware
      │   ├── rateLimiter.js # brute force rate-limits policy
      │   └── errorHandler.js # global exception mapper
      ├── models/           # Mongoose schemas (User, Workspace, Doc, Message, Comment, etc)
      ├── controllers/      # REST endpoint handlers
      ├── routes/           # Router mount definitions
      ├── services/
      │   ├── emailService.js # mock verification/reset dispatcher
      │   └── presenceService.js # websocket collaborators status manager
      └── sockets/
          ├── index.js      # Main dispatch handler & handshake checker
          ├── docHandler.js # rich text real-time cursor & content saves
          ├── canvasHandler.js # board coords movements & properties
          └── chatHandler.js # channel chats notification relays
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas cluster credentials (preconfigured in your `.env`)

### Steps

1. **Install Dependencies**:
   Open a terminal in the `backend/` folder and run:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   A `.env` has been created automatically. Update variables if needed:
   - `PORT`: Server port (default: 5000)
   - `MONGODB_URI`: Pre-configured connection string to your MongoDB Atlas cluster.
   - `JWT_ACCESS_EXPIRY` & `JWT_REFRESH_EXPIRY`: Lifetimes of authorization JWTs.
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Placeholders for OAuth 2.0.

3. **Start the server**:
   ```bash
   npm run dev
   ```
   On first boot, the system will automatically generate a new 2048-bit RSA key pair in the `.keys/` directory for secure RS256 JWT signatures.

---

## REST Endpoints Map

### 1. Authentication (`/api/auth`)
* `POST /register`: Registers user accounts.
* `POST /login`: Authenticates password and initiates cookies session.
* `POST /google`: Mocks Google account authentication & auto-registration.
* `POST /refresh`: Grants new access tokens using refresh tokens.
* `POST /logout`: Invalidates session cookie.
* `POST /forgot-password`: Generates reset token and logs mock reset link.
* `POST /reset-password`: Commits new credentials with active reset token.

### 2. Workspace Management (`/api/workspaces`)
* `POST /`: Creates a workspace. Creator becomes `Owner`.
* `GET /:id`: Fetches workspace settings and members array.
* `PATCH /:id`: Modifies name/description (Owner & Admin only).
* `DELETE /:id`: Drops workspace from DB (Owner only).
* `POST /:id/invite`: Issues workspace invitation token to emails (Owner & Admin only).
* `POST /accept-invite`: Enrolls user into workspace using invitation token.
* `PATCH /:id/members/:userId`: Promotes/demotes member role (Owner & Admin only).
* `DELETE /:id/members/:userId`: Expels member from team workspace (Owner & Admin only).
* `GET /:id/activity`: Lists workspace activity logs (Owner & Admin only).

### 3. Document Collaboration (`/api/documents`)
* `POST /`: Creates rich-text documents (Editor and above).
* `GET /`: Lists all workspace documents (All members).
* `GET /:id`: Retrieves text content state and comments (All members).
* `PATCH /:id`: Renames/categorizes folders metadata (Editor and above).
* `DELETE /:id`: Moves document to soft-delete Trash (Owner/Admin only).
* `GET /:id/versions`: Lists document snapshot logs (All members).
* `POST /:id/restore/:versionId`: Restores document to target version state (Editor and above).
* `POST /:id/share`: Generates a shareable URL token (Owner/Admin only).
* `POST /:id/comments`: Anchors threaded comments to text ranges (Commenter and above).
* `PATCH /:id/comments/:cid`: Resolves comment thread or replies (Commenter and above).

### 4. Figma Design Boards (`/api/boards`)
* `POST /`: Creates a design board (Editor and above).
* `GET /`: Lists workspace boards (All members).
* `GET /:id`: Retrieves canvas object state (All members).
* `PATCH /:id`: Modifies board details or save objects array (Editor and above).
* `DELETE /:id`: Removes canvas board (Owner/Admin only).

### 5. Chat & Notifications (`/api/chat`)
* `POST /messages`: Posts channel message supporting markdown formats (All members).
* `GET /messages`: Fetches chat history (All members).
* `GET /notifications`: Fetches user's inbox alerts (All members).
* `PATCH /notifications/:id`: Clears or marks notifications read (All members).

---

## WebSocket Events Spec

Secure WebSocket connection is authenticated during handshake using `auth.token`.

### Document Sync
* **Listen**:
  * `doc:collaborators`: Array of users active on the editor.
  * `doc:operation`: Real-time text changes delta operations from collaborators.
  * `doc:cursor`: Mouse range selections position changes.
  * `doc:cursor-remove`: Emitted to hide cursor of disconnected member.
* **Emit**:
  * `doc:join` -> `{ documentId, workspaceId }`
  * `doc:operation` -> `{ documentId, op, revision }`
  * `doc:cursor` -> `{ documentId, range, color }`

### Figma Canvas Board Sync
* **Listen**:
  * `canvas:collaborators`: Active board visitors.
  * `canvas:object-update`: Shape modifications/moves from others.
  * `canvas:cursor`: Pointer positions coordinates.
  * `canvas:cursor-remove`: Emitted to remove pointers of disconnected members.
* **Emit**:
  * `canvas:join` -> `{ boardId, workspaceId }`
  * `canvas:object-update` -> `{ boardId, object }` (updates stored in DB)
  * `canvas:cursor` -> `{ boardId, x, y }`

### active Presence & Chat Notification
* **Listen**:
  * `presence:update`: Active members list in workspace.
* **Emit**:
  * `chat:join` -> `{ workspaceId }`
  * `presence:heartbeat` -> `{ workspaceId }` (keeps presence alive; triggers idle fallback check)

---

## Postman API Testing Guide

1. Open **Postman**.
2. Click **Import** and upload `backend/postman/CollabSpace_Backend_APIs.postman_collection.json`.
3. Set the environment variables or edit the collection variables:
   - `baseUrl` -> `http://localhost:5000` (default)
   - `accessToken` -> Paste the access token returned from Register/Login response.
   - `refreshToken` -> Paste the refresh token.
4. Execute endpoints in sequence to test user flows!
