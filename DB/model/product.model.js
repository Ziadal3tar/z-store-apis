import { Schema, model, Types } from "mongoose";

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, "product name is required"],
    min: [2, "minimum length 2 char"],
    max: [120, "max length 120 char"],
    trim: true,
  },
  slug: { type: String, index: true },
  description: {
    type: String,
    required: [true, "product description is required"],
    min: [20, "minimum length 20 char"],
    max: [2000, "max length 2000 char"],
  },
  images: {
    type: [String],
    required: [true, "product images are required"],
  },
  publicImagesIds: [String],
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  price: {
    type: Number,
    required: [true, "price is required"],
    min: 0,
  },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  isSpecial: { type: Boolean, default: false, index: true },
  finalPrice: Number,
  ratingAverage: { type: Number, default: 0, min: 0, max: 5, index: true },
  ratingCount: { type: Number, default: 0, min: 0 },
  viewCount: { type: Number, default: 0, min: 0, index: true },
  colors: { type: [String], default: [] },
  sizes: {
    type: [String],
    default: ["free"],
    enum: ["sm", "md", "lg", "xl", "free"],
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "All"],
  },
  categoryId: {
    type: Types.ObjectId,
    ref: "Category",
    required: [true, "categoryId is required"],
    index: true,
  },
  subCategoryId: {
    type: Types.ObjectId,
    ref: "subCategory",
    index: true,
  },
  brandId: {
    type: Types.ObjectId,
    ref: "Brand",
    index: true,
  },
  createdBy: {
    type: Types.ObjectId,
    ref: "User",
    required: [true, "createdBy is required"],
    index: true,
  },
  storeId: {
    type: Types.ObjectId,
    ref: "Store",
    index: true,
  },
  updateBy: {
    type: Types.ObjectId,
    ref: "User",
  },
  totalItems: { type: Number, default: 0 },
  soldItems: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  sku: { type: String, index: true, sparse: true },
  attributes: [{ key: String, value: String }],
  isPublished: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

productSchema.pre("save", function (next) {
  this.isSpecial = Number(this.discount || 0) >= 70;
  next();
});

productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  if (update.discount !== undefined) {
    update.isSpecial = Number(update.discount || 0) >= 70;
    this.setUpdate(update);
  }
  next();
});

productSchema.index({ createdAt: -1, isPublished: 1 });
productSchema.index({ isSpecial: 1, createdAt: -1 });
productSchema.index({ storeId: 1, createdAt: -1 });
productSchema.index({ finalPrice: 1, createdAt: -1 });
productSchema.index({ colors: 1, finalPrice: 1 });
productSchema.index({ isPublished: 1, stock: 1, ratingAverage: -1, createdAt: -1 });
productSchema.index({ isPublished: 1, discount: -1, createdAt: -1 });

const productModel = model("Product", productSchema);
export default productModel;
