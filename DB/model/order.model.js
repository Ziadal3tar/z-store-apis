import { Schema, model, Types } from "mongoose";


const orderSchema = new Schema({
  storeId: { type: mongoose.Types.ObjectId, ref: 'Store', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Types.ObjectId, ref: 'Product' },
    title: String,
    price: Number,
    quantity: Number,
    sku: String
  }],
  subtotal: Number,
  shipping: Number,
  total: Number,
  status: { type: String, enum: ['pending','paid','shipped','delivered','cancelled','refunded'], default: 'pending' },
  payment: { method: String, providerRef: String, paidAt: Date },
  createdAt: { type: Date, default: Date.now },
});

const orderModel = model('Order', orderSchema)
export default orderModel