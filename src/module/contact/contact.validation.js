import Joi from 'joi';

export const sendContactValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    phone: Joi.string().trim().max(30).allow(''),
    subject: Joi.string().trim().min(2).max(120).required(),
    message: Joi.string().trim().min(10).max(1500).required(),
  }).required(),
};
