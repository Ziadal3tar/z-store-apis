import crypto from 'crypto';
import cartModel from '../../../DB/model/cart.model.js';
import couponModel from '../../../DB/model/coupon.model.js';
import orderModel from '../../../DB/model/order.model.js';
import productModel from '../../../DB/model/product.model.js';
import userModel from '../../../DB/model/user.model.js';
import { asyncHandler } from '../../services/asyncHandler.js';
import { createNotification } from '../notification/notification.controller.js';
import { cacheDelete, cacheGet, cacheIncrement, cacheKey, cacheSet } from '../../services/cache.service.js';

const ORDER_SELECT = '_id orderNumber storeId userId items address subtotal discount shipping total coupon status payment loyaltyAwarded createdAt updatedAt';

const orderNumber = () => `ZS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const normalizeAddress = (address = {}) => ({
  firstName: String(address.firstName ?? '').trim(),
  lastName: String(address.lastName ?? '').trim(),
  phone: String(address.phone ?? '').trim(),
  country: String(address.country ?? 'Egypt').trim(),
  city: String(address.city ?? '').trim(),
  postalCode: String(address.postalCode ?? '').trim(),
  street: String(address.street ?? '').trim(),
  building: String(address.building ?? '').trim(),
  apartment: String(address.apartment ?? '').trim(),
  note: String(address.note ?? '').trim(),
});

const resolveCoupon = async (code) => {
  if (!code) return null;
  const coupon = await couponModel.findOne({
    name: String(code).trim(),
    isStopped: false,
    expireIn: { $gt: new Date() },
  }).lean();
  return coupon;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clearOrderCache = async (userId, orderId = null, storeId = null) => {
  await cacheDelete(cacheKey("orders", userId, "page", 1, "limit", 10, "all", "all"));
  if (orderId) await cacheDelete(cacheKey("order", orderId, userId));
  if (storeId) {
    await Promise.all([
      cacheDelete(cacheKey("store-analytics", storeId)),
      cacheIncrement(cacheKey('store-orders-version', storeId)),
    ]);
  }
  await cacheDelete(cacheKey('admin-summary'));
};

export const createOrder = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.body?.address);
  if (!address.firstName || !address.lastName || !address.phone || !address.city || !address.street) {
    return res.status(400).json({ message: 'Complete delivery details are required' });
  }

  const paymentMethod = req.body?.paymentMethod === 'card' ? 'card' : 'cash-on-delivery';
  if (paymentMethod === 'card') {
    return res.status(501).json({ message: 'Card payment provider is not configured yet' });
  }

  const shippingMethod = req.body?.shippingMethod === 'express' ? 'express' : 'standard';
  const cart = await cartModel.findOne({ userId: req.user._id }).lean();
  if (!cart?.products?.length) return res.status(400).json({ message: 'Your cart is empty' });

  const productIds = cart.products.map((item) => item.productId).filter(Boolean);
  const products = await productModel.find({ _id: { $in: productIds }, isPublished: true })
    .select('_id name price finalPrice stock sku storeId soldItems')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const items = [];
  const stockUpdates = [];
  for (const cartItem of cart.products) {
    const product = byId.get(String(cartItem.productId));
    const quantity = Math.max(1, Number(cartItem.quantity) || 1);
    if (!product) return res.status(409).json({ message: 'A product in your cart is no longer available' });
    if (Number(product.stock ?? 0) < quantity) {
      return res.status(409).json({ message: `Not enough stock for ${product.name}` });
    }
    const unitPrice = Number(product.finalPrice ?? product.price ?? 0);
    items.push({ productId: product._id, title: product.name, price: unitPrice, quantity, sku: product.sku, storeId: product.storeId });
    stockUpdates.push({ productId: product._id, quantity });
  }

  const subtotal = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const coupon = await resolveCoupon(req.body?.coupon);
  const discount = coupon ? Number((subtotal * (Number(coupon.amount) / 100)).toFixed(2)) : 0;
  const shipping = shippingMethod === 'express' ? 120 : subtotal >= 1500 ? 0 : 60;
  const total = Number(Math.max(0, subtotal - discount + shipping).toFixed(2));

  const updatedProducts = [];
  for (const update of stockUpdates) {
    const updated = await productModel.findOneAndUpdate(
      { _id: update.productId, stock: { $gte: update.quantity } },
      { $inc: { stock: -update.quantity, soldItems: update.quantity } },
      { new: true },
    ).lean();
    if (!updated) {
      await Promise.all(updatedProducts.map((item) => productModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity, soldItems: -item.quantity } })));
      return res.status(409).json({ message: 'Stock changed while placing the order. Please try again.' });
    }
    updatedProducts.push(update);
  }

  const uniqueStoreIds = [...new Set(items.map((item) => String(item.storeId ?? '')).filter(Boolean))];
  const order = await orderModel.create({
    orderNumber: orderNumber(),
    storeId: uniqueStoreIds.length === 1 ? uniqueStoreIds[0] : undefined,
    userId: req.user._id,
    items,
    address,
    subtotal,
    discount,
    shipping,
    total,
    coupon: coupon?.name,
    status: 'pending',
    payment: { method: paymentMethod, status: 'pending' },
  });

  await cartModel.findByIdAndUpdate(cart._id, { $set: { products: [] } });
  await userModel.findByIdAndUpdate(req.user._id, { $set: { cart: false, cartId: null } });
  await clearOrderCache(req.user._id, null, uniqueStoreIds.length === 1 ? uniqueStoreIds[0] : null);

  await createNotification({
    userId: req.user._id,
    type: 'order-created',
    title: 'Order placed',
    message: `Order ${order.orderNumber} has been placed successfully.`,
    entityId: order._id,
  });

  const populated = await orderModel.findById(order._id).select(ORDER_SELECT).lean();
  res.status(201).json({ message: 'Order created', order: populated });
});

export const myOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));
  const search = String(req.query.search ?? '').trim();
  const status = String(req.query.status ?? '').trim().toLowerCase();
  const cacheable = page === 1 && limit === 10;
  const key = cacheKey("orders", req.user._id, "page", page, "limit", limit, search || "all", status || "all");

  if (cacheable) {
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json(cached);
  }

  const condition = { userId: req.user._id };
  if (status) {
    const allowed = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (allowed.includes(status)) condition.status = status;
  }
  if (search) condition.orderNumber = { $regex: new RegExp(escapeRegex(search), 'i') };

  const [orders, total] = await Promise.all([
    orderModel.find(condition).select(ORDER_SELECT).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    orderModel.countDocuments(condition),
  ]);
  const payload = { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  if (cacheable) await cacheSet(key, payload, 15);
  res.status(200).json(payload);
});

export const getOrder = asyncHandler(async (req, res) => {
  const key = cacheKey("order", req.params.id, req.user._id);
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const order = await orderModel.findOne({ _id: req.params.id, userId: req.user._id }).select(ORDER_SELECT).lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const payload = { order };
  await cacheSet(key, payload, 15);
  res.status(200).json(payload);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['pending', 'confirmed'].includes(order.status)) return res.status(409).json({ message: 'This order cannot be cancelled now' });

  for (const item of order.items) {
    await productModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity, soldItems: -item.quantity } });
  }

  order.status = 'cancelled';
  await order.save();
  await clearOrderCache(req.user._id, order._id, order.storeId);
  await createNotification({ userId: req.user._id, type: 'order-cancelled', title: 'Order cancelled', message: `Order ${order.orderNumber} was cancelled.`, entityId: order._id });
  res.status(200).json({ message: 'Order cancelled', order: order.toObject() });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const nextStatus = String(req.body?.status ?? '').toLowerCase();
  const allowed = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!allowed.includes(nextStatus)) return res.status(400).json({ message: 'Invalid order status' });

  const order = await orderModel.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = nextStatus;
  if (nextStatus === 'paid') {
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
  }
  if (nextStatus === 'delivered' && !order.loyaltyAwarded) {
    const points = Math.floor(Number(order.total || 0) / 100);
    if (points > 0) await userModel.findByIdAndUpdate(order.userId, { $inc: { loyaltyPoints: points } });
    order.loyaltyAwarded = true;
  }
  await order.save();
  await clearOrderCache(order.userId, order._id, order.storeId);

  await createNotification({ userId: order.userId, type: `order-${nextStatus}`, title: `Order ${nextStatus}`, message: `Order ${order.orderNumber} is now ${nextStatus}.`, entityId: order._id });
  res.status(200).json({ message: 'Order updated', order: order.toObject() });
});


export const adminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 12));
  const search = String(req.query?.search || '').trim();
  const status = String(req.query?.status || '').trim();

  const condition = {};
  if (status) condition.status = status;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    const matchingCustomers = await userModel
      .find({ $or: [{ userName: regex }, { email: regex }, { phone: regex }] })
      .select('_id')
      .lean();

    const customerIds = matchingCustomers.map((customer) => customer._id);

    condition.$or = [
      { orderNumber: regex },
      ...(customerIds.length ? [{ userId: { $in: customerIds } }] : []),
    ];
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    orderModel
      .find(condition)
      .select('_id orderNumber userId items total subtotal discount shipping status payment createdAt updatedAt')
      .populate({ path: 'userId', select: '_id userName email phone', options: { lean: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    orderModel.countDocuments(condition),
  ]);

  res.status(200).json({
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});


export const adminSummary = asyncHandler(async (req, res) => {
  const forceRefresh = String(req.query?.refresh ?? '') === '1';
  const summaryCacheKey = cacheKey('admin-summary');

  if (!forceRefresh) {
    const cached = await cacheGet(summaryCacheKey);
    if (cached) return res.status(200).json(cached);
  }

  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [
    customers,
    products,
    orders,
    revenue,
    statusBreakdown,
    recentOrders,
    topProducts,
    abandonedCarts,
    averageOrder,
    newCustomers,
    lowStockProducts,
    activeCoupons,
    salesByDay,
    topCategories,
  ] = await Promise.all([
    userModel.countDocuments({ role: { $ne: 'Admin' } }),
    productModel.countDocuments({ isPublished: true }),
    orderModel.countDocuments(),
    orderModel.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, value: { $sum: '$total' } } },
    ]),
    orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    orderModel
      .find()
      .select('_id orderNumber userId total status createdAt')
      .sort({ createdAt: -1 })
      .limit(7)
      .populate({ path: 'userId', select: '_id userName email', options: { lean: true } })
      .lean(),
    productModel
      .find({ isPublished: true })
      .select('_id name finalPrice ratingAverage soldItems images stock categoryId')
      .sort({ soldItems: -1, ratingAverage: -1 })
      .limit(6)
      .slice('images', 1)
      .lean(),
    cartModel.countDocuments({
      'products.0': { $exists: true },
      updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    orderModel.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, value: { $avg: '$total' } } },
    ]),
    userModel.countDocuments({ role: { $ne: 'Admin' }, createdAt: { $gte: since } }),
    productModel.countDocuments({ isPublished: true, stock: { $lte: 5 } }),
    couponModel.countDocuments({ isStopped: false, expireIn: { $gt: new Date() } }),
    orderModel.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled', 'refunded'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    productModel.aggregate([
      { $match: { isPublished: true, soldItems: { $gt: 0 } } },
      { $group: { _id: '$categoryId', sold: { $sum: '$soldItems' }, revenue: { $sum: { $multiply: ['$finalPrice', '$soldItems'] } } } },
      { $sort: { sold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: '$category.name', sold: 1, revenue: 1 } },
    ]),
  ]);

  const dayMap = new Map((salesByDay ?? []).map((item) => [item._id, item]));
  const sales = [];
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const item = dayMap.get(key);
    sales.push({
      date: key,
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      revenue: Number(item?.revenue ?? 0),
      orders: Number(item?.orders ?? 0),
    });
  }

  const payload = {
    summary: {
      customers,
      products,
      orders,
      revenue: Number(revenue[0]?.value ?? 0),
      abandonedCarts,
      averageOrderValue: Number(averageOrder[0]?.value ?? 0),
      newCustomers,
      lowStockProducts,
      activeCoupons,
    },
    statusBreakdown,
    recentOrders,
    topProducts,
    salesByDay: sales,
    topCategories: topCategories ?? [],
  };

  await cacheSet(summaryCacheKey, payload, 30);
  res.status(200).json(payload);
});
