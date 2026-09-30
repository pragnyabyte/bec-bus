import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDatabaseIfEmpty } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

  // Sanitize URI for logging to avoid exposing password
  const sanitizedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log(`🔌 [MongoDB] Connecting to MongoDB Atlas (${sanitizedUri})...`);

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
      console.error('   👉 [Atlas Auth Tip]: Please ensure the database user "pragnyaparida11_db_user" has password "685eEprDZLPyQ94z" configured in MongoDB Atlas -> Database Access.');
      console.error('   👉 [Atlas Network Tip]: Ensure your IP or "0.0.0.0/0" is whitelisted in MongoDB Atlas -> Network Access.');
    }
    console.log('🛡️ [Server Resilience] Express server will continue running using resilient persistent fallback.');
    return false;
  }
}

export default connectMongoDB;
