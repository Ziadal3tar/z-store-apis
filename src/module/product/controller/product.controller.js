import slugify from "slugify";
import { create, find, findById, findByIdAndDelete, findByIdAndUpdate, findOne } from "../../../../DB/DBMethods.js";
import brandModel from "../../../../DB/model/brand.model.js";
import categoryModel from "../../../../DB/model/category.model.js";
import productModel from "../../../../DB/model/product.model.js";
import storesModel from "../../../../DB/model/store.model.js";
import subCategoryModel from "../../../../DB/model/subCategory.model.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import cloudinary from "../../../services/cloudinary.js";
import { paginate } from "../../../services/pagination.js";
const populate = [
  {
    path: "storeId",
  },
  {
    path: "categoryId",
  },
  {
    path: "createdBy",
    select: ["userName", "email"]
  },
  {
    path: "subCategoryId",
  },
  {
    path: "brandId",
  },

];
const productsPop = [
  {
    path: "storeId",
  },
  {
    path: "categoryId",
  },
  {
    path: "createdBy",
    select: ["userName", "email"]
  },
  {
    path: "subCategoryId",
  },
  {
    path: "brandId",
  },

];

export const addProduct = asyncHandler(async (req, res, next) => {
  let { categoryId, subCategoryId, brandId } = req.params;
  let foundedSubCategory = await findOne({ model: subCategoryModel, condition: { subCategoryId, categoryId } });

  if (!foundedSubCategory) {

    res.status(404).json({message:"SubCategory or category is not found"})

  } else {

    let brand = await findById({ model: brandModel, condition: brandId });
    // res.status(400).json({message:"error when insert to DB"})

    if (!brand) {
    res.status(404).json({message:"brand not found"})

    } else {
      if (!req.files?.length) {
    res.status(400).json({message:"you have to add some images"})

      } else {
        let { name, discount, price, totalItems } = req.body;
        req.body.slug = slugify(name);
        req.body.stock = totalItems;
        req.body.finalPrice = price - (price * discount || 0) / 100;
        req.body.categoryId = categoryId;
        req.body.subCategoryId = subCategoryId;
        req.body.brandId = brandId;
        req.body.createdBy = req.user._id;
        req.body.soldItems = 0;

        let imagesURL = [];
        let imageIds = [];

        for (const file of req.files) {
          let { secure_url, public_id } = await cloudinary.uploader.upload(file.path, { folder: "brands/products" });
          imagesURL.push(secure_url)
          imageIds.push(public_id);
        }
        req.body.images = imagesURL;
        req.body.publicImagesIds = imageIds;

        if (req.user.role == 'User') {
          req.body.createdBy = req.user._id
          req.body.storeId = req.user.storeId

        }

        let product = await create({ model: productModel, data: req.body })

        if (!product) {
          for (const id of imageIds) {
            await cloudinary.uploader.destroy(id)
          }
    res.status(400).json({message:"error when insert to DB"})

        } else {
          if (product.storeId) {
            let store = await findById({ model: storesModel, condition: product.storeId })
            store.storeProduct = store.storeProduct.push(product._id)
            let updatedStore = await findByIdAndUpdate({ model: storesModel, condition: product.storeId, data: { storeProduct: store.storeProduct }, options: { new: true } })

            if (updatedStore) {
              return res.status(201).json({ message: "Created", product })

            }
          }
          res.status(201).json({ message: "Created", product })

        }

      }



    }
  }


})
export const updateProduct = asyncHandler(async (req, res, next) => {
  let { productId } = req.params;
  let product = await findById({ model: productModel, condition: productId });
  if (!product) {
    res.status(404).json({message:"product id not found"})

  } else {
    let { price, discount, name, totalItems } = req.body
    if (name) {
      req.body.slug = slugify(name);
    }
    if (price && discount) {
      req.body.finalPrice = price - (price * discount) / 100;
    } else if (price) {
      req.body.finalPrice = price - (price * product.discount) / 100;
    } else if (discount) {
      req.body.finalPrice = product.price - (product.price * discount) / 100;
    }
    if (totalItems) {
      let currentStock = totalItems - product.soldItems;
      req.body.stock = currentStock > 0 ? currentStock : 0
    }

    if (req.files?.length) {
      let imagesURL = [];
      let imageIds = [];
      for (const file of req.files) {
        let { secure_url, public_id } = await cloudinary.uploader.upload(file.path, { folder: "brands/products" });
        imagesURL.push(secure_url);
        imageIds.push(public_id);
      }
      req.body.images = imagesURL;
      req.body.publicImagesIds = imageIds;
    }
    req.body.updateBy = req.user._id

    let updatedProduct = await findByIdAndUpdate({
      model: productModel,
      condition: { _id: productId },
      data: req.body,
      options: { new: true }
    });
    if (!updatedProduct) {
      if (req.body.publicImagesIds) {
        for (const id of req.body.publicImagesIds) {
          await cloudinary.uploader.destroy(id)
        }
      }
    res.status(400).json({message:"DB error"})

    } else {

      if (req.body.publicImagesIds) {
        for (const id of product.publicImagesIds) {
          await cloudinary.uploader.destroy(id);
        }
      }

      res.status(200).json({ message: "updated" })
    }

  }
});
export const removeProduct = asyncHandler(async (req, res, next) => {
  let { productId } = req.params;
  let product = await findByIdAndDelete({ model: productModel, condition: productId });
  if (!product) {
    res.status(404).json({message:"product not found"})

  } else {

    res.status(200).json({ message: "updated" })
  }

})
export const getProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const product = await findById({ model: productModel, condition: id })
  if (!product) {
    res.status(404).json({message:"product not found"})

  } else {
    res.status(200).json({ message: "product", product })
  }
})
export const allProduct = asyncHandler(async (req, res, next) => {
  let { limit, skip } = paginate(req.query.page, req.query.size)
  const products = await find({ model: productModel, limit, skip, populate: [...populate] })
  if (!products) {
    res.status(404).json({message:"no products"})

  } else {
    res.status(200).json({ message: "All products", products })
  }
})
export const getSpecialProduct = asyncHandler(async (req, res, next) => {
  let products = await find({ model: productModel, condition: { isSpecial: true }, populate: [...populate] })
  res.status(200).json({ message: "All products", products })
})
export const getStoresProducts = asyncHandler(async (req, res, next) => {
  let {id} = req.params
  let products = await find({model:productModel,condition:{storeId:id}})
  res.status(200).json({ message: "All products", products })
})
