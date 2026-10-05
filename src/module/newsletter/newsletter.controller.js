import newsletterSubscriberModel from '../../../DB/model/newsletterSubscriber.model.js';
import { asyncHandler } from '../../services/asyncHandler.js';

export const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const subscriber = await newsletterSubscriberModel.findOneAndUpdate(
    { email },
    { $set: { active: true }, $setOnInsert: { email, subscribedAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).select('_id email active subscribedAt').lean();

  res.status(200).json({ message: 'Subscribed successfully', subscriber });
});
