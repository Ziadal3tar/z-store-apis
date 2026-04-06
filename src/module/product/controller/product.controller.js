<<<<<<< HEAD
// src/controllers/product.controller.js
import slugify from "slugify";
import { create, find, findById, findByIdAndDelete, findByIdAndUpdate } from "../../../../DB/DBMethods.js";
import productModel from "../../../../DB/model/product.model.js";
import cloudinary from "../../../services/cloudinary.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import { paginate } from "../../../services/pagination.js";

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
  const storeIdParam = req.params.storeId ?? null;

  const categoryIdBody = req.body.categoryId ?? null;
  const storeIdBody = req.body.storeId ?? null;

  const storeFromUser = req.user?.storeId ?? null;

  const categoryId = categoryIdParam || categoryIdBody || null;
  const storeId = storeIdParam || storeIdBody || storeFromUser || null;

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

export const allProduct = asyncHandler(async (req, res, next) => {
  const { limit, skip } = paginate(req.query.page, req.query.size);
  const products = await find({
    model: productModel,
    limit,
    skip,
    populate
  });

  if (!products || products.length === 0) return res.status(404).json({ message: "No products found" });

  res.status(200).json({ message: "All products", products });
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
=======
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
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
