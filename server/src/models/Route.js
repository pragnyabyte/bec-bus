import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  morningTime: { type: String },
  eveningTime: { type: String },
  sequence: { type: Number, required: true }
}, { _id: false });

const routeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#0284c7' },
  startPoint: { type: String, required: true },
  endPoint: { type: String, required: true },
  distanceKm: { type: Number, default: 0 },
  totalDurationMin: { type: Number, default: 0 },
  busId: { type: String },
  driverId: { type: String },
  stops: [stopSchema]
}, { timestamps: true });

export default mongoose.models.Route || mongoose.model('Route', routeSchema);
