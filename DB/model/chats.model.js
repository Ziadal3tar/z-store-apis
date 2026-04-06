<<<<<<< HEAD

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
=======

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
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
