import notificationModel from '../../../DB/model/notification.model.js';
import { asyncHandler } from '../../services/asyncHandler.js';

export const createNotification = async ({ userId, type, title, message, entityId }) =>
  notificationModel.create({ userId, type, title, message, entityId }).catch(() => null);

export const listMine = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const notifications = await notificationModel
    .find({ userId: req.user._id })
    .select('_id type title message entityId isRead createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const unread = await notificationModel.countDocuments({ userId: req.user._id, isRead: false });
  res.status(200).json({ notifications, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const updated = await notificationModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true },
  ).lean();
  if (!updated) return res.status(404).json({ message: 'Notification not found' });
  res.status(200).json({ notification: updated });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationModel.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.status(200).json({ message: 'All notifications marked as read' });
});
