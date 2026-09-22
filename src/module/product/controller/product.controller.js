// src/controllers/product.controller.js
import slugify from "slugify";
import {
  create,
  find,
  findById,
  findByIdAndDelete,
  findByIdAndUpdate,
  findOne,
} from "../../../../DB/DBMethods.js";
import categoryModel from "../../../../DB/model/category.model.js";
import brandModel from "../../../../DB/model/brand.model.js";
import productModel from "../../../../DB/model/product.model.js";
import cloudinary from "../../../services/cloudinary.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import { paginate } from "../../../services/pagination.js";
import storesModel from "../../../../DB/model/store.model.js";
const populate = [
  { path: "storeId" },
  { path: "categoryId" },
  { path: "createdBy", select: ["userName", "email"] },
  { path: "subCategoryId" },
  { path: "brandId" },
];


const uploadFilesToCloudinary = async (files, folder = "products") => {
  const urls = [];
  const publicIds = [];
  for (const file of files) {
    const upload = await cloudinary.uploader.upload(file.path, { folder });
    urls.push(upload.secure_url);
    publicIds.push(upload.public_id);
  }
  return { urls, publicIds };
};


export const addProduct = asyncHandler(async (req, res, next) => {
const categoryIdParam = req.params.categoryId ?? null;
const categoryIdBody = req.body.categoryId ?? null;

const categoryId = categoryIdParam || categoryIdBody || null;

let storeId = null;

if (req.user?.role === "User") {
  const userStore = await findOne({
    model: storesModel,
    condition: { createdBy: req.user._id },
  });

  if (!userStore) {
    return res.status(400).json({
      message: "You must create your store before adding products",
    });
  }

  storeId = userStore._id;
}

  if (!categoryId && productModel.schema.paths.categoryId?.isRequired) {
    return res.status(400).json({ message: "categoryId is required" });
  }

  let images = [];
  let publicImagesIds = [];
  if (req.files && req.files.length > 0) {
    const uploaded = await uploadFilesToCloudinary(req.files, "products");
    images = uploaded.urls;
    publicImagesIds = uploaded.publicIds;
  }

  const {
    name,
    description,
    price,
    discount = 0,
    totalItems = 0,
    soldItems = 0,
    gender,
    subCategoryId = null,
    brandId = null,
    colors = [],
    sizes = []
  } = req.body;

  if (!name || !description || price == null) {
    return res.status(400).json({ message: "name, description and price are required" });
  }

  const numericPrice = Number(price);
  const numericDiscount = Number(discount);
  const numericTotalItems = Number(totalItems);
  const numericSoldItems = Number(soldItems);

  const finalPrice = Number((numericPrice * (100 - (isNaN(numericDiscount) ? 0 : numericDiscount)) / 100).toFixed(2));
  const stock = Math.max(0, numericTotalItems - (isNaN(numericSoldItems) ? 0 : numericSoldItems));

  const productData = {
    name,
    slug: slugify(name, { lower: true }),
    description,
    price: numericPrice,
    discount: numericDiscount,
    totalItems: numericTotalItems,
    soldItems: numericSoldItems,
    stock,
    gender,
    categoryId: categoryId || undefined,
    storeId: storeId || undefined,
    subCategoryId,
    brandId,
    images,
    publicImagesIds,
    finalPrice,
    colors: Array.isArray(colors) ? colors : (typeof colors === "string" ? colors.split(",").map(s => s.trim()) : []),
    sizes: Array.isArray(sizes) ? sizes : (typeof sizes === "string" ? sizes.split(",").map(s => s.trim()) : []),
    createdBy: req.user?._id
  };

  Object.keys(productData).forEach(k => {
    if (productData[k] === undefined) delete productData[k];
  });

  const result = await create({ model: productModel, data: productData });
  const populatedResult = await findById({ model: productModel, condition: { _id: result._id }, populate });

  res.status(201).json({ message: "Product created", product: populatedResult });
});



export const updateProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  if (!productId) return res.status(400).json({ message: "productId is required in params" });

  const product = await findById({ model: productModel, condition: { _id: productId } });
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }

  if (req.body.price != null) req.body.price = Number(req.body.price);
  if (req.body.discount != null) req.body.discount = Number(req.body.discount);
  if (req.body.totalItems != null) req.body.totalItems = Number(req.body.totalItems);
  if (req.body.soldItems != null) req.body.soldItems = Number(req.body.soldItems);

  const newPrice = req.body.price != null ? req.body.price : product.price;
  const newDiscount = req.body.discount != null ? req.body.discount : product.discount || 0;
  req.body.finalPrice = Number((newPrice * (100 - newDiscount) / 100).toFixed(2));

  const totalItems = req.body.totalItems != null ? req.body.totalItems : (product.totalItems || 0);
  const soldItems = req.body.soldItems != null ? req.body.soldItems : (product.soldItems || 0);
  req.body.stock = Math.max(0, Number(totalItems) - Number(soldItems));

  if (req.files?.length) {
    try {
      const uploaded = await uploadFilesToCloudinary(req.files, "products");
      req.body.images = uploaded.urls;
      req.body.publicImagesIds = uploaded.publicIds;
    } catch (err) {
      return res.status(500).json({ message: "Error uploading images", error: err.message });
    }
  }

  req.body.updateBy = req.user?._id;

  const updated = await findByIdAndUpdate({
    model: productModel,
    condition: { _id: productId },
    data: req.body,
    options: { new: true }
  });

  if (!updated) {
    if (req.body.publicImagesIds && Array.isArray(req.body.publicImagesIds)) {
      for (const id of req.body.publicImagesIds) {
        await cloudinary.uploader.destroy(id).catch(() => null);
      }
    }
    return res.status(500).json({ message: "Failed to update product" });
  }

  if (req.body.publicImagesIds && Array.isArray(req.body.publicImagesIds) && product.publicImagesIds?.length) {
    for (const oldId of product.publicImagesIds) {
      await cloudinary.uploader.destroy(oldId).catch(() => null);
    }
  }

  res.status(200).json({ message: "Product updated", product: updated });
});

export const removeProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  if (!productId) return res.status(400).json({ message: "productId is required in params" });

  const product = await findById({ model: productModel, condition: { _id: productId } });
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (product.publicImagesIds && Array.isArray(product.publicImagesIds)) {
    for (const id of product.publicImagesIds) {
      await cloudinary.uploader.destroy(id).catch(() => null);
    }
  }

  await findByIdAndDelete({ model: productModel, condition: { _id: productId } });

  res.status(200).json({ message: "Product deleted" });
});

export const getProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "product id is required in params" });

  const product = await findById({
    model: productModel,
    condition: { _id: id },
    populate
  });

  if (!product) return res.status(404).json({ message: "Product not found" });

  res.status(200).json({ message: "Product found", product });
});
const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
export const allProduct = asyncHandler(async (req, res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(req.query.limit) ||
        Number(req.query.size) ||
        12
    )
  );

  const search = String(req.query.q ?? "").trim();

  let condition = {};

  if (search) {
    const regex = new RegExp(
      escapeRegex(search),
      "i"
    );

    const [categories, brands] = await Promise.all([
      categoryModel
        .find({ name: regex })
        .select("_id")
        .lean(),

      brandModel
        .find({ name: regex })
        .select("_id")
        .lean(),
    ]);

    const categoryIds = categories.map(
      (category) => category._id
    );

    const brandIds = brands.map(
      (brand) => brand._id
    );

    condition = {
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },

        ...(categoryIds.length
          ? [{ categoryId: { $in: categoryIds } }]
          : []),

        ...(brandIds.length
          ? [{ brandId: { $in: brandIds } }]
          : []),
      ],
    };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    productModel
      .find(condition)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(populate),

    productModel.countDocuments(condition),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    message: "All products",
    products,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
});

export const getSpecialProduct = asyncHandler(async (req, res, next) => {
  const products = await find({
    model: productModel,
    condition: { isSpecial: true },
    populate
  });

  res.status(200).json({ message: "Special products", products });
});

export const getStoresProducts = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "store id is required in params" });

  const products = await find({
    model: productModel,
    condition: { storeId: id },
    populate
  });

  res.status(200).json({ message: "Store products", products });
});
