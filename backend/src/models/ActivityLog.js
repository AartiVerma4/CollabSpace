import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String, // e.g. 'document_created', 'member_joined', 'role_changed', 'board_created'
    required: true
  },
  target: {
    type: String, // name/title of document, board, or workspace
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // additional audit metrics
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

activityLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
