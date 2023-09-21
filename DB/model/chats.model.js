
import { Schema, model, Types } from "mongoose";


const chatsSchema = new Schema({
    userId1: {
        type: Types.ObjectId,
        ref: "User"
    },
    storeId2: {
        type: Types.ObjectId,
        ref: "Store"
    },
    messages:[{
        type: Types.ObjectId,
        ref: "Message"
    }]
})
const chatsModel = model('Chat', chatsSchema);
export default chatsModel
