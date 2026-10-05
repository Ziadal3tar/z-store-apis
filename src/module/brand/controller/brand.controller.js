import { asyncHandler } from "../../../services/asyncHandler.js";
import slugify from "slugify";
import { create, findByIdAndUpdate, find, findByIdAndDelete, findById } from "../../../../DB/DBMethods.js";
import brandModel from "../../../../DB/model/brand.model.js";
import cloudinary from '../../../services/cloudinary.js'
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";
import { paginate } from '../../../services/pagination.js';
import { cacheGet, cacheSet, cacheDelete, cacheIncrement, cacheKey } from '../../../services/cache.service.js';
const populate = [
  {
    path: "createdBy",
    select: ["userName", "email"]

  },

];

export const addBrand = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    res.status(422).json({message:"you have to upload an image"})

  } else {

    let { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
      folder: "brands",
    });
    req.body.image = secure_url;
    req.body.public_id = public_id;
    req.body.slug = slugify(req.body.name);
    req.body.createdBy = req.user._id

    let result;
    try {
      result = await create({ model: brandModel, data: req.body });
    } catch (error) {
      await destroyCloudinaryAsset(public_id);
      throw error;
    }
    await cacheIncrement(cacheKey('catalog', 'brands', 'version'));
    await cacheDelete(cacheKey('catalog', 'brands', 'all'));
    await cacheIncrement(cacheKey('products', 'version'));
    await cacheDelete(cacheKey('products', 'home-feed'));
    res.status(201).json({ message: "created", result });
  }
});



export const updateBrand = asyncHandler(async (req, res, next) => {
  const { brandId } = req.params;

  const brand = await findById({
    model: brandModel,
    condition: brandId,
  });

  if (!brand) {
    return res.status(404).json({
      message: "brand not found",
    });
  }

  // Keep the old Cloudinary public_id so we can delete it
  // only after the new image has been saved successfully.
  const oldPublicId = brand.public_id || null;

  let image = brand.image;
  let public_id = oldPublicId;

  // New image uploaded
  if (req.file) {
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: "brands",
    });

    image = upload.secure_url;
    public_id = upload.public_id;
  }

  const name =
    req.body.name && req.body.name !== "undefined"
      ? req.body.name.trim()
      : brand.name;

  const data = {
    name,
    slug: slugify(name),
    image,
    public_id,
  };

  const updatedBrand = await findByIdAndUpdate({
    model: brandModel,
    condition: { _id: brandId },
    data,
    options: { new: true, runValidators: true },
  });

  if (!updatedBrand) {
    // If a new image was uploaded but DB update failed,
    // clean the new Cloudinary asset.
    if (req.file && public_id) {
      await destroyCloudinaryAsset(public_id);
    }

    return res.status(404).json({
      message: "brand not found",
    });
  }

  // Delete the OLD image only when:
  // 1. a new image was uploaded
  // 2. there is an old public_id
  // 3. old and new public_id are different
  if (
    req.file &&
    oldPublicId &&
    oldPublicId !== public_id
  ) {
    await destroyCloudinaryAsset(oldPublicId);
  }

  await cacheIncrement(cacheKey('catalog', 'brands', 'version'));
  await cacheDelete(cacheKey('catalog', 'brands', 'all'));

  await cacheIncrement(
    cacheKey("products", "version")
  );

  await cacheDelete(
    cacheKey("products", "home-feed")
  );

  return res.status(200).json({
    message: "brand is updated",
    results: updatedBrand,
  });
});

export const allBrands = asyncHandler(async (req, res) => {
  const pageRequested = req.query.page != null || req.query.size != null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(50, Math.max(1, Number(req.query.size) || 10));

  const version = Number(await cacheGet(cacheKey('catalog', 'brands', 'version')) ?? 0);
  const key = pageRequested
    ? cacheKey('catalog', 'brands', version, page, size)
    : cacheKey('catalog', 'brands', version, 'all');

  const cached = await cacheGet(key);
  if (cached) {
    return res
      .set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180')
      .status(200)
      .json(cached);
  }

  const condition = {};
  const skip = pageRequested ? (page - 1) * size : 0;

  const [brands, total] = await Promise.all([
    brandModel
      .find(condition)
      .select('_id name slug image public_id createdBy createdAt updatedAt')
      .populate(populate)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageRequested ? size : 0)
      .lean(),
    brandModel.countDocuments(condition),
  ]);

  const totalPages = pageRequested ? Math.ceil(total / size) : 1;

  const payload = {
    message: 'All brands',
    brands,
    total,
    page: pageRequested ? page : 1,
    size: pageRequested ? size : total,
    totalPages,
    hasNextPage: pageRequested ? page < totalPages : false,
    hasPrevPage: pageRequested ? page > 1 : false,
  };

  await cacheSet(key, payload, 120);

  return res
    .set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180')
    .status(200)
    .json(payload);
});

export const removeBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const brand = await findById({
    model: brandModel,
    condition: id,
  });

  if (!brand) {
    return res.status(404).json({ message: 'brand not found' });
  }

  const deletedBrand = await findByIdAndDelete({
    model: brandModel,
    condition: id,
  });

  if (!deletedBrand) {
    return res.status(404).json({ message: 'brand not found' });
  }

  if (deletedBrand.public_id) {
    await destroyCloudinaryAsset(deletedBrand.public_id);
  }

  await cacheIncrement(cacheKey('catalog', 'brands', 'version'));
  await cacheDelete(cacheKey('catalog', 'brands', 'all'));
  await cacheIncrement(cacheKey('products', 'version'));
  await cacheDelete(cacheKey('products', 'home-feed'));

  return res.status(200).json({
    message: 'Deleted',
    deleteBrand: deletedBrand,
  });
});
