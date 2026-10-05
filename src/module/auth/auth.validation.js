import Joi from"joi";

export const signUpValidation={
    body:Joi.object().required().keys({
        userName:Joi.string().required().min(2).max(20),
        email:Joi.string().required().email(),
        password:Joi.string().min(8).max(72).required(),
        confirmPassword:Joi.string().valid(Joi.ref("password")).required()
    })
}
export const logInValidation={
    body:Joi.object().required().keys({
        email:Joi.string().required().email(),
        password:Joi.string().min(8).max(72).required(),
    })
}
export const updateRoleValidation={
    body:Joi.object().required().keys({
        userId:Joi.string().required().min(24).max(24),
        
    })
}