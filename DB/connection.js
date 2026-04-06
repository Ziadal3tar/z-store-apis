import mongoose from "mongoose";

const connection = async ()=>{
    return await mongoose.connect("mongodb+srv://ZiadAlmorsy:00241300@cluster0.mjwgrkh.mongodb.net/chatdb")
    .then(()=> console.log(`connected on ...... `))
    .catch(err=>console.log(`fail to connect `))
}

export default connection;