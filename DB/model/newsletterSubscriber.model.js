import { Schema, model } from 'mongoose';

const newsletterSubscriberSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  subscribedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const NewsletterSubscriber = model('NewsletterSubscriber', newsletterSubscriberSchema);
export default NewsletterSubscriber;
