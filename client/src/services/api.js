import { io } from 'socket.io-client';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import {
  db,
  firebaseGetOverview,
  firebaseGetRoutes,
  firebaseGetBuses,
  firebaseGetDrivers,
  firebaseUpdateBus,
  firebaseGetStudents,
  firebaseFindStudent,
  firebaseFindDriver,
  firebaseRegisterStudentFullFlow,
  firebaseRegisterDriverFullFlow,
  firebaseGetComplaints,
  firebaseSubmitComplaint,
  firebaseReplyComplaint,
  firebaseGetChangeRequests,
  firebaseSubmitChangeRequest,
  firebaseActionChangeRequest,
  firebaseGetNotifications,
  firebaseBroadcastNotification,
  DEFAULT_ROUTES,
  DEFAULT_BUSES,
  DEFAULT_DRIVERS
} from './firebase';

// Determine backend URL for production or local environment:
// In production: serverless Firebase Spark mode (direct Firestore & Firebase Auth)
// In local dev on localhost: connects to http://localhost:5000 (Express & MongoDB)
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.local') ||
  /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)
);

export const BACKEND_URL = envApiUrl 
  ? envApiUrl.replace(/\/$/, '') 
  : (isLocalhost ? `http://${window.location.hostname}:5000` : '');

const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '';
const SOCKET_URL = BACKEND_URL || (isLocalhost ? `http://${window.location.hostname}:5000` : '');

// Real-time Socket.IO is active for local development with Express;
// in production Firebase Spark hosting, no websocket server is needed.
export const socket = isLocalhost && SOCKET_URL 
  ? io(SOCKET_URL, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    })
  : {
      on: () => {},
      off: () => {},
      emit: () => {}
    };

export function getAuthToken() {
  try {
    const raw = localStorage.getItem('bectransit_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
    }
    const drvId = localStorage.getItem('apextransit_active_driver_id');
    if (drvId) {
      return `token-drv-${drvId}`;
    }
  } catch (e) {}
  return 'token-drv-session';
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
  if (!url || (!isLocalhost && !envApiUrl)) {
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const headers = getAuthHeaders(options.headers);
  return fetch(url, {
    ...options,
    headers
  });
}

export async function fastFetch(url, options = {}, ms = 8000) {
  if (!url || (!isLocalhost && !envApiUrl)) {
    return null;
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const headers = getAuthHeaders(options.headers);
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

export async function safeJson(resPromise, fallback = null) {
  try {
    const res = await resPromise;
    if (!res || !res.ok) return fallback;
    const cType = res.headers?.get('content-type') || '';
    if (cType.includes('application/json')) {
      return await res.json();
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export const api = {
  checkAuth: async () => {
    if (isLocalhost && API_BASE) {
      return safeJson(authFetch(`${API_BASE}/auth/me`), null);
    }
    try {
      const session = JSON.parse(localStorage.getItem('bectransit_auth_session') || 'null');
      return session ? { user: session.user } : null;
    } catch (e) {
      return null;
    }
  },

  getOverview: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/overview`), null);
      if (be && be.buses) return be;
    }
    return firebaseGetOverview();
  },

  getBuses: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/buses`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetBuses();
  },

  updateBus: async (id, data) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/buses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }).catch(() => {});
    }
    return firebaseUpdateBus(id, data);
  },

  addBus: async (busData) => {
    const targetId = busData.id || `BUS-${Date.now()}`;
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/buses`, {
        method: 'POST',
        body: JSON.stringify(busData)
      }).catch(() => {});
    }
    return firebaseUpdateBus(targetId, busData);
  },

  getRoutes: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/routes`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetRoutes();
  },

  getStudents: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/students`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetStudents();
  },

  registerStudent: async (studentData, onStepChange) => {
    const { stopId, boardingStop, boarding_stop, ...cleanStudentData } = studentData;
    const cleanRollNo = (cleanStudentData.rollNo || '').trim().toUpperCase().replace(/\s+/g, '');

    // 1. Sync with backend API (Express & MongoDB) if active
    let backendStudent = null;
    if (isLocalhost && API_BASE) {
      try {
        const res = await fastFetch(`${API_BASE}/students/register`, {
          method: 'POST',
          body: JSON.stringify({
            ...cleanStudentData,
            rollNo: cleanRollNo
          })
        });
        if (res && res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `A student account already exists for Registration ID "${cleanRollNo}".`);
        }
        if (res && res.ok) {
          backendStudent = await res.json().catch(() => null);
        }
      } catch (err) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
          throw err;
        }
        console.warn('[API registerStudent] Local backend notice:', err.message);
      }
    }

    // 2. Execute stepped registration in Firebase (Auth + Cloud Firestore + Local Cache)
    const fbRes = await firebaseRegisterStudentFullFlow({
      ...cleanStudentData,
      rollNo: cleanRollNo
    }, onStepChange);

    const mergedStudent = {
      ...(backendStudent || {}),
      ...(fbRes?.student || {}),
      routeId: cleanStudentData.routeId,
      busId: cleanStudentData.routeId === 'R-102' ? 'BUS-02' : 'BUS-01'
    };

    return {
      ...fbRes,
      success: true,
      student: mergedStudent
    };
  },

  loginStudent: async (credentials) => {
    const enteredId = (credentials.registrationId || credentials.identifier || credentials.rollNo || '').trim();
    const enteredName = (credentials.name || '').trim();
    const normalize = str => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Check in Cloud Firestore and local persistent cache (<1ms)
    const fbStudent = await firebaseFindStudent(enteredId);
    if (fbStudent) {
      if (enteredName && fbStudent.name && normalize(enteredName) !== normalize(fbStudent.name)) {
        throw new Error(`The entered Name "${enteredName}" does not match the registered record for Registration ID "${enteredId}".`);
      }
      return {
        success: true,
        student: fbStudent,
        token: `token-fb-${Date.now()}`
      };
    }

    // 2. Instant check in default pre-approved students (<1ms)
    const demoStudents = [
      { id: 'STU-01', name: 'Tanmay Mohanty', rollNo: 'CS-2024-001', department: 'Computer Science & Engineering', year: '3rd Year', routeId: 'R-101', status: 'approved' },
      { id: 'STU-02', name: 'Priya Sharma', rollNo: 'CS-2024-002', department: 'Electronics & Communication', year: '2nd Year', routeId: 'R-102', status: 'approved' },
      { id: 'STU-03', name: 'prachi', rollNo: '25078', department: 'Computer Science & Engineering', year: '1st Year', routeId: 'R-101', status: 'approved' }
    ];
    const demoMatch = demoStudents.find(s => s.rollNo.toLowerCase() === enteredId.toLowerCase() || s.id.toLowerCase() === enteredId.toLowerCase());
    if (demoMatch) {
      if (enteredName && normalize(enteredName) !== normalize(demoMatch.name)) {
        throw new Error(`The entered Name "${enteredName}" does not match the registered record for Registration ID "${enteredId}".`);
      }
      return {
        success: true,
        student: demoMatch,
        token: `token-demo-${Date.now()}`
      };
    }

    // 3. If on localhost, check local Express backend
    if (isLocalhost && API_BASE) {
      const res = await fastFetch(`${API_BASE}/students/login`, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res && res.ok) {
        const contentType = res.headers?.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      } else if (res && !res.ok) {
        const contentType = res.headers?.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Login failed with status ${res.status}`);
        }
      }
    }

    throw new Error(`No registered student found for Registration ID "${enteredId}". Please click Register below to create an account.`);
  },

  updateStudent: async (id, studentData) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData)
      }).catch(() => {});
    }
    await setDoc(doc(db, 'students', id), studentData, { merge: true });
    return studentData;
  },

  deleteStudent: async (id) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
    await deleteDoc(doc(db, 'students', id)).catch(() => {});
    return { success: true };
  },

  adminLogin: async (credentials) => {
    const username = (credentials.username || '').trim().toLowerCase();
    const password = (credentials.password || '').trim();

    // Instant validation of authorized administrator credentials: only admin / ad2026
    if (username === 'admin' && password === 'ad2026') {
      return {
        success: true,
        token: `token-admin-${Date.now()}`,
        user: { id: 'ADM-01', name: 'Campus Transport Administrator', role: 'admin' }
      };
    }

    if (isLocalhost && API_BASE) {
      const res = await fastFetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res && res.ok) {
        const contentType = res.headers?.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    }

    throw new Error('Invalid administrator credentials.');
  },

  adminRegisterUser: async (userData) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/admin/register-user`, {
        method: 'POST',
        body: JSON.stringify(userData)
      }).catch(() => {});
    }
    const targetId = userData.userId || userData.rollNo || userData.id;
    const colName = userData.role === 'driver' ? 'drivers' : 'students';
    await setDoc(doc(db, colName, targetId), { ...userData, status: 'approved', source: 'admin' }, { merge: true });
    return { success: true, user: userData };
  },

  driverLogin: async (credentials) => {
    const targetId = (credentials.driverId || '').trim().toUpperCase();
    const enteredPin = (credentials.pin || '').trim();

    // Driver Access PIN must be exactly 2026
    if (enteredPin !== '2026') {
      throw new Error('Invalid Driver Access PIN. Driver login requires PIN 2026.');
    }

    // 1. Check in Cloud Firestore driver collection
    const fbDriver = await firebaseFindDriver(targetId);
    if (fbDriver) {
      return {
        success: true,
        driver: fbDriver,
        token: `token-drv-${Date.now()}`
      };
    }

    // 2. Check in pre-registered fleet drivers: Pragnya (Bus 1) or Jitendra (Bus 2)
    if (targetId === 'PRAGNYA01' || targetId === 'JITENDRA01') {
      return {
        success: true,
        driver: targetId === 'PRAGNYA01'
          ? { id: 'PRAGNYA01', name: 'Pragnya', busId: 'BUS-01', busName: 'Bus 1 (Baramunda)', phone: '+919040833547' }
          : { id: 'JITENDRA01', name: 'Jitendra', busId: 'BUS-02', busName: 'Bus 2 (Patia)', phone: '+916370998587' },
        token: `token-drv-${Date.now()}`
      };
    }

    if (isLocalhost && API_BASE) {
      const res = await fastFetch(`${API_BASE}/driver/login`, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res && res.ok) {
        const contentType = res.headers?.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    }

    throw new Error(`Driver with ID "${targetId}" not found. Please register your driver account below.`);
  },

  registerDriver: async (driverData, onStepChange) => {
    const fbRes = await firebaseRegisterDriverFullFlow(driverData, onStepChange);
    if (isLocalhost && API_BASE) {
      fastFetch(`${API_BASE}/driver/register`, {
        method: 'POST',
        body: JSON.stringify(driverData)
      }).catch(() => {});
    }
    return fbRes;
  },

  updateStudentStatus: async (id, status) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/students/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      }).catch(() => {});
    }
    const { doc, updateDoc, getFirestore } = await import('firebase/firestore');
    const { app } = await import('./firebase');
    const db = getFirestore(app);
    await updateDoc(doc(db, 'students', id), { status }).catch(() => {});
    return { success: true, status };
  },

  getComplaints: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/complaints`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetComplaints();
  },

  submitComplaint: async (data) => {
    let result = null;
    if (isLocalhost && API_BASE) {
      try {
        const res = await authFetch(`${API_BASE}/complaints`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.ok) {
          result = await res.json();
        }
      } catch (e) {
        console.warn('Backend submitComplaint error:', e.message);
      }
    }
    const fbRes = await firebaseSubmitComplaint(data);
    return result || fbRes;
  },

  replyComplaint: async (id, data) => {
    let result = null;
    if (isLocalhost && API_BASE) {
      try {
        const res = await authFetch(`${API_BASE}/complaints/${id}/reply`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.ok) {
          result = await res.json();
        }
      } catch (e) {
        console.warn('Backend replyComplaint error:', e.message);
      }
    }
    const fbRes = await firebaseReplyComplaint(id, data);
    return result || fbRes;
  },

  getChangeRequests: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/change-requests`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetChangeRequests();
  },

  submitChangeRequest: async (data) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/change-requests`, {
        method: 'POST',
        body: JSON.stringify(data)
      }).catch(() => {});
    }
    return firebaseSubmitChangeRequest(data);
  },

  actionChangeRequest: async (id, action) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/change-requests/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
      }).catch(() => {});
    }
    return firebaseActionChangeRequest(id, action);
  },

  getNotifications: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/notifications`), null);
      if (be && be.length > 0) return be;
    }
    return firebaseGetNotifications();
  },

  broadcastNotification: async (notif) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST',
        body: JSON.stringify(notif)
      }).catch(() => {});
    }
    return firebaseBroadcastNotification(notif);
  },

  startTrip: async (tripData) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/trips/start`, {
        method: 'POST',
        body: JSON.stringify(tripData)
      }).catch(() => {});
    }
    return firebaseUpdateBus(tripData.busId || 'BUS-01', { status: 'on_trip', activeTrip: tripData });
  },

  endTrip: async (data) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/trips/end`, {
        method: 'POST',
        body: JSON.stringify(data)
      }).catch(() => {});
    }
    return firebaseUpdateBus(data.busId || 'BUS-01', { status: 'idle', activeTrip: null });
  },

  boardStudent: async (data) => {
    let result = { success: true };
    if (isLocalhost && API_BASE) {
      const res = await authFetch(`${API_BASE}/trips/board`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res && res.ok) {
        result = await res.json();
      } else if (res) {
        const errData = await res.json().catch(() => ({}));
        console.warn('Backend /api/trips/board response:', res.status, errData);
        throw new Error(errData.error || `Boarding failed with status ${res.status}`);
      }
    }

    if (result && result.alreadyBoarded) {
      return result;
    }

    const studentDocId = result.student?.id || data.studentId;
    const studentRoll = result.student?.rollNo || data.rollNo;
    const boardedTime = result.student?.boardedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (studentDocId) {
      await updateDoc(doc(db, 'students', studentDocId), {
        boardedToday: true,
        boardedTime
      }).catch(() => {});
    }

    // Also update localStorage cache so offline/fallback reads preserve boarded state
    try {
      const cached = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        let matched = false;
        const updated = cached.map(s => {
          if ((studentDocId && s.id === studentDocId) || (studentRoll && s.rollNo?.toLowerCase() === studentRoll.toLowerCase())) {
            matched = true;
            return { ...s, boardedToday: true, boardedTime };
          }
          return s;
        });
        if (!matched && (data.name || data.studentName) && (studentRoll || studentDocId)) {
          updated.push({
            id: studentDocId || `STU-${studentRoll}`,
            name: data.name || data.studentName,
            rollNo: studentRoll || studentDocId,
            routeId: data.routeId || 'R-101',
            busId: data.busId || 'BUS-01',
            boardedToday: true,
            boardedTime
          });
        }
        localStorage.setItem('bectransit_firebase_students', JSON.stringify(updated));
      }
    } catch (e) {}

    return result;
  },

  triggerSOS: async (data) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/trips/sos`, {
        method: 'POST',
        body: JSON.stringify(data)
      }).catch(() => {});
    }
    const busId = data.busId || 'BUS-01';
    await firebaseUpdateBus(busId, { status: 'emergency' });
    await firebaseBroadcastNotification({
      title: '🚨 EMERGENCY SOS ALERT',
      message: `Bus ${busId} has triggered an emergency alarm. Coordinates: ${data.lat || 'Campus Route'}, ${data.lng || ''}`,
      type: 'emergency'
    });
    return { success: true };
  },

  reportIncident: async (data) => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/trips/incident`, {
        method: 'POST',
        body: JSON.stringify(data)
      }).catch(() => {});
    }
    return firebaseBroadcastNotification({
      title: `⚠️ Delay Report: ${data.busName || 'Bus'}`,
      message: data.message || `Bus delayed by approximately ${data.delayMinutes || '10'} minutes due to traffic.`,
      type: 'warning'
    });
  },

  getDbStatus: async () => {
    if (isLocalhost && API_BASE) {
      const be = await safeJson(authFetch(`${API_BASE}/db-status`), null);
      if (be) return be;
    }
    return { connected: true, provider: 'Cloud Firestore (Spark Plan)' };
  },

  reconnectDb: async () => {
    if (isLocalhost && API_BASE) {
      authFetch(`${API_BASE}/reconnect-db`, { method: 'POST' }).catch(() => {});
    }
    return { success: true };
  }
};
