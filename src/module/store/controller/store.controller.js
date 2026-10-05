import slugify from "slugify";
import {
  create,
  find,
  findById,
  findByIdAndUpdate,
  findOne,
} from "../../../../DB/DBMethods.js";
import brandModel from "../../../../DB/model/brand.model.js";
import categoryModel from "../../../../DB/model/category.model.js";
import productModel from "../../../../DB/model/product.model.js";
import storesModel from "../../../../DB/model/store.model.js";
import subCategoryModel from "../../../../DB/model/subCategory.model.js";
import orderModel from "../../../../DB/model/order.model.js";
import { cacheGet, cacheSet, cacheDelete, cacheKey } from "../../../services/cache.service.js";
import userModel from "../../../../DB/model/user.model.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import cloudinary from "../../../services/cloudinary.js";
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const populateStoreData = [];

// ------------------ إضافة متجر جديد ------------------
export const addStore = asyncHandler(async (req, res, next) => {
  // إذا تم رفع صورة، ارفعها للسيرفس ثم ضع الحقول في body
  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      { folder: "storesImgs" }
    );
    req.body.storeImage = secure_url;
    req.body.storeImageId = public_id;
  }

  req.body.createdBy = req.user._id;

  // استخدام findOne بدل جلب كل المستندات
  const existingStore = await findOne({
    model: storesModel,
    condition: { createdBy: req.user._id },
  });

  if (existingStore) {
    return res.status(400).json({ message: "you have a store" });
  }

  // إنشاء المتجر
  let newStore;
  try {
    newStore = await create({ model: storesModel, data: req.body });
  } catch (error) {
    if (req.body.storeImageId) await destroyCloudinaryAsset(req.body.storeImageId);
    throw error;
  }
  if (!newStore) {
    if (req.body.storeImageId) await destroyCloudinaryAsset(req.body.storeImageId);
    return res.status(500).json({ message: "failed to create store" });
  }

  // ربط الـ user بالمتجر المنشأ
  let updateUser;
  try {
    updateUser = await findByIdAndUpdate({
      model: userModel,
      condition: req.user._id,
      data: { storeId: newStore._id },
      options: { new: true },
    });
  } catch (error) {
    await storesModel.deleteOne({ _id: newStore._id });
    if (newStore.storeImageId) await destroyCloudinaryAsset(newStore.storeImageId);
    throw error;
  }

  return res.status(201).json({ message: "added", newStore, updateUser });
});

// ------------------ تعديل صورة المتجر ------------------
export const editStoreImg = asyncHandler(async (req, res, next) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "store id is required" });
  }

  // تأكد من وجود ملف للرفع
  if (!req.file) {
    return res.status(422).json({ message: "you have to upload an image" });
  }

  // احصل على المتجر الحالي أولاً حتى نحفظ public_id القديم لحذفه لاحقًا
  const store = await findById({ model: storesModel, condition: id });
  if (!store) {
    return res.status(404).json({ message: "store not found" });
  }

  // ارفع الصورة الجديدة
  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path,
    { folder: "storesImgs" }
  );

  // حدث الدوكومت مع الصورة الجديدة، وأرجع الوثيقة المحدثة
  const updated = await findByIdAndUpdate({
    model: storesModel,
    condition: id,
    data: { storeImage: secure_url, storeImageId: public_id },
    options: { new: true },
  });

  if (!updated) {
    // لو لم يحدث التحديث، نحذف الصورة التي رفعناها لتجنب تراكم الصور غير مستخدمة
    try {
      await destroyCloudinaryAsset(public_id);
    } catch (err) {
      console.error("failed to destroy newly uploaded image after update failure", err);
    }
    return res.status(500).json({ message: "failed to update store image" });
  }

  // لو كان لدى السجل صورة قديمة، احذفها من Cloudinary
  try {
    if (store.storeImageId) {
      await destroyCloudinaryAsset(store.storeImageId);
    }
  } catch (err) {
    // لا نوقف العملية لو فشل حذف القديم؛ نكتفي بتسجيل الخطأ
    console.error("failed to destroy old store image", err);
  }

  return res.status(200).json({ message: "Done", result: updated });
});

// ------------------ البحث عن متاجر ------------------
export const searchStores = asyncHandler(async (req, res, next) => {
  const name = String(req.body.name ?? "").trim();
  const currentUserId = req.user._id;

  if (!name) {
    return res.status(400).json({ message: "search term is required", allstores: [] });
  }

  // استخدم استعلام Mongo مع regex لاستخدام الفهرس والتصفية في DB بدلاً من جلب كل المستندات
  const matched = await storesModel.find({
    name: { $regex: escapeRegex(name), $options: "i" },
    createdBy: { $ne: currentUserId },
  });

  if (!matched || matched.length === 0) {
    return res.status(200).json({ message: "not found", allstores: [] });
  }

  return res.status(200).json({ message: "users", allstores: matched });
});

// ------------------ جلب متجر واحد ------------------
export const getStore = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "store id required" });

  const store = await findById({
    model: storesModel,
    condition: id,
    populate: [...populateStoreData],
  });

  if (!store) {
    return res.status(404).json({ message: "store not found" });
  }

  return res.status(200).json({ message: "store", store });
});



export const deleteStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "store id is required" });

  const store = await storesModel
    .findOne({ _id: id, createdBy: req.user._id })
    .select('_id storeImageId')
    .lean();

  if (!store) {
    return res.status(404).json({ message: 'Store not found or you do not own it' });
  }

  await Promise.all([
    productModel.updateMany(
      { storeId: store._id },
      { $set: { storeId: null, isPublished: false } },
    ),
    userModel.findByIdAndUpdate(req.user._id, { $unset: { storeId: 1 } }),
    storesModel.deleteOne({ _id: store._id }),
    cacheDelete(cacheKey('store-analytics', store._id)),
  ]);

  if (store.storeImageId) {
    try {
      await destroyCloudinaryAsset(store.storeImageId);
    } catch (error) {
      console.error('Failed to remove deleted store image:', error);
    }
  }

  return res.status(200).json({ message: 'removed' });
});

export const getStoreOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'store id required' });

  if (req.user?.role !== 'Admin') {
    const owner = await storesModel.findOne({ _id: id, createdBy: req.user._id }).select('_id').lean();
    if (!owner) return res.status(403).json({ message: 'You are not allowed to view this store orders' });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const version = Number(await cacheGet(cacheKey('store-orders-version', id)) ?? 0);
  const key = cacheKey('store-orders', version, id, page, limit);
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const condition = { storeId: id };
  const [orders, total] = await Promise.all([
    orderModel
      .find(condition)
      .select('_id orderNumber userId items total subtotal status payment createdAt updatedAt')
      .populate({ path: 'userId', select: '_id userName email phone', options: { lean: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    orderModel.countDocuments(condition),
  ]);

  const payload = {
    orders: orders.map((order) => ({
      ...order,
      user: order.userId,
      paymentMethod: order.payment?.method,
      paymentStatus: order.payment?.status,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  await cacheSet(key, payload, 20);
  res.status(200).json(payload);
});

export const getStoreAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "store id required" });

  if (req.user?.role !== 'Admin') {
    const owner = await storesModel.findOne({ _id: id, createdBy: req.user._id }).select('_id').lean();
    if (!owner) return res.status(403).json({ message: 'You are not allowed to view this store analytics' });
  }

  const key = cacheKey("store-analytics", id);
  const cached = await cacheGet(key);
  if (cached) {
    return res.status(200).json(cached);
  }

  const [productCount, orderStats, statusStats] = await Promise.all([
    productModel.countDocuments({ storeId: id, isPublished: true }),
    orderModel.aggregate([
      { $match: { storeId: id, status: { $nin: ["cancelled", "refunded"] } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]),
    orderModel.aggregate([
      { $match: { storeId: id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const payload = {
    message: "Store analytics",
    analytics: {
      totalProducts: productCount,
      totalOrders: orderStats[0]?.totalOrders ?? 0,
      totalRevenue: Number((orderStats[0]?.totalRevenue ?? 0).toFixed(2)),
      avgOrderValue: Number((orderStats[0]?.avgOrderValue ?? 0).toFixed(2)),
      ordersByStatus: Object.fromEntries(statusStats.map(item => [item._id, item.count])),
    },
  };

  await cacheSet(key, payload, 60);
  res.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return res.status(200).json(payload);
});
