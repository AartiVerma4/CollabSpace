import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const invitationSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days TTL
  }
});

invitationSchema.index({ email: 1 });

export const Invitation = mongoose.model('Invitation', invitationSchema);
