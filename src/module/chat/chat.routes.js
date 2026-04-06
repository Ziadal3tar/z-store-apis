<<<<<<< HEAD
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import { fileValidation, HME, myMulter } from "../../services/multer.js";
import { endPoints } from "./chat.endPoint.js";
import * as chatControl from './controller/chat.controller.js'
const router = Router()
router.get("/", (req, res) => {
    res.status(200).json({ message: 'chat Module' })
})
router.post("/sendMessage",myMulter(fileValidation.image).array('image'),HME,chatControl.message)
// router.get("/getMessage",chatControl.getMessage)

=======
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import { fileValidation, HME, myMulter } from "../../services/multer.js";
import { endPoints } from "./chat.endPoint.js";
import * as chatControl from './controller/chat.controller.js'
const router = Router()
router.get("/", (req, res) => {
    res.status(200).json({ message: 'chat Module' })
})
router.post("/sendMessage",myMulter(fileValidation.image).array('image'),HME,chatControl.message)
// router.get("/getMessage",chatControl.getMessage)

>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default router