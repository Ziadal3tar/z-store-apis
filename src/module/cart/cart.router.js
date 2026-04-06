<<<<<<< HEAD
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./cart.endPoint.js";
import * as cartController from './controller/cart.controller.js'
const router = Router()



router.get("/", (req, res) => {
    res.status(200).json({ message: 'cart Module' })
})

router.post("/createCart",auth(endPoints.create),cartController.createCart)
router.delete("/removeWishList/:productId", auth(endPoints.create), cartController.removeWishList);

router.get("/allCarts",cartController.allCarts)
router.put("/deleteFromCart",cartController.deleteFromCart)
router.get("/getCart/:token",cartController.getCart)
router.patch("/changeQuantityOfProductInCart/:token",cartController.changeQuantityOfProductInCart)



=======
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./cart.endPoint.js";
import * as cartController from './controller/cart.controller.js'
const router = Router()



router.get("/", (req, res) => {
    res.status(200).json({ message: 'cart Module' })
})

router.post("/createCart",auth(endPoints.create),cartController.createCart)
router.delete("/removeWishList/:productId", auth(endPoints.create), cartController.removeWishList);

router.get("/allCarts",cartController.allCarts)
router.put("/deleteFromCart",cartController.deleteFromCart)
router.get("/getCart/:token",cartController.getCart)
router.patch("/changeQuantityOfProductInCart/:token",cartController.changeQuantityOfProductInCart)



>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default router