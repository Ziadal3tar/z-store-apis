<<<<<<< HEAD
import { Schema, model, Types } from "mongoose";

const adminSchema = new Schema({
    adminId: {
        type: Types.ObjectId,
        ref: "User",
        required: [true, "admin id is required"],
      },
}, {
    timestamps: true
})


const adminModel = model('admin', adminSchema);
=======
import { Schema, model, Types } from "mongoose";

const adminSchema = new Schema({
    adminId: {
        type: Types.ObjectId,
        ref: "User",
        required: [true, "admin id is required"],
      },
}, {
    timestamps: true
})


const adminModel = model('admin', adminSchema);
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default adminModel