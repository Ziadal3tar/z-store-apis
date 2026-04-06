<<<<<<< HEAD
import { Schema, model, Types } from "mongoose";

const subCategorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'subCategory name is required'],
        min: [2, 'minimum length 2 char'],
        max: [20, 'max length 20 char']
    },
    
    image: {
        type: String,
        required: [false, 'subCategory image is required'],
    },
    createdBy:{
        type:Types.ObjectId,
        ref:"User",
        required: [true, 'createdBy is required'],
    },
    categoryId:{
        type:Types.ObjectId,
        ref:"Category",
        required: [true, 'categoryId is required'],
    },
    public_id: String
}, {
    timestamps: true
})


const subCategoryModel = model('subCategory', subCategorySchema)
=======
import { Schema, model, Types } from "mongoose";

const subCategorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'subCategory name is required'],
        min: [2, 'minimum length 2 char'],
        max: [20, 'max length 20 char']
    },
    
    image: {
        type: String,
        required: [true, 'subCategory image is required'],
    },
    createdBy:{
        type:Types.ObjectId,
        ref:"User",
        required: [true, 'createdBy is required'],
    },
    categoryId:{
        type:Types.ObjectId,
        ref:"Category",
        required: [true, 'categoryId is required'],
    },
    public_id: String
}, {
    timestamps: true
})


const subCategoryModel = model('subCategory', subCategorySchema)
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default subCategoryModel