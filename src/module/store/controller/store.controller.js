import slugify from "slugify";
import {
  create,
  find,
  findById,
  findByIdAndDelete,
  findByIdAndUpdate,
  findOne,
} from "../../../../DB/DBMethods.js";
import brandModel from "../../../../DB/model/brand.model.js";
import categoryModel from "../../../../DB/model/category.model.js";
import productModel from "../../../../DB/model/product.model.js";
import storesModel from "../../../../DB/model/store.model.js";
import subCategoryModel from "../../../../DB/model/subCategory.model.js";
import userModel from "../../../../DB/model/user.model.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import cloudinary from "../../../services/cloudinary.js";
import { paginate } from "../../../services/pagination.js";

const populateStoreData = [
  // {
  //   path: "chats",
  //   populate: [
  //     {
  //       path: "messages",
  //       populate: [
  //         {
  //           path: "sender",
  //         },
  //         {
  //           path: "receiver",
  //         },
  //       ],
  //     },
  //     { path: "userId" },
  //     { path: "storeId" },
  //   ],
  // },
  // {
  //   path: "storeProduct",
  // },
];

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
  const newStore = await create({ model: storesModel, data: req.body });
  if (!newStore) {
    return res.status(500).json({ message: "failed to create store" });
  }

  // ربط الـ user بالمتجر المنشأ
  const updateUser = await findByIdAndUpdate({
    model: userModel,
    condition: req.user._id,
    data: { storeId: newStore._id },
    options: { new: true },
  });

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
      await cloudinary.uploader.destroy(public_id);
    } catch (err) {
      console.error("failed to destroy newly uploaded image after update failure", err);
    }
    return res.status(500).json({ message: "failed to update store image" });
  }

  // لو كان لدى السجل صورة قديمة، احذفها من Cloudinary
  try {
    if (store.storeImageId) {
      await cloudinary.uploader.destroy(store.storeImageId);
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
    name: { $regex: name, $options: "i" },
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
