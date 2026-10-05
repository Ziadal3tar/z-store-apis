import mongoose from "mongoose";
import dns from "dns";

dns.setServers([
  process.env.DNS_PRIMARY || "8.8.8.8",
  process.env.DNS_SECONDARY || "8.8.4.4",
]);

const connection = async () => {
  const uri = process.env.MONGODB_URI || process.env.DBURL;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
      serverSelectionTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
    });

    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
};

export default connection;
