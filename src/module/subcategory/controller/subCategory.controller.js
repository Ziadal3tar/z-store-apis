import userModel from '../../../../DB/model/user.model.js'
import { asyncHandler } from '../../../services/asyncHandler.js';
import { findById, findByIdAndDelete, findOneAndUpdate, findOne, create, find, findByIdAndUpdate } from '../../../../DB/DBMethods.js';
import cloudinary from '../../../services/cloudinary.js'
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";
import categoryModel from '../../../../DB/model/category.model.js';
import subCategoryModel from '../../../../DB/model/subCategory.model.js';
import productModel from '../../../../DB/model/product.model.js';
import cartModel from '../../../../DB/model/cart.model.js';
import { cacheGet, cacheSet, cacheDelete, cacheIncrement, cacheKey } from '../../../services/cache.service.js';
const populate = [
    {
        path: "createdBy",
        select: ["userName", "email"]

    },
    {
        path: "categoryId",
        select: ["name"]

    },
];

export const addSubCategory = asyncHandler(async (req, res, next) => {
    let { categoryId } = req.params
    let category = await findById({ model: categoryModel, condition: categoryId })
    if (!category) {
    res.status(404).json({message:"Category not found"})

    } else {
        if (!req.file) {
    res.status(422).json({message:"you have to upload an image"})

        } else {
            let { name } = req.body
            let { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
                folder: "category/subCategory"
            });
            let result;
            try {
                result = await create({ model: subCategoryModel, data: { name, image: secure_url, createdBy: req.user._id, public_id, categoryId } });
            } catch (error) {
                await destroyCloudinaryAsset(public_id);
                throw error;
            }
            await cacheIncrement(cacheKey('catalog', 'subcategories', 'version'));
            await cacheDelete(cacheKey('catalog', 'subcategories', 'all'));
            res.status(201).json({ message: "created", result })
        }
    }
})

export const UpdateSubCategory = asyncHandler(async (req, res) => {
    const { subCategoryId } = req.params;
    const subCategory = await findById({ model: subCategoryModel, condition: subCategoryId });

    if (!subCategory) {
        return res.status(404).json({ message: "subcategory not found" });
    }

    const name = !req.body.name || req.body.name === "undefined"
        ? subCategory.name
        : String(req.body.name).trim();

    let image = subCategory.image || "";
    let public_id = subCategory.public_id || "";
    let newPublicId = "";

    if (req.file) {
        const upload = await cloudinary.uploader.upload(req.file.path, {
            folder: "category/subCategory",
        });
        image = upload.secure_url;
        public_id = upload.public_id;
        newPublicId = upload.public_id;
    }

    try {
        const updatedSubCategory = await findByIdAndUpdate({
            model: subCategoryModel,
            condition: subCategoryId,
            data: { name, image, public_id },
            options: { new: true, runValidators: true },
        });

        if (!updatedSubCategory) {
            if (newPublicId) await destroyCloudinaryAsset(newPublicId);
            return res.status(404).json({ message: "subcategory not found" });
        }

        if (newPublicId && subCategory.public_id && subCategory.public_id !== newPublicId) {
            await destroyCloudinaryAsset(subCategory.public_id);
        }

        await cacheIncrement(cacheKey('catalog', 'subcategories', 'version'));
            await cacheDelete(cacheKey('catalog', 'subcategories', 'all'));
        await cacheIncrement(cacheKey('products', 'version'));
        await cacheDelete(cacheKey('products', 'home-feed'));

        return res.status(200).json({ message: 'SubCategory is updated', updatedSubCategory });
    } catch (error) {
        if (newPublicId) await destroyCloudinaryAsset(newPublicId);
        throw error;
    }
});
export const allSubCategoriesFromCategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;

    const allSubCategories = await subCategoryModel
        .find({ categoryId })
        .select('_id name image public_id categoryId createdBy createdAt updatedAt')
        .populate(populate)
        .sort({ createdAt: -1 })
        .lean();

    if (!allSubCategories.length) {
        return res.status(404).json({ message: 'no SubCategories' });
    }

    return res.status(200).json({
        message: 'All Sub Categories',
        allSubCategories,
    });
});

export const removeSubCategory = async (req, res, next) => {
    const { subCategoryId } = req.params
    console.log(subCategoryId);
    
    let deleteSubCategory = await findByIdAndDelete({ model: subCategoryModel, condition: {_id:subCategoryId} })
    if (!deleteSubCategory) {
        res.status(404).json({message:"SubCategory not found"})

    } else {
        const products = await find({ model: productModel, condition: { subCategoryId: subCategoryId } });
        const productIds = products.map(product => product._id);

        for (const product of products) {
            await findByIdAndDelete({ model: productModel, condition: product._id });
            if (Array.isArray(product.publicImagesIds) && product.publicImagesIds.length) {
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

        if (deleteSubCategory.public_id) {
            await destroyCloudinaryAsset(deleteSubCategory.public_id);
        }
        await cacheIncrement(cacheKey('catalog', 'subcategories', 'version'));
            await cacheDelete(cacheKey('catalog', 'subcategories', 'all'));
        await cacheIncrement(cacheKey('products', 'version'));
        await cacheDelete(cacheKey('products', 'home-feed'));
        res.status(200).json({ message: "deleted", deleteSubCategory })
    }

}
export const allSubCategory = asyncHandler(async (req, res) => {
    const pageRequested = req.query.page != null || req.query.size != null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = Math.min(50, Math.max(1, Number(req.query.size) || 10));
    const version = Number(await cacheGet(cacheKey('catalog', 'subcategories', 'version')) ?? 0);
    const key = pageRequested
        ? cacheKey('catalog', 'subcategories', version, page, size)
        : cacheKey('catalog', 'subcategories', version, 'all');

    const cached = await cacheGet(key);
    if (cached) {
        return res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=180').status(200).json(cached);
    }

    const skip = pageRequested ? (page - 1) * size : 0;
    const [allSubCategories, total] = await Promise.all([
        subCategoryModel.find({})
            .select('_id name image public_id categoryId createdBy createdAt updatedAt')
            .populate(populate)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageRequested ? size : 0)
            .lean(),
        subCategoryModel.countDocuments(),
    ]);

    const totalPages = pageRequested ? Math.ceil(total / size) : 1;
    const payload = {
        message: 'All SubCategories',
        allSubCategories,
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

export const getSubCategory = asyncHandler(async (req, res) => {
    const { subCategoryId } = req.params;

    const data = await subCategoryModel
        .findById(subCategoryId)
        .populate(populate)
        .lean();

    if (!data) {
        return res.status(404).json({ message: 'subCategory not Found' });
    }

    return res.status(200).json({
        message: 'data',
        allData: [data],
    });
});
