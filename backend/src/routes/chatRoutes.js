import express from 'express';
import { postMessage, getMessages, getNotifications, markNotificationRead } from '../controllers/chatController.js';
import { authenticateJWT, requireWorkspaceRole } from '../middlewares/auth.js';

const router = express.Router();

// Messaging endpoints
router.post('/messages', authenticateJWT, requireWorkspaceRole([]), postMessage);
router.get('/messages', authenticateJWT, requireWorkspaceRole([]), getMessages);

// User notification endpoints
router.get('/notifications', authenticateJWT, getNotifications);
router.patch('/notifications/:id', authenticateJWT, markNotificationRead);

export default router;
