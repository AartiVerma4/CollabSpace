import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  anchorRange: {
    type: mongoose.Schema.Types.Mixed, // e.g. { index: number, length: number }
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  replies: [{
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

commentSchema.index({ documentId: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
