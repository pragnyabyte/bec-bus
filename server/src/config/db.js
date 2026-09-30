import './env.js';
import mongoose from 'mongoose';
import { seedDatabaseIfEmpty } from './seed.js';

let isConnected = false;

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️ [MongoDB] MONGODB_URI is not defined in .env file.');
    return false;
  }

  console.log('🔌 [MongoDB] Connecting to MongoDB Atlas cluster...');

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('✅ [MongoDB] Mongoose successfully connected to MongoDB Atlas!');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('❌ [MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ [MongoDB] Disconnected from MongoDB Atlas.');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('🚀 [MongoDB] Atlas connection established. Running database migration/seeding...');
    await seedDatabaseIfEmpty();
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ [MongoDB] Failed to connect to MongoDB Atlas:');
    console.error(`   Error: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('   👉 [Atlas Auth Tip]: Authentication failed for database user. Please verify the user credentials in MongoDB Atlas -> Database Access.');
      console.error('   👉 [Atlas Network Tip]: Ensure your IP or "0.0.0.0/0" is whitelisted in MongoDB Atlas -> Network Access.');
    }
    console.log('🛡️ [Server Resilience] Express server will continue running using resilient persistent fallback.');
    return false;
  }
}

export default connectMongoDB;
