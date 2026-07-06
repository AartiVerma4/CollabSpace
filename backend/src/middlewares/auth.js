import jwt from 'jsonwebtoken';
import { PUBLIC_KEY, PRIVATE_KEY } from '../config/keys.js';
import { Workspace } from '../models/Workspace.js';
import { Document } from '../models/Document.js';
import { Board } from '../models/Board.js';
import { ROLES } from '../config/constants.js';

// Access Token TTL: 15 minutes, Refresh Token TTL: 7 days
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: ACCESS_EXPIRY }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: REFRESH_EXPIRY }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch (error) {
    return null;
  }
};

// ── Strict auth — returns 401 if no/invalid token ─────────────────────────────
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded; // Contains userId, email, name
  next();
};

// ── Optional auth — enriches req.user if token is present but never blocks ────
// Use this for routes that can be accessed by both authenticated and anonymous users
export const optionalAuthenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next(); // Always proceed, even without a valid token
};

// ── Share-token validator middleware ──────────────────────────────────────────
// Validates the ?token= query param against the document's shareToken.
// Sets req.shareAccess = { permission, docId } on success.
// Calls next() so downstream middleware can combine this with user-level checks.
export const authenticateShareToken = async (req, res, next) => {
  try {
    const docId = req.params.id;

    if (!docId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    const doc = await Document.findOne({ _id: docId, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check share is still active (not revoked)
    if (!doc.shareIsActive) {
      return res.status(403).json({ message: 'This share link has been revoked or is not active' });
    }

    // Check expiry
    if (doc.shareExpiresAt && new Date() > new Date(doc.shareExpiresAt)) {
      return res.status(403).json({ message: 'This share link has expired' });
    }

    // Attach share context to request for downstream use
    req.shareAccess = {
      docId: doc._id.toString(),
      permission: doc.sharePermission, // 'Viewer' | 'Commenter' | 'Editor'
      doc
    };

    next();
  } catch (error) {
    console.error('Share token middleware error:', error);
    res.status(500).json({ message: 'Internal error validating share token' });
  }
};

// ── Workspace Role-Based Access Control Middleware ────────────────────────────
// Checks if user is a member of the workspace with the target role.
// Also supports share-token bypass for document routes.
export const requireWorkspaceRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      let workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
      const reqToken = req.query.token || req.body.token;

      // If workspaceId is not direct, check if we're hitting a workspace detail route directly
      if (!workspaceId && req.baseUrl.includes('workspaces') && req.params.id) {
        workspaceId = req.params.id;
      }

      // If document detail endpoint, resolve workspaceId from document
      if (!workspaceId && req.baseUrl.includes('documents') && req.params.id) {
        const doc = await Document.findById(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: 'Document not found' });
        }

        // If the document has sharing active, allow access (the document ID is unguessable and acts as the secret)
        if (doc.shareIsActive) {
          if (doc.shareExpiresAt && new Date() > new Date(doc.shareExpiresAt)) {
            return res.status(403).json({ message: 'This share link has expired' });
          }

          req.workspace = await Workspace.findById(doc.workspaceId);
          let role = ROLES.VIEWER;
          if (doc.sharePermission === 'Editor') role = ROLES.EDITOR;
          else if (doc.sharePermission === 'Commenter') role = ROLES.COMMENTER;

          req.userWorkspaceRole = role;

          if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
            return res.status(403).json({ message: `Access denied. Shared access is ${doc.sharePermission} only.` });
          }
          return next();
        }

        workspaceId = doc.workspaceId;
      }

      // If board detail endpoint, resolve workspaceId from board
      if (!workspaceId && req.baseUrl.includes('boards') && req.params.id) {
        const board = await Board.findById(req.params.id);
        if (!board) {
          return res.status(404).json({ message: 'Design board not found' });
        }
        workspaceId = board.workspaceId;
      }

      if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace ID could not be identified' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      // Must be authenticated to proceed beyond this point
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user is the Owner
      if (workspace.ownerId.toString() === req.user.userId) {
        req.workspace = workspace;
        req.userWorkspaceRole = ROLES.OWNER;
        return next(); // Owner has all permissions
      }

      // Check user membership role
      const member = workspace.members.find(m => m.userId.toString() === req.user.userId);
      if (!member) {
        return res.status(403).json({ message: 'You are not a member of this workspace' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
      }

      req.workspace = workspace;
      req.userWorkspaceRole = member.role;
      next();
    } catch (error) {
      console.error('RBAC Middleware error:', error);
      res.status(500).json({ message: 'Internal server authorization error' });
    }
  };
};
