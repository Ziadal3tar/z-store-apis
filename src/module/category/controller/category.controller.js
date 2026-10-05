import userModel from '../../../../DB/model/user.model.js'
import { asyncHandler } from '../../../services/asyncHandler.js';
import { findById, findByIdAndDelete, findOneAndUpdate, findOne, create, find, findByIdAndUpdate } from '../../../../DB/DBMethods.js';
import cloudinary from '../../../services/cloudinary.js'
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";
import categoryModel from '../../../../DB/model/category.model.js';
import subCategoryModel from '../../../../DB/model/subCategory.model.js';
import { paginate } from '../../../services/pagination.js';
import productModel from '../../../../DB/model/product.model.js';
import cartModel from '../../../../DB/model/cart.model.js';
import { cacheGet, cacheSet, cacheDelete, cacheIncrement, cacheKey } from '../../../services/cache.service.js';
const populate = [
    {
        path: "createdBy",
        select: ["userName", "email"]
    },
];

export const addCategory = asyncHandler(async (req, res, next) => {
    let { name } = req.body;

    let image = "";
    let public_id = "";

    if (req.file) {
        const upload = await cloudinary.uploader.upload(req.file.path, {
            folder: "category"
        });

        image = upload.secure_url;
        public_id = upload.public_id;
    }

    let result;
    try {
        result = await create({
            model: categoryModel,
            data: {
                name,
                image,
                public_id,
                createdBy: req.user._id
            }
        });
    } catch (error) {
        if (public_id) await destroyCloudinaryAsset(public_id);
        throw error;
    }

    const populatedResult = await findById({
        model: categoryModel,
        condition: { _id: result._id },
        populate: [...populate]
    });

    await cacheIncrement(cacheKey('catalog', 'categories', 'version'));
    await cacheDelete(cacheKey('catalog', 'categories', 'all'));
    await cacheIncrement(cacheKey('products', 'version'));
    await cacheDelete(cacheKey('products', 'home-feed'));
    res.status(201).json({ message: "created", result: populatedResult });
});

export const UpdateCategory = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const category = await findById({ model: categoryModel, condition: { _id } });

    if (!category) return res.status(404).json({ message: "category not found" });

    const name = !req.body.name || req.body.name === "undefined"
        ? category.name
        : String(req.body.name).trim();

    let image = category.image || "";
    let public_id = category.public_id || "";
    let newPublicId = "";

    if (req.file) {
        const upload = await cloudinary.uploader.upload(req.file.path, { folder: "category" });
        image = upload.secure_url;
        public_id = upload.public_id;
        newPublicId = upload.public_id;
    }

    try {
        const updatedCategory = await findByIdAndUpdate({
            model: categoryModel,
            condition: { _id },
            data: { name, image, public_id, createdBy: category.createdBy },
            options: { new: true, runValidators: true },
        });

        if (!updatedCategory) {
            if (newPublicId) await destroyCloudinaryAsset(newPublicId);
            return res.status(404).json({ message: "category not found" });
        }

        if (newPublicId && category.public_id && category.public_id !== newPublicId) {
            await destroyCloudinaryAsset(category.public_id);
        }

        const populatedUpdated = await findById({
            model: categoryModel,
            condition: { _id },
            populate: [...populate],
        });

        await cacheIncrement(cacheKey('catalog', 'categories', 'version'));
    await cacheDelete(cacheKey('catalog', 'categories', 'all'));
        await cacheIncrement(cacheKey('products', 'version'));
        await cacheDelete(cacheKey('products', 'home-feed'));
        return res.status(200).json({ message: 'Category is updated', updatedCategory: populatedUpdated });
    } catch (error) {
        if (newPublicId) await destroyCloudinaryAsset(newPublicId);
        throw error;
    }
});

export const allCategories = asyncHandler(async (req, res) => {
    const pageRequested = req.query.page != null || req.query.size != null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = Math.min(50, Math.max(1, Number(req.query.size) || 10));
    const version = Number(await cacheGet(cacheKey('catalog', 'categories', 'version')) ?? 0);
    const key = pageRequested
        ? cacheKey('catalog', 'categories', version, page, size)
        : cacheKey('catalog', 'categories', version, 'all');

    const cached = await cacheGet(key);
    if (cached) {
        return res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180').status(200).json(cached);
    }

    const condition = {};
    const skip = pageRequested ? (page - 1) * size : 0;

    const [categories, total] = await Promise.all([
        categoryModel.find(condition)
            .select('_id name image public_id createdBy createdAt updatedAt')
            .populate(populate)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageRequested ? size : 0)
            .lean(),
        categoryModel.countDocuments(condition),
    ]);

    const totalPages = pageRequested ? Math.ceil(total / size) : 1;
    const payload = {
        message: 'All categories',
        categories,
        total,
        page: pageRequested ? page : 1,
        size: pageRequested ? size : total,
        totalPages,
        hasNextPage: pageRequested ? page < totalPages : false,
        hasPrevPage: pageRequested ? page > 1 : false,
    };

    await cacheSet(key, payload, 120);
    return res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180').status(200).json(payload);
});

export const removeCategory = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const category = await findById({ model: categoryModel, condition: { _id } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const subCategories = await find({ model: subCategoryModel, condition: { categoryId: _id } });
    const products = await find({ model: productModel, condition: { categoryId: _id } });
    const deleteCategory = await findByIdAndDelete({ model: categoryModel, condition: { _id } });

    if (category.public_id) await destroyCloudinaryAsset(category.public_id);

    for (const item of subCategories) {
        await findByIdAndDelete({ model: subCategoryModel, condition: item._id });
        if (item.public_id) await destroyCloudinaryAsset(item.public_id);
    }

    const productIds = products.map(product => product._id);
    for (const product of products) {
        await findByIdAndDelete({ model: productModel, condition: product._id });
        if (Array.isArray(product.publicImagesIds)) {
            await Promise.all(product.publicImagesIds.map((id) => destroyCloudinaryAsset(id)));
        }
    }

    if (productIds.length) {
        await cartModel.updateMany(
            { 'products.productId': { $in: productIds } },
            { $pull: { products: { productId: { $in: productIds } } } },
        );
        await userModel.updateMany(
            { wishlist: { $in: productIds } },
            { $pull: { wishlist: { $in: productIds } } },
        );
    }

    await cacheIncrement(cacheKey('catalog', 'categories', 'version'));
    await cacheDelete(cacheKey('catalog', 'categories', 'all'));
    await cacheIncrement(cacheKey('catalog', 'subcategories', 'version'));
    await cacheDelete(cacheKey('catalog', 'subcategories', 'all'));
    await cacheIncrement(cacheKey('products', 'version'));
    await cacheDelete(cacheKey('products', 'home-feed'));
    return res.status(200).json({ message: 'Deleted', deleteCategory });
});

export const getCategory = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;

    const category = await findById({
        model: categoryModel,
        condition: { _id: categoryId },
        populate: [...populate]
    });

    if (!category) {
        return res.status(404).json({ message: "category not found" });
    }

    res.status(200).json({ message: "category found", category });
});
