import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const reviewModel = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default reviewModel;
