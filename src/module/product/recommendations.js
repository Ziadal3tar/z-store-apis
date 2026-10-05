import productModel from '../../../DB/model/product.model.js';
import { asyncHandler } from '../../services/asyncHandler.js';
import { cacheGet, cacheSet, cacheKey } from '../../services/cache.service.js';

export const recommendations = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const key = cacheKey('recommendations', id);
  const cached = await cacheGet(key);
  if (cached) return res.status(200).json(cached);

  const source = await productModel.findById(id).select('categoryId subCategoryId brandId').lean();
  if (!source) return res.status(404).json({ message: 'Product not found' });

  const products = await productModel.find({
    _id: { $ne: id },
    isPublished: true,
    $or: [
      { subCategoryId: source.subCategoryId },
      { categoryId: source.categoryId },
      { brandId: source.brandId },
    ],
  }).select('_id name slug images price discount finalPrice colors sizes ratingAverage ratingCount soldItems stock categoryId subCategoryId brandId').slice('images', 1).sort({ soldItems: -1, ratingAverage: -1, createdAt: -1 }).limit(8).lean();

  const payload = { products };
  await cacheSet(key, payload, 120);
  res.status(200).json(payload);
});
