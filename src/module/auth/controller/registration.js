import userModel from '../../../../DB/model/user.model.js';
import { sendEmail } from '../../../services/email.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../../services/asyncHandler.js';
import {
  findById,
  findByIdAndDelete,
  findOneAndUpdate,
  findOne,
  find,
  findByIdAndUpdate,
  create,
  findOneAndDelete,
  findByIdAndUpdate as _findByIdAndUpdate // (if helper has different signature)
} from '../../../../DB/DBMethods.js';
import cloudinary from '../../../services/cloudinary.js';
import { destroyCloudinaryAsset } from "../../../services/cloudinary.safe.js";
import adminModel from '../../../../DB/model/admin.model.js';
import cartModel from '../../../../DB/model/cart.model.js';
import storesModel from '../../../../DB/model/store.model.js';
import productModel from '../../../../DB/model/product.model.js';
import { cacheDelete, cacheKey } from '../../../services/cache.service.js';

const adminpopulate = [
  {
    path: "adminId",
    select: ["userName", "email", "profilePic"],
  },
];

const allUserpopulate = [
  { path: "wishlist" },
  { path: "cartId" },
];

const userProductSelect =
  "_id name images stock price discount finalPrice ratingAverage sku categoryId subCategoryId brandId storeId createdAt updatedAt";

const userpopulate = [
  {
    path: "wishlist",
    select: userProductSelect,
    options: { lean: true },
  },
  {
    path: "cartId",
    select: "_id userId products createdAt updatedAt",
    populate: {
      path: "products.productId",
      select: userProductSelect,
      options: { lean: true },
    },
  },
];

export const signUp = asyncHandler(async (req, res, next) => {
  const { userName, email, password } = req.body;

  const user = await findOne({ model: userModel, condition: { email } });
  if (user) {
    return res.status(409).json({ message: 'this email already register' });
  }

  const addUser = new userModel({
    userName,
    email,
    password,
    confirmEmail: true,
    profilePic:
      'https://res.cloudinary.com/dqaf8jxn5/image/upload/v1695326721/img_218090.png_vbwgzw.png',
  });

  const savedUser = await addUser.save();
  await cacheDelete(cacheKey('admin-summary'));
  res.status(201).json({ message: "added successfully", savedUser });
});

export const confirmEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const decoded = jwt.verify(token, process.env.emailToken);

  if (!decoded || !decoded.id) {
    return res.status(400).json({ message: 'invalid token data' });
  }

  const updatedUser = await findOneAndUpdate({
    model: userModel,
    condition: { _id: decoded.id, confirmEmail: false },
    data: { confirmEmail: true },
    options: { new: true },
  });

  if (updatedUser) {
    return res.redirect("https://ziadal3tar.github.io/Ecommerce-Z-store");
  }

  res.status(404).json({ message: 'invalid data token' });
});

export const resendConfirmEmail = asyncHandler(async (req, res, next) => {
  // expects a token param (previous/expired token) and will resend confirmation based on decoded id
  const { token: oldToken } = req.params;

  if (!oldToken) {
    return res.status(400).json({ message: 'invalid token data' });
  }

  const decoded = jwt.verify(oldToken, process.env.emailToken);
  if (!decoded || !decoded.id) {
    return res.status(400).json({ message: 'invalid token data' });
  }

  const userRecord = await findById({ model: userModel, condition: { _id: decoded.id }, select: "email" });
  if (!userRecord) {
    return res.status(404).json({ message: 'user not found' });
  }

  const newToken = jwt.sign({ id: decoded.id, isLoggedIn: true }, process.env.emailToken, {
    expiresIn: '1h',
  });
  const refreshToken = jwt.sign({ id: decoded.id, isLoggedIn: true }, process.env.emailToken, {
    expiresIn: 60 * 60 * 24,
  });

  const link = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${newToken}`;
  const refreshLink = `${req.protocol}://${req.headers.host}/auth/refreshToken/${refreshToken}`;

  const message = `please verify your email <a href="${link}" > here </a>
                    <br/>
                    to refresh token please click <a href="${refreshLink}" > here </a>
                   `;

  await sendEmail(userRecord.email, "confirm to register", message);
  res.status(200).json({ message: "confirmation email resent" });
});

export const logIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await findOne({ model: userModel, condition: { email } });

  if (!user) {
    return res.status(404).json({ message: 'You have to register first' });
  }

  const compare = bcrypt.compareSync(password, user.password, parseInt(process.env.SALTROUND));
  if (!compare) {
    return res.status(400).json({ message: 'In-valid password' });
  }

  if (!user.confirmEmail) {
    return res.status(400).json({ message: 'You have to confirm email first' });
  }

  const token = jwt.sign({ id: user._id, isLoggedIn: true }, process.env.tokenSignature, {
    expiresIn: 60 * 60 * 24 * 2,
  });

  const userSnapshot = await userModel
    .findById(user._id)
    .select('_id userName email phone role profilePic cart cartId storeId loyaltyPoints country city postCode postalCode street building apartment')
    .lean();

  res.status(200).json({
    message: 'welcome',
    token,
    id: user._id,
    user: userSnapshot,
  });
});

export const allUser = asyncHandler(async (req, res, next) => {
  const users = await userModel
    .find({})
    .select('_id userName email phone role profilePic blocked confirmEmail storeId createdAt')
    .sort({ createdAt: -1 })
    .lean();
  if (!users || users.length === 0) {
    return res.status(404).json({ message: 'no users' });
  }
  res.status(200).json({ message: "All users", users });
});

export const removeUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;
  const user = await findById({ model: userModel, condition: { _id } });

  if (!user) {
    return res.status(400).json({ message: "user not found" });
  }

  // remove from admin model if needed
  if (user.role === "Admin") {
    await findOneAndDelete({ model: adminModel, condition: { adminId: _id } });
  }

  // delete cart
  if (user.cartId) {
    await findByIdAndDelete({ model: cartModel, condition: { _id: user.cartId } });
  } else {
    await findOneAndDelete({ model: cartModel, condition: { userId: _id } });
  }

  // delete store and its products
  if (user.storeId) {
    const storeId = user.storeId;
    const store = await findById({ model: storesModel, condition: storeId });
    const storeProducts = await productModel.find({ storeId }).select('_id publicImagesIds').lean();
    for (const product of storeProducts) {
      await findByIdAndDelete({ model: productModel, condition: product._id });
      if (Array.isArray(product.publicImagesIds) && product.publicImagesIds.length) {
        await Promise.all(product.publicImagesIds.map((id) => destroyCloudinaryAsset(id)));
      }
    }
    await findByIdAndDelete({ model: storesModel, condition: storeId });
    if (store?.storeImageId) {
      await destroyCloudinaryAsset(store.storeImageId);
    }
  }

  const deletedUser = await findByIdAndDelete({ model: userModel, condition: { _id } });

  if (deletedUser) {
    if (user.public_id) {
      await destroyCloudinaryAsset(user.public_id);
    }
    return res.status(200).json({ message: "deleted", deletedUser });
  }

  res.status(400).json({ message: "user not deleted" });
});

export const blockUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;

  const user = await findById({ model: userModel, condition: { _id } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.confirmEmail) {
    return res.status(400).json({ message: "User not confirmed" });
  }

  const updatedRole = await findByIdAndUpdate({
    model: userModel,
    condition: { _id },
    data: { blocked: !user.blocked },
    options: { new: true },
  });

  res.json({ message: "Done", updatedRole });
});

export const updateRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  const user = await findById({ model: userModel, condition: { _id: userId } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.confirmEmail) {
    return res.status(400).json({ message: "User not confirmed" });
  }

  const updatedRole = await findByIdAndUpdate({
    model: userModel,
    condition: { _id: userId },
    data: { role: "Admin" },
    options: { new: true },
  });

  res.json({ message: "Admin is added", updatedRole });
});


export const getMe = asyncHandler(async (req, res) => {
  const user = await userModel
    .findById(req.user._id)
    .select('_id userName email phone role profilePic cart cartId storeId wishlist loyaltyPoints country city postCode postalCode street house building entrance floor apartment comment DOB createdAt updatedAt')
    .populate({
      path: 'wishlist',
      select: userProductSelect,
      options: { lean: true },
    })
    .populate({
      path: 'cartId',
      select: '_id userId products createdAt updatedAt',
      populate: {
        path: 'products.productId',
        select: userProductSelect,
        options: { lean: true },
      },
    })
    .lean();

  if (!user) return res.status(404).json({ message: 'user not found' });
  res.status(200).json({ message: 'user', user });
});

export const getUser = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const decoded = jwt.verify(token, process.env.tokenSignature);

  const user = await findById({
    model: userModel,
    condition: decoded.id,
    select: "_id userName email phone role profilePic cart cartId storeId wishlist",
    populate: [...userpopulate],
  });

  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  res.status(200).json({ message: "user", user });
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;

  const user = await findById({
    model: userModel,
    condition: _id,
    populate: [...userpopulate],
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ message: "user", user });
});

export const editProfilePic = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(422).json({ message: "you have to upload an image" });
  }

  const id = req.user._id;
  const current = await userModel.findById(id).select('public_id').lean();
  const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: "usersImages" });

  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { profilePic: uploadRes.secure_url, public_id: uploadRes.public_id },
      { new: true, runValidators: true, select: '_id userName email phone role profilePic public_id' },
    ).lean();

    if (!updatedUser) {
      await destroyCloudinaryAsset(uploadRes.public_id);
      return res.status(404).json({ message: "user not found" });
    }

    if (current?.public_id && current.public_id !== uploadRes.public_id) {
      await destroyCloudinaryAsset(current.public_id);
    }

    return res.status(200).json({ message: "updated", result: updatedUser });
  } catch (error) {
    await destroyCloudinaryAsset(uploadRes.public_id);
    throw error;
  }
});

export const addAdmin = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;
  const admin = await findOne({ model: adminModel, condition: { adminId: _id } });

  if (admin) {
    await findByIdAndUpdate({
      model: userModel,
      condition: { _id },
      data: { role: "User" },
    });
    await findByIdAndDelete({ model: adminModel, condition: admin._id });
    return res.status(200).json({ message: "removed" });
  }

  const user = await findByIdAndUpdate({
    model: userModel,
    condition: { _id },
    data: { role: "Admin" },
  });

  if (!user) {
    return res.status(400).json({ message: "user not found" });
  }

  req.body.adminId = user._id;
  const addAdmin = await create({ model: adminModel, data: req.body });
  res.status(200).json({ message: "added", addAdmin });
});

export const removeAdmin = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;
  const admin = await findOne({ model: adminModel, condition: { adminId: _id } });

  if (!admin) {
    return res.status(200).json({ message: "already admin", admin });
  }

  const user = await findByIdAndUpdate({
    model: userModel,
    condition: { _id },
    data: { role: "User" },
  });

  if (!user) {
    return res.status(400).json({ message: "user not found" });
  }

  await findByIdAndDelete({ model: adminModel, condition: _id });
  res.status(200).json({ message: "deleted" });
});

export const searchUser = asyncHandler(async (req, res, next) => {
  const name = req.body.name || '';
  const currentUserId = req.user._id;

  // use regex search to let DB handle it and exclude the current user
  const matchedUsers = await userModel.find({
    userName: { $regex: name, $options: 'i' },
    _id: { $ne: currentUserId },
  });

  if (!matchedUsers || matchedUsers.length === 0) {
    return res.status(200).json({ message: "not found", allUser: [] });
  }

  res.status(200).json({ message: "users", allUser: matchedUsers });
});

export const getAllAdmins = asyncHandler(async (req, res, next) => {
  const admins = await find({ model: adminModel, populate: [...adminpopulate] });
  if (!admins || admins.length === 0) {
    return res.status(404).json({ message: "admins not found" });
  }
  res.status(200).json({ message: "admins", admins });
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (String(req.user._id) !== String(id) && req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const user = await findById({ model: userModel, condition: id });

  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  if (req.body.type === "email") {
    const newEmail = req.body.email;
    if (user.email === newEmail) {
      return res.status(404).json({ message: "same email" });
    }

    const updatedEmail = await findByIdAndUpdate({
      model: userModel,
      condition: { _id: id },
      data: { email: newEmail },
      options: { new: true },
    });

    return res.status(200).json({ message: "email is updated", updatedEmail });
  } else if (req.body.type === "password") {
    const SALTROUND = parseInt(process.env.SALTROUND);
    const { oldPassword, newPassword } = req.body;

    const compareOld = bcrypt.compareSync(oldPassword, user.password, SALTROUND);
    if (!compareOld) {
      return res.status(404).json({ message: "password is incorrect" });
    }

    const sameAsOld = bcrypt.compareSync(newPassword, user.password, SALTROUND);
    if (sameAsOld) {
      return res.status(404).json({ message: "inter new password" });
    }

    const hashPassword = bcrypt.hashSync(newPassword, SALTROUND);
    const updatedPassword = await findByIdAndUpdate({
      model: userModel,
      condition: { _id: id },
      data: { password: hashPassword },
      options: { new: true },
    });

    return res.status(200).json({ message: "password is updated", updatedPassword });
  }

  res.status(400).json({ message: "invalid update type" });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'phone', 'DOB', 'country', 'city', 'postCode', 'postalCode',
    'street', 'house', 'building', 'entrance', 'floor', 'apartment', 'comment',
  ];

  const data = Object.fromEntries(
    allowed
      .filter((key) => req.body?.[key] !== undefined)
      .map((key) => [key, typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key]]),
  );

  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName = String(req.body?.lastName ?? '').trim();
  if (firstName || lastName) {
    data.userName = `${firstName} ${lastName}`.trim();
  }

  const user = await userModel
    .findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true })
    .select('_id userName email phone role blocked profilePic DOB country city postCode postalCode street house building entrance floor apartment comment loyaltyPoints wishlist cart cartId storeId createdAt updatedAt')
    .populate({ path: 'wishlist', select: userProductSelect, options: { lean: true } })
    .populate({ path: 'cartId', select: '_id userId products createdAt updatedAt', populate: { path: 'products.productId', select: userProductSelect, options: { lean: true } } })
    .lean();

  if (!user) return res.status(404).json({ message: 'user not found' });
  res.status(200).json({ message: 'profile updated', user });
});

export const sendEmaiil = asyncHandler(async (req, res, next) => {
  // kept original export name to avoid breaking existing callers
  const { text, email } = req.body;
  const message = `${text} from ${email}`;
  const emailRes = await sendEmail(email, "confirm to register", message);

  if (emailRes && emailRes.accepted && emailRes.accepted.length) {
    return res.status(201).json({ message: "sended" });
  }
  res.status(404).json({ message: "invalid email" });
});
