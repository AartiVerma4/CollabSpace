import { Workspace } from '../models/Workspace.js';
import { Invitation } from '../models/Invitation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { User } from '../models/User.js';
import { emailService } from '../services/emailService.js';
import { ROLES } from '../config/constants.js';
import crypto from 'crypto';

export const createWorkspace = async (req, res, next) => {
  try {
    const { name, slug, description, logo } = req.body;
    const userId = req.user.userId;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Workspace name and slug are required' });
    }

    const existingWorkspace = await Workspace.findOne({ slug });
    if (existingWorkspace) {
      return res.status(400).json({ message: 'Slug already taken. Please choose another URL identifier.' });
    }

    const workspace = new Workspace({
      name,
      slug,
      description: description || '',
      logo: logo || '',
      ownerId: userId,
      members: [{ userId, role: ROLES.OWNER }]
    });

    await workspace.save();

    // Log Activity
    await new ActivityLog({
      workspaceId: workspace._id,
      actorId: userId,
      action: 'workspace_created',
      target: workspace.name
    }).save();

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceDetails = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId)
      .populate('ownerId', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.status(200).json(workspace);
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { name, description, logo } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (logo !== undefined) workspace.logo = logo;

    await workspace.save();

    // Log Activity
    await new ActivityLog({
      workspaceId: workspace._id,
      actorId: req.user.userId,
      action: 'workspace_updated',
      target: workspace.name
    }).save();

    res.status(200).json({ message: 'Workspace updated successfully', workspace });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only Owner can delete workspace
    if (workspace.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only the Workspace Owner can perform this action' });
    }

    await Workspace.findByIdAndDelete(workspaceId);

    // Cascading cleanup can delete docs, versions, comments, and messages
    // For capstone/safety, we can run them asynchronously
    res.status(200).json({ message: 'Workspace deleted successfully along with members references' });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${Object.values(ROLES).join(', ')}` });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is already a member
    const existingMember = await User.findOne({ email });
    if (existingMember) {
      const isMember = workspace.members.some(m => m.userId.toString() === existingMember._id.toString());
      if (isMember) {
        return res.status(400).json({ message: 'User is already a member of this workspace' });
      }
    }

    // Create unique token
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = new Invitation({
      workspaceId,
      email: email.toLowerCase(),
      role,
      token
    });

    await invitation.save();

    // Generate link and trigger mock email
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;
    await emailService.sendWorkspaceInviteEmail(
      email,
      req.user.name,
      workspace.name,
      inviteLink,
      role
    );

    // Log Activity
    await new ActivityLog({
      workspaceId,
      actorId: req.user.userId,
      action: 'member_invited',
      target: email,
      metadata: { role }
    }).save();

    res.status(200).json({ message: 'Invitation email dispatched successfully', token });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Invitation token is required' });
    }

    const invite = await Invitation.findOne({ token });
    if (!invite || invite.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    // Resolve or find the registered user who is accepting the invite
    // Authenticated user email should match the invite email
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Authenticated user profile not found' });
    }

    if (user.email !== invite.email) {
      return res.status(403).json({ message: `This invite was issued for ${invite.email}, but you are logged in as ${user.email}` });
    }

    const workspace = await Workspace.findById(invite.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace no longer exists' });
    }

    // Check if user already added
    const isMember = workspace.members.some(m => m.userId.toString() === user._id.toString());
    if (!isMember) {
      workspace.members.push({ userId: user._id, role: invite.role });
      await workspace.save();
    }

    // Delete token
    await Invitation.findByIdAndDelete(invite._id);

    // Log Activity
    await new ActivityLog({
      workspaceId: workspace._id,
      actorId: user._id,
      action: 'member_joined',
      target: user.name
    }).save();

    res.status(200).json({
      message: 'Invitation accepted successfully. Workspace access granted.',
      workspaceId: workspace._id
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const member = workspace.members.find(m => m.userId.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: 'User is not a member of this workspace' });
    }

    // Enforce permission checks:
    // Only Owner can promote/demote to/from Admin or Owner
    // Admin can only manage Editor/Commenter/Viewer roles
    const requestorRole = req.userWorkspaceRole;
    if (requestorRole === ROLES.ADMIN && (role === ROLES.ADMIN || role === ROLES.OWNER || member.role === ROLES.ADMIN || member.role === ROLES.OWNER)) {
      return res.status(403).json({ message: 'Admins cannot elevate members to Admin or modify Admin/Owner roles' });
    }

    const oldRole = member.role;
    member.role = role;
    await workspace.save();

    // Log Activity
    const userDetail = await User.findById(userId);
    await new ActivityLog({
      workspaceId: workspace._id,
      actorId: req.user.userId,
      action: 'role_changed',
      target: userDetail ? userDetail.name : userId,
      metadata: { oldRole, newRole: role }
    }).save();

    res.status(200).json({ message: 'Member role updated successfully', workspace });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Owner cannot be removed from workspace
    if (workspace.ownerId.toString() === userId) {
      return res.status(400).json({ message: 'The workspace owner cannot be removed' });
    }

    // Enforce permissions: Admin cannot remove Admin/Owner
    const requestorRole = req.userWorkspaceRole;
    const targetMember = workspace.members.find(m => m.userId.toString() === userId);
    
    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in workspace' });
    }

    if (requestorRole === ROLES.ADMIN && (targetMember.role === ROLES.ADMIN || targetMember.role === ROLES.OWNER)) {
      return res.status(403).json({ message: 'Admins cannot remove other Admins or the Owner' });
    }

    workspace.members = workspace.members.filter(m => m.userId.toString() !== userId);
    await workspace.save();

    // Log Activity
    const userDetail = await User.findById(userId);
    await new ActivityLog({
      workspaceId: workspace._id,
      actorId: req.user.userId,
      action: 'member_removed',
      target: userDetail ? userDetail.name : userId
    }).save();

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

export const getActivityFeed = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const logs = await ActivityLog.find({ workspaceId })
      .sort({ createdAt: -1 })
      .populate('actorId', 'name email avatar');

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const listUserWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ]
    }).populate('ownerId', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    res.status(200).json(workspaces);
  } catch (error) {
    next(error);
  }
};
