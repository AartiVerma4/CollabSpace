import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { NOTIFICATION_TYPES } from '../config/constants.js';

export const postMessage = async (req, res, next) => {
  try {
    const { workspaceId, channelId, text, attachments } = req.body;

    if (!workspaceId || !channelId || !text) {
      return res.status(400).json({ message: 'Workspace ID, Channel ID, and Message text are required' });
    }

    const message = new Message({
      workspaceId,
      channelId,
      authorId: req.user.userId,
      text,
      attachments: attachments || []
    });

    await message.save();

    // Check for @mentions
    const mentions = text.match(/@([a-zA-Z0-9._-]+)/g);
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.substring(1); // strip '@'
        const mentionedUser = await User.findOne({ name: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (mentionedUser && mentionedUser._id.toString() !== req.user.userId) {
          // Log Notification
          await new Notification({
            userId: mentionedUser._id,
            type: NOTIFICATION_TYPES.MENTION,
            payload: {
              workspaceId,
              channelId,
              messageId: message._id,
              actorId: req.user.userId,
              actorName: req.user.name,
              messageText: text
            }
          }).save();
        }
      }
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('authorId', 'name email avatar');

    res.status(201).json(populatedMessage);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { workspaceId, channelId } = req.query;

    if (!workspaceId || !channelId) {
      return res.status(400).json({ message: 'Workspace ID and Channel ID query parameters are required' });
    }

    // Paginate or limit to last 100 messages for speed
    const messages = await Message.find({ workspaceId, channelId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('authorId', 'name email avatar');

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (id === 'all') {
      await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
      return res.status(200).json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
};
