import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// Use process.env for backend since this file is used by the server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/depohero';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
}

// Initialize connection
connectDB(); 