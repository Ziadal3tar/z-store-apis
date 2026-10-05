import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    sku: { type: String },
    storeId: { type: mongoose.Types.ObjectId, ref: 'Store' },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    phone: String,
    country: String,
    city: String,
    postalCode: String,
    street: String,
    building: String,
    apartment: String,
    note: String,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    storeId: { type: mongoose.Types.ObjectId, ref: 'Store', index: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    address: { type: addressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    coupon: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    payment: {
      method: { type: String, enum: ['cash-on-delivery', 'card'], default: 'cash-on-delivery' },
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      providerRef: String,
      paidAt: Date,
    },
    loyaltyAwarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });

const orderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default orderModel;
