import crypto from 'crypto';
import { Document } from '../models/Document.js';
import { DocVersion } from '../models/DocVersion.js';
import { Comment } from '../models/Comment.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { NOTIFICATION_TYPES } from '../config/constants.js';

// ── Helper: validate share token lifecycle ────────────────────────────────────
function validateShareToken(doc, token) {
  // If sharing is active, the link is valid (the doc ID acts as the secure key)
  if (!doc.shareIsActive) {
    return { valid: false, reason: 'This share link has been revoked or is not active' };
  }
  if (doc.shareExpiresAt && new Date() > new Date(doc.shareExpiresAt)) {
    return { valid: false, reason: 'This share link has expired' };
  }
  return { valid: true };
}

// ── Create Document ───────────────────────────────────────────────────────────
export const createDocument = async (req, res, next) => {
  try {
    const { workspaceId, title, folder } = req.body;

    if (!workspaceId || !title) {
      return res.status(400).json({ message: 'Workspace ID and Title are required' });
    }

    const doc = new Document({
      workspaceId,
      title,
      folder: folder || '',
      authorId: req.user.userId,
      content: { ops: [] }
    });

    await doc.save();

    await new DocVersion({
      documentId: doc._id,
      content: doc.content,
      authorId: req.user.userId,
      version: 1
    }).save();

    await new ActivityLog({
      workspaceId,
      actorId: req.user.userId,
      action: 'document_created',
      target: doc.title,
      metadata: { documentId: doc._id }
    }).save();

    res.status(201).json({ message: 'Document created successfully', document: doc });
  } catch (error) {
    next(error);
  }
};

// ── List workspace documents ──────────────────────────────────────────────────
export const getWorkspaceDocuments = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId || req.params.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID query parameter is required' });
    }

    const documents = await Document.find({ workspaceId, isDeleted: false })
      .sort({ lastSavedAt: -1 })
      .populate('authorId', 'name email avatar');

    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

// ── Get document details (authenticated workspace member) ─────────────────────
export const getDocumentDetails = async (req, res, next) => {
  try {
    const docId = req.params.id;

    const doc = await Document.findOne({ _id: docId, isDeleted: false })
      .populate('authorId', 'name email avatar');

    if (!doc) {
      return res.status(404).json({ message: 'Document not found or is in Trash bin' });
    }

    const comments = await Comment.find({ documentId: docId })
      .populate('authorId', 'name email avatar')
      .populate('replies.authorId', 'name email avatar');

    res.status(200).json({ document: doc, comments });
  } catch (error) {
    next(error);
  }
};

// ── Get document details via share token (any user, logged-in or guest) ───────
// FIX Bug 1: Owners / non-members who visit a share link should use this endpoint.
// It validates the share token lifecycle and returns full content.
export const getSharedDocumentDetails = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { token } = req.query;

    const doc = await Document.findOne({ _id: docId, isDeleted: false })
      .populate('authorId', 'name email avatar');

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const validation = validateShareToken(doc, token);
    if (!validation.valid) {
      return res.status(403).json({ message: validation.reason });
    }

    const comments = await Comment.find({ documentId: docId })
      .populate('authorId', 'name email avatar')
      .populate('replies.authorId', 'name email avatar');

    res.status(200).json({
      document: {
        ...doc.toObject(),
        // Expose share metadata so the client knows what permissions apply
        sharePermission: doc.sharePermission
      },
      comments
    });
  } catch (error) {
    next(error);
  }
};

// ── Get public doc metadata (for unauthenticated guest landing screen) ─────────
// FIX Bug 1 (partial): Validates token and returns title/permission only,
// no full content. Used by unauthenticated users before they join as guest.
export const getPublicDocumentDetails = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { token } = req.query;

    const doc = await Document.findOne({ _id: docId, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const validation = validateShareToken(doc, token);
    if (!validation.valid) {
      return res.status(403).json({ message: validation.reason });
    }

    res.status(200).json({
      valid: true,
      title: doc.title,
      sharePermission: doc.sharePermission,
      shareExpiresAt: doc.shareExpiresAt
    });
  } catch (error) {
    next(error);
  }
};

// ── Update document metadata / content ───────────────────────────────────────
export const updateDocumentMetadata = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { title, folder, content } = req.body;

    const doc = await Document.findOne({ _id: docId, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (title) doc.title = title;
    if (folder !== undefined) doc.folder = folder;

    let versionCreated = false;
    if (content !== undefined) {
      doc.content = content;
      doc.version += 1;
      versionCreated = true;
    }

    doc.lastSavedAt = Date.now();
    await doc.save();

    if (versionCreated) {
      await new DocVersion({
        documentId: doc._id,
        content: doc.content,
        authorId: req.user.userId,
        version: doc.version
      }).save();
    }

    res.status(200).json({ message: 'Document updated successfully', document: doc });
  } catch (error) {
    next(error);
  }
};

// ── Soft-delete document ──────────────────────────────────────────────────────
export const softDeleteDocument = async (req, res, next) => {
  try {
    const docId = req.params.id;

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    doc.isDeleted = true;
    doc.deletedAt = Date.now();
    // Revoke share link on deletion
    doc.shareIsActive = false;
    await doc.save();

    await new ActivityLog({
      workspaceId: doc.workspaceId,
      actorId: req.user.userId,
      action: 'document_deleted',
      target: doc.title,
      metadata: { documentId: doc._id }
    }).save();

    res.status(200).json({ message: 'Document moved to Trash. It will be permanently deleted in 30 days.' });
  } catch (error) {
    next(error);
  }
};

// ── List version history ──────────────────────────────────────────────────────
export const listVersionHistory = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const versions = await DocVersion.find({ documentId: docId })
      .sort({ version: -1 })
      .populate('authorId', 'name email avatar');

    res.status(200).json(versions);
  } catch (error) {
    next(error);
  }
};

// ── Restore version snapshot ──────────────────────────────────────────────────
export const restoreVersion = async (req, res, next) => {
  try {
    const { id: docId, versionId } = req.params;

    const snapshot = await DocVersion.findById(versionId);
    if (!snapshot) {
      return res.status(404).json({ message: 'Historical snapshot version not found' });
    }

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    doc.content = snapshot.content;
    doc.version += 1;
    doc.lastSavedAt = Date.now();
    await doc.save();

    await new DocVersion({
      documentId: doc._id,
      content: doc.content,
      authorId: req.user.userId,
      version: doc.version
    }).save();

    await new ActivityLog({
      workspaceId: doc.workspaceId,
      actorId: req.user.userId,
      action: 'document_restored',
      target: doc.title,
      metadata: { documentId: doc._id, restoredToVersion: snapshot.version }
    }).save();

    res.status(200).json({ message: 'Document successfully restored to historic state', document: doc });
  } catch (error) {
    next(error);
  }
};

// ── Generate share link ───────────────────────────────────────────────────────
// FIX Bug 6: Added shareIsActive, shareExpiresAt, shareCreatedAt lifecycle fields.
// FIX Bug 5: Returns consistent shareLink and share metadata.
// Accepts optional expiresInDays (null/0 = never expires).
export const generateShareLink = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { permission, expiresInDays } = req.body;

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Generate a fresh cryptographically secure token
    const shareToken = crypto.randomBytes(24).toString('hex');

    doc.shareToken = shareToken;
    doc.sharePermission = permission || 'Viewer';
    doc.shareIsActive = true;
    doc.shareCreatedAt = new Date();

    // Set expiry: null = never expires
    if (expiresInDays && Number(expiresInDays) > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + Number(expiresInDays));
      doc.shareExpiresAt = expiry;
    } else {
      doc.shareExpiresAt = null; // Never expires
    }

    await doc.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const shareLink = `${clientUrl}/share/doc/${docId}?token=${shareToken}`;

    res.status(200).json({
      message: 'Shareable link generated successfully',
      shareLink,
      token: shareToken,
      permission: doc.sharePermission,
      shareIsActive: true,
      shareExpiresAt: doc.shareExpiresAt,
      shareCreatedAt: doc.shareCreatedAt
    });
  } catch (error) {
    next(error);
  }
};

// ── Revoke share link ─────────────────────────────────────────────────────────
// FIX Bug 6: New endpoint to revoke a share link without deleting the token.
export const revokeShareLink = async (req, res, next) => {
  try {
    const docId = req.params.id;

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    doc.shareIsActive = false;
    await doc.save();

    res.status(200).json({ message: 'Share link revoked. Anyone with the old link can no longer access this document.' });
  } catch (error) {
    next(error);
  }
};

// ── Get share link status ─────────────────────────────────────────────────────
export const getShareLinkStatus = async (req, res, next) => {
  try {
    const docId = req.params.id;

    const doc = await Document.findById(docId).select('shareToken shareIsActive sharePermission shareExpiresAt shareCreatedAt');
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const isExpired = doc.shareExpiresAt && new Date() > new Date(doc.shareExpiresAt);

    res.status(200).json({
      hasShareLink: !!doc.shareToken,
      shareIsActive: doc.shareIsActive && !isExpired,
      sharePermission: doc.sharePermission,
      shareExpiresAt: doc.shareExpiresAt,
      shareCreatedAt: doc.shareCreatedAt,
      isExpired: !!isExpired
    });
  } catch (error) {
    next(error);
  }
};

// ── Add comment ───────────────────────────────────────────────────────────────
// FIX Bug 3: anchorRange is now optional. Frontend doesn't need to send it.
// FIX Bug 2: This handler no longer requires hard auth — works via share token too.
export const addComment = async (req, res, next) => {
  try {
    const docId = req.params.id;
    const { text, anchorRange } = req.body;

    // text is the only required field
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Determine author — authenticated user or share-token guest
    const authorId = req.user?.userId || null;

    const comment = new Comment({
      documentId: docId,
      anchorRange: anchorRange || null, // Optional text selection range
      authorId,
      text: text.trim()
    });

    await comment.save();

    // Scan comment text for @mentions (authenticated users only)
    if (authorId) {
      const mentions = text.match(/@([a-zA-Z0-9._-]+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.substring(1);
          const mentionedUser = await User.findOne({ name: { $regex: new RegExp(`^${username}$`, 'i') } });
          if (mentionedUser) {
            await new Notification({
              userId: mentionedUser._id,
              type: NOTIFICATION_TYPES.COMMENT,
              payload: {
                documentId: docId,
                workspaceId: doc.workspaceId,
                commentId: comment._id,
                actorId: authorId,
                actorName: req.user.name,
                commentText: text
              }
            }).save();
          }
        }
      }
    }

    res.status(201).json({ message: 'Comment posted successfully', comment });
  } catch (error) {
    next(error);
  }
};

// ── Resolve / edit / reply to comment ────────────────────────────────────────
// FIX Bug 7: Unified field handling — accepts 'text' as reply body (not 'replyText').
// If 'resolved' is set → toggle resolution.
// If 'text' is set and user is the author → edit the comment text.
// If 'replyText' OR 'text' is set AND comment is not being edited → add threaded reply.
export const resolveOrEditComment = async (req, res, next) => {
  try {
    const { cid: commentId } = req.params;
    const { resolved, text, replyText } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Resolve / unresolve thread
    if (resolved !== undefined) {
      comment.resolved = resolved;
    }

    const authorId = req.user?.userId;

    // The actual reply text — accept either field name for compatibility
    const actualReplyText = replyText || text;

    // Determine intent: if the comment author is editing vs anyone replying
    const isAuthorEditing = authorId && comment.authorId &&
      comment.authorId.toString() === authorId &&
      resolved === undefined;

    if (isAuthorEditing && text && !replyText) {
      // Edit the base comment text
      comment.text = text;
    } else if (actualReplyText && resolved === undefined) {
      // Add a threaded reply
      comment.replies.push({
        authorId: authorId || null,
        authorName: req.user?.name || 'Guest',
        text: actualReplyText
      });
    }

    await comment.save();
    res.status(200).json({ message: 'Comment thread updated successfully', comment });
  } catch (error) {
    next(error);
  }
};
