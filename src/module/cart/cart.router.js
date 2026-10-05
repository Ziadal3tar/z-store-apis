import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { endPoints } from './cart.endPoint.js';
import * as cartController from './controller/cart.controller.js';

const router = Router();

router.get('/', (_req, res) => res.status(200).json({ message: 'Cart module' }));
router.post('/createCart', auth(endPoints.create), cartController.createCart);
router.get('/allCarts', auth(endPoints.create), cartController.allCarts);
router.get('/me', auth(endPoints.create), cartController.getMyCart);
router.put('/deleteFromCart', auth(endPoints.create), cartController.deleteFromCart);
router.patch('/changeQuantity', auth(endPoints.create), cartController.changeQuantity);

export default router;
