import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../middlewares/auth.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';

// Temporary store for forgot password reset tokens (for demo/simplicity, you could also add these fields to User model)
// key: token -> value: { userId, expiresAt }
const resetTokens = new Map();

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new User({ name, email, passwordHash: password });
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Mock verification link
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, user.name, verificationLink);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'Registration successful. Verification email sent.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log login audit details
    console.log(`User logged in: ${user.email} from IP: ${req.ip} at ${new Date().toISOString()}`);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleOAuth = async (req, res, next) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ message: 'Google authentication details are incomplete' });
    }

    let user = await User.findOne({ email });

    if (user) {
      // Link Google account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Auto-register
      user = new User({
        name,
        email,
        googleId,
        avatar: avatar || ''
      });
      await user.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Google login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * googleOAuthCallback — GET /api/auth/google/callback
 *
 * This is the endpoint that Google redirects to after the user approves
 * the OAuth consent screen. Google appends a "code" query parameter.
 *
 * Flow:
 *   1. Receive ?code=... from Google
 *   2. Exchange code for user profile using Google Token endpoint
 *   3. Find or auto-register user in MongoDB
 *   4. Issue JWT access + refresh tokens
 *   5. Set refresh token in httpOnly cookie
 *   6. Redirect user to frontend /dashboard?token=<accessToken>
 *      so the React app can read and store it in localStorage/state.
 *
 * NOTE: This requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be set in .env.
 */
export const googleOAuthCallback = async (req, res, next) => {
  try {
    const { code, error: oauthError } = req.query;

    // If user denied access on Google's consent screen
    if (oauthError) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=google_auth_denied`);
    }

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is missing from Google callback' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`;

    // Step 1: Exchange authorization code for tokens from Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Google token exchange error:', tokenData.error_description);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=google_token_failed`);
    }

    // Step 2: Use the Google access token to fetch user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile = await profileResponse.json();

    if (!profile.id || !profile.email) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}/login?error=google_profile_failed`);
    }

    // Step 3: Find existing user or auto-register
    let user = await User.findOne({ email: profile.email });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = profile.id;
        if (profile.picture && !user.avatar) user.avatar = profile.picture;
        await user.save();
      }
    } else {
      // Auto-register new user from Google profile
      user = new User({
        name: profile.name,
        email: profile.email,
        googleId: profile.id,
        avatar: profile.picture || ''
      });
      await user.save();
    }

    // Step 4: Issue JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Step 5: Set refresh token as httpOnly cookie (secure session)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`Google OAuth login: ${user.email} at ${new Date().toISOString()}`);

    // Step 6: Redirect to frontend dashboard with accessToken as query param
    // The React app reads this token, stores it in state/localStorage, then removes it from URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/dashboard?token=${accessToken}`);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't disclose if email exists. Still return success.
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate 1-hour token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000;
    resetTokens.set(token, { userId: user._id, expiresAt });

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(user.email, user.name, resetLink);

    res.status(200).json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const tokenData = resetTokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash password automatically triggers in pre-save hook
    user.passwordHash = newPassword;
    await user.save();

    // Invalidate reset token
    resetTokens.delete(token);

    res.status(200).json({ message: 'Password has been reset successfully. Please login with your new credentials.' });
  } catch (error) {
    next(error);
  }
};

export const guestLogin = async (req, res, next) => {
  try {
    let { name, email } = req.body;

    // Default values if skipped or empty
    if (!name || !name.trim()) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      name = `Guest ${rand}`;
    }
    if (!email || !email.trim()) {
      const randStr = crypto.randomBytes(4).toString('hex');
      email = `guest_${randStr}@collabspace-guest.com`;
    }

    // Try finding if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-register new guest user with a dummy googleId
      user = new User({
        name,
        email,
        googleId: `guest_${crypto.randomBytes(8).toString('hex')}`
      });
      await user.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      message: 'Guest login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};
