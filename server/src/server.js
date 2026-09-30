import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialData } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'db_storage.json');

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

app.use(cors());
app.use(express.json());

// Load persistent data from disk or fallback to initialData
function loadDbState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
        // Enforce strictly 2 buses and 2 drivers
        if (Array.isArray(parsed.buses) && parsed.buses.length === 2 && Array.isArray(parsed.drivers) && parsed.drivers.length === 2) {
          console.log(`[Storage] Loaded verified 2-bus & 2-driver fleet from ${DATA_FILE}`);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Could not read db_storage.json, falling back to initialData:', err.message);
  }
  const fresh = JSON.parse(JSON.stringify(initialData));
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Storage] Could not write initial db_storage.json:', err.message);
  }
  return fresh;
}

let db = loadDbState();

function saveDbState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Failed to save db state:', err);
  }
}

// Utility: Calculate distance between coordinates (Haversine formula in km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// REST API Endpoints

// 1. Health & Overview
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), university: db.university.name });
});

app.get('/api/overview', (req, res) => {
  const activeBuses = db.buses.filter(b => b.status === 'on_trip' || b.status === 'emergency').length;
  const totalStudents = db.students.length;
  const boardedStudents = db.students.filter(s => s.boardedToday).length;
  const pendingApprovals = db.students.filter(s => s.status === 'pending_approval').length;
  const pendingChangeRequests = db.routeChangeRequests.filter(r => r.status === 'pending').length;
  const openComplaints = db.complaints.filter(c => c.status === 'open' || c.status === 'in_review').length;

  res.json({
    university: db.university,
    stats: {
      totalBuses: db.buses.length,
      activeBuses,
      totalDrivers: db.drivers.length,
      totalRoutes: db.routes.length,
      totalStudents,
      boardedStudents,
      attendanceRate: totalStudents > 0 ? Math.round((boardedStudents / totalStudents) * 100) : 0,
      pendingApprovals,
      pendingChangeRequests,
      openComplaints
    },
    buses: db.buses,
    routes: db.routes,
    drivers: db.drivers,
    activeTrips: db.activeTrips,
    notifications: db.notifications.slice(0, 10)
  });
});

// 2. Buses API
app.get('/api/buses', (req, res) => {
  res.json(db.buses);
});

app.post('/api/buses', (req, res) => {
  return res.status(400).json({
    error: 'Fleet is fixed to exactly 2 buses (Bus 1 - Pragnya and Bus 2 - Jitendra). Additional buses cannot be created.'
  });
});

app.patch('/api/buses/:id', (req, res) => {
  const busIndex = db.buses.findIndex(b => b.id === req.params.id);
  if (busIndex === -1) return res.status(404).json({ error: 'Bus not found' });
  
  // Permanent Invariant: Bus 1 must always be assigned to Pragnya, Bus 2 must always be assigned to Jitendra
  const lockedDriverId = req.params.id === 'BUS-01' ? 'PRAGNYA01' : req.params.id === 'BUS-02' ? 'JITENDRA01' : db.buses[busIndex].driverId;
  const lockedDriverName = req.params.id === 'BUS-01' ? 'Pragnya' : req.params.id === 'BUS-02' ? 'Jitendra' : db.buses[busIndex].driverName;
  const lockedRouteId = req.params.id === 'BUS-01' ? 'R-101' : req.params.id === 'BUS-02' ? 'R-102' : db.buses[busIndex].routeId;
  const lockedFleetNumber = req.params.id === 'BUS-01' ? 'Bus 1' : req.params.id === 'BUS-02' ? 'Bus 2' : db.buses[busIndex].fleetNumber;

  db.buses[busIndex] = {
    ...db.buses[busIndex],
    ...req.body,
    fleetNumber: lockedFleetNumber,
    driverId: lockedDriverId,
    driverName: lockedDriverName,
    routeId: lockedRouteId,
    lastUpdated: new Date().toISOString()
  };
  saveDbState();
  io.emit('buses:updated', db.buses);
  res.json(db.buses[busIndex]);
});

// 3. Routes & Stops API
app.get('/api/routes', (req, res) => {
  res.json(db.routes);
});

app.post('/api/routes', (req, res) => {
  return res.status(400).json({
    error: 'Transit network is fixed to exactly 2 routes (BEC College ↔ Baramunda and BEC College ↔ Patia).'
  });
});

// 4. Students & Registration
app.get('/api/students', (req, res) => {
  res.json(db.students);
});

app.post('/api/students/register', (req, res) => {
  const { name, email, rollNo, department, year, phone, routeId, stopId } = req.body;
  if (!name || !rollNo || !routeId) {
    return res.status(400).json({ error: 'Name, Roll Number, and Route selection are required' });
  }

  // Find assigned route and bus
  const route = db.routes.find(r => r.id === routeId);
  const bus = db.buses.find(b => b.routeId === routeId) || db.buses.find(b => b.id === route?.busId) || db.buses[0];
  const busId = bus ? bus.id : (route ? route.busId : null);

  // Check if student with this roll number already exists
  const existingIdx = db.students.findIndex(s => s.rollNo?.toLowerCase() === rollNo.trim().toLowerCase());
  let savedStudent;

  if (existingIdx !== -1) {
    db.students[existingIdx] = {
      ...db.students[existingIdx],
      name: name.trim(),
      email: email ? email.trim() : db.students[existingIdx].email,
      rollNo: rollNo.trim(),
      department: department || db.students[existingIdx].department,
      year: year || db.students[existingIdx].year,
      phone: phone ? phone.trim() : db.students[existingIdx].phone,
      routeId,
      busId,
      stopId: stopId || (route && route.stops.length > 0 ? route.stops[0].id : null),
      status: 'approved'
    };
    savedStudent = db.students[existingIdx];
  } else {
    const nextNum = db.students.reduce((max, s) => {
      const num = parseInt(s.id.replace('STU-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0) + 1;

    savedStudent = {
      id: `STU-${String(nextNum).padStart(2, '0')}`,
      name: name.trim(),
      email: email ? email.trim() : `${rollNo.toLowerCase()}@apex.edu`,
      rollNo: rollNo.trim(),
      department: department || 'Engineering',
      year: year || '1st Year',
      phone: phone ? phone.trim() : '+91 90000 00000',
      routeId,
      busId,
      stopId: stopId || (route && route.stops.length > 0 ? route.stops[0].id : null),
      status: 'approved',
      boardedToday: false,
      boardedTime: null,
      qrToken: `APEX-STU-${String(nextNum).padStart(2, '0')}-${rollNo.trim()}`
    };
    db.students.push(savedStudent);
  }

  // Persist state to disk
  saveDbState();

  // Create real-time notification
  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: 'New Student Registration Successful',
    message: `${savedStudent.name} (${savedStudent.rollNo}) registered for Route ${route ? route.code : routeId}. Digital Bus Pass is active.`,
    type: 'info',
    target: 'all',
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);
  io.emit('notification:new', notif);
  io.emit('students:updated', db.students);

  res.status(201).json(savedStudent);
});

app.post('/api/students/:id/status', (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  const student = db.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  student.status = status;
  saveDbState();
  io.emit('students:updated', db.students);
  res.json({ message: `Student status updated to ${status}`, student });
});

// 5. Drivers API
app.get('/api/drivers', (req, res) => {
  res.json(db.drivers);
});

// 6. Complaints & Feedback
app.get('/api/complaints', (req, res) => {
  res.json(db.complaints);
});

app.post('/api/complaints', (req, res) => {
  const { studentId, studentName, studentRoll, category, subject, message } = req.body;
  const newComplaint = {
    id: `CMP-${String(db.complaints.length + 1).padStart(2, '0')}`,
    studentId: studentId || 'STU-01',
    studentName: studentName || 'Alex Johnson',
    studentRoll: studentRoll || 'CS-2024-042',
    category: category || 'General',
    subject: subject || 'Feedback',
    message: message || '',
    status: 'open',
    adminReply: null,
    createdAt: 'Just now'
  };
  db.complaints.unshift(newComplaint);

  // Push notification to Admin
  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: 'New Student Complaint Received',
    message: `[${category}] ${subject} from ${studentName}`,
    type: 'warning',
    target: 'admin',
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);
  io.emit('notification:new', notif);
  io.emit('complaints:updated', db.complaints);

  res.status(201).json(newComplaint);
});

app.post('/api/complaints/:id/reply', (req, res) => {
  const { adminReply, status } = req.body;
  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  complaint.adminReply = adminReply;
  complaint.status = status || 'resolved';
  io.emit('complaints:updated', db.complaints);
  res.json(complaint);
});

// 7. Route / Bus Change Requests
app.get('/api/change-requests', (req, res) => {
  res.json(db.routeChangeRequests);
});

app.post('/api/change-requests', (req, res) => {
  const { studentId, studentName, studentRoll, currentRoute, requestedRoute, currentStop, requestedStop, reason } = req.body;
  const newReq = {
    id: `REQ-${String(db.routeChangeRequests.length + 1).padStart(2, '0')}`,
    studentId,
    studentName,
    studentRoll,
    currentRoute,
    requestedRoute,
    currentStop,
    requestedStop,
    reason,
    status: 'pending',
    submittedAt: 'Just now'
  };
  db.routeChangeRequests.unshift(newReq);
  io.emit('change_requests:updated', db.routeChangeRequests);
  res.status(201).json(newReq);
});

app.post('/api/change-requests/:id/action', (req, res) => {
  const { action } = req.body; // 'approved' | 'rejected'
  const request = db.routeChangeRequests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = action;

  if (action === 'approved') {
    // If approved, update student's route & stop
    const student = db.students.find(s => s.id === request.studentId);
    if (student) {
      // Find matching route
      const matchedRoute = db.routes.find(r => r.name.toLowerCase().includes(request.requestedRoute.toLowerCase()) || r.code.toLowerCase().includes(request.requestedRoute.toLowerCase()));
      if (matchedRoute) {
        student.routeId = matchedRoute.id;
        student.busId = matchedRoute.busId;
      }
    }
  }

  io.emit('change_requests:updated', db.routeChangeRequests);
  io.emit('students:updated', db.students);
  res.json(request);
});

// 8. Notifications API
app.get('/api/notifications', (req, res) => {
  res.json(db.notifications);
});

app.post('/api/notifications/broadcast', (req, res) => {
  const { title, message, type, target } = req.body;
  const newNotif = {
    id: `NOTIF-${Date.now()}`,
    title: title || 'Campus Transport Announcement',
    message: message || '',
    type: type || 'info', // 'info' | 'warning' | 'delay' | 'emergency'
    target: target || 'all',
    timestamp: 'Just now',
    read: false
  };

  db.notifications.unshift(newNotif);
  io.emit('notification:new', newNotif);
  res.status(201).json(newNotif);
});

// 9. Trip Controls (Start, End, Boarding, SOS, Incident)
app.post('/api/trips/start', (req, res) => {
  const { busId, routeId, driverId, tripType } = req.body;
  const bus = db.buses.find(b => b.id === busId);
  if (bus) {
    bus.status = 'on_trip';
    bus.speed = 25;
    bus.lastUpdated = new Date().toISOString();
  }

  const existingTrip = db.activeTrips.find(t => t.busId === busId && t.status === 'in_progress');
  if (existingTrip) {
    return res.json({ message: 'Trip already in progress', trip: existingTrip });
  }

  const newTrip = {
    id: `TRIP-${Date.now()}`,
    busId,
    routeId,
    driverId,
    type: tripType || 'morning_pickup',
    status: 'in_progress',
    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    currentStopIndex: 0,
    totalBoarded: 0,
    boardedStudents: []
  };

  db.activeTrips.push(newTrip);

  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: `Trip Started: ${bus ? bus.fleetNumber : 'Bus'}`,
    message: `Driver has commenced trip along ${routeId}. GPS tracking is live.`,
    type: 'info',
    target: routeId,
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);

  io.emit('trip:started', { trip: newTrip, bus });
  io.emit('buses:updated', db.buses);
  io.emit('notification:new', notif);

  res.json({ message: 'Trip started successfully', trip: newTrip });
});

app.post('/api/trips/end', (req, res) => {
  const { busId, summary } = req.body;
  const bus = db.buses.find(b => b.id === busId);
  if (bus) {
    bus.status = 'available';
    bus.speed = 0;
    bus.lastUpdated = new Date().toISOString();
  }

  const tripIndex = db.activeTrips.findIndex(t => t.busId === busId && t.status === 'in_progress');
  let finishedTrip = null;
  if (tripIndex !== -1) {
    finishedTrip = db.activeTrips[tripIndex];
    finishedTrip.status = 'completed';
    finishedTrip.endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    finishedTrip.summary = summary;
    db.activeTrips.splice(tripIndex, 1);
  }

  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: `Trip Completed: ${bus ? bus.fleetNumber : 'Bus'}`,
    message: `Bus has safely arrived at destination and concluded route.`,
    type: 'info',
    target: bus ? bus.routeId : 'all',
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);

  io.emit('trip:ended', { busId, finishedTrip });
  io.emit('buses:updated', db.buses);
  io.emit('notification:new', notif);

  res.json({ message: 'Trip concluded', trip: finishedTrip });
});

// Board student (QR scan or manual check)
app.post('/api/trips/board', (req, res) => {
  const { studentId, busId, stopId, method } = req.body;
  const student = db.students.find(s => s.id === studentId || s.rollNo === studentId || s.qrToken === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found in registry' });

  student.boardedToday = true;
  student.boardedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update bus occupied count
  const bus = db.buses.find(b => b.id === (busId || student.busId));
  if (bus && bus.occupied < bus.capacity) {
    bus.occupied += 1;
  }

  // Update active trip
  const trip = db.activeTrips.find(t => t.busId === (bus ? bus.id : student.busId) && t.status === 'in_progress');
  if (trip) {
    trip.totalBoarded = (trip.totalBoarded || 0) + 1;
    trip.boardedStudents.push({
      studentId: student.id,
      stopId: stopId || student.stopId,
      time: student.boardedTime,
      method: method || 'manual'
    });
  }

  io.emit('student:boarded', { student, bus, timestamp: student.boardedTime });
  io.emit('buses:updated', db.buses);
  io.emit('students:updated', db.students);

  res.json({ message: `${student.name} marked as boarded!`, student });
});

// Emergency SOS alert
app.post('/api/trips/sos', (req, res) => {
  const { busId, driverId, lat, lng, reason } = req.body;
  const bus = db.buses.find(b => b.id === busId);
  if (bus) {
    bus.status = 'emergency';
    bus.lastUpdated = new Date().toISOString();
  }

  const sosAlert = {
    id: `SOS-${Date.now()}`,
    busId,
    busNo: bus ? bus.busNo : 'Unknown',
    fleetNumber: bus ? bus.fleetNumber : 'Bus',
    driverId,
    location: { lat: lat || (bus ? bus.currentLat : 12.8450), lng: lng || (bus ? bus.currentLng : 77.6650) },
    reason: reason || 'Driver Triggered High-Priority Emergency SOS',
    timestamp: new Date().toLocaleTimeString(),
    resolved: false
  };

  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: `🚨 EMERGENCY SOS TRIGGERED: ${bus ? bus.fleetNumber : 'Bus'}`,
    message: `Driver triggered emergency SOS near coordinates (${sosAlert.location.lat.toFixed(4)}, ${sosAlert.location.lng.toFixed(4)}). Transport control and campus security alerted!`,
    type: 'emergency',
    target: 'all',
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);

  io.emit('alert:sos', sosAlert);
  io.emit('notification:new', notif);
  io.emit('buses:updated', db.buses);

  res.json({ message: 'Emergency SOS broadcasted successfully', sosAlert });
});

// Driver Incident Report (Traffic / Breakdown)
app.post('/api/trips/incident', (req, res) => {
  const { busId, type, delayMinutes, description } = req.body; // type: 'traffic', 'breakdown', 'accident'
  const bus = db.buses.find(b => b.id === busId);
  if (bus && type === 'breakdown') {
    bus.status = 'maintenance';
    bus.speed = 0;
  }

  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: type === 'breakdown' ? `⚠️ Bus Breakdown Reported: ${bus ? bus.fleetNumber : 'Bus'}` : `⏳ Traffic Delay Alert (+${delayMinutes || 15} mins)`,
    message: description || `Bus is delayed due to ${type}. Please adjust arrival expectations.`,
    type: type === 'breakdown' ? 'emergency' : 'delay',
    target: bus ? bus.routeId : 'all',
    timestamp: 'Just now',
    read: false
  };
  db.notifications.unshift(notif);

  io.emit('notification:new', notif);
  io.emit('buses:updated', db.buses);

  res.json({ message: 'Incident reported and broadcasted', notification: notif });
});

// WebSocket Real-time Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('initial:state', {
    buses: db.buses,
    routes: db.routes,
    notifications: db.notifications.slice(0, 10),
    activeTrips: db.activeTrips
  });

  // Driver emits GPS telemetry
  socket.on('driver:location_update', (telemetry) => {
    // telemetry: { busId, lat, lng, speed, heading, nextStopId }
    const { busId, lat, lng, speed, heading, nextStopId } = telemetry;
    const bus = db.buses.find(b => b.id === busId);

    if (bus) {
      bus.currentLat = lat;
      bus.currentLng = lng;
      if (speed !== undefined) bus.speed = speed;
      if (heading !== undefined) bus.heading = heading;
      if (nextStopId) bus.nextStopId = nextStopId;
      bus.lastUpdated = new Date().toISOString();

      // Check distance to route stops to trigger ETA and "5-min away" alerts
      const route = db.routes.find(r => r.id === bus.routeId);
      if (route && route.stops) {
        route.stops.forEach(stop => {
          const distKm = calculateDistanceKm(lat, lng, stop.lat, stop.lng);
          // If within ~1.2 km and moving towards it (~ 3 to 5 minutes away)
          if (distKm <= 1.2 && distKm >= 0.8 && !stop._notified5Min) {
            stop._notified5Min = true;
            const proximityNotif = {
              id: `NOTIF-${Date.now()}-${stop.id}`,
              title: `Bus Approaching: ${stop.name}`,
              message: `${bus.fleetNumber} is ~5 minutes away from ${stop.name} (${distKm.toFixed(1)} km). Please be ready at your stop!`,
              type: 'info',
              target: route.id,
              stopId: stop.id,
              timestamp: 'Just now',
              read: false
            };
            db.notifications.unshift(proximityNotif);
            io.emit('alert:5min_away', proximityNotif);
            io.emit('notification:new', proximityNotif);
          }
        });
      }

      // Broadcast updated telemetry to all subscribers
      io.emit('bus:telemetry', {
        busId,
        lat,
        lng,
        speed: bus.speed,
        heading: bus.heading,
        status: bus.status,
        occupied: bus.occupied,
        lastUpdated: bus.lastUpdated
      });
    }
  });

  socket.on('disconnect', () => {
    // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚌 College Bus Backend Server running on port ${PORT}`);
  console.log(`🌐 REST API available at http://localhost:${PORT}/api/overview`);
  console.log(`⚡ WebSocket Server listening for GPS & Trip events`);
});
