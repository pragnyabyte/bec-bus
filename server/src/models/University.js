import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  campusLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true }
  },
  contact: { type: String },
  emergencyContact: { type: String }
}, { timestamps: true });

export default mongoose.models.University || mongoose.model('University', universitySchema);
