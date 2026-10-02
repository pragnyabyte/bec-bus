import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  studentId: { type: String },
  studentName: { type: String, default: 'Student' },
  studentRoll: { type: String },
  issueType: { type: String, default: 'General Issue' },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  subject: { type: String, default: 'Issue Report' },
  message: { type: String, default: '' },
  status: {
    type: String,
    default: 'Pending'
  },
  adminReply: { type: String, default: null },
  createdAtString: { type: String, default: 'Just now' }
}, { timestamps: true });

export default mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

