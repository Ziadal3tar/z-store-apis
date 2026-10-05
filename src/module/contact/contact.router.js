import { Router } from 'express';
import { validation } from '../../middleware/validation.js';
import { sendContactValidation } from './contact.validation.js';
import { sendContactMessage } from './contact.controller.js';

const router = Router();

router.post('/send', validation(sendContactValidation), sendContactMessage);

export default router;
