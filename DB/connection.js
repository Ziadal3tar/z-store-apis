<<<<<<< HEAD
import mongoose from "mongoose";

const connection = async ()=>{
    return await mongoose.connect("mongodb+srv://ZiadAlmorsy:00241300@cluster0.mjwgrkh.mongodb.net/chatdb")
    .then(()=> console.log(`connected on ...... `))
    .catch(err=>console.log(`fail to connect `))
}

=======
import mongoose from "mongoose";

const connection = async ()=>{
    return await mongoose.connect("mongodb+srv://ziad:00241300@cluster0.bxnbg.mongodb.net/BeEcommerce")
    .then(()=> console.log(`connected on ...... `))
    .catch(err=>console.log(`fail to connect `))
}

>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
export default connection;