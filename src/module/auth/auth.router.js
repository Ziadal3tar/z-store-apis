import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import { fileValidation, HME, myMulter } from "../../services/multer.js";
import { endPoints } from "./auth.endPoint.js";
import { logInValidation, signUpValidation, updateRoleValidation } from "./auth.validation.js";
import * as registerControl from './controller/registration.js'
const router = Router()
router.get("/", (req, res) => {
    res.status(200).json({ message: 'Auth Module' })
})

router.post("/signUp",validation(signUpValidation), registerControl.signUp)
router.get("/confirmEmail/:token", registerControl.confirmEmail)
router.get("/refreshToken/:token", registerControl.resendConfirmEmail)
router.post("/logIn",validation(logInValidation), registerControl.logIn)
router.get("/allUser", auth(endPoints.manageUsers), registerControl.allUser)
router.get("/allAdmins", auth(endPoints.manageUsers), registerControl.getAllAdmins)
router.delete("/removeUser/:_id",auth(endPoints.removeRole), registerControl.removeUser)
router.get("/getUserById/:_id", registerControl.getUserById)

router.put("/updateRole",auth(endPoints.updateRole),validation(updateRoleValidation),registerControl.updateRole)
router.get("/getUser/:token", registerControl.getUser)
// Legacy token-in-URL endpoint retained for compatibility; frontend uses /me.
router.get("/me", auth(endPoints.user), registerControl.getMe)
router.patch("/editProfilePic",auth(endPoints.user),myMulter(fileValidation.image).single("image"),HME,registerControl.editProfilePic)
router.put("/addAdmin/:_id",auth(endPoints.manageUsers),registerControl.addAdmin)
router.delete("/removeAdmin/:_id",auth(endPoints.manageUsers),registerControl.removeAdmin)
router.put("/block/:_id",auth(endPoints.manageUsers),registerControl.blockUser)
router.post("/searchUser",auth(endPoints.addAdmin),registerControl.searchUser)
router.put("/updateUser/:id",auth(endPoints.user),registerControl.updateUser)
router.patch("/profile", auth(endPoints.user), registerControl.updateProfile)
router.post("/sendEmail",registerControl.sendEmaiil)
export default router