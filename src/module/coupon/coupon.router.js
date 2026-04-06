<<<<<<< HEAD
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoint } from "./coupon.endPoint.js";
import * as couponController from './controller/coupon.controller.js'
const router = Router()




router.get('/', (req ,res)=>{
    res.status(200).json({message:"Coupon Module"})
})


router.post("/addCoupon", auth(endPoint.create), couponController.addCoupon);
router.put("/updateCoupon/:name", auth(endPoint.create), couponController.updatedCoupon);
router.get("/stopCoupon/:name",  auth(endPoint.create),couponController.stopCoupon);
router.get("/allcoupons",couponController.allcoupons);
router.delete("/removeCoupon/:id",  auth(endPoint.create),couponController.removeCoupon);
router.get("/getCoupon/:couponName", couponController.getCoupon);

router.get("/getCouponById/:id",couponController.getCouponById);



=======
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoint } from "./coupon.endPoint.js";
import * as couponController from './controller/coupon.controller.js'
const router = Router()




router.get('/', (req ,res)=>{
    res.status(200).json({message:"Coupon Module"})
})


router.post("/addCoupon", auth(endPoint.create), couponController.addCoupon);
router.put("/updateCoupon/:name", auth(endPoint.create), couponController.updatedCoupon);
router.get("/stopCoupon/:name",  auth(endPoint.create),couponController.stopCoupon);
router.get("/allcoupons",couponController.allcoupons);
router.delete("/removeCoupon/:id",  auth(endPoint.create),couponController.removeCoupon);
router.get("/getCoupon/:couponName", couponController.getCoupon);

router.get("/getCouponById/:id",couponController.getCouponById);



>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default router