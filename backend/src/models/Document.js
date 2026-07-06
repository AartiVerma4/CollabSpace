import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: { ops: [] } // Quill delta format
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  folder: {
    type: String,
    default: '',
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  },

  // ── Sharing fields ───────────────────────────────────────────────
  shareToken: {
    type: String,
    default: null,
    index: true            // Fast lookup by token
  },
  sharePermission: {
    type: String,
    enum: ['Viewer', 'Commenter', 'Editor'],
    default: 'Viewer'
  },
  shareIsActive: {
    type: Boolean,
    default: false         // false until a link is generated
  },
  shareExpiresAt: {
    type: Date,
    default: null          // null = never expires
  },
  shareCreatedAt: {
    type: Date,
    default: null
  }
});

// Indexes for query optimisation
documentSchema.index({ workspaceId: 1, isDeleted: 1 });

export const Document = mongoose.model('Document', documentSchema);
