import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import * as controller from './review.controller.js';
import { endPoints } from './review.endPoint.js';
const router = Router();
router.get('/product/:productId', controller.listProductReviews);
router.post('/', auth(endPoints.user), controller.createReview);
router.patch('/:id/helpful', auth(endPoints.user), controller.markHelpful);
export default router;
