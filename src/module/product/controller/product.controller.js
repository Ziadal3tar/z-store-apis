import slugify from "slugify";
import {
  create,
  findById,
  findByIdAndDelete,
  findByIdAndUpdate,
  findOne,
} from "../../../../DB/DBMethods.js";
import categoryModel from "../../../../DB/model/category.model.js";
import brandModel from "../../../../DB/model/brand.model.js";
import productModel from "../../../../DB/model/product.model.js";
import cloudinary from "../../../services/cloudinary.js";
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import storesModel from "../../../../DB/model/store.model.js";
import {
  cacheGet,
  cacheSet,
  cacheIncrement,
  cacheDelete,
  cacheKey,
} from "../../../services/cache.service.js";

const cardSelect =
  "_id name slug images stock price discount finalPrice colors sizes gender tags soldItems totalItems categoryId subCategoryId brandId storeId createdAt updatedAt isSpecial isPublished ratingAverage ratingCount viewCount";

const detailSelect =
  "_id name slug description images publicImagesIds stock price discount finalPrice colors sizes gender tags soldItems totalItems categoryId subCategoryId brandId storeId createdBy createdAt updatedAt isSpecial isPublished attributes sku ratingAverage ratingCount viewCount";

const cardPopulate = [
  { path: "categoryId", select: "_id name", options: { lean: true } },
  { path: "subCategoryId", select: "_id name", options: { lean: true } },
  { path: "brandId", select: "_id name image", options: { lean: true } },
];

const detailPopulate = [
  { path: "storeId", select: "_id name storeImage", options: { lean: true } },
  { path: "categoryId", select: "_id name", options: { lean: true } },
  { path: "subCategoryId", select: "_id name", options: { lean: true } },
  { path: "brandId", select: "_id name image", options: { lean: true } },
  { path: "createdBy", select: "_id userName email", options: { lean: true } },
];

const populateCardShape = (product) => {
  if (!product) return product;
  return {
    ...product,
    category: product.categoryId,
    subCategory: product.subCategoryId,
    brand: product.brandId,
  };
};

const uploadFilesToCloudinary = async (files, folder = "products") => {
  const results = await Promise.all(
    files.map((file) => cloudinary.uploader.upload(file.path, { folder })),
  );

  return {
    urls: results.map((item) => item.secure_url),
    publicIds: results.map((item) => item.public_id),
  };
};

const invalidateProductCache = async (productId = null, storeId = null) => {
  await cacheIncrement(cacheKey("products", "version"));
  await Promise.all([
      cacheDelete(cacheKey('admin-summary')),
    cacheDelete(cacheKey("products", "special")),
    cacheDelete(cacheKey("products", "best-selling")),
    cacheDelete(cacheKey("products", "new-arrivals")),
    cacheDelete(cacheKey("products", "home-feed")),
    ...(productId ? [cacheDelete(cacheKey("product", productId)), cacheDelete(cacheKey("recommendations", productId))] : []),
    ...(storeId
      ? [
          cacheDelete(cacheKey("store-analytics", storeId)),
          (async () => {
            const versionKey = cacheKey("store-products-version", storeId);
            const currentVersion = Number(await cacheGet(versionKey) ?? 0);
            await cacheSet(versionKey, currentVersion + 1, 86400);
          })(),
        ]
      : []),
  ]);
};

export const addProduct = asyncHandler(async (req, res) => {
  const categoryId = req.params.categoryId ?? req.body.categoryId ?? null;
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

  if (!categoryId) {
    return res.status(400).json({ message: "categoryId is required" });
  }

  if (!req.body.name || !req.body.description || req.body.price == null) {
    return res.status(400).json({
      message: "name, description and price are required",
    });
  }

  let images = [];
  let publicImagesIds = [];

  if (req.files?.length) {
    const uploaded = await uploadFilesToCloudinary(req.files);
    images = uploaded.urls;
    publicImagesIds = uploaded.publicIds;
  }

  const numericPrice = Number(req.body.price);
  const numericDiscount = Number(req.body.discount || 0);
  const numericTotalItems = Number(req.body.totalItems || 0);
  const numericSoldItems = Number(req.body.soldItems || 0);

  const productData = {
    name: req.body.name,
    slug: slugify(req.body.name, { lower: true }),
    description: req.body.description,
    price: numericPrice,
    discount: numericDiscount,
    totalItems: numericTotalItems,
    soldItems: numericSoldItems,
    stock: Math.max(0, numericTotalItems - numericSoldItems),
    finalPrice: Number((numericPrice * (100 - numericDiscount) / 100).toFixed(2)),
    gender: req.body.gender,
    categoryId,
    storeId: storeId || undefined,
    subCategoryId: req.body.subCategoryId || undefined,
    brandId: req.body.brandId || undefined,
    images,
    publicImagesIds,
    colors: Array.isArray(req.body.colors)
      ? req.body.colors
      : String(req.body.colors || "").split(",").map((s) => s.trim()).filter(Boolean),
    sizes: Array.isArray(req.body.sizes)
      ? req.body.sizes
      : String(req.body.sizes || "").split(",").map((s) => s.trim()).filter(Boolean),
    createdBy: req.user?._id,
  };

  let result;
  try {
    result = await create({ model: productModel, data: productData });
  } catch (error) {
    if (publicImagesIds.length) {
      await Promise.all(publicImagesIds.map((id) => destroyCloudinaryAsset(id)));
    }
    throw error;
  }
  const product = await productModel
    .findById(result._id)
    .select(detailSelect)
    .populate(detailPopulate)
    .lean();

  await invalidateProductCache(result?._id ?? null, storeId);

  res.status(201).json({ message: "Product created", product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await productModel.findById(productId).lean();

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!(await canManageProduct(product, req.user))) {
    return res.status(403).json({ message: "You are not allowed to manage this product" });
  }

  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }

  for (const key of ["price", "discount", "totalItems", "soldItems"]) {
    if (req.body[key] != null) req.body[key] = Number(req.body[key]);
  }

  const newPrice = req.body.price ?? product.price;
  const newDiscount = req.body.discount ?? product.discount ?? 0;
  const totalItems = req.body.totalItems ?? product.totalItems ?? 0;
  const soldItems = req.body.soldItems ?? product.soldItems ?? 0;

  req.body.finalPrice = Number((newPrice * (100 - newDiscount) / 100).toFixed(2));
  req.body.stock = Math.max(0, Number(totalItems) - Number(soldItems));
  req.body.isSpecial = Number(newDiscount) >= 70;
  req.body.updateBy = req.user?._id;

  let newPublicImagesIds = [];
  if (req.files?.length) {
    const uploaded = await uploadFilesToCloudinary(req.files);
    newPublicImagesIds = uploaded.publicIds;
    req.body.images = uploaded.urls;
    req.body.publicImagesIds = uploaded.publicIds;
  }

  let updated;
  try {
    updated = await productModel.findByIdAndUpdate(
      productId,
      req.body,
      { new: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (newPublicImagesIds.length) {
      await Promise.all(newPublicImagesIds.map((id) => destroyCloudinaryAsset(id)));
    }
    throw error;
  }

  if (!updated) {
    if (newPublicImagesIds.length) {
      await Promise.all(newPublicImagesIds.map((id) => destroyCloudinaryAsset(id)));
    }
    return res.status(500).json({ message: "Failed to update product" });
  }

  if (newPublicImagesIds.length && product.publicImagesIds?.length) {
    await Promise.all(
      product.publicImagesIds.map((id) => destroyCloudinaryAsset(id)),
    );
  }

  await invalidateProductCache(productId, product.storeId);
  res.status(200).json({ message: "Product updated", product: updated });
});

export const removeProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await productModel.findById(productId).lean();

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!(await canManageProduct(product, req.user))) {
    return res.status(403).json({ message: "You are not allowed to manage this product" });
  }

  const deletedProduct = await findByIdAndDelete({ model: productModel, condition: productId });
  if (!deletedProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (Array.isArray(deletedProduct.publicImagesIds) && deletedProduct.publicImagesIds.length) {
    await Promise.all(
      deletedProduct.publicImagesIds.map((id) => destroyCloudinaryAsset(id)),
    );
  }

  // Remove stale references so deleted products never remain in carts or wishlists.
  const carts = await cartModel.find({ 'products.productId': productId }).select('_id userId').lean();
  if (carts.length) {
    await cartModel.updateMany(
      { _id: { $in: carts.map(cart => cart._id) } },
      { $pull: { products: { productId } } },
    );

    await Promise.all(
      carts.map(async cart => {
        const nextCart = await cartModel.findById(cart._id).select('products').lean();
        await userModel.findByIdAndUpdate(cart.userId, {
          cart: Boolean(nextCart?.products?.length),
          cartId: nextCart?.products?.length ? cart._id : null,
        });
        await cacheDelete(cacheKey('cart', cart.userId));
      }),
    );
  }

  await userModel.updateMany(
    { wishlist: productId },
    { $pull: { wishlist: productId } },
  );

  await invalidateProductCache(productId, product.storeId);

  res.status(200).json({ message: "Product deleted" });
});

export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  cacheIncrement(cacheKey("product-views", id), 86400).catch(() => null);
  const key = cacheKey("product", id);
  const cached = await cacheGet(key);

  if (cached) {
    return res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300")
      .status(200)
      .json(cached);
  }

  const product = await productModel
    .findById(id)
    .select(detailSelect)
    .populate(detailPopulate)
    .lean();

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const payload = { message: "Product found", product };
  await cacheSet(key, payload, 120);

  res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(payload);
});

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const canManageProduct = async (product, user) => {
  if (user?.role === 'Admin') return true;
  if (!product?.storeId || !user?._id) return false;

  const store = await storesModel
    .findById(product.storeId)
    .select('createdBy')
    .lean();

  return Boolean(store && String(store.createdBy) === String(user._id));
};

export const allProduct = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const search = String(req.query.q ?? '').trim().toLowerCase();
  const category = String(req.query.category ?? '').trim();
  const brand = String(req.query.brand ?? '').trim();
  const color = String(req.query.color ?? '').trim().toLowerCase();
  const minPrice = Number.isFinite(Number(req.query.minPrice)) && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
  const maxPrice = Number.isFinite(Number(req.query.maxPrice)) && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;
  const sort = String(req.query.sort ?? 'featured').trim();
  const inStock = String(req.query.inStock ?? '').trim() === 'true';
  const minRatingRaw = Number(req.query.minRating);
  const minRating = Number.isFinite(minRatingRaw) && minRatingRaw > 0 ? Math.min(5, minRatingRaw) : null;

  const version = await cacheGet(cacheKey('products', 'version')) ?? 0;
  const key = cacheKey('products', version, page, limit, search || 'all', category || 'all', brand || 'all', color || 'all', minPrice ?? 'min', maxPrice ?? 'max', sort, inStock ? 'stock' : 'all-stock', minRating ?? 'rating-all');
  const cached = await cacheGet(key);

  if (cached) {
    return res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300")
      .status(200)
      .json(cached);
  }

  let condition = { isPublished: true };
  if (category) condition.categoryId = category;
  if (brand) condition.brandId = brand;
  if (color) condition.colors = { $regex: new RegExp(escapeRegex(color), 'i') };
  if (inStock) condition.stock = { $gt: 0 };
  if (minRating != null) condition.ratingAverage = { $gte: minRating };
  if (minPrice != null || maxPrice != null) {
    condition.finalPrice = {};
    if (minPrice != null) condition.finalPrice.$gte = minPrice;
    if (maxPrice != null) condition.finalPrice.$lte = maxPrice;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    const [categories, brands] = await Promise.all([
      categoryModel.find({ name: regex }).select("_id").lean(),
      brandModel.find({ name: regex }).select("_id").lean(),
    ]);

    condition = {
      ...condition,
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },
        ...(categories.length ? [{ categoryId: { $in: categories.map((x) => x._id) } }] : []),
        ...(brands.length ? [{ brandId: { $in: brands.map((x) => x._id) } }] : []),
      ],
    };
  }

  const skip = (page - 1) * limit;

  const [rawProducts, total] = await Promise.all([
    productModel
      .find(condition)
      .select(cardSelect)
      .slice("images", 1)
      .sort(sort === 'price-low' ? { finalPrice: 1 }
        : sort === 'price-high' ? { finalPrice: -1 }
        : sort === 'newest' ? { createdAt: -1 }
        : sort === 'name' ? { name: 1 }
        : sort === 'rating-high' ? { ratingAverage: -1, ratingCount: -1, createdAt: -1 }
        : sort === 'discount-high' ? { discount: -1, createdAt: -1 }
        : sort === 'best-selling' || sort === 'featured' ? { soldItems: -1, ratingAverage: -1, createdAt: -1 }
        : { soldItems: -1, ratingAverage: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(cardPopulate)
      .lean(),
    productModel.countDocuments(condition),
  ]);

  const products = rawProducts.map(populateCardShape);
  const totalPages = Math.ceil(total / limit);

  const payload = {
    message: "All products",
    products,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  await cacheSet(key, payload, search ? 30 : 120);
  res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(payload);
});

export const getSpecialProduct = asyncHandler(async (req, res) => {
  const key = cacheKey("products", "special");
  const cached = await cacheGet(key);

  if (cached) {
    return res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300")
      .status(200)
      .json(cached);
  }

  const rawProducts = await productModel
    .find({ isSpecial: true, isPublished: true })
    .select(cardSelect)
    .slice("images", 1)
    .sort({ createdAt: -1 })
    .limit(12)
    .populate(cardPopulate)
    .lean();

  const payload = {
    message: "Special products",
    products: rawProducts.map(populateCardShape),
  };

  await cacheSet(key, payload, 120);
  res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(payload);
});


export const getBestSelling = asyncHandler(async (req, res) => {
  const key = cacheKey('products', 'best-selling');
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const products = await productModel
    .find({ isPublished: true })
    .select(cardSelect)
    .slice('images', 1)
    .sort({ soldItems: -1, ratingAverage: -1, createdAt: -1 })
    .limit(12)
    .populate(cardPopulate)
    .lean();

  const payload = { message: 'Best selling products', products: products.map(populateCardShape) };
  await cacheSet(key, payload, 180);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
  res.status(200).json(payload);
});

export const getNewArrivals = asyncHandler(async (req, res) => {
  const key = cacheKey('products', 'new-arrivals');
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const products = await productModel
    .find({ isPublished: true })
    .select(cardSelect)
    .slice('images', 1)
    .sort({ createdAt: -1 })
    .limit(12)
    .populate(cardPopulate)
    .lean();

  const payload = { message: 'New arrivals', products: products.map(populateCardShape) };
  await cacheSet(key, payload, 180);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
  res.status(200).json(payload);
});

export const getStoresProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'store id is required in params' });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const search = String(req.query.q ?? '').trim();
  const category = String(req.query.category ?? '').trim();
  const minPrice = Number.isFinite(Number(req.query.minPrice)) && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
  const maxPrice = Number.isFinite(Number(req.query.maxPrice)) && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;

  const versionKey = cacheKey('store-products-version', id);
  const version = Number(await cacheGet(versionKey) ?? 0);
  const key = cacheKey('store-products', version, id, page, limit, search || 'all', category || 'all', minPrice ?? 'min', maxPrice ?? 'max');
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const condition = { storeId: id, isPublished: true };
  if (category) condition.categoryId = category;
  if (minPrice != null || maxPrice != null) {
    condition.finalPrice = {};
    if (minPrice != null) condition.finalPrice.$gte = minPrice;
    if (maxPrice != null) condition.finalPrice.$lte = maxPrice;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    condition.$or = [
      { name: regex },
      { description: regex },
      { tags: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [rawProducts, total] = await Promise.all([
    productModel
      .find(condition)
      .select(cardSelect)
      .slice('images', 1)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(cardPopulate)
      .lean(),
    productModel.countDocuments(condition),
  ]);

  const totalPages = Math.ceil(total / limit);
  const payload = {
    message: 'Store products',
    products: rawProducts.map(populateCardShape),
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  await cacheSet(key, payload, search ? 30 : 60);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180');
  return res.status(200).json(payload);
});

export const getHomeFeed = asyncHandler(async (_req, res) => {
  const key = cacheKey('products', 'home-feed');
  const cached = await cacheGet(key);
  if (cached) return res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300').status(200).json(cached);

  const [special, bestSelling, newArrivals, categories, brands] = await Promise.all([
    productModel.find({ isSpecial: true, isPublished: true }).select(cardSelect).slice('images', 1).sort({ createdAt: -1 }).limit(8).populate(cardPopulate).lean(),
    productModel.find({ isPublished: true }).select(cardSelect).slice('images', 1).sort({ soldItems: -1, ratingAverage: -1, createdAt: -1 }).limit(8).populate(cardPopulate).lean(),
    productModel.find({ isPublished: true }).select(cardSelect).slice('images', 1).sort({ createdAt: -1 }).limit(8).populate(cardPopulate).lean(),
    categoryModel.find().select('_id name image').sort({ name: 1 }).limit(12).lean(),
    brandModel.find().select('_id name image').sort({ name: 1 }).limit(12).lean(),
  ]);

  const payload = {
    special: special.map(populateCardShape),
    bestSelling: bestSelling.map(populateCardShape),
    newArrivals: newArrivals.map(populateCardShape),
    categories,
    brands,
  };
  await cacheSet(key, payload, 120);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300').status(200).json(payload);
});
