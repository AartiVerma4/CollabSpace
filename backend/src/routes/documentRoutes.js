import express from 'express';
import {
  createDocument,
  getWorkspaceDocuments,
  getDocumentDetails,
  getSharedDocumentDetails,
  updateDocumentMetadata,
  softDeleteDocument,
  listVersionHistory,
  restoreVersion,
  generateShareLink,
  revokeShareLink,
  getShareLinkStatus,
  addComment,
  resolveOrEditComment,
  getPublicDocumentDetails
} from '../controllers/documentController.js';
import {
  authenticateJWT,
  optionalAuthenticateJWT,
  requireWorkspaceRole
} from '../middlewares/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// ── Listing and creation (authenticated workspace members only) ────────────────
router.post('/', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), createDocument);
router.get('/', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER, ROLES.VIEWER]), getWorkspaceDocuments);

// ── Public metadata endpoint (NO auth required — for guest landing screen) ────
// Must be declared BEFORE /:id to avoid route collision
router.get('/public/:id', getPublicDocumentDetails);

// ── Shared document access via share token (authenticated OR guest) ────────────
// FIX Bug 1: Owners and non-members visiting a share link use this endpoint.
// optionalAuthenticateJWT enriches req.user if logged in, but never blocks.
// The controller validates the share token lifecycle (active, not expired).
router.get('/shared/:id', optionalAuthenticateJWT, getSharedDocumentDetails);

// ── Standard authenticated document endpoints ─────────────────────────────────
router.get('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER, ROLES.VIEWER]), getDocumentDetails);
router.patch('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), updateDocumentMetadata);
router.delete('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), softDeleteDocument);

// ── Snapshot and Version control ──────────────────────────────────────────────
router.get('/:id/versions', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER, ROLES.VIEWER]), listVersionHistory);
router.post('/:id/restore/:versionId', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), restoreVersion);

// ── Share link management (owner/admin only) ──────────────────────────────────
router.post('/:id/share', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), generateShareLink);
router.delete('/:id/share', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), revokeShareLink);
router.get('/:id/share/status', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), getShareLinkStatus);

// ── Comments (FIX Bug 2: optionalAuthenticateJWT allows guests with share token) ─
// requireWorkspaceRole still validates the share token for guests
router.post('/:id/comments', optionalAuthenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER]), addComment);
router.patch('/:id/comments/:cid', optionalAuthenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER]), resolveOrEditComment);

export default router;
