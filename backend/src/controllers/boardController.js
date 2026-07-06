import { Board } from '../models/Board.js';
import { ActivityLog } from '../models/ActivityLog.js';

export const createBoard = async (req, res, next) => {
  try {
    const { workspaceId, title } = req.body;

    if (!workspaceId || !title) {
      return res.status(400).json({ message: 'Workspace ID and Title are required' });
    }

    const board = new Board({
      workspaceId,
      title,
      authorId: req.user.userId,
      objects: [] // Init design canvas empty
    });

    await board.save();

    // Log Activity
    await new ActivityLog({
      workspaceId,
      actorId: req.user.userId,
      action: 'board_created',
      target: board.title,
      metadata: { boardId: board._id }
    }).save();

    res.status(201).json({ message: 'Design board created successfully', board });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceBoards = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId || req.params.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID query parameter is required' });
    }

    const boards = await Board.find({ workspaceId })
      .sort({ createdAt: -1 })
      .populate('authorId', 'name email avatar');

    res.status(200).json(boards);
  } catch (error) {
    next(error);
  }
};

export const getBoardDetails = async (req, res, next) => {
  try {
    const boardId = req.params.id;
    const board = await Board.findById(boardId)
      .populate('authorId', 'name email avatar');

    if (!board) {
      return res.status(404).json({ message: 'Design board not found' });
    }

    res.status(200).json(board);
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const boardId = req.params.id;
    const { title, objects } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Design board not found' });
    }

    if (title) board.title = title;
    if (objects) {
      board.objects = objects;
      board.version += 1;
    }

    await board.save();

    res.status(200).json({ message: 'Design board updated successfully', board });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const boardId = req.params.id;
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Design board not found' });
    }

    await Board.findByIdAndDelete(boardId);

    // Log Activity
    await new ActivityLog({
      workspaceId: board.workspaceId,
      actorId: req.user.userId,
      action: 'board_deleted',
      target: board.title
    }).save();

    res.status(200).json({ message: 'Design board deleted successfully' });
  } catch (error) {
    next(error);
  }
};
