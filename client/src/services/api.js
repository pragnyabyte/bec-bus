import { io } from 'socket.io-client';

// Determine backend URL for production or local environment:
// In production: uses import.meta.env.VITE_API_URL or current origin (relative /api)
// In local dev on localhost: defaults to http://localhost:5000
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.local')
);

export const BACKEND_URL = envApiUrl 
  ? envApiUrl.replace(/\/$/, '') 
  : (isLocalhost ? 'http://localhost:5000' : (typeof window !== 'undefined' ? window.location.origin : ''));

const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
const SOCKET_URL = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

export const socket = io(SOCKET_URL, {
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling']
});

export function getAuthToken() {
  try {
    const raw = localStorage.getItem('bectransit_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || null;
    }
  } catch (e) {}
  return null;
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
}

export async function authFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers);
  return fetch(url, {
    ...options,
    headers
  });
}

export const api = {
  checkAuth: async () => {
    const res = await authFetch(`${API_BASE}/auth/me`);
    return res.json();
  },
  getOverview: async () => {
    const res = await authFetch(`${API_BASE}/overview`);
    return res.json();
  },
  getBuses: async () => {
    const res = await authFetch(`${API_BASE}/buses`);
    return res.json();
  },
  updateBus: async (id, data) => {
    const res = await authFetch(`${API_BASE}/buses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  addBus: async (busData) => {
    const res = await authFetch(`${API_BASE}/buses`, {
      method: 'POST',
      body: JSON.stringify(busData)
    });
    return res.json();
  },
  getRoutes: async () => {
    const res = await authFetch(`${API_BASE}/routes`);
    return res.json();
  },
  getStudents: async () => {
    const res = await authFetch(`${API_BASE}/students`);
    return res.json();
  },
  registerStudent: async (studentData) => {
    const res = await authFetch(`${API_BASE}/students/register`, {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Registration failed with status ${res.status}`);
    }
    return data;
  },
  loginStudent: async (credentials) => {
    const res = await authFetch(`${API_BASE}/students/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Login failed with status ${res.status}`);
    }
    return data;
  },
  updateStudent: async (id, studentData) => {
    const res = await authFetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Update failed with status ${res.status}`);
    }
    return data;
  },
  deleteStudent: async (id) => {
    const res = await authFetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to delete student with status ${res.status}`);
    }
    return data;
  },
  adminLogin: async (credentials) => {
    const res = await authFetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Admin login failed with status ${res.status}`);
    }
    return data;
  },
  adminRegisterUser: async (userData) => {
    const res = await authFetch(`${API_BASE}/admin/register-user`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Registration failed with status ${res.status}`);
    }
    return data;
  },
  driverLogin: async (credentials) => {
    const res = await authFetch(`${API_BASE}/driver/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Driver login failed with status ${res.status}`);
    }
    return data;
  },
  updateStudentStatus: async (id, status) => {
    const res = await authFetch(`${API_BASE}/students/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  getComplaints: async () => {
    const res = await authFetch(`${API_BASE}/complaints`);
    return res.json();
  },
  submitComplaint: async (data) => {
    const res = await authFetch(`${API_BASE}/complaints`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  replyComplaint: async (id, data) => {
    const res = await authFetch(`${API_BASE}/complaints/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getChangeRequests: async () => {
    const res = await authFetch(`${API_BASE}/change-requests`);
    return res.json();
  },
  submitChangeRequest: async (data) => {
    const res = await authFetch(`${API_BASE}/change-requests`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  actionChangeRequest: async (id, action) => {
    const res = await authFetch(`${API_BASE}/change-requests/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    return res.json();
  },
  getNotifications: async () => {
    const res = await authFetch(`${API_BASE}/notifications`);
    return res.json();
  },
  broadcastNotification: async (notif) => {
    const res = await authFetch(`${API_BASE}/notifications/broadcast`, {
      method: 'POST',
      body: JSON.stringify(notif)
    });
    return res.json();
  },
  startTrip: async (tripData) => {
    const res = await authFetch(`${API_BASE}/trips/start`, {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
    return res.json();
  },
  endTrip: async (data) => {
    const res = await authFetch(`${API_BASE}/trips/end`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  boardStudent: async (data) => {
    const res = await authFetch(`${API_BASE}/trips/board`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  triggerSOS: async (data) => {
    const res = await authFetch(`${API_BASE}/trips/sos`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  reportIncident: async (data) => {
    const res = await authFetch(`${API_BASE}/trips/incident`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getDbStatus: async () => {
    const res = await authFetch(`${API_BASE}/db-status`);
    return res.json();
  },
  reconnectDb: async () => {
    const res = await authFetch(`${API_BASE}/reconnect-db`, { method: 'POST' });
    return res.json();
  }
};
