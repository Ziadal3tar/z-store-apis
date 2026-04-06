<<<<<<< HEAD
import { Schema, model, Types } from "mongoose";

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        min: [2, 'minimum length 2 char'],
        max: [20, 'max length 20 char']
    },
    
    image: {
        type: String,
        required: [false, 'Category image is required'],
    },
    createdBy:{
        type:Types.ObjectId,
        ref:"User",
        required: [true, 'createdBy is required'],

    },
    public_id: String

}, {
    timestamps: true
})


const categoryModel = model('Category', categorySchema)
=======
import { Schema, model, Types } from "mongoose";

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        min: [2, 'minimum length 2 char'],
        max: [20, 'max length 20 char']
    },
    
    image: {
        type: String,
        required: [true, 'Category image is required'],
    },
    createdBy:{
        type:Types.ObjectId,
        ref:"User",
        required: [true, 'createdBy is required'],

    },
    public_id: String

}, {
    timestamps: true
})


const categoryModel = model('Category', categorySchema)
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default categoryModel