<<<<<<< HEAD
import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  slug: { type: String, lowercase: true, index: true },
  description: { type: String },
  createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true }, // user has ONE store
  storeImage: { type: String },
  storeImageId: { type: String }, // cloudinary public_id
  categories: [{ type: mongoose.Types.ObjectId, ref: 'Category' }],
  storeSettings: {
    currency: { type: String, default: 'USD' },
    shipping: {
      enabled: { type: Boolean, default: true },
      methods: [{ name: String, price: Number, minDays: Number, maxDays: Number }]
    },
    isActive: { type: Boolean, default: true },
  },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

storeSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Store', storeSchema);
=======
import { Schema, model, Types } from "mongoose";

const storesSchema = new Schema({

    name: { required: true, type: String },
    storeImage: {
        type: String,
        default:'https://res.cloudinary.com/dqaf8jxn5/image/upload/v1673275524/1624304_pxkrmm.png'

    },
    storeImageId: [String],
    backGroundImage: {
        type: String,
        default:'https://res.cloudinary.com/dqaf8jxn5/image/upload/v1674919917/3969_f6buq4.jpg'
    },
    backGroundImageId: [String],
     createdBy: {
        type: Types.ObjectId,
        ref: "User"
    },
    storeProduct: [{
        type: Types.ObjectId,
        ref: "Product",
    }],
    title: { type: String },
    color: { type: String },

    followers: [
        {
            type: Types.ObjectId,
            ref: "User",
        },
    ],
    chats: [
        {
          type: Types.ObjectId,
          ref: "Chat",
        },
      ],
    socketID: String,

})
const storesModel = model('Store', storesSchema)
export default storesModel
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
