import { create, find, findById, findOne, findOneAndUpdate, findByIdAndDelete } from "../../../../DB/DBMethods.js";
import couponModel from "../../../../DB/model/coupon.model.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import { paginate } from "../../../services/pagination.js";


export const addCoupon = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  req.body.expireIn = Date.now();
  let name = req.body.name
  let foundCoupon = await findOne({ model: couponModel, condition: { name } })
  if (foundCoupon) {
    return res.status(404).json({message:"coupon name must be unique"})

  }
  let addded = await create({ model: couponModel, data: req.body });
  res.status(201).json({ "message": "Added", addded })
})


export const updatedCoupon = asyncHandler(async (req, res, next) => {
  if (req.body.type == "enable") {
    req.body.isStopped = false
  } else if (req.body.type == "disable") {
    req.body.isStopped = true
  }

  req.body.updatedBy = req.user._id;
  let { name } = req.params
  let updated = await findOneAndUpdate({ model: couponModel, condition: { name }, data: req.body, options: { new: true } })
  res.status(200).json({ message: "updated", updated });
});

export const stopCoupon = asyncHandler(async (req, res, next) => {
  req.body.deletedBy = req.user._id;

  let { name } = req.params;
  let coupon = await findOne({ model: couponModel, condition: { name } })
  if (coupon) {
    let stopCouponStatus = await findOneAndUpdate({ model: couponModel, condition: { name }, data: { isStopped: !coupon.isStopped, deletedBy: req.user._id }, options: { new: true } });
    res.status(200).json({ message: "done", stopCouponStatus });
  }

});

export const allcoupons = asyncHandler(async (req, res, next) => {
  let { limit, skip } = paginate(req.query.page, req.query.size)
  const coupons = await find({ model: couponModel, limit, skip })
  if (!coupons) {
    res.status(404).json({message:"no coupons"})
  } else {
    res.status(200).json({ message: "All coupons", coupons })
  }
})
const populate = [
  {
    path: "createdBy",
    select: ["userName", "email"]

  },
  {
    path: "deletedBy",
    select: ["userName", "email"]

  },
  {
    path: "updatedBy",
    select: ["userName", "email"]
  },


];
export const getCouponById = asyncHandler(async (req, res, next) => {
  let { id } = req.params
  const coupon = await findById({ model: couponModel, condition: id, populate: [...populate] })
  if (!coupon) {
    res.status(404).json({message:"no coupon not found"})

  } else {
    res.status(200).json({ message: "coupon", coupon })
  }
})
export const removeCoupon = asyncHandler(async (req, res, next) => {

  let { id } = req.params;
  let coupon = await findOne({ model: couponModel, condition: { id } })
  if (coupon) {
    let deletedCoupon = await findByIdAndDelete({ model: couponModel, condition: { _id: id } });
    res.status(200).json({ message: "deleted", deletedCoupon });
  } else {
    return res.status(404).json({message:"coupon note found"})


  }

});

export const getCoupon = asyncHandler(async (req, res, next) => {
  let { couponName } = req.params
  let coupon = await findOne({ model: couponModel, condition: { name: couponName } })
  if (coupon) {
    if (coupon.isStopped) {
      return res.status(404).json({message:"coupon not founded"})
    } else {
      res.status(201).json({ message: "coupon", coupon })
    }
  } else {
    return res.status(404).json({message:"coupon not founded"})
  }
});
