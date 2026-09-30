import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  rollNo: { type: String, required: true, unique: true, trim: true, index: true },
  department: { type: String, default: 'Engineering' },
  year: { type: String, default: '1st Year' },
  phone: { type: String, default: '+91 90000 00000' },
  routeId: { type: String, required: true },
  busId: { type: String },
  stopId: { type: String },
  status: {
    type: String,
    enum: ['approved', 'pending_approval', 'rejected'],
    default: 'approved'
  },
  boardedToday: { type: Boolean, default: false },
  boardedTime: { type: String, default: null },
  qrToken: { type: String, unique: true, sparse: true }
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model('Student', studentSchema);
