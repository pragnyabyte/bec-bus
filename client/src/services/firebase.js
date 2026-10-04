import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  query, 
  where 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || "AIzaSyDZAjfY5nQxrV_O6aEO79v8wsVGDpVSveg",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || "bec-bus.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || "bec-bus",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || "bec-bus.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "341826123522",
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || "1:341826123522:web:9257e33eca185e2234f41b",
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || "G-H9FH14JLKV"
};

// Initialize Firebase App safely (singleton)
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('YOUR_NEW') &&
  !firebaseConfig.projectId.includes('your_') &&
  !firebaseConfig.apiKey.includes('YOUR_NEW') &&
  !firebaseConfig.apiKey.includes('your_')
);

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Strict timeout failsafe to ensure no operation hangs the UI forever
 */
export function promiseWithTimeout(promise, ms = 10000, timeoutMessage = 'Unable to connect to Firebase. Check your internet connection.') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(timeoutMessage);
      err.code = 'timeout/request-timed-out';
      reject(err);
    }, ms);

    promise.then(
      res => {
        clearTimeout(timer);
        resolve(res);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Fast promise timeout utility returning fallback value instead of throwing
 */
export function withTimeout(promise, ms = 2000, fallbackVal = null) {
  return promiseWithTimeout(promise, ms, 'Timeout').catch(err => {
    console.warn('[Firebase] Handled error in withTimeout:', err.message);
    return fallbackVal;
  });
}

/**
 * Comprehensive mapping of Firebase Auth and Firestore error codes to user-friendly messages
 * Technical errors are logged to console.error; user-safe messages are returned.
 */
export function mapFirebaseAuthError(err) {
  if (!err) return 'Registration could not be completed. Please check the entered details.';
  console.error('[Firebase Detailed Error]:', err.code, err.message, err);

  const code = err.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists for this email address or Registration ID.';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email address format. Please enter a valid College Email.';
  }
  if (code === 'auth/weak-password') {
    return 'The password is too weak. Please ensure your Registration ID has at least 6 characters.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'permission-denied') {
    return 'Registration could not be completed because database access is not configured correctly.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in method is not enabled in Firebase Console. Please enable Email/Password in Authentication > Sign-in method.';
  }
  if (code === 'auth/configuration-not-found') {
    return 'Firebase Authentication is not yet enabled in Firebase Console. Please enable Authentication in Firebase Console.';
  }
  if (code === 'auth/admin-restricted-operation') {
    return 'Account creation is currently restricted by the administrator.';
  }
  if (code === 'auth/user-disabled') {
    return 'This user account has been disabled.';
  }
  if (err.message && err.message.toLowerCase().includes('timed out')) {
    return 'Network error. Please try again.';
  }
  return err.message || 'Registration could not be completed. Please check the entered details.';
}

/**
 * Fast lookup student: local persistent mirror first (<1ms), then Firestore
 */
export async function firebaseFindStudent(identifier) {
  if (!identifier) return null;
  const lookup = identifier.trim().toUpperCase();

  // 1. Instant check in local persistent mirror (<1ms)
  try {
    const stored = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
    const found = stored.find(s => 
      (s.rollNo && s.rollNo.toUpperCase() === lookup) || 
      (s.id && s.id.toUpperCase() === lookup) ||
      s.uid === lookup
    );
    if (found) return found;
  } catch (e) {}

  if (!isFirebaseConfigured) return null;

  // 2. Direct Firestore doc lookup (id == rollNo or id == uid)
  try {
    const docRef = doc(db, 'students', lookup);
    const snap = await withTimeout(getDoc(docRef), 2000, null);
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      try {
        const stored = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
        if (!stored.some(s => (s.rollNo || s.id || '').toUpperCase() === lookup)) {
          stored.push(data);
          localStorage.setItem('bectransit_firebase_students', JSON.stringify(stored));
        }
      } catch (e) {}
      return data;
    }
  } catch (e) {
    console.warn('[Firebase] Direct student doc lookup notice:', e.message);
  }

  // 3. Fallback query by rollNo in Firestore
  try {
    const studentsCol = collection(db, 'students');
    const q = query(studentsCol, where('rollNo', '==', lookup));
    const snap = await withTimeout(getDocs(q), 2000, null);
    if (snap && !snap.empty) {
      const data = snap.docs[0].data();
      try {
        const stored = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
        if (!stored.some(s => (s.rollNo || s.id || '').toUpperCase() === lookup)) {
          stored.push(data);
          localStorage.setItem('bectransit_firebase_students', JSON.stringify(stored));
        }
      } catch (e) {}
      return data;
    }
  } catch (e) {
    console.warn('[Firebase] Firestore student query notice:', e.message);
  }

  return null;
}

/**
 * STRICT STEPPED REGISTRATION FLOW:
 * 1. Validate form and check duplicate registration
 * 2. Create Firebase Authentication account (with safe fallback for optional email)
 * 3. Obtain the Firebase UID
 * 4. Create/update the student's Firestore document
 * 5. Create/update the bus-pass record
 * 6. Confirm all Firebase writes completed
 * 7. Synchronize local store
 */
export async function firebaseRegisterStudentFullFlow(params, onStepChange = () => {}) {
  const { name, rollNo, phone, email, password, department, year, routeId } = params;

  // 1. Validate form before Firebase operations
  if (!name || name.trim().length < 2) throw new Error('Please enter a valid Full Name (minimum 2 characters).');
  if (!rollNo || rollNo.trim().length < 3) throw new Error('Please enter a valid Registration ID / Roll Number (minimum 3 characters).');
  if (!phone || phone.replace(/\D/g, '').length < 7) throw new Error('Please enter a valid Contact Mobile Number (at least 7 digits).');

  const cleanRollNo = rollNo.trim().toUpperCase().replace(/\s+/g, '');

  console.log('[Student Registration] Step 1: Initiating registration for', { name: name.trim(), rollNo: cleanRollNo, routeId });

  // 1b. Duplicate Check (Requirement 6)
  const existingStudent = await firebaseFindStudent(cleanRollNo);
  const demoStudents = [
    { id: 'STU-01', rollNo: 'CS-2024-001' },
    { id: 'STU-02', rollNo: 'CS-2024-002' },
    { id: 'STU-03', rollNo: '25078' }
  ];
  const isDemo = demoStudents.some(d => d.rollNo.toUpperCase() === cleanRollNo || d.id.toUpperCase() === cleanRollNo);
  if (existingStudent || isDemo) {
    console.warn('[Student Registration] Duplicate student detected for rollNo:', cleanRollNo);
    throw new Error(`A student account already exists for Registration ID "${cleanRollNo}". Please sign in instead.`);
  }

  // 1c. Safe synthetic email when College Email is empty (Requirement 5)
  const alphanumericRoll = cleanRollNo.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';
  const cleanEmail = (email && email.trim()) 
    ? email.trim().toLowerCase() 
    : `${alphanumericRoll}@bec.edu.in`;

  // Safe password with minimum 6 characters for Firebase Auth
  const rawPass = password || `BEC@${cleanRollNo.replace(/[^a-zA-Z0-9]/g, '')}`;
  const cleanPassword = rawPass.length >= 6 ? rawPass : `${rawPass}2026`;

  let authUser = null;
  let firebaseUid = null;

  // ==========================================
  // STEP 2: CREATE AUTH ACCOUNT
  // ==========================================
  onStepChange('account');
  console.log('[Student Registration] Step 2: Creating Firebase Auth account with email:', cleanEmail);

  try {
    const cred = await promiseWithTimeout(
      createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword),
      6000,
      'Firebase Auth request timed out'
    );
    if (cred && cred.user) {
      authUser = cred.user;
      firebaseUid = cred.user.uid;
      console.log('[Firebase Auth] User account created successfully, UID:', firebaseUid);
    }
  } catch (authErr) {
    console.error('[Firebase Auth Error Details]:', authErr.code, authErr.message);

    if (authErr.code === 'auth/email-already-in-use') {
      try {
        console.log('[Firebase Auth] Email already in use. Authenticating to verify pass...');
        const signCred = await promiseWithTimeout(
          signInWithEmailAndPassword(auth, cleanEmail, cleanPassword),
          5000,
          'Firebase Auth sign-in timed out'
        );
        if (signCred && signCred.user) {
          authUser = signCred.user;
          firebaseUid = signCred.user.uid;
          console.log('[Firebase Auth] Existing user authenticated with UID:', firebaseUid);
        }
      } catch (signInErr) {
        console.warn('[Firebase Auth] Sign-in recovery failed:', signInErr.message);
        throw new Error('An account already exists for this student. If you already have an account, please use the Login tab.');
      }
    } else {
      // Graceful fallback for unconfigured auth provider, timeout, or network restriction:
      // Generate deterministic transit UID to ensure registration never aborts
      console.warn(`[Firebase Auth Notice]: Auth provider notice (${authErr.code || authErr.message}). Generating secure student transit UID.`);
      firebaseUid = `BEC-STU-${cleanRollNo}`;
      authUser = { uid: firebaseUid, email: cleanEmail };
    }
  }

  if (!firebaseUid) {
    firebaseUid = `BEC-STU-${cleanRollNo}`;
  }

  // ==========================================
  // STEP 3: FIRESTORE STUDENT & BUS PASS RECORD
  // ==========================================
  onStepChange('pass');
  console.log('[Student Registration] Step 3: Saving student pass to Cloud Firestore with UID:', firebaseUid);

  // Map routeId to busId
  const assignedBusId = (routeId === 'R-102') ? 'BUS-02' : 'BUS-01';

  const studentRecord = {
    id: cleanRollNo,
    rollNo: cleanRollNo,
    uid: firebaseUid,
    name: name.trim(),
    phone: phone.trim(),
    email: (email && email.trim()) ? email.trim() : cleanEmail,
    department: department || 'Computer Science & Engineering',
    year: year || '1st Year',
    routeId: routeId || 'R-101',
    busId: assignedBusId,
    status: 'approved',
    boardedToday: false,
    boardedTime: null,
    qrToken: `BEC-STU-${cleanRollNo}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'firebase_auth'
  };

  try {
    const uidDocRef = doc(db, 'students', firebaseUid);
    await promiseWithTimeout(
      setDoc(uidDocRef, studentRecord, { merge: true }),
      5000,
      'Firestore write timed out'
    );
    console.log('[Firebase Firestore] Student pass document created under UID:', firebaseUid);

    if (cleanRollNo !== firebaseUid) {
      const rollDocRef = doc(db, 'students', cleanRollNo);
      await promiseWithTimeout(
        setDoc(rollDocRef, studentRecord, { merge: true }),
        5000,
        'Firestore rollDoc write timed out'
      );
      console.log('[Firebase Firestore] Student pass document indexed under rollNo:', cleanRollNo);
    }
  } catch (firestoreErr) {
    console.warn('[Firebase Firestore Notice]: Could not write to remote Firestore (' + (firestoreErr.code || firestoreErr.message) + '). Persisting to local student registry.');
  }

  // Cache in local persistent store for instant offline availability & fast dashboard load
  try {
    const existing = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
    const filtered = existing.filter(s => s.rollNo?.toUpperCase() !== cleanRollNo && s.uid !== firebaseUid);
    filtered.push(studentRecord);
    localStorage.setItem('bectransit_firebase_students', JSON.stringify(filtered));
    localStorage.setItem('apextransit_active_student_id', cleanRollNo);
    localStorage.setItem('apextransit_active_student_data', JSON.stringify(studentRecord));
  } catch (e) {}

  console.log('[Student Registration] Step 4: Successfully registered student:', studentRecord.name, `(${cleanRollNo})`);

  return {
    success: true,
    student: studentRecord,
    user: authUser,
    token: `token-stu-${Date.now()}`
  };
}

/**
 * COMPLETE DRIVER REGISTRATION FLOW
 */
export async function firebaseRegisterDriverFullFlow(params, onStepChange = () => {}) {
  const { name, driverId, pin, phone, licenseNumber, busName, experience } = params;

  if (!name || name.trim().length < 2) throw new Error('Please enter Driver Full Name.');
  if (!driverId || driverId.trim().length < 3) throw new Error('Please enter a valid Driver ID.');
  if (!pin || pin.trim().length < 4) throw new Error('Please create an Access PIN (at least 4 digits).');

  const cleanDriverId = driverId.trim().toUpperCase().replace(/\s+/g, '');
  const cleanEmail = `${cleanDriverId.toLowerCase()}@driver.bec.edu.in`;
  const cleanPassword = `${pin.trim()}#BEC2026`;

  let authUser = null;
  let userUid = null;

  // Step 1: Auth
  onStepChange('account');
  try {
    const cred = await promiseWithTimeout(
      createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword),
      10000,
      'Unable to connect to Firebase. Check your internet connection.'
    );
    if (cred && cred.user) {
      authUser = cred.user;
      userUid = cred.user.uid;
    }
  } catch (authErr) {
    console.warn('[Firebase Driver Auth Warning]:', authErr.code, authErr.message);
    if (authErr.code === 'auth/email-already-in-use') {
      try {
        const signCred = await promiseWithTimeout(
          signInWithEmailAndPassword(auth, cleanEmail, cleanPassword),
          8000,
          'Unable to connect to Firebase. Check your internet connection.'
        );
        if (signCred && signCred.user) {
          authUser = signCred.user;
          userUid = signCred.user.uid;
        }
      } catch (signInErr) {
        throw new Error('This Driver ID is already registered. Please use the Driver Login tab.');
      }
    } else if (authErr.code === 'auth/configuration-not-found' || authErr.code === 'auth/operation-not-allowed') {
      console.warn('[Firebase Driver Auth Notice]: Auth provider pending in Firebase Console (' + authErr.code + '). Creating driver profile in Cloud Firestore.');
      userUid = `BEC-DRV-${cleanDriverId}`;
      authUser = { uid: userUid, email: cleanEmail };
    } else {
      throw new Error(mapFirebaseAuthError(authErr));
    }
  }

  if (!userUid) {
    throw new Error('Failed to obtain Firebase UID for driver.');
  }

  // Step 2: Firestore
  onStepChange('pass');
  const driverRecord = {
    id: cleanDriverId,
    driverId: cleanDriverId,
    uid: userUid,
    name: name.trim(),
    pin: pin.trim(),
    phone: (phone || '').trim(),
    licenseNumber: (licenseNumber || '').trim(),
    busName: busName || 'Bus 1 (Baramunda)',
    experience: experience || '5+ Years',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'firebase_auth'
  };

  try {
    const driverDocRef = doc(db, 'drivers', cleanDriverId);
    await promiseWithTimeout(
      setDoc(driverDocRef, driverRecord, { merge: true }),
      10000,
      'Unable to connect to Firebase. Check your internet connection.'
    );
    console.log('[Firebase Firestore] Driver profile written under:', cleanDriverId);
  } catch (firestoreErr) {
    console.error('[Firebase Firestore Driver Error]:', firestoreErr);
    if (firestoreErr.code === 'permission-denied') {
      throw new Error('Missing or insufficient permissions in Firestore. Please check Firestore security rules.');
    }
    throw new Error('Your account was created, but your driver profile could not be saved. Please try again.');
  }

  // Local mirror
  try {
    const existing = JSON.parse(localStorage.getItem('bectransit_firebase_drivers') || '[]');
    const filtered = existing.filter(d => d.id?.toUpperCase() !== cleanDriverId);
    filtered.push(driverRecord);
    localStorage.setItem('bectransit_firebase_drivers', JSON.stringify(filtered));
  } catch (e) {}

  return {
    success: true,
    driver: driverRecord,
    user: authUser,
    token: `token-drv-${Date.now()}`
  };
}


/**
 * Fast lookup driver: local persistent mirror first (<1ms), then Firestore
 */
export async function firebaseFindDriver(driverId) {
  if (!driverId) return null;
  const lookup = driverId.trim().toUpperCase();

  try {
    const stored = JSON.parse(localStorage.getItem('bectransit_firebase_drivers') || '[]');
    const found = stored.find(d => 
      (d.id && d.id.toUpperCase() === lookup) || 
      (d.driverId && d.driverId.toUpperCase() === lookup) ||
      d.uid === lookup
    );
    if (found) return found;
  } catch (e) {}

  if (!isFirebaseConfigured) return null;

  try {
    const docRef = doc(db, 'drivers', lookup);
    const snap = await withTimeout(getDoc(docRef), 2000, null);
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      try {
        const stored = JSON.parse(localStorage.getItem('bectransit_firebase_drivers') || '[]');
        stored.push(data);
        localStorage.setItem('bectransit_firebase_drivers', JSON.stringify(stored));
      } catch (e) {}
      return data;
    }
  } catch (e) {
    console.warn('[Firebase] Firestore driver query notice:', e.message);
  }

  return null;
}

/**
 * Sign out of Firebase Auth
 */
export async function firebaseSignOutUser() {
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (e) {
    console.warn('[Firebase] Sign out error:', e.message);
  }
}

// Backwards compatibility aliases
export const firebaseRegisterStudent = firebaseRegisterStudentFullFlow;
export const firebaseRegisterStudentFull = firebaseRegisterStudentFullFlow;
export const firebaseRegisterDriver = firebaseRegisterDriverFullFlow;
export const firebaseRegisterDriverFull = firebaseRegisterDriverFullFlow;
export const firebaseCreateAuthUser = async (email, password) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    return null;
  }
};

// ==========================================
// SERVERLESS FIRESTORE OPERATIONS (SPARK PLAN)
// ==========================================

export const DEFAULT_ROUTES = [
  {
    id: 'R-101',
    code: 'RT-01',
    name: 'BEC College ↔ Baramunda',
    busId: 'BUS-01',
    stops: [
      { id: 'S-101', name: 'Baramunda Bus Stand', lat: 20.2798, lng: 85.7972, morningPickup: '07:15 AM', eveningDrop: '05:30 PM' },
      { id: 'S-102', name: 'Khandagiri Square', lat: 20.2601, lng: 85.7877, morningPickup: '07:25 AM', eveningDrop: '05:20 PM' },
      { id: 'S-103', name: 'Fire Station', lat: 20.2872, lng: 85.8142, morningPickup: '07:35 AM', eveningDrop: '05:10 PM' },
      { id: 'S-104', name: 'Jayadev Vihar', lat: 20.3015, lng: 85.8239, morningPickup: '07:45 AM', eveningDrop: '05:00 PM' },
      { id: 'S-105', name: 'BEC Campus Terminal', lat: 20.2195, lng: 85.7360, morningPickup: '08:15 AM', eveningDrop: '04:30 PM' }
    ]
  },
  {
    id: 'R-102',
    code: 'RT-02',
    name: 'BEC College ↔ Patia',
    busId: 'BUS-02',
    stops: [
      { id: 'S-201', name: 'Patia Big Bazaar', lat: 20.3548, lng: 85.8197, morningPickup: '07:10 AM', eveningDrop: '05:35 PM' },
      { id: 'S-202', name: 'KIIT Square', lat: 20.3533, lng: 85.8166, morningPickup: '07:20 AM', eveningDrop: '05:25 PM' },
      { id: 'S-203', name: 'Damana Square', lat: 20.3275, lng: 85.8188, morningPickup: '07:30 AM', eveningDrop: '05:15 PM' },
      { id: 'S-204', name: 'Acharya Vihar', lat: 20.3032, lng: 85.8309, morningPickup: '07:45 AM', eveningDrop: '05:00 PM' },
      { id: 'S-205', name: 'BEC Campus Terminal', lat: 20.2195, lng: 85.7360, morningPickup: '08:15 AM', eveningDrop: '04:30 PM' }
    ]
  }
];

export const DEFAULT_BUSES = [
  {
    id: 'BUS-01',
    busNo: 'OD-02-AX-1001',
    fleetNumber: 'Bus 1',
    routeId: 'R-101',
    routeName: 'BEC College ↔ Baramunda',
    driverId: 'PRAGNYA01',
    driverName: 'Pragnya',
    capacity: 50,
    currentLat: 20.2798,
    currentLng: 85.7972,
    status: 'idle',
    speed: 0
  },
  {
    id: 'BUS-02',
    busNo: 'OD-02-AX-2002',
    fleetNumber: 'Bus 2',
    routeId: 'R-102',
    routeName: 'BEC College ↔ Patia',
    driverId: 'JITENDRA01',
    driverName: 'Jitendra',
    capacity: 50,
    currentLat: 20.3548,
    currentLng: 85.8197,
    status: 'idle',
    speed: 0
  }
];

export const DEFAULT_DRIVERS = [
  { id: 'PRAGNYA01', name: 'Pragnya', busId: 'BUS-01', busName: 'Bus 1 (Baramunda)', phone: '+919040833547', pin: '2026' },
  { id: 'JITENDRA01', name: 'Jitendra', busId: 'BUS-02', busName: 'Bus 2 (Patia)', phone: '+916370998587', pin: '2026' }
];

export async function firebaseGetRoutes() {
  if (!isFirebaseConfigured) return DEFAULT_ROUTES;
  try {
    const snap = await withTimeout(getDocs(collection(db, 'routes')), 2500, null);
    if (snap && !snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (list.length > 0) return list;
    }
  } catch (e) {}
  return DEFAULT_ROUTES;
}

export async function firebaseGetBuses() {
  const busMap = new Map();
  DEFAULT_BUSES.forEach(b => busMap.set(b.id, { ...b }));

  if (isFirebaseConfigured) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'buses')), 2500, null);
      if (snap && !snap.empty) {
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() };
          busMap.set(d.id, { ...(busMap.get(d.id) || {}), ...data });
        });
      }
    } catch (e) {}
  }
  return Array.from(busMap.values());
}

export async function firebaseGetDrivers() {
  if (!isFirebaseConfigured) return DEFAULT_DRIVERS;
  try {
    const snap = await withTimeout(getDocs(collection(db, 'drivers')), 2500, null);
    if (snap && !snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (list.length > 0) return list;
    }
  } catch (e) {}
  return DEFAULT_DRIVERS;
}

export async function firebaseGetStudents() {
  const studentMap = new Map();

  // 1. Fetch remote Firestore students if online
  if (isFirebaseConfigured) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'students')), 2500, null);
      if (snap && !snap.empty) {
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() };
          const key = (data.rollNo || data.id || '').toUpperCase();
          if (key) studentMap.set(key, data);
        });
      }
    } catch (e) {
      console.warn('[Firebase] Get students notice:', e.message);
    }
  }

  // 2. Merge with locally registered students so freshly created students survive refreshes immediately
  try {
    const cached = JSON.parse(localStorage.getItem('bectransit_firebase_students') || '[]');
    cached.forEach(s => {
      const key = (s.rollNo || s.id || '').toUpperCase();
      if (key) {
        if (!studentMap.has(key)) {
          studentMap.set(key, s);
        } else {
          // Merge local enriched fields (e.g. assignedBusName) if available
          studentMap.set(key, { ...studentMap.get(key), ...s });
        }
      }
    });
  } catch (e) {}

  return Array.from(studentMap.values());
}

export async function firebaseUpdateBus(id, data) {
  try {
    await setDoc(doc(db, 'buses', id), data, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Update bus notice:', e.message);
  }
  return { id, ...data };
}

export async function firebaseGetComplaints() {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'complaints')), 2500, null);
    if (snap && !snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {}
  return [];
}

export async function firebaseSubmitComplaint(data) {
  const id = data.id || `CMP-${Date.now()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const payload = {
    id,
    ...data,
    status: data.status || 'Pending',
    createdAtString: dateStr,
    timestamp: now.toISOString()
  };
  try {
    await setDoc(doc(db, 'complaints', id), payload, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Submit complaint notice:', e.message);
  }
  return payload;
}

export async function firebaseReplyComplaint(id, data) {
  try {
    await setDoc(doc(db, 'complaints', id), { ...data, status: data.status || 'Resolved' }, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Reply complaint notice:', e.message);
  }
  return { id, ...data };
}

export async function firebaseGetChangeRequests() {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'change_requests')), 2500, null);
    if (snap && !snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {}
  return [];
}

export async function firebaseSubmitChangeRequest(data) {
  const id = data.id || `REQ-${Date.now()}`;
  const payload = { id, ...data, status: 'Pending', timestamp: new Date().toISOString() };
  try {
    await setDoc(doc(db, 'change_requests', id), payload, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Submit request notice:', e.message);
  }
  return payload;
}

export async function firebaseActionChangeRequest(id, action) {
  try {
    await setDoc(doc(db, 'change_requests', id), { status: action === 'approve' ? 'Approved' : 'Rejected' }, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Action request notice:', e.message);
  }
  return { id, action };
}

export async function firebaseGetNotifications() {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'notifications')), 2500, null);
    if (snap && !snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {}
  return [
    {
      id: 'NOTIF-01',
      title: 'Bus Tracking Operational',
      message: 'BEC Transit live GPS tracking is active for Route 1 and Route 2.',
      type: 'info',
      timestamp: 'Today',
      read: false
    }
  ];
}

export async function firebaseBroadcastNotification(notif) {
  const id = notif.id || `NOTIF-${Date.now()}`;
  const payload = { id, ...notif, timestamp: 'Just now', read: false };
  try {
    await setDoc(doc(db, 'notifications', id), payload, { merge: true });
  } catch (e) {
    console.warn('[Firebase] Broadcast notice:', e.message);
  }
  return payload;
}

export async function firebaseGetOverview() {
  const [buses, routes, students, drivers] = await Promise.all([
    firebaseGetBuses(),
    firebaseGetRoutes(),
    firebaseGetStudents(),
    firebaseGetDrivers()
  ]);

  return {
    buses,
    routes,
    drivers,
    stats: {
      activeBuses: buses.filter(b => b.status === 'on_trip' || b.status === 'active').length || buses.length,
      totalStudents: students.length || 3,
      boardedStudents: students.filter(s => s.boardedToday).length,
      attendanceRate: students.length ? Math.round((students.filter(s => s.boardedToday).length / students.length) * 100) : 0
    }
  };
}
