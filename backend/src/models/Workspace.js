import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const workspaceSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 50,
    match: [/^[a-z0-9-_]+$/, 'Slug must be alphanumeric, dashes, or underscores']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.VIEWER
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Workspace = mongoose.model('Workspace', workspaceSchema);
