import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling']
});

export const api = {
  getOverview: async () => {
    const res = await fetch(`${API_BASE}/overview`);
    return res.json();
  },
  getBuses: async () => {
    const res = await fetch(`${API_BASE}/buses`);
    return res.json();
  },
  updateBus: async (id, data) => {
    const res = await fetch(`${API_BASE}/buses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  addBus: async (busData) => {
    const res = await fetch(`${API_BASE}/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(busData)
    });
    return res.json();
  },
  getRoutes: async () => {
    const res = await fetch(`${API_BASE}/routes`);
    return res.json();
  },
  getStudents: async () => {
    const res = await fetch(`${API_BASE}/students`);
    return res.json();
  },
  registerStudent: async (studentData) => {
    const res = await fetch(`${API_BASE}/students/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Registration failed with status ${res.status}`);
    }
    return data;
  },
  updateStudentStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/students/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  getComplaints: async () => {
    const res = await fetch(`${API_BASE}/complaints`);
    return res.json();
  },
  submitComplaint: async (data) => {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  replyComplaint: async (id, data) => {
    const res = await fetch(`${API_BASE}/complaints/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getChangeRequests: async () => {
    const res = await fetch(`${API_BASE}/change-requests`);
    return res.json();
  },
  submitChangeRequest: async (data) => {
    const res = await fetch(`${API_BASE}/change-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  actionChangeRequest: async (id, action) => {
    const res = await fetch(`${API_BASE}/change-requests/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return res.json();
  },
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`);
    return res.json();
  },
  broadcastNotification: async (notif) => {
    const res = await fetch(`${API_BASE}/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    });
    return res.json();
  },
  startTrip: async (tripData) => {
    const res = await fetch(`${API_BASE}/trips/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData)
    });
    return res.json();
  },
  endTrip: async (data) => {
    const res = await fetch(`${API_BASE}/trips/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  boardStudent: async (data) => {
    const res = await fetch(`${API_BASE}/trips/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  triggerSOS: async (data) => {
    const res = await fetch(`${API_BASE}/trips/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  reportIncident: async (data) => {
    const res = await fetch(`${API_BASE}/trips/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
