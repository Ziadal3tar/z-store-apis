import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import * as controller from './order.controller.js';
import { endPoints } from './order.endPoint.js';

const router = Router();
router.post('/', auth(endPoints.user), controller.createOrder);
router.get('/me', auth(endPoints.user), controller.myOrders);
router.get('/admin', auth(endPoints.admin), controller.adminOrders);
router.get('/admin/summary', auth(endPoints.admin), controller.adminSummary);
router.get('/:id', auth(endPoints.user), controller.getOrder);
router.patch('/:id/cancel', auth(endPoints.user), controller.cancelOrder);
router.patch('/:id/status', auth(endPoints.admin), controller.updateStatus);
export default router;
