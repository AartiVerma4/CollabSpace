import express from 'express';
import {
  createWorkspace,
  getWorkspaceDetails,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  getActivityFeed,
  listUserWorkspaces
} from '../controllers/workspaceController.js';
import { authenticateJWT, requireWorkspaceRole } from '../middlewares/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Publicly authenticated workspace paths
router.get('/', authenticateJWT, listUserWorkspaces);
router.post('/', authenticateJWT, createWorkspace);
router.post('/accept-invite', authenticateJWT, acceptInvitation);

// Roles guarded workspace paths
router.get('/:id', authenticateJWT, requireWorkspaceRole([]), getWorkspaceDetails);
router.patch('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), updateWorkspace);
router.delete('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER]), deleteWorkspace);
router.post('/:id/invite', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), inviteMember);
router.patch('/:id/members/:userId', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), updateMemberRole);
router.delete('/:id/members/:userId', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), removeMember);
router.get('/:id/activity', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), getActivityFeed);

export default router;
