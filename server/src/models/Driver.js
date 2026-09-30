import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  licenseNo: { type: String },
  experienceYears: { type: Number, default: 5 },
  rating: { type: Number, default: 4.8 },
  busId: { type: String, required: true },
  busName: { type: String, required: true },
  routeId: { type: String, required: true },
  routeName: { type: String, required: true },
  avatar: { type: String },
  status: { type: String, enum: ['active', 'off_duty', 'on_leave'], default: 'active' }
}, { timestamps: true });

export default mongoose.models.Driver || mongoose.model('Driver', driverSchema);
