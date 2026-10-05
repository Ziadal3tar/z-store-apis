import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import connection from '../DB/connection.js';
import userModel from '../DB/model/user.model.js';
import categoryModel from '../DB/model/category.model.js';
import subCategoryModel from '../DB/model/subCategory.model.js';
import brandModel from '../DB/model/brand.model.js';
import productModel from '../DB/model/product.model.js';
import storeModel from '../DB/model/store.model.js';
import cartModel from '../DB/model/cart.model.js';
import orderModel from '../DB/model/order.model.js';
import couponModel from '../DB/model/coupon.model.js';
import reviewModel from '../DB/model/review.model.js';
import notificationModel from '../DB/model/notification.model.js';
import newsletterSubscriberModel from '../DB/model/newsletterSubscriber.model.js';

const PASSWORD = process.env.SEED_PASSWORD || 'ZStoreDemo#2026!';

const images = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900',
  'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?w=900',
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900',
];

const categoryData = [
  ['Fashion', 'Fashion for everyday and occasion-ready looks.'],
  ['Electronics', 'Smart devices and practical technology.'],
  ['Home & Living', 'Modern pieces for comfortable homes.'],
  ['Beauty', 'Personal care and beauty essentials.'],
  ['Sports', 'Training, running and active lifestyle gear.'],
  ['Accessories', 'Finishing touches for every style.'],
  ['Footwear', 'Sneakers, casual shoes and daily essentials.'],
  ['Gadgets', 'Useful compact devices for work and travel.'],
];

const subcategoryNames = [
  ['Men', 'Women', 'Outerwear'],
  ['Phones', 'Audio', 'Computers'],
  ['Furniture', 'Kitchen', 'Decor'],
  ['Skincare', 'Haircare', 'Fragrance'],
  ['Running', 'Training', 'Outdoor'],
  ['Watches', 'Bags', 'Sunglasses'],
  ['Sneakers', 'Casual', 'Performance'],
  ['Smart Home', 'Travel Tech', 'Office Tech'],
];

const brandNames = [
  'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Puma',
  'Zara', 'IKEA', 'Anker', 'Logitech', 'Mira', 'Nova',
  'Urban Lab', 'Aster', 'Vertex', 'North',
];

const productNames = [
  'Aero Runner', 'Core Hoodie', 'Essential Tee', 'Everyday Jacket',
  'Studio Headphones', 'Wireless Speaker', 'Smart Watch Pro', 'Ultra Phone',
  'Travel Backpack', 'Minimal Desk Lamp', 'Ceramic Set', 'Daily Sneakers',
  'Performance Shorts', 'Cloud Sofa', 'Glow Serum', 'Fresh Cologne',
  'Smart Hub', 'Mechanical Keyboard', 'Portable Charger', 'Trail Bottle',
];

const descriptions = [
  'A carefully selected Z-Store product designed for reliable everyday use and a clean modern experience.',
  'Premium materials, practical details and a versatile design make this a strong choice for daily routines.',
  'A refined product combining comfort, durability and a modern look for customers who value quality.',
];

const pick = (arr, index) => arr[index % arr.length];
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function createUser({ userName, email, role = 'User', storeId = undefined }) {
  const existing = await userModel.findOne({ email });
  if (existing) return existing;

  const user = new userModel({
    userName,
    email,
    password: PASSWORD,
    role,
    active: true,
    confirmEmail: true,
    country: 'Egypt',
    city: 'Cairo',
    phone: '01000000000',
    storeId,
    wishlist: [],
    loyaltyPoints: role === 'User' ? 750 : 0,
  });

  await user.save();
  return user;
}

async function main() {
  await connection();

  console.log('Clearing demo catalog and transactional demo data...');

  await Promise.all([
    reviewModel.deleteMany({}),
    orderModel.deleteMany({}),
    cartModel.deleteMany({}),
    notificationModel.deleteMany({}),
    newsletterSubscriberModel.deleteMany({}),
    productModel.deleteMany({}),
    subCategoryModel.deleteMany({}),
    categoryModel.deleteMany({}),
    brandModel.deleteMany({}),
    couponModel.deleteMany({}),
    storeModel.deleteMany({}),
    userModel.deleteMany({ email: /@zstore\.demo$/ }),
  ]);

  const admin = await createUser({
    userName: 'Z-Store Admin',
    email: 'admin@zstore.demo',
    role: 'Admin',
  });

  const seller = await createUser({
    userName: 'Z-Store Seller',
    email: 'seller@zstore.demo',
  });

  const customers = [];
  for (let i = 1; i <= 24; i += 1) {
    customers.push(await createUser({
      userName: `Customer ${String(i).padStart(2, '0')}`,
      email: `customer${i}@zstore.demo`,
    }));
  }

  const categories = [];
  for (let i = 0; i < categoryData.length; i += 1) {
    const category = await categoryModel.create({
      name: categoryData[i][0],
      image: pick(images, i),
      createdBy: admin._id,
    });
    categories.push(category);
  }

  const subCategories = [];
  for (let i = 0; i < categories.length; i += 1) {
    for (const name of subcategoryNames[i]) {
      subCategories.push(await subCategoryModel.create({
        name,
        image: pick(images, subCategories.length),
        createdBy: admin._id,
        categoryId: categories[i]._id,
      }));
    }
  }

  const brands = [];
  for (let i = 0; i < brandNames.length; i += 1) {
    brands.push(await brandModel.create({
      name: brandNames[i],
      slug: slug(brandNames[i]),
      image: pick(images, i + 2),
      createdBy: admin._id,
    }));
  }

  const store = await storeModel.create({
    name: 'Z-Store Select',
    slug: 'z-store-select',
    description: 'The official demo storefront with curated products.',
    createdBy: seller._id,
    storeImage: images[0],
    categories: categories.map(category => category._id),
    storeSettings: {
      currency: 'EGP',
      shipping: {
        enabled: true,
        methods: [
          { name: 'Standard', price: 60, minDays: 2, maxDays: 5 },
          { name: 'Express', price: 120, minDays: 1, maxDays: 2 },
        ],
      },
      isActive: true,
    },
    rating: 4.8,
  });

  seller.storeId = store._id;
  await seller.save();

  const products = [];
  for (let i = 0; i < 120; i += 1) {
    const category = categories[i % categories.length];
    const categorySubcategories = subCategories.filter(item => String(item.categoryId) === String(category._id));
    const subCategory = pick(categorySubcategories, i);
    const brand = brands[i % brands.length];
    const price = 180 + ((i * 137) % 4800);
    const discount = [0, 10, 15, 20, 25, 30, 40, 70, 75][i % 9];
    const soldItems = (i * 7) % 180;
    const totalItems = 30 + ((i * 11) % 170);

    const product = await productModel.create({
      name: `${pick(productNames, i)} ${i + 1}`,
      slug: `${slug(pick(productNames, i))}-${i + 1}`,
      description: pick(descriptions, i),
      images: [pick(images, i), pick(images, i + 3)],
      stock: Math.max(0, totalItems - soldItems),
      price,
      discount,
      isSpecial: discount >= 70,
      finalPrice: Number((price * (100 - discount) / 100).toFixed(2)),
      ratingAverage: Number((3.7 + ((i * 13) % 13) / 10).toFixed(1)),
      ratingCount: 5 + ((i * 3) % 120),
      viewCount: 20 + ((i * 31) % 1000),
      colors: ['Black', 'White', 'Blue'].slice(0, 1 + (i % 3)),
      sizes: ['sm', 'md', 'lg', 'xl'].slice(0, 2 + (i % 3)),
      gender: ['Male', 'Female', 'All'][i % 3],
      categoryId: category._id,
      subCategoryId: subCategory?._id,
      brandId: brand._id,
      createdBy: i % 5 === 0 ? seller._id : admin._id,
      storeId: store._id,
      totalItems,
      soldItems,
      tags: [category.name.toLowerCase(), brand.name.toLowerCase(), 'featured'],
      sku: `ZST-${String(i + 1).padStart(5, '0')}`,
      isPublished: i % 17 !== 0,
      attributes: [
        { key: 'Material', value: i % 2 ? 'Premium' : 'Standard' },
        { key: 'Warranty', value: '12 months' },
      ],
    });
    products.push(product);
  }

  const now = Date.now();
  const coupons = [
    ['WELCOME10', 10, 30],
    ['SAVE20', 20, 60],
    ['FLASH30', 30, 7],
    ['VIP15', 15, 90],
    ['FREESHIP', 12, 45],
    ['SUMMER25', 25, 21],
  ];

  for (const [name, amount, days] of coupons) {
    await couponModel.create({
      name,
      amount,
      expireIn: new Date(now + days * 86400000),
      isStopped: false,
      createdBy: admin._id,
    });
  }

  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    const selected = [
      products[(i * 3) % products.length],
      products[(i * 3 + 7) % products.length],
      products[(i * 3 + 14) % products.length],
    ];

    customer.wishlist = selected.slice(0, 1 + (i % 3)).map(product => product._id);
    await customer.save();

    const cart = await cartModel.create({
      userId: customer._id,
      products: i % 4 === 0
        ? selected.slice(0, 2).map(product => ({ productId: product._id, quantity: 1 + (i % 2) }))
        : [],
    });

    customer.cartId = cart._id;
    customer.cart = cart.products.length > 0;
    await customer.save();

    if (i < customers.length) {
      const items = selected.map((product, index) => ({
        productId: product._id,
        title: product.name,
        price: product.finalPrice,
        quantity: 1 + (index % 2),
        sku: product.sku,
        storeId: product.storeId,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = i % 3 === 0 ? 0 : 60;
      await orderModel.create({
        orderNumber: `ZST-DEMO-${String(i + 1).padStart(4, '0')}`,
        storeId: store._id,
        userId: customer._id,
        items,
        address: {
          firstName: customer.userName.split(' ')[0],
          lastName: 'Demo',
          phone: customer.phone,
          country: 'Egypt',
          city: 'Cairo',
          postalCode: '11511',
          street: 'Demo Street',
          building: String(10 + i),
          apartment: String(2 + (i % 8)),
        },
        subtotal,
        discount: i % 4 === 0 ? Number((subtotal * 0.1).toFixed(2)) : 0,
        shipping,
        total: Number((subtotal - (i % 4 === 0 ? subtotal * 0.1 : 0) + shipping).toFixed(2)),
        coupon: i % 4 === 0 ? 'WELCOME10' : undefined,
        status: ['pending', 'confirmed', 'paid', 'shipped', 'delivered'][i % 5],
        payment: {
          method: 'cash-on-delivery',
          status: i % 5 === 4 ? 'paid' : 'pending',
        },
      });
    }

    await notificationModel.create({
      userId: customer._id,
      type: i % 2 ? 'system' : 'order-shipped',
      title: i % 2 ? 'Welcome to Z-Store' : 'Your demo order is on the way',
      message: i % 2
        ? 'Your demo account is ready. Explore the catalog and try the complete shopping flow.'
        : 'This notification is included in the demo seed to showcase the notification center.',
      isRead: i % 3 === 0,
    });

    await newsletterSubscriberModel.create({
      email: `subscriber${i + 1}@demo.zstore.local`,
      active: true,
    });
  }

  for (let i = 0; i < Math.min(40, products.length); i += 1) {
    const customer = customers[i % customers.length];
    await reviewModel.create({
      productId: products[i]._id,
      userId: customer._id,
      orderId: (await orderModel.findOne({ userId: customer._id }))?._id,
      rating: 3 + (i % 3),
      comment: [
        'Excellent demo product with a clean shopping experience.',
        'Good quality and the delivery flow is easy to understand.',
        'The product looks great and matches the information shown.',
      ][i % 3],
      helpfulCount: i * 2,
    });
  }

  console.log('\nZ-Store demo seed completed.');
  console.log('Admin:    admin@zstore.demo');
  console.log('Seller:   seller@zstore.demo');
  console.log('Customer: customer1@zstore.demo');
  console.log(`Password: ${PASSWORD}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Subcategories: ${subCategories.length}`);
  console.log(`Brands: ${brands.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Customers: ${customers.length}`);
  console.log(`Orders: ${customers.length}`);
  console.log('Coupons: 6');

  await mongoose.disconnect();
}

main().catch(async error => {
  console.error('Seed failed:', error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
