import mongoose from "mongoose";

const MONGODB_URI = Bun.env.MONGODB_URI || "mongodb://localhost:27017/ask-0x-jonny";

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected) {
    console.log("Already connected to MongoDB");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    
    isConnected = true;
    console.log("Connected to MongoDB successfully");
    
    // Handle connection events
    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
      isConnected = false;
    });
    
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
    });
    
    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
      isConnected = true;
    });
    
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    isConnected = false;
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
    throw error;
  }
}

export function getDatabaseConnection() {
  return mongoose.connection;
}

export function isConnectedToDatabase(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}