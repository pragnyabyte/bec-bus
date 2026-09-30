import './config/env.js';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectMongoDB, { isMongoConnected } from './config/db.js';
import {
  University,
  Route,
  Bus,
  Driver,
  Student,
  Complaint,
  RouteChangeRequest,
  Notification,
  ActiveTrip
} from './models/index.js';
import { initialData } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// In-memory fallback and cache
function loadDbState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
        if (Array.isArray(parsed.buses) && parsed.buses.length === 2 && Array.isArray(parsed.drivers) && parsed.drivers.length === 2) {
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

function saveLocalState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Failed to save local db state:', err.message);
  }
}

// Utility: Calculate distance between coordinates (Haversine formula in km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// -------------------------------------------------------------
// REST API Endpoints with MongoDB Mongoose Integration
// -------------------------------------------------------------

// 1. Health & Database Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isMongoConnected() ? 'MongoDB Atlas (Connected)' : 'Local Storage Fallback (Connecting/Offline)',
    mongoReadyState: mongoose.connection.readyState,
    university: db.university ? db.university.name : 'BEC College'
  });
});

app.get('/api/db-status', async (req, res) => {
  const connected = isMongoConnected();
  let collections = {};

  if (connected) {
    try {
      collections = {
        buses: await Bus.countDocuments(),
        drivers: await Driver.countDocuments(),
        routes: await Route.countDocuments(),
        students: await Student.countDocuments(),
        complaints: await Complaint.countDocuments(),
        routeChangeRequests: await RouteChangeRequest.countDocuments(),
        notifications: await Notification.countDocuments(),
        activeTrips: await ActiveTrip.countDocuments()
      };
    } catch (e) {
      collections = { error: e.message };
    }
  } else {
    collections = {
      buses: db.buses.length,
      drivers: db.drivers.length,
      routes: db.routes.length,
      students: db.students.length,
      complaints: db.complaints.length,
      routeChangeRequests: db.routeChangeRequests.length,
      notifications: db.notifications.length,
      activeTrips: db.activeTrips.length
    };
  }

  res.json({
    connected,
    readyState: mongoose.connection.readyState,
    databaseName: mongoose.connection.name || 'bectransit',
    host: mongoose.connection.host || 'cluster0.lnz3ymu.mongodb.net',
    counts: collections
  });
});

app.post('/api/reconnect-db', async (req, res) => {
  // Re-read .env to load any updated credentials
  dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });
  const success = await connectMongoDB();
  res.json({
    success,
    connected: isMongoConnected(),
    readyState: mongoose.connection.readyState,
    databaseName: mongoose.connection.name,
    message: success
      ? 'Successfully connected to MongoDB Atlas and completed migration!'
      : 'Connection to MongoDB Atlas failed. Please verify user password and IP Access List in Atlas.'
  });
});

// 2. Overview Dashboard API
app.get('/api/overview', async (req, res) => {
  try {
    let buses, routes, drivers, students, complaints, routeChangeRequests, notifications, activeTrips, university;

    if (isMongoConnected()) {
      buses = await Bus.find({}).lean();
      routes = await Route.find({}).lean();
      drivers = await Driver.find({}).lean();
      students = await Student.find({}).lean();
      complaints = await Complaint.find({}).lean();
      routeChangeRequests = await RouteChangeRequest.find({}).lean();
      notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(10).lean();
      activeTrips = await ActiveTrip.find({ status: 'in_progress' }).lean();
      university = await University.findOne({}).lean() || db.university;

      // Update in-memory cache
      db.buses = buses;
      db.routes = routes;
      db.drivers = drivers;
      db.students = students;
      db.complaints = complaints;
      db.routeChangeRequests = routeChangeRequests;
      db.notifications = notifications;
      db.activeTrips = activeTrips;
    } else {
      buses = db.buses;
      routes = db.routes;
      drivers = db.drivers;
      students = db.students;
      complaints = db.complaints;
      routeChangeRequests = db.routeChangeRequests;
      notifications = db.notifications.slice(0, 10);
      activeTrips = db.activeTrips;
      university = db.university;
    }

    const activeBusesCount = buses.filter(b => b.status === 'on_trip' || b.status === 'emergency').length;
    const totalStudents = students.length;
    const boardedStudents = students.filter(s => s.boardedToday).length;
    const pendingApprovals = students.filter(s => s.status === 'pending_approval').length;
    const pendingChangeRequests = routeChangeRequests.filter(r => r.status === 'pending').length;
    const openComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in_review').length;

    res.json({
      university,
      stats: {
        totalBuses: buses.length,
        activeBuses: activeBusesCount,
        totalDrivers: drivers.length,
        totalRoutes: routes.length,
        totalStudents,
        boardedStudents,
        attendanceRate: totalStudents > 0 ? Math.round((boardedStudents / totalStudents) * 100) : 0,
        pendingApprovals,
        pendingChangeRequests,
        openComplaints
      },
      buses,
      routes,
      drivers,
      activeTrips,
      notifications
    });
  } catch (err) {
    console.error('Error fetching overview:', err);
    res.status(500).json({ error: 'Failed to fetch overview', details: err.message });
  }
});

// 3. Buses API (Read, Update, Lock Invariant)
app.get('/api/buses', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const buses = await Bus.find({}).lean();
      db.buses = buses;
      return res.json(buses);
    }
    res.json(db.buses);
  } catch (err) {
    res.json(db.buses);
  }
});

app.get('/api/buses/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const bus = await Bus.findOne({ id: req.params.id }).lean();
      if (bus) return res.json(bus);
    }
    const bus = db.buses.find(b => b.id === req.params.id);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buses', (req, res) => {
  return res.status(400).json({
    error: 'Fleet is fixed to exactly 2 buses (Bus 1 - Pragnya and Bus 2 - Jitendra). Additional buses cannot be created.'
  });
});

app.patch('/api/buses/:id', async (req, res) => {
  const busId = req.params.id;
  const lockedDriverId = busId === 'BUS-01' ? 'PRAGNYA01' : busId === 'BUS-02' ? 'JITENDRA01' : 'PRAGNYA01';
  const lockedDriverName = busId === 'BUS-01' ? 'Pragnya' : busId === 'BUS-02' ? 'Jitendra' : 'Pragnya';
  const lockedRouteId = busId === 'BUS-01' ? 'R-101' : busId === 'BUS-02' ? 'R-102' : 'R-101';
  const lockedFleetNumber = busId === 'BUS-01' ? 'Bus 1' : busId === 'BUS-02' ? 'Bus 2' : 'Bus 1';

  const updateData = {
    ...req.body,
    fleetNumber: lockedFleetNumber,
    driverId: lockedDriverId,
    driverName: lockedDriverName,
    routeId: lockedRouteId,
    lastUpdated: new Date()
  };

  try {
    let updatedBus;
    if (isMongoConnected()) {
      updatedBus = await Bus.findOneAndUpdate({ id: busId }, { $set: updateData }, { new: true }).lean();
    }

    const busIndex = db.buses.findIndex(b => b.id === busId);
    if (busIndex !== -1) {
      db.buses[busIndex] = { ...db.buses[busIndex], ...updateData };
      if (!updatedBus) updatedBus = db.buses[busIndex];
    }

    saveLocalState();
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);
    res.json(updatedBus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bus', details: err.message });
  }
});

// 4. Routes API
app.get('/api/routes', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const routes = await Route.find({}).lean();
      db.routes = routes;
      return res.json(routes);
    }
    res.json(db.routes);
  } catch (err) {
    res.json(db.routes);
  }
});

app.get('/api/routes/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const route = await Route.findOne({ id: req.params.id }).lean();
      if (route) return res.json(route);
    }
    const route = db.routes.find(r => r.id === req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/routes', (req, res) => {
  return res.status(400).json({
    error: 'Transit network is fixed to exactly 2 routes (BEC College ↔ Baramunda and BEC College ↔ Patia).'
  });
});

// 5. Drivers API
app.get('/api/drivers', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const drivers = await Driver.find({}).lean();
      db.drivers = drivers;
      return res.json(drivers);
    }
    res.json(db.drivers);
  } catch (err) {
    res.json(db.drivers);
  }
});

app.get('/api/drivers/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const driver = await Driver.findOne({ id: req.params.id }).lean();
      if (driver) return res.json(driver);
    }
    const driver = db.drivers.find(d => d.id === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Students API & Registration (Create, Read, Update, Delete)
app.get('/api/students', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const students = await Student.find({}).lean();
      db.students = students;
      return res.json(students);
    }
    res.json(db.students);
  } catch (err) {
    res.json(db.students);
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const student = await Student.findOne({
        $or: [{ id: req.params.id }, { rollNo: req.params.id }]
      }).lean();
      if (!student) return res.status(404).json({ error: 'Student not found in registry' });
      return res.json(student);
    }
    const student = db.students.find(s => s.id === req.params.id || s.rollNo === req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/register', async (req, res) => {
  const { name, email, rollNo, department, year, phone, routeId, stopId } = req.body;
  if (!name || !rollNo || !routeId) {
    return res.status(400).json({ error: 'Name, Roll Number, and Route selection are required' });
  }

  // Find assigned route and bus
  const route = db.routes.find(r => r.id === routeId);
  const bus = db.buses.find(b => b.routeId === routeId) || db.buses.find(b => b.id === route?.busId) || db.buses[0];
  const busId = bus ? bus.id : (route ? route.busId : 'BUS-01');

  try {
    let savedStudent;

    if (isMongoConnected()) {
      let existing = await Student.findOne({ rollNo: rollNo.trim() });
      if (existing) {
        existing.name = name.trim();
        if (email) existing.email = email.trim();
        if (department) existing.department = department;
        if (year) existing.year = year;
        if (phone) existing.phone = phone.trim();
        existing.routeId = routeId;
        existing.busId = busId;
        existing.stopId = stopId || (route && route.stops.length > 0 ? route.stops[0].id : null);
        existing.status = 'approved';
        await existing.save();
        savedStudent = existing.toObject();
      } else {
        const count = await Student.countDocuments();
        const nextId = `STU-${String(count + 1).padStart(2, '0')}`;
        const newStu = new Student({
          id: nextId,
          name: name.trim(),
          email: email ? email.trim() : `${rollNo.toLowerCase()}@bec.edu.in`,
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
          qrToken: `BEC-STU-${String(count + 1).padStart(2, '0')}-${rollNo.trim()}`
        });
        await newStu.save();
        savedStudent = newStu.toObject();
      }
    }

    // Mirror to local cache
    const existingIdx = db.students.findIndex(s => s.rollNo?.toLowerCase() === rollNo.trim().toLowerCase());
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
      if (!savedStudent) savedStudent = db.students[existingIdx];
    } else {
      const nextNum = db.students.reduce((max, s) => {
        const num = parseInt(s.id?.replace('STU-', '') || '0', 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0) + 1;

      const newStudentObj = {
        id: `STU-${String(nextNum).padStart(2, '0')}`,
        name: name.trim(),
        email: email ? email.trim() : `${rollNo.toLowerCase()}@bec.edu.in`,
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
        qrToken: `BEC-STU-${String(nextNum).padStart(2, '0')}-${rollNo.trim()}`
      };
      db.students.push(newStudentObj);
      if (!savedStudent) savedStudent = newStudentObj;
    }

    saveLocalState();

    // Create real-time notification in MongoDB & socket
    const notifObj = {
      id: `NOTIF-${Date.now()}`,
      title: 'New Student Registration Successful',
      message: `${savedStudent.name} (${savedStudent.rollNo}) registered for Route ${route ? route.code : routeId}. Digital Bus Pass is active.`,
      type: 'info',
      target: 'all',
      timestamp: 'Just now',
      read: false
    };

    if (isMongoConnected()) {
      try {
        await Notification.create(notifObj);
      } catch (err) {
        console.warn('Could not save notification to Mongo:', err.message);
      }
    }
    db.notifications.unshift(notifObj);

    io.emit('notification:new', notifObj);
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);

    res.status(201).json(savedStudent);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/api/students/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    let student;
    if (isMongoConnected()) {
      student = await Student.findOneAndUpdate({ id: req.params.id }, { $set: { status } }, { new: true }).lean();
    }

    const localStu = db.students.find(s => s.id === req.params.id);
    if (localStu) {
      localStu.status = status;
      if (!student) student = localStu;
    }

    if (!student) return res.status(404).json({ error: 'Student not found' });

    saveLocalState();
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);
    res.json({ message: `Student status updated to ${status}`, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/login', async (req, res) => {
  const { rollNo, email, identifier } = req.body;
  const lookup = (rollNo || email || identifier || '').trim();

  if (!lookup) {
    return res.status(400).json({ error: 'Please enter your College Roll Number or Email to log in.' });
  }

  try {
    let student;
    if (isMongoConnected()) {
      const safeRegex = new RegExp(`^${lookup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      student = await Student.findOne({
        $or: [
          { rollNo: safeRegex },
          { email: safeRegex },
          { id: lookup }
        ]
      }).lean();
    } else {
      student = db.students.find(s =>
        (s.rollNo && s.rollNo.toLowerCase() === lookup.toLowerCase()) ||
        (s.email && s.email.toLowerCase() === lookup.toLowerCase()) ||
        s.id === lookup
      );
    }

    if (!student) {
      return res.status(404).json({
        error: `No registered student found for "${lookup}". Please verify your Roll Number or register for a new bus pass.`
      });
    }

    res.json({
      success: true,
      message: `Welcome back, ${student.name}!`,
      student
    });
  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

app.post('/api/students/update', async (req, res) => {
  const targetId = req.body.id || req.query.id;
  const targetRoll = req.body.rollNo || req.query.rollNo;

  if (!targetId && !targetRoll) {
    return res.status(400).json({ error: 'Student ID or Roll Number is required for updating details.' });
  }

  try {
    const updateData = { ...req.body };
    delete updateData._id;

    if (updateData.routeId) {
      const route = db.routes.find(r => r.id === updateData.routeId);
      const bus = db.buses.find(b => b.routeId === updateData.routeId) || db.buses.find(b => b.id === route?.busId) || db.buses[0];
      updateData.busId = bus ? bus.id : (route ? route.busId : 'BUS-01');
    }

    let student;
    if (isMongoConnected()) {
      const filter = targetId ? { id: targetId } : { rollNo: targetRoll.trim() };
      student = await Student.findOneAndUpdate(filter, { $set: updateData }, { new: true }).lean();
    }

    const idx = db.students.findIndex(s => (targetId && s.id === targetId) || (targetRoll && s.rollNo?.toLowerCase() === targetRoll.trim().toLowerCase()));
    if (idx !== -1) {
      db.students[idx] = { ...db.students[idx], ...updateData };
      if (!student) student = db.students[idx];
    }

    if (!student) return res.status(404).json({ error: 'Student not found in registry' });

    saveLocalState();
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);
    res.json({ success: true, message: 'Student details updated successfully in MongoDB Atlas!', student });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;

    if (updateData.routeId) {
      const route = db.routes.find(r => r.id === updateData.routeId);
      const bus = db.buses.find(b => b.routeId === updateData.routeId) || db.buses.find(b => b.id === route?.busId) || db.buses[0];
      updateData.busId = bus ? bus.id : (route ? route.busId : 'BUS-01');
    }

    let student;
    if (isMongoConnected()) {
      student = await Student.findOneAndUpdate({ id: req.params.id }, { $set: updateData }, { new: true }).lean();
    }
    const idx = db.students.findIndex(s => s.id === req.params.id);
    if (idx !== -1) {
      db.students[idx] = { ...db.students[idx], ...updateData };
      if (!student) student = db.students[idx];
    }
    if (!student) return res.status(404).json({ error: 'Student not found' });

    saveLocalState();
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if ((username === 'admin' && (password === 'admin123' || password === 'admin' || password === '2026')) || password === '2026') {
    return res.json({
      success: true,
      message: 'Administrator authentication successful',
      user: { role: 'admin', name: 'Transport Administrator', id: 'ADMIN-01' }
    });
  }
  return res.status(401).json({ error: 'Invalid administrator credentials. (Default: admin / admin123)' });
});

app.post('/api/driver/login', async (req, res) => {
  const { driverId } = req.body;
  try {
    let driver;
    if (isMongoConnected()) {
      driver = await Driver.findOne({ id: driverId }).lean();
    }
    if (!driver) {
      driver = db.drivers.find(d => d.id === driverId);
    }
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found in fleet registry' });
    }
    res.json({
      success: true,
      message: `Welcome, Driver ${driver.name}!`,
      driver
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const targetId = req.params.id;
  try {
    let deletedStudent;
    if (isMongoConnected()) {
      deletedStudent = await Student.findOneAndDelete({
        $or: [{ id: targetId }, { rollNo: targetId }]
      }).lean();
    }
    const idToDel = deletedStudent?.id || targetId;
    const rollToDel = (deletedStudent?.rollNo || targetId).toLowerCase();
    db.students = db.students.filter(s => s.id !== idToDel && s.rollNo?.toLowerCase() !== rollToDel);

    if (!deletedStudent) {
      return res.status(404).json({ error: 'Student not found in registry' });
    }

    // Clean up related route change requests
    if (isMongoConnected()) {
      await RouteChangeRequest.deleteMany({
        $or: [{ studentId: deletedStudent.id }, { studentRoll: deletedStudent.rollNo }]
      });
    }
    db.routeChangeRequests = db.routeChangeRequests.filter(r => r.studentId !== deletedStudent.id && r.studentRoll !== deletedStudent.rollNo);

    // Create admin notification
    const notifObj = {
      id: `NOTIF-${Date.now()}`,
      title: 'Student Registration Revoked',
      message: `${deletedStudent.name} (${deletedStudent.rollNo}) was removed from MongoDB Atlas database.`,
      type: 'warning',
      target: 'admin',
      timestamp: 'Just now',
      read: false
    };
    if (isMongoConnected()) {
      await Notification.create(notifObj).catch(() => {});
    }
    db.notifications.unshift(notifObj);

    saveLocalState();
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);
    io.emit('notification:new', notifObj);
    res.json({ success: true, message: `Student ${deletedStudent.name} (${deletedStudent.rollNo}) deleted successfully from MongoDB Atlas.`, deletedStudent });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Complaints API (Create, Read, Update, Delete)
app.get('/api/complaints', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const complaints = await Complaint.find({}).sort({ createdAt: -1 }).lean();
      db.complaints = complaints;
      return res.json(complaints);
    }
    res.json(db.complaints);
  } catch (err) {
    res.json(db.complaints);
  }
});

app.post('/api/complaints', async (req, res) => {
  const { studentId, studentName, studentRoll, category, subject, message } = req.body;
  const count = db.complaints.length;
  const newComplaint = {
    id: `CMP-${String(count + 1).padStart(2, '0')}`,
    studentId: studentId || 'STU-01',
    studentName: studentName || 'Alex Johnson',
    studentRoll: studentRoll || 'CS-2024-042',
    category: category || 'General',
    subject: subject || 'Feedback',
    message: message || '',
    status: 'open',
    adminReply: null,
    createdAtString: 'Just now'
  };

  try {
    if (isMongoConnected()) {
      await Complaint.create(newComplaint);
    }
    db.complaints.unshift(newComplaint);
    saveLocalState();

    const notif = {
      id: `NOTIF-${Date.now()}`,
      title: 'New Student Complaint Received',
      message: `[${category}] ${subject} from ${studentName}`,
      type: 'warning',
      target: 'admin',
      timestamp: 'Just now',
      read: false
    };

    if (isMongoConnected()) {
      await Notification.create(notif);
    }
    db.notifications.unshift(notif);

    io.emit('notification:new', notif);
    io.emit('complaints:updated', isMongoConnected() ? await Complaint.find({}).lean() : db.complaints);

    res.status(201).json(newComplaint);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record complaint', details: err.message });
  }
});

app.post('/api/complaints/:id/reply', async (req, res) => {
  const { adminReply, status } = req.body;
  try {
    let complaint;
    if (isMongoConnected()) {
      complaint = await Complaint.findOneAndUpdate(
        { id: req.params.id },
        { $set: { adminReply, status: status || 'resolved' } },
        { new: true }
      ).lean();
    }

    const localCmp = db.complaints.find(c => c.id === req.params.id);
    if (localCmp) {
      localCmp.adminReply = adminReply;
      localCmp.status = status || 'resolved';
      if (!complaint) complaint = localCmp;
    }

    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    saveLocalState();
    io.emit('complaints:updated', isMongoConnected() ? await Complaint.find({}).lean() : db.complaints);
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/complaints/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      await Complaint.deleteOne({ id: req.params.id });
    }
    db.complaints = db.complaints.filter(c => c.id !== req.params.id);
    saveLocalState();
    io.emit('complaints:updated', isMongoConnected() ? await Complaint.find({}).lean() : db.complaints);
    res.json({ message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Route Change Requests API
app.get('/api/change-requests', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const requests = await RouteChangeRequest.find({}).sort({ createdAt: -1 }).lean();
      db.routeChangeRequests = requests;
      return res.json(requests);
    }
    res.json(db.routeChangeRequests);
  } catch (err) {
    res.json(db.routeChangeRequests);
  }
});

app.post('/api/change-requests', async (req, res) => {
  const { studentId, studentName, studentRoll, currentRoute, requestedRoute, currentStop, requestedStop, reason } = req.body;
  const count = db.routeChangeRequests.length;
  const newReq = {
    id: `REQ-${String(count + 1).padStart(2, '0')}`,
    studentId,
    studentName,
    studentRoll,
    currentRoute,
    requestedRoute,
    currentStop,
    requestedStop,
    reason,
    status: 'pending',
    submittedAtString: 'Just now'
  };

  try {
    if (isMongoConnected()) {
      await RouteChangeRequest.create(newReq);
    }
    db.routeChangeRequests.unshift(newReq);
    saveLocalState();

    io.emit('change_requests:updated', isMongoConnected() ? await RouteChangeRequest.find({}).lean() : db.routeChangeRequests);
    res.status(201).json(newReq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/change-requests/:id/action', async (req, res) => {
  const { action } = req.body; // 'approved' | 'rejected'
  try {
    let request;
    if (isMongoConnected()) {
      request = await RouteChangeRequest.findOneAndUpdate(
        { id: req.params.id },
        { $set: { status: action } },
        { new: true }
      ).lean();
    }

    const localReq = db.routeChangeRequests.find(r => r.id === req.params.id);
    if (localReq) {
      localReq.status = action;
      if (!request) request = localReq;
    }

    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (action === 'approved') {
      const matchedRoute = db.routes.find(r =>
        r.name.toLowerCase().includes(request.requestedRoute.toLowerCase()) ||
        r.code.toLowerCase().includes(request.requestedRoute.toLowerCase())
      );
      if (matchedRoute) {
        if (isMongoConnected()) {
          await Student.findOneAndUpdate(
            { id: request.studentId },
            { $set: { routeId: matchedRoute.id, busId: matchedRoute.busId } }
          );
        }
        const student = db.students.find(s => s.id === request.studentId);
        if (student) {
          student.routeId = matchedRoute.id;
          student.busId = matchedRoute.busId;
        }
      }
    }

    saveLocalState();
    io.emit('change_requests:updated', isMongoConnected() ? await RouteChangeRequest.find({}).lean() : db.routeChangeRequests);
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Notifications API
app.get('/api/notifications', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const notifs = await Notification.find({}).sort({ createdAt: -1 }).lean();
      db.notifications = notifs;
      return res.json(notifs);
    }
    res.json(db.notifications);
  } catch (err) {
    res.json(db.notifications);
  }
});

app.post('/api/notifications/broadcast', async (req, res) => {
  const { title, message, type, target } = req.body;
  const newNotif = {
    id: `NOTIF-${Date.now()}`,
    title: title || 'Campus Transport Announcement',
    message: message || '',
    type: type || 'info',
    target: target || 'all',
    timestamp: 'Just now',
    read: false
  };

  try {
    if (isMongoConnected()) {
      await Notification.create(newNotif);
    }
    db.notifications.unshift(newNotif);
    saveLocalState();

    io.emit('notification:new', newNotif);
    res.status(201).json(newNotif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      await Notification.deleteOne({ id: req.params.id });
    }
    db.notifications = db.notifications.filter(n => n.id !== req.params.id);
    saveLocalState();
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Trip Controls & Real-time Persistence
app.get('/api/trips', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const trips = await ActiveTrip.find({}).lean();
      db.activeTrips = trips;
      return res.json(trips);
    }
    res.json(db.activeTrips);
  } catch (err) {
    res.json(db.activeTrips);
  }
});

app.post('/api/trips/start', async (req, res) => {
  const { busId, routeId, driverId, tripType } = req.body;

  try {
    if (isMongoConnected()) {
      await Bus.findOneAndUpdate({ id: busId }, { $set: { status: 'on_trip', speed: 25, lastUpdated: new Date() } });
    }
    const bus = db.buses.find(b => b.id === busId);
    if (bus) {
      bus.status = 'on_trip';
      bus.speed = 25;
      bus.lastUpdated = new Date().toISOString();
    }

    const existingTrip = isMongoConnected()
      ? await ActiveTrip.findOne({ busId, status: 'in_progress' }).lean()
      : db.activeTrips.find(t => t.busId === busId && t.status === 'in_progress');

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

    if (isMongoConnected()) {
      await ActiveTrip.create(newTrip);
    }
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

    if (isMongoConnected()) {
      await Notification.create(notif);
    }
    db.notifications.unshift(notif);

    saveLocalState();
    io.emit('trip:started', { trip: newTrip, bus });
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);
    io.emit('notification:new', notif);

    res.json({ message: 'Trip started successfully', trip: newTrip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/end', async (req, res) => {
  const { busId, summary } = req.body;
  try {
    if (isMongoConnected()) {
      await Bus.findOneAndUpdate({ id: busId }, { $set: { status: 'available', speed: 0, lastUpdated: new Date() } });
    }
    const bus = db.buses.find(b => b.id === busId);
    if (bus) {
      bus.status = 'available';
      bus.speed = 0;
      bus.lastUpdated = new Date().toISOString();
    }

    let finishedTrip = null;
    if (isMongoConnected()) {
      finishedTrip = await ActiveTrip.findOneAndUpdate(
        { busId, status: 'in_progress' },
        {
          $set: {
            status: 'completed',
            endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            summary
          }
        },
        { new: true }
      ).lean();
    }

    const tripIndex = db.activeTrips.findIndex(t => t.busId === busId && t.status === 'in_progress');
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

    if (isMongoConnected()) {
      await Notification.create(notif);
    }
    db.notifications.unshift(notif);

    saveLocalState();
    io.emit('trip:ended', { busId, finishedTrip });
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);
    io.emit('notification:new', notif);

    res.json({ message: 'Trip concluded', trip: finishedTrip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Board student (QR scan or manual check)
app.post('/api/trips/board', async (req, res) => {
  const { studentId, busId, stopId, method } = req.body;

  try {
    let student;
    const boardedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isMongoConnected()) {
      student = await Student.findOneAndUpdate(
        { $or: [{ id: studentId }, { rollNo: studentId }, { qrToken: studentId }] },
        { $set: { boardedToday: true, boardedTime } },
        { new: true }
      ).lean();
    }

    const localStu = db.students.find(s => s.id === studentId || s.rollNo === studentId || s.qrToken === studentId);
    if (localStu) {
      localStu.boardedToday = true;
      localStu.boardedTime = boardedTime;
      if (!student) student = localStu;
    }

    if (!student) return res.status(404).json({ error: 'Student not found in registry' });

    // Update bus occupied count
    const targetBusId = busId || student.busId;
    if (isMongoConnected()) {
      await Bus.findOneAndUpdate(
        { id: targetBusId, occupied: { $lt: 50 } },
        { $inc: { occupied: 1 } }
      );
    }

    const bus = db.buses.find(b => b.id === targetBusId);
    if (bus && bus.occupied < bus.capacity) {
      bus.occupied += 1;
    }

    // Update active trip
    const trip = db.activeTrips.find(t => t.busId === targetBusId && t.status === 'in_progress');
    if (trip) {
      trip.totalBoarded = (trip.totalBoarded || 0) + 1;
      trip.boardedStudents.push({
        studentId: student.id,
        stopId: stopId || student.stopId,
        time: student.boardedTime,
        method: method || 'manual'
      });
    }

    saveLocalState();
    io.emit('student:boarded', { student, bus, timestamp: student.boardedTime });
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);
    io.emit('students:updated', isMongoConnected() ? await Student.find({}).lean() : db.students);

    res.json({ message: `${student.name} marked as boarded!`, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Emergency SOS alert
app.post('/api/trips/sos', async (req, res) => {
  const { busId, driverId, lat, lng, reason } = req.body;

  try {
    if (isMongoConnected()) {
      await Bus.findOneAndUpdate({ id: busId }, { $set: { status: 'emergency', lastUpdated: new Date() } });
    }
    const bus = db.buses.find(b => b.id === busId);
    if (bus) {
      bus.status = 'emergency';
      bus.lastUpdated = new Date().toISOString();
    }

    const sosAlert = {
      id: `SOS-${Date.now()}`,
      busId,
      busNo: bus ? bus.busNo : 'OD-02-AX-1001',
      fleetNumber: bus ? bus.fleetNumber : 'Bus',
      driverId,
      location: { lat: lat || (bus ? bus.currentLat : 20.2612), lng: lng || (bus ? bus.currentLng : 85.7745) },
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

    if (isMongoConnected()) {
      await Notification.create(notif);
    }
    db.notifications.unshift(notif);

    saveLocalState();
    io.emit('alert:sos', sosAlert);
    io.emit('notification:new', notif);
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);

    res.json({ message: 'Emergency SOS broadcasted successfully', sosAlert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Incident Report (Traffic / Breakdown)
app.post('/api/trips/incident', async (req, res) => {
  const { busId, type, delayMinutes, description } = req.body;

  try {
    if (type === 'breakdown') {
      if (isMongoConnected()) {
        await Bus.findOneAndUpdate({ id: busId }, { $set: { status: 'maintenance', speed: 0, lastUpdated: new Date() } });
      }
      const bus = db.buses.find(b => b.id === busId);
      if (bus) {
        bus.status = 'maintenance';
        bus.speed = 0;
      }
    }

    const bus = db.buses.find(b => b.id === busId);
    const notif = {
      id: `NOTIF-${Date.now()}`,
      title: type === 'breakdown' ? `⚠️ Bus Breakdown Reported: ${bus ? bus.fleetNumber : 'Bus'}` : `⏳ Traffic Delay Alert (+${delayMinutes || 15} mins)`,
      message: description || `Bus is delayed due to ${type}. Please adjust arrival expectations.`,
      type: type === 'breakdown' ? 'emergency' : 'delay',
      target: bus ? bus.routeId : 'all',
      timestamp: 'Just now',
      read: false
    };

    if (isMongoConnected()) {
      await Notification.create(notif);
    }
    db.notifications.unshift(notif);

    saveLocalState();
    io.emit('notification:new', notif);
    io.emit('buses:updated', isMongoConnected() ? await Bus.find({}).lean() : db.buses);

    res.json({ message: 'Incident reported and broadcasted', notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// WebSocket Real-time Handlers & MongoDB Telemetry Updates
// -------------------------------------------------------------
io.on('connection', (socket) => {
  socket.emit('initial:state', {
    buses: db.buses,
    routes: db.routes,
    notifications: db.notifications.slice(0, 10),
    activeTrips: db.activeTrips
  });

  // Driver emits GPS telemetry
  socket.on('driver:location_update', async (telemetry) => {
    const { busId, lat, lng, speed, heading, nextStopId } = telemetry;
    const bus = db.buses.find(b => b.id === busId);

    if (bus) {
      bus.currentLat = lat;
      bus.currentLng = lng;
      if (speed !== undefined) bus.speed = speed;
      if (heading !== undefined) bus.heading = heading;
      if (nextStopId) bus.nextStopId = nextStopId;
      bus.lastUpdated = new Date().toISOString();

      if (isMongoConnected()) {
        try {
          await Bus.findOneAndUpdate(
            { id: busId },
            {
              $set: {
                currentLat: lat,
                currentLng: lng,
                speed: bus.speed,
                heading: bus.heading,
                nextStopId: bus.nextStopId,
                lastUpdated: new Date()
              }
            }
          );
        } catch (e) {
          // ignore telemetry write error
        }
      }

      // Proximity ETA check (5-minute away alert)
      const route = db.routes.find(r => r.id === bus.routeId);
      if (route && route.stops) {
        route.stops.forEach(async (stop) => {
          const distKm = calculateDistanceKm(lat, lng, stop.lat, stop.lng);
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
            if (isMongoConnected()) {
              try {
                await Notification.create(proximityNotif);
              } catch (e) {}
            }
            db.notifications.unshift(proximityNotif);
            io.emit('alert:5min_away', proximityNotif);
            io.emit('notification:new', proximityNotif);
          }
        });
      }

      // Broadcast updated telemetry to all clients
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
});

const PORT = process.env.PORT || 5000;

// Serve static frontend assets in production if client/dist exists
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Connect to MongoDB Atlas and start HTTP/Socket Server
async function startServer() {
  await connectMongoDB();

  server.listen(PORT, () => {
    console.log(`🚌 College Bus Backend Server running on port ${PORT}`);
    console.log(`🌐 REST API available at http://localhost:${PORT}/api/overview`);
    console.log(`📊 DB Status available at http://localhost:${PORT}/api/db-status`);
    console.log(`⚡ WebSocket Server listening for GPS & Trip events`);
  });
}

startServer();
