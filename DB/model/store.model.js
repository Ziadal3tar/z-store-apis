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
