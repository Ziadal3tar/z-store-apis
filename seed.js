import mongoose, { Types } from "mongoose";
import brandModel from "./DB/model/brand.model.js";
import productModel from "./DB/model/product.model.js";
import subCategoryModel from "./DB/model/subCategory.model.js";
import categoryModel from "./DB/model/category.model.js";

/* ================= CONFIG ================= */
const CREATED_BY = new Types.ObjectId("692c2572ee3abc595b987c3d");
const MONGO_URI = "mongodb+srv://ZiadAlmorsy:00241300@cluster0.mjwgrkh.mongodb.net/BeEcommerce";

/* ================= CATEGORY DATA ================= */
const CATEGORY_DATA = [
  {
    name: "T-Shirts",
    images: [
      "https://images.unsplash.com/photo-1523381294911-8d3cead13475",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c",
    ],
  },
  {
    name: "Shoes",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d",
    ],
  },
  {
    name: "Watches",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade",
    ],
  },
  {
    name: "Hoodies",
    images: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246",
    ],
  },
  {
    name: "Bags",
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
      "https://images.unsplash.com/photo-1593032465175-481ac7f401a0",
    ],
  },
  {
    name: "Caps",
    images: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
      "https://images.unsplash.com/photo-1562158070-622a5d4cba8a",
    ],
  },
  {
    name: "Jackets",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5",
      "https://images.unsplash.com/photo-1542060748-10c28b62716f",
    ],
  },
  {
    name: "Jeans",
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d",
      "https://images.unsplash.com/photo-1583001809873-a128495da465",
    ],
  },
  {
    name: "Sunglasses",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083",
      "https://images.unsplash.com/photo-1509695507497-903c140c43b0",
    ],
  },
  {
    name: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
      "https://images.unsplash.com/photo-1618354691373-63ccfef2e41b",
    ],
  },
];

const SUB_CATEGORIES = [
  "Men",
  "Women",
  "Unisex",
  "Sport",
  "Classic",
  "Casual",
  "Premium",
  "Limited",
  "Summer",
  "Winter",
];

const BRANDS = [
  "Nike",
  "Adidas",
  "Puma",
  "Zara",
  "H&M",
  "Levis",
  "Reebok",
  "Under Armour",
  "Diesel",
  "Tommy Hilfiger",
];

/* ================= SEED FUNCTION ================= */
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ DB Connected");

    /* ===== Clean Old Data ===== */
    await Promise.all([
      categoryModel.deleteMany(),
      subCategoryModel.deleteMany(),
      brandModel.deleteMany(),
      productModel.deleteMany(),
    ]);

    /* ===== Categories ===== */
    const categories = await categoryModel.insertMany(
      CATEGORY_DATA.map((c) => ({
        name: c.name,
        image: c.images[0],
        createdBy: CREATED_BY,
      }))
    );

    /* ===== SubCategories ===== */
    const subCategories = await subCategoryModel.insertMany(
      categories.map((cat, i) => ({
        name: SUB_CATEGORIES[i],
        image: CATEGORY_DATA[i].images[0],
        categoryId: cat._id,
        createdBy: CREATED_BY,
      }))
    );

    /* ===== Brands ===== */
    const brands = await brandModel.insertMany(
      BRANDS.map((b) => ({
        name: b,
        slug: b.toLowerCase().replace(/\s/g, "-"),
        image: `https://logo.clearbit.com/${b.toLowerCase().replace(/\s/g, "")}.com`,
        createdBy: CREATED_BY,
      }))
    );

    /* ===== Products (100) ===== */
    const products = [];

    for (let i = 1; i <= 100; i++) {
      const index = i % 10;

      products.push({
        name: `${brands[index].name} ${categories[index].name} ${i}`,
        slug: `${brands[index].slug}-${categories[index].name.toLowerCase()}-${i}`,
        description: `Original ${categories[index].name} by ${brands[index].name}, premium quality and perfect for everyday use.`,
        images: CATEGORY_DATA[index].images,
        stock: 20 + i,
        price: 500 + i * 10,
  
 finalPrice : Math.round((500 + i * 10 - 500 + i * 10 * i / 100) * 100) / 100,

        colors: ["black", "white", "blue"],
        sizes: ["sm", "md", "lg", "xl"],
        gender: "All",
        categoryId: categories[index]._id,
        subCategoryId: subCategories[index]._id,
        brandId: brands[index]._id,
        createdBy: CREATED_BY,
        tags: [categories[index].name, brands[index].name],
        sku: `${brands[index].name.toUpperCase()}-${i}`,
        attributes: [
          { key: "material", value: "Premium Fabric" },
          { key: "origin", value: "Imported" },
        ],
      });
    }

    await productModel.insertMany(products);

    console.log("🔥 Seed Completed Successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Seed Error:", error);
    process.exit(1);
  }
}

seed();
