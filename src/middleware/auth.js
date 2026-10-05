import jwt from "jsonwebtoken";
import userModel from "../../DB/model/user.model.js";
import { asyncHandler } from "../services/asyncHandler.js";

export const roles = {
  User: "User",
  Admin: "Admin",
};

export const auth = (acceptRoles = [roles.User]) => {
  return asyncHandler(async (req, res, next) => {
    const authorization = req.headers.authorization;
    const bearerKey = process.env.BearerKey;

    if (!authorization || !bearerKey || !authorization.startsWith(bearerKey)) {
      return res.status(401).json({ message: "Invalid bearer key" });
    }

    const token = authorization.slice(bearerKey.length);
    if (!token) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const decoded = jwt.verify(token, process.env.tokenSignature);
    if (!decoded?.id || !decoded?.isLoggedIn) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await userModel.findById(decoded.id).select(
      "_id userName email phone role profilePic cart cartId storeId wishlist loyaltyPoints blocked country city postCode postalCode street house building entrance floor apartment comment DOB createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Registered user not found" });
    }

    if (user.blocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    if (!acceptRoles.includes(user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    req.user = user;
    return next();
  });
};
