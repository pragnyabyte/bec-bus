import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  busNo: { type: String, required: true },
  fleetNumber: { type: String, required: true },
  capacity: { type: Number, default: 45 },
  occupied: { type: Number, default: 0 },
  driverId: { type: String, required: true },
  driverName: { type: String, required: true },
  routeId: { type: String, required: true },
  routeName: { type: String, required: true },
  status: {
    type: String,
    enum: ['available', 'on_trip', 'delayed', 'emergency', 'maintenance'],
    default: 'available'
  },
  currentLat: { type: Number, required: true },
  currentLng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  fuelPercent: { type: Number, default: 85 },
  nextStopId: { type: String },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Bus || mongoose.model('Bus', busSchema);
