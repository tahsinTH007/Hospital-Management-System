import mongoose from "mongoose";

let connection: Promise<typeof mongoose> | null = null;

/**
 * Connects once and reuses the connection. Safe to call on every request,
 * which is what a serverless runtime needs (the module cache survives between
 * warm invocations, so the promise is only created on a cold start).
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose;

  if (!connection) {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error("MONGO_URI is not set");
    }

    connection = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then((instance) => {
        console.log(`MongoDB connected: ${instance.connection.host}`);
        return instance;
      })
      .catch((error) => {
        connection = null;
        throw error;
      });
  }

  return connection;
};
