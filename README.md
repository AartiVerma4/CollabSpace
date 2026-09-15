# CollabSpace — Real-time SaaS Collaboration Platform

> A production-ready, full-stack SaaS web application inspired by Notion, Slack, Figma, and Google Docs.

---

## 🚀 Quick Start

### Frontend
```bash
npm install
npm run dev        # http://localhost:5173
```

### Backend
```bash
cd backend
npm install
node src/server.js  # http://localhost:5000
```

---

## 🛠 Tech Stack

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Charts | Recharts |
| State | React Context API |
| Notifications | Sonner (toast) |
| Real-time | Socket.IO Client |
| Build Tool | Vite 6 |

### Backend
| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ESM modules) |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (RS256 asymmetric keys) |
| Real-time | Socket.IO |
| Security | Helmet, CORS, Rate Limiting |
| Password | bcryptjs (12-round salt) |

---

## 🏗 Architecture Overview

```
CollabSpace SaaS Web App Design/
├── src/                          # Frontend (React + TypeScript)
│   ├── app/
│   │   ├── pages/                # 16 complete page components
│   │   ├── components/           # Shared & UI components
│   │   ├── contexts/             # AppContext, ThemeContext
│   │   └── routes.tsx            # React Router config
│   ├── lib/
│   │   ├── api.ts                # Typed REST API client
│   │   └── socket.ts             # Socket.IO singleton client
│   └── styles/index.css
│
└── backend/
    └── src/
        ├── controllers/          # Business logic handlers
        ├── models/               # Mongoose schemas (10 models)
        ├── routes/               # REST API routes (5 route groups)
        ├── middlewares/          # JWT auth, RBAC, rate limiting
        ├── sockets/              # Socket.IO event handlers
        ├── services/             # Email, Presence services
        └── config/               # DB, Keys, Constants
```

---

## 📄 Pages & Features

### Authentication (5 pages)
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, testimonials, pricing, CTA |
| Login | `/login` | Email + Google OAuth, remember me, auto-redirect |
| Register | `/register` | Full name, email, password + Google OAuth |
| Forgot Password | `/forgot-password` | Email reset flow with token |
| Reset Password | `/reset-password` | New password entry |

### Workspace Management (3 pages)
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/workspace` | Stats, recent docs/boards, activity feed |
| Settings | `/workspace/settings` | General, members, roles, invite system |
| Admin | `/admin` | Analytics, audit logs, user growth charts |

### Document Collaboration (2 pages)
| Page | Route | Description |
|------|-------|-------------|
| Document List | `/documents` | Grid/list view, folders, search, filters |
| Document Editor | `/documents/:id` | Rich text toolbar, real-time cursors, comments, version history |
| Shared View | `/share/doc/:id` | Public share link access (Viewer/Commenter/Editor) |

### Design Boards & More
| Page | Route | Description |
|------|-------|-------------|
| Design Board | `/boards/:id` | Figma-style canvas, tools, layers, zoom |
| Team Chat | `/chat` | Channels, threads, emoji reactions, typing indicators |
| Direct Messages | `/messages` | Workspace direct messaging |
| Activity Feed | `/activity` | Timeline of all workspace activities |
| User Profile | `/profile` | Personal info, preferences |
| 404 | `*` | Custom not-found page |

---

## 🔌 Backend API Endpoints

### Auth (`/api/auth`)
- `POST /register` — Register new user (sends verification email)
- `POST /login` — Email/password login (rate limited)
- `POST /guest-login` — Guest access
- `POST /google` — Google OAuth (client-side token exchange)
- `GET  /google/callback` — Server-side OAuth callback
- `POST /refresh` — Refresh access token from httpOnly cookie
- `POST /logout` — Clear refresh token cookie
- `POST /forgot-password` — Send password reset email
- `POST /reset-password` — Reset password with token

### Workspaces (`/api/workspaces`)
- `GET/POST /` — List / Create workspaces
- `GET/PATCH/DELETE /:id` — Get / Update / Delete workspace
- `POST /:id/invite` — Invite member (sends email)
- `POST /accept-invite` — Accept invitation via token
- `PATCH /:id/members/:userId` — Update member role
- `DELETE /:id/members/:userId` — Remove member
- `GET /:id/activity` — Activity feed

### Documents (`/api/documents`)
- `GET/POST /` — List / Create documents
- `GET/PATCH/DELETE /:id` — Get / Update / Delete document
- `GET /:id/versions` — Version history
- `POST /:id/restore/:versionId` — Restore version
- `POST /:id/share` — Generate share link
- `DELETE /:id/share` — Revoke share link
- `GET /:id/share/status` — Share link status
- `POST /:id/comments` — Add comment thread
- `PATCH /:id/comments/:cid` — Edit/resolve/reply to comment
- `GET /shared/:id` — Access via share token
- `GET /public/:id` — Public metadata (unauthenticated)

### Boards (`/api/boards`)
- `GET/POST /` — List / Create boards
- `GET/PATCH/DELETE /:id` — Get / Update / Delete board

### Chat & Notifications (`/api/chat`)
- `POST /messages` — Post channel message
- `GET /messages` — Get channel history
- `GET /notifications` — Get user notifications
- `PATCH /notifications/:id` — Mark notification read
- `PATCH /notifications/all` — Clear all notifications

---

## 🔐 Security

- **JWT RS256** — Asymmetric key pair (auto-generated on first run)
- **Access Token**: 15m TTL in `Authorization: Bearer` header
- **Refresh Token**: 7d TTL in `httpOnly` cookie (CSRF-safe)
- **Auto-refresh**: Frontend silently refreshes token on 401
- **RBAC**: Role-based permissions — Owner > Admin > Editor > Commenter > Viewer
- **Rate Limiting**: Auth endpoints limited to prevent brute-force
- **Helmet.js**: HTTP security headers
- **CORS**: Configured for frontend origin only

---

## 🔄 Real-time (Socket.IO)

| Event | Description |
|-------|-------------|
| `doc:join` | Join a document editing room |
| `doc:operation` | Broadcast document operations (OT-ready) |
| `doc:cursor` | Share cursor position/color to collaborators |
| `doc:collaborators` | Emit live collaborator list |
| `canvas:join` | Join a design board room |
| `canvas:object-update` | Broadcast shape/object changes |
| `canvas:cursor` | Broadcast board cursor position |
| `chat:join` | Join workspace chat room |
| `chat:message` | Broadcast new message |
| `chat:typing` / `stop-typing` | Typing indicators |
| `chat:reaction` | Emoji reactions on messages |
| `presence:heartbeat` | Keep user presence alive |

---

## 📊 Data Models

| Model | Purpose |
|-------|---------|
| `User` | Auth, profile, Google OAuth |
| `Workspace` | Workspace with members array + RBAC roles |
| `Document` | Rich text document with share link fields |
| `DocVersion` | Version history snapshots |
| `Board` | Design canvas with objects array |
| `Comment` | Threaded comment with replies |
| `Message` | Chat message with reactions |
| `Notification` | In-app notifications |
| `Invitation` | Workspace invite tokens |
| `ActivityLog` | Audit trail |

---

## ✅ Test Coverage

Run the full API test suite (31 routes, 100% pass rate):

```bash
cd backend
node src/testAllApis.js
```

Results:
```
Passed Routes: 31
Failed Routes: 0
Success Rate: 100%
```

---

## 🌐 Environment Variables (backend/.env)

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=5
```

---

## 🎨 Design System

- **Color Palette**: Indigo primary (#4F46E5), Slate secondary, adaptive dark mode
- **Typography**: Inter font, 8px spacing system
- **Radius**: 12-16px (rounded-xl)
- **Glassmorphism**: Modals and overlays
- **Motion**: Smooth micro-animations via Framer Motion
- **Theme**: System-aware light/dark mode with localStorage persistence