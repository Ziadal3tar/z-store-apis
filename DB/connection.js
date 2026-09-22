import mongoose from "mongoose";
import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

const connection = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://ZiadAlmorsy:00241300@cluster0.mjwgrkh.mongodb.net/BeEcommerce"
        );

        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("MongoDB connection failed:");
        console.error(err);
    }
};

export default connection;