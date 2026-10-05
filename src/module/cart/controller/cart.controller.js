import cartModel from '../../../../DB/model/cart.model.js';
import productModel from '../../../../DB/model/product.model.js';
import userModel from '../../../../DB/model/user.model.js';
import { asyncHandler } from '../../../services/asyncHandler.js';
import { cacheDelete, cacheGet, cacheKey, cacheSet } from '../../../services/cache.service.js';

const cartPopulate = [
  {
    path: 'userId',
    select: '_id userName email',
  },
  {
    path: 'products.productId',
    select: '_id name slug images price finalPrice discount stock categoryId brandId colors sizes storeId isPublished',
  },
];

const clearCartCache = (userId) => cacheDelete(cacheKey('cart', userId));

export const createCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const productId = req.body?.productId;
  const quantity = Math.max(1, Number(req.body?.quantity) || 1);

  const product = await productModel.findOne({ _id: productId, isPublished: true }).select('_id stock').lean();
  if (!product) return res.status(404).json({ message: 'product not found' });

  let cart = await cartModel.findOne({ userId });
  if (!cart) cart = await cartModel.create({ userId, products: [] });

  const existing = cart.products.find((item) => String(item.productId) === String(productId));
  const nextQuantity = existing ? existing.quantity + quantity : quantity;
  if (Number(product.stock ?? 0) < nextQuantity) {
    return res.status(409).json({ message: 'not enough stock' });
  }

  if (existing) existing.quantity = nextQuantity;
  else cart.products.push({ productId, quantity });

  cart.markModified('products');
  await cart.save();
  await userModel.findByIdAndUpdate(userId, { cart: true, cartId: cart._id });
  await clearCartCache(userId);

  const populated = await cartModel.findById(cart._id).populate(cartPopulate).lean();
  res.status(200).json({ message: 'Cart updated', cart: populated });
});

export const getMyCart = asyncHandler(async (req, res) => {
  const key = cacheKey('cart', req.user._id);
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const cart = await cartModel.findOne({ userId: req.user._id }).populate(cartPopulate).lean();
  const payload = { message: 'cart', cart: cart ?? { products: [] } };
  await cacheSet(key, payload, 30);
  res.status(200).json(payload);
});

export const allCarts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(50, Math.max(1, Number(req.query.size) || 20));
  const [carts, total] = await Promise.all([
    cartModel.find({}).populate(cartPopulate).sort({ updatedAt: -1 }).skip((page - 1) * size).limit(size).lean(),
    cartModel.countDocuments(),
  ]);
  res.status(200).json({ message: 'All carts', carts, total, page, size, totalPages: Math.ceil(total / size) });
});

export const deleteFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const productId = req.body?.productId;
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const cart = await cartModel.findOne({ userId });
  if (!cart) {
    await userModel.findByIdAndUpdate(userId, { cart: false, cartId: null });
    return res.status(200).json({ message: 'Cart already empty', cart: { products: [] } });
  }

  cart.products = cart.products.filter((item) => String(item.productId) !== String(productId));
  await cart.save();
  await userModel.findByIdAndUpdate(userId, { cart: cart.products.length > 0, cartId: cart.products.length ? cart._id : null });
  await clearCartCache(userId);

  const populated = await cartModel.findById(cart._id).populate(cartPopulate).lean();
  res.status(200).json({ message: 'Product removed', cart: populated ?? { products: [] } });
});

export const changeQuantity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const productId = req.body?.productId;
  const quantity = Math.max(1, Number(req.body?.quantity) || 1);
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const product = await productModel.findById(productId).select('_id stock').lean();
  if (!product) return res.status(404).json({ message: 'product not found' });
  if (Number(product.stock ?? 0) < quantity) return res.status(409).json({ message: 'not enough stock' });

  const cart = await cartModel.findOne({ userId });
  if (!cart) return res.status(404).json({ message: 'cart not found' });
  const item = cart.products.find((entry) => String(entry.productId) === String(productId));
  if (!item) return res.status(404).json({ message: 'product is not in cart' });

  item.quantity = quantity;
  cart.markModified('products');
  await cart.save();
  await clearCartCache(userId);
  const populated = await cartModel.findById(cart._id).populate(cartPopulate).lean();
  res.status(200).json({ message: 'Quantity updated', cart: populated });
});
