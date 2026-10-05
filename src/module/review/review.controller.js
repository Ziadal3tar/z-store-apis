import reviewModel from '../../../DB/model/review.model.js';
import orderModel from '../../../DB/model/order.model.js';
import productModel from '../../../DB/model/product.model.js';
import { asyncHandler } from '../../services/asyncHandler.js';

const refreshProductRating = async (productId) => {
  const stats = await reviewModel.aggregate([
    { $match: { productId } },
    { $group: { _id: '$productId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const average = Number((stats[0]?.average ?? 0).toFixed(1));
  const count = Number(stats[0]?.count ?? 0);
  await productModel.findByIdAndUpdate(productId, { ratingAverage: average, ratingCount: count });
};

export const listProductReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const filter = { productId: req.params.productId };
  const [reviews, total] = await Promise.all([
    reviewModel.find(filter).populate({ path: 'userId', select: '_id userName profilePic' }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    reviewModel.countDocuments(filter),
  ]);
  const stats = await reviewModel.aggregate([{ $match: filter }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  res.status(200).json({ reviews, average: Number((stats[0]?.average ?? 0).toFixed(1)), total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment } = req.body ?? {};
  const normalizedRating = Number(rating);
  if (!productId || !orderId || normalizedRating < 1 || normalizedRating > 5 || !String(comment ?? '').trim()) {
    return res.status(400).json({ message: 'productId, orderId, rating and comment are required' });
  }

  const order = await orderModel.findOne({ _id: orderId, userId: req.user._id, status: 'delivered' }).lean();
  if (!order || !order.items.some((item) => String(item.productId) === String(productId))) {
    return res.status(403).json({ message: 'You can only review products from delivered orders' });
  }

  const exists = await reviewModel.findOne({ productId, userId: req.user._id });
  if (exists) return res.status(409).json({ message: 'You already reviewed this product' });

  const review = await reviewModel.create({ productId, userId: req.user._id, orderId, rating: normalizedRating, comment: String(comment).trim() });
  await refreshProductRating(productId);
  res.status(201).json({ message: 'Review created', review });
});

export const markHelpful = asyncHandler(async (req, res) => {
  const review = await reviewModel.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true }).lean();
  if (!review) return res.status(404).json({ message: 'Review not found' });
  res.status(200).json({ review });
});
