import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import * as controller from './notification.controller.js';
import { endPoints } from './notification.endPoint.js';

const router = Router();
router.get('/me', auth(endPoints.user), controller.listMine);
router.patch('/:id/read', auth(endPoints.user), controller.markRead);
router.patch('/read-all', auth(endPoints.user), controller.markAllRead);
export default router;
