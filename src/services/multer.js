<<<<<<< HEAD
import multer from "multer";

export const fileValidation = {
    image: ['image/png', 'image/jpeg', 'image/jif','image/webp'],
    pdf: ['application/pdf'],
}
export const HME = (err, req, res, next) => {
    if (err) {
        res.json({ message: "multer error message", err: err });
    } else {
        next();
    }
};

export function myMulter(customValidation = fileValidation.image) {
    const storage = multer.diskStorage({})
    function fileFilter(req, file, cb) {

        if (customValidation.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb('invalid format', false)
        }
    }
    const upload = multer({ fileFilter, storage })
    return upload
=======
import multer from "multer";

export const fileValidation = {
    image: ['image/png', 'image/jpeg', 'image/jif','image/webp'],
    pdf: ['application/pdf'],
}
export const HME = (err, req, res, next) => {
    if (err) {
        res.json({ message: "multer error message", err: err });
    } else {
        next();
    }
};

export function myMulter(customValidation = fileValidation.image) {
    const storage = multer.diskStorage({})
    function fileFilter(req, file, cb) {

        if (customValidation.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb('invalid format', false)
        }
    }
    const upload = multer({ fileFilter, storage })
    return upload
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
}