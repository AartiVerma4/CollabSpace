import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  channelId: {
    type: String, // channel name or unique room identifier for DMs
    required: true,
    trim: true
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
  attachments: {
    type: [String],
    default: [] // Array of attachment file URLs
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ workspaceId: 1, channelId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
