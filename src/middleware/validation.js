<<<<<<< HEAD
const dataMethod = ["body", "params", "query", "headers"];
export const validation = (schema) => {
    return (req, res, next) => {
        let validationArr = [];
        dataMethod.forEach(key => {
            if (schema[key]) {
                const validationResult = schema[key].validate(req[key], { abortEarly: false })
                if (validationResult?.error) {
                    validationArr.push(validationResult.error.details);
                }
                if (validationArr.length) {
                    res.status(400).json({ message: " Validation error", validationArr })
                } else {
                    next();
                }
            }
        })
    }
}
=======
const dataMethod = ["body", "params", "query", "headers"];
export const validation = (schema) => {
    return (req, res, next) => {
        let validationArr = [];
        dataMethod.forEach(key => {
            if (schema[key]) {
                const validationResult = schema[key].validate(req[key], { abortEarly: false })
                if (validationResult?.error) {
                    validationArr.push(validationResult.error.details);
                }
                if (validationArr.length) {
                    res.status(400).json({ message: " Validation error", validationArr })
                } else {
                    next();
                }
            }
        })
    }
}
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
