import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectMongoDB, { isMongoConnected } from './config/db.js';
import { Bus, Driver, Route, Student, Complaint, Notification } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verify() {
  console.log('--- MongoDB Verification Script ---');
  const connected = await connectMongoDB();
  console.log('Connected to MongoDB Atlas:', connected);
  if (connected) {
    console.log('Buses count:', await Bus.countDocuments());
    console.log('Drivers count:', await Driver.countDocuments());
    console.log('Routes count:', await Route.countDocuments());
    console.log('Students count:', await Student.countDocuments());
    console.log('Complaints count:', await Complaint.countDocuments());
    console.log('Notifications count:', await Notification.countDocuments());
  }
  await mongoose.disconnect();
  process.exit(0);
}

verify();
