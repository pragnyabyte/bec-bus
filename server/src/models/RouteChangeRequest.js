import mongoose from 'mongoose';

const routeChangeRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentRoll: { type: String, required: true },
  currentRoute: { type: String, required: true },
  requestedRoute: { type: String, required: true },
  currentStop: { type: String },
  requestedStop: { type: String },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAtString: { type: String, default: 'Just now' }
}, { timestamps: true });

export default mongoose.models.RouteChangeRequest || mongoose.model('RouteChangeRequest', routeChangeRequestSchema);
