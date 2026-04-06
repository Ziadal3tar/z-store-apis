import userModel from '../../../../DB/model/user.model.js'
import { asyncHandler } from '../../../services/asyncHandler.js';
import { findById, findByIdAndDelete, findOneAndUpdate, findOne, create, find, findByIdAndUpdate } from '../../../../DB/DBMethods.js';
import cloudinary from '../../../services/cloudinary.js'
import categoryModel from '../../../../DB/model/category.model.js';
import subCategoryModel from '../../../../DB/model/subCategory.model.js';
import { paginate } from '../../../services/pagination.js';
import productModel from '../../../../DB/model/product.model.js';
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

    const result = await create({
        model: categoryModel,
        data: {
            name,
            image,
            public_id,
            createdBy: req.user._id
        }
    });

    const populatedResult = await findById({
        model: categoryModel,
        condition: { _id: result._id },
        populate: [...populate]
    });

    res.status(201).json({ message: "created", result: populatedResult });
});

export const UpdateCategory = asyncHandler(async (req, res, next) => {
    const { _id } = req.params;

    let category = await findById({ model: categoryModel, condition: { _id } });

    if (!category) {
        return res.status(404).json({ message: "category not found" });
    }

    if (!req.body.name || req.body.name === "undefined") {
        req.body.name = category.name;
    }

    if (req.file) {
        const upload = await cloudinary.uploader.upload(req.file.path, {
            folder: "category"
        });
        req.body.image = upload.secure_url;
        req.body.public_id = upload.public_id;

        if (category.public_id) {
            try {
                await cloudinary.uploader.destroy(category.public_id);
            } catch (err) {
                console.warn("Failed to destroy old category image:", err.message || err);
            }
        }
    } else {
        req.body.image = category.image || "";
        req.body.public_id = category.public_id || "";
    }

    let updatedCategory = await findByIdAndUpdate({
        model: categoryModel,
        condition: { _id },
        data: req.body,
        options: { new: true }
    });

    const populatedUpdated = await findById({
        model: categoryModel,
        condition: { _id: updatedCategory._id },
        populate: [...populate]
    });

    res.status(200).json({ message: 'Category is updated', updatedCategory: populatedUpdated });
});

export const allCategories = asyncHandler(async (req, res, next) => {
    // let { limit, skip } = paginate(req.query.page, req.query.size);

    const categories = await find({
        model: categoryModel,
       
        populate: [...populate]
    });

    if (!categories || categories.length === 0) {
        return res.status(404).json({ message: "no categories" });
    }

    res.status(200).json({ message: "All categories", categories });
});

export const removeCategory = asyncHandler(async (req, res, next) => {
    const { _id } = req.params;
    const category = await findById({ model: categoryModel, condition: { _id } });

    if (!category) {
        return res.status(404).json({ message: 'Category not found' });
    }

    if (category.public_id) {
        try {
            await cloudinary.uploader.destroy(category.public_id);
        } catch (err) {
            console.warn("Failed to destroy category image:", err.message || err);
        }
    }

    const deleteCategory = await findByIdAndDelete({ model: categoryModel, condition: { _id } });

    let SubCategories = await find({ model: subCategoryModel, condition: { categoryId: _id } });
    for (let i = 0; i < SubCategories.length; i++) {
        const element = SubCategories[i];
        if (element.public_id) {
            try {
                await cloudinary.uploader.destroy(element.public_id);
            } catch (err) {
                console.warn("Failed to destroy subcategory image:", err.message || err);
            }
        }
        await findByIdAndDelete({ model: subCategoryModel, condition: element._id });
    }

    let products = await find({ model: productModel, condition: { categoryId: _id } });
    for (let i = 0; i < products.length; i++) {
        const element = products[i];
        if (element.public_id) {
            try {
                await cloudinary.uploader.destroy(element.public_id);
            } catch (err) {
                console.warn("Failed to destroy product image:", err.message || err);
            }
        }
        await findByIdAndDelete({ model: productModel, condition: element._id });
    }

    res.json({ message: 'Deleted', deleteCategory });
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
