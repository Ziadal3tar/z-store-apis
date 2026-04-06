<<<<<<< HEAD
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { fileValidation, HME, myMulter } from "../../services/multer.js";
import { endPoints } from "./category.endPoint.js";
import subCategoryRouter from "../subcategory/subCategory.router.js"
import * as categoryController from './controller/category.controller.js'
const router = Router()
router.use("/:id/subCategory",subCategoryRouter)

router.get("/", (req, res) => {
    res.status(200).json({ message: 'Category Module' })
})

router.post("/addCategory",auth(endPoints.addCategory),myMulter(fileValidation.image).single("image"),HME,categoryController.addCategory)
router.put("/updateCategory/:_id",auth(endPoints.updateCategory),myMulter(fileValidation.image).single("image"),HME,categoryController.UpdateCategory)
router.get("/allCategories",categoryController.allCategories)
router.delete("/removeCategory/:_id",auth(endPoints.removeCategory),categoryController.removeCategory)
router.get("/getCategory/:categoryId",categoryController.getCategory)



=======
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { fileValidation, HME, myMulter } from "../../services/multer.js";
import { endPoints } from "./category.endPoint.js";
import subCategoryRouter from "../subcategory/subCategory.router.js"
import * as categoryController from './controller/category.controller.js'
const router = Router()
router.use("/:id/subCategory",subCategoryRouter)

router.get("/", (req, res) => {
    res.status(200).json({ message: 'Category Module' })
})

router.post("/addCategory",auth(endPoints.addCategory),myMulter(fileValidation.image).single("image"),HME,categoryController.addCategory)
router.put("/updateCategory/:_id",auth(endPoints.updateCategory),myMulter(fileValidation.image).single("image"),HME,categoryController.UpdateCategory)
router.get("/allCategories",categoryController.allCategories)
router.delete("/removeCategory/:_id",auth(endPoints.removeCategory),categoryController.removeCategory)
router.get("/getCategory/:categoryId",categoryController.getCategory)



>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default router