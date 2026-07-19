import mongoose from "mongoose";
import config from "./config.js";

// ✅ Fix
async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to DB");
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
}

export default connectDB;