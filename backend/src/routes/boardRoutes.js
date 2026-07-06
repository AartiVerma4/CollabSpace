import express from 'express';
import {
  createBoard,
  getWorkspaceBoards,
  getBoardDetails,
  updateBoard,
  deleteBoard
} from '../controllers/boardController.js';
import { authenticateJWT, requireWorkspaceRole } from '../middlewares/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.post('/', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), createBoard);
router.get('/', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER, ROLES.VIEWER]), getWorkspaceBoards);
router.get('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.COMMENTER, ROLES.VIEWER]), getBoardDetails);
router.patch('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR]), updateBoard);
router.delete('/:id', authenticateJWT, requireWorkspaceRole([ROLES.OWNER, ROLES.ADMIN]), deleteBoard);

export default router;
