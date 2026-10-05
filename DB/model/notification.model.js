import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'system', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityId: { type: mongoose.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const notificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default notificationModel;
