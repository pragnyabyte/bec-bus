import mongoose from 'mongoose';

const boardedStudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  stopId: { type: String },
  time: { type: String },
  method: { type: String, default: 'manual' }
}, { _id: false });

const activeTripSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  busId: { type: String, required: true },
  routeId: { type: String, required: true },
  driverId: { type: String },
  type: { type: String, default: 'morning_pickup' },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  startTime: { type: String },
  endTime: { type: String },
  currentStopIndex: { type: Number, default: 0 },
  totalBoarded: { type: Number, default: 0 },
  boardedStudents: [boardedStudentSchema],
  summary: { type: String }
}, { timestamps: true });

export default mongoose.models.ActiveTrip || mongoose.model('ActiveTrip', activeTripSchema);
