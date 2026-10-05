import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import { fileValidation, myMulter, HME } from "../../services/multer.js";
import { endPoints } from "./store.endPoint.js";
import * as storeController from './controller/store.controller.js';

const router = Router()
router.get('/', (req ,res)=>{
    res.status(200).json({message:"store Module"})
})

router.post("/addStore",auth(endPoints.create),  myMulter(fileValidation.image).single("image"), HME, storeController.addStore);
router.put("/editStoreImg",auth(endPoints.create),  myMulter(fileValidation.image).single("image"), HME, storeController.editStoreImg);
router.post("/searchStores",auth(endPoints.search),storeController.searchStores)
router.get("/getStore/:id",auth(endPoints.search),storeController.getStore)
router.get("/:id/analytics",auth(endPoints.search),storeController.getStoreAnalytics)
router.get("/:id/orders", auth(endPoints.search), storeController.getStoreOrders)
router.delete("/:id", auth(endPoints.remove), storeController.deleteStore)

export default router