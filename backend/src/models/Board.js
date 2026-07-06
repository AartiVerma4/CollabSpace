import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
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
  objects: {
    type: [mongoose.Schema.Types.Mixed],
    default: [] // Array of canvas objects (shapes, text, drawings)
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

boardSchema.index({ workspaceId: 1 });

export const Board = mongoose.model('Board', boardSchema);
