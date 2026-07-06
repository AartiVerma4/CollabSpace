import express from 'express';
import { register, login, googleOAuth, googleOAuthCallback, refresh, logout, forgotPassword, resetPassword, guestLogin } from '../controllers/authController.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', authRateLimiter, login);
router.post('/guest-login', guestLogin);

// Client-side Google OAuth (frontend sends googleId/email/name after verifying on client)
router.post('/google', googleOAuth);

// Server-side Google OAuth callback (Google redirects here after consent screen)
// Used when doing full server-side OAuth flow with passport.js or manual code exchange
router.get('/google/callback', googleOAuthCallback);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
