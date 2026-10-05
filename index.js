import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as indexRouter from './src/module/index.router.js';
import connection from './DB/connection.js';
import { globalError } from './src/services/asyncHandler.js';
import * as socket from './common/socket.js';
import userModel from './DB/model/user.model.js';
import storesModel from './DB/model/store.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, './config/.env') });

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = [
  ...String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:4200', 'http://127.0.0.1:4200']),
];

app.use(cors({
  origin: allowedOrigins.length
    ? allowedOrigins
    : process.env.NODE_ENV === 'production'
      ? false
      : true,
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const requestBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 180;
app.use((req, res, next) => {
  const now = Date.now();
  const key = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  }

  if (requestBuckets.size > 5000 && bucket.count === 2) {
    for (const [bucketKey, value] of requestBuckets) {
      if (now - value.startedAt >= RATE_WINDOW_MS) requestBuckets.delete(bucketKey);
    }
  }

  next();
});

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/auth', indexRouter.authRouter);
app.use('/category', indexRouter.categoryRouter);
app.use('/subCategory', indexRouter.subCategoryRouter);
app.use('/brand', indexRouter.brandRouter);
app.use('/product', indexRouter.productRouter);
app.use('/wishlist', indexRouter.wishlistRouter);
app.use('/coupon', indexRouter.couponRouter);
app.use('/cart', indexRouter.cartRouter);
app.use('/store', indexRouter.storeRouter);
app.use('/chat', indexRouter.chatRouter);
app.use('/order', indexRouter.orderRouter);
app.use('/review', indexRouter.reviewRouter);
app.use('/notification', indexRouter.notificationRouter);
app.use('/newsletter', indexRouter.newsletterRouter);
app.use('/contact', indexRouter.contactRouter);

app.get('/', (_req, res) => {
  res.json({ message: 'Z-Store API', status: 'ok' });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Invalid route. Please check URL or method.' });
});

app.use(globalError);

const start = async () => {
  await connection();

  const server = app.listen(port, () => {
    console.log(`Z-Store API listening on port ${port}`);
  });

  const io = socket.init(server);

  io.on('connection', (client) => {
    client.on('updateSocketId', async (_id) => {
      if (!_id) return;
      await userModel.findByIdAndUpdate(
        _id,
        { socketID: client.id },
        { new: true },
      );
    });

    client.on('updateStoreSocketId', async (_id) => {
      if (!_id) return;
      await storesModel.findByIdAndUpdate(
        _id,
        { socketID: client.id },
        { new: true },
      );
    });

    client.on('sendMessage', (data) => {
      if (data?.socketID) {
        client.to(data.socketID).emit('resevMessage', data);
      }
    });
  });
};

start().catch((error) => {
  console.error('API startup failed:', error);
  process.exit(1);
});
