import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String },
  studentName: { type: String, default: 'Student' },
  studentRoll: { type: String },
  category: { type: String, default: 'General' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved', 'closed'],
    default: 'open'
  },
  adminReply: { type: String, default: null },
  createdAtString: { type: String, default: 'Just now' }
}, { timestamps: true });

export default mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
