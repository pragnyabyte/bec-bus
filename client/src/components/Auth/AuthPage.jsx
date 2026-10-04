import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, User, Compass, Shield, LogIn, UserPlus,
  CheckCircle2, AlertCircle, ArrowLeft, Phone,
  Mail, MapPin, Key, Truck, Award, GraduationCap, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../services/api';

const DEFAULT_ROUTES = [
  {
    id: 'R-101',
    code: 'RT-01',
    name: 'BEC College ↔ Baramunda',
    stops: [
      { id: 'S-101', name: 'Baramunda Bus Stand' },
      { id: 'S-102', name: 'Khandagiri Square' },
      { id: 'S-103', name: 'Fire Station' },
      { id: 'S-104', name: 'Jayadev Vihar' },
      { id: 'S-105', name: 'BEC Campus Terminal' }
    ]
  },
  {
    id: 'R-102',
    code: 'RT-02',
    name: 'BEC College ↔ Patia',
    stops: [
      { id: 'S-201', name: 'Patia Big Bazaar' },
      { id: 'S-202', name: 'KIIT Square' },
      { id: 'S-203', name: 'Damana Square' },
      { id: 'S-204', name: 'Acharya Vihar' },
      { id: 'S-205', name: 'BEC Campus Terminal' }
    ]
  }
];

export default function AuthPage({ routes = [], onAuthenticated }) {
  const activeRoutes = (routes && routes.length > 0) ? routes : DEFAULT_ROUTES;

  // Active Role: 'student' | 'driver' | 'admin'
  const [selectedRole, setSelectedRole] = useState('student');

  // Mode toggles
  const [studentMode, setStudentMode] = useState('login'); // 'login' | 'register'
  const [driverMode, setDriverMode] = useState('login');   // 'login' | 'register'

  // Student Login Form State
  const [studentName, setStudentName] = useState('');
  const [studentIdentifier, setStudentIdentifier] = useState('');

  // Student Registration Form State
  const [regStudentName, setRegStudentName] = useState('');
  const [regStudentRoll, setRegStudentRoll] = useState('');
  const [regStudentEmail, setRegStudentEmail] = useState('');
  const [regStudentPhone, setRegStudentPhone] = useState('');
  const [regStudentDept, setRegStudentDept] = useState('Computer Science & Engineering');
  const [regStudentYear, setRegStudentYear] = useState('1st Year');
  const [regStudentRouteId, setRegStudentRouteId] = useState(activeRoutes[0]?.id || 'R-101');

  // Driver Login Form State
  const [driverId, setDriverId] = useState('PRAGNYA01');
  const [driverPin, setDriverPin] = useState('');
  const [showDriverPin, setShowDriverPin] = useState(false);

  // Driver Registration Form State
  const [regDriverName, setRegDriverName] = useState('');
  const [regDriverId, setRegDriverId] = useState('');
  const [regDriverPin, setRegDriverPin] = useState('');
  const [regDriverPhone, setRegDriverPhone] = useState('');
  const [regDriverLicense, setRegDriverLicense] = useState('');
  const [regDriverBus, setRegDriverBus] = useState('Bus 1 (Baramunda)');
  const [regDriverExp, setRegDriverExp] = useState('5+ Years');

  // Admin Login State (Strictly Login Only - NO Registration)
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [studentSubmittingStep, setStudentSubmittingStep] = useState(''); // '' | 'account' | 'pass'
  const [driverSubmittingStep, setDriverSubmittingStep] = useState('');   // '' | 'account' | 'pass'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [registeredSuccessData, setRegisteredSuccessData] = useState(null);

  // Submission protection ref to prevent duplicate clicks
  const isSubmittingRef = useRef(false);

  // Reset notifications when switching role tabs
  const handleRoleTabChange = (role) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    setRegisteredSuccessData(null);
    if (role === 'student') setStudentMode('login');
    if (role === 'driver') setDriverMode('login');
  };

  // ==========================================
  // 1. STUDENT AUTHENTICATION HANDLERS
  // ==========================================
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg('');
    setSuccessMsg('');
    const enteredName = studentName.trim();
    const id = studentIdentifier.trim();

    if (!enteredName) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }
    if (!id) {
      setErrorMsg('Please enter your Registration ID / Roll Number.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const res = await api.loginStudent({ name: enteredName, identifier: id, registrationId: id });
      if (res && res.student) {
        const normalize = str => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalize(res.student.name) !== normalize(enteredName)) {
          throw new Error(`The entered Name "${enteredName}" does not match the registered record for Registration ID "${id}".`);
        }
        setSuccessMsg(`Welcome back, ${res.student.name}!`);
        // Navigate immediately without artificial delay
        onAuthenticated({
          role: 'student',
          user: res.student,
          token: res.token
        });
      } else {
        throw new Error('Could not retrieve student profile.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please verify your Name and Registration ID or Register below.');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg('');
    setSuccessMsg('');
    setRegisteredSuccessData(null);

    const name = regStudentName.trim();
    const rollNo = regStudentRoll.trim();
    const phone = regStudentPhone.trim();
    const email = regStudentEmail.trim();

    // 1. Properly validate all required fields
    if (!name || name.length < 2) {
      setErrorMsg('Please enter your Full Name (minimum 2 characters).');
      return;
    }
    if (!rollNo || rollNo.length < 3) {
      setErrorMsg('Please enter your Registration ID / Roll Number (minimum 3 characters).');
      return;
    }
    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (!phone || cleanPhoneDigits.length < 7) {
      setErrorMsg('Please enter a valid Contact Mobile Number (at least 7 digits).');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid College Email address (e.g. student@bec.edu.in).');
      return;
    }
    if (!regStudentDept) {
      setErrorMsg('Please select your Department.');
      return;
    }
    if (!regStudentYear) {
      setErrorMsg('Please select your Year of Study.');
      return;
    }
    if (!regStudentRouteId) {
      setErrorMsg('Please select an Assigned Bus Route.');
      return;
    }

    // Lock submission & show loading
    isSubmittingRef.current = true;
    setLoading(true);
    setStudentSubmittingStep('account');

    try {
      const cleanRollNo = rollNo.toUpperCase().replace(/\s+/g, '');
      const collegeEmail = (email || `${cleanRollNo.toLowerCase()}@bec.edu.in`).trim();
      const defaultPassword = `BEC@${cleanRollNo.replace(/[^a-zA-Z0-9]/g, '') || '2026'}`;

      const payload = {
        name,
        rollNo: cleanRollNo,
        phone,
        email: collegeEmail,
        password: defaultPassword,
        department: regStudentDept,
        year: regStudentYear,
        routeId: regStudentRouteId
      };

      // Execute registration via existing Firebase & database services
      const res = await api.registerStudent(payload, (step) => {
        setStudentSubmittingStep(step);
      });

      if (!res || !res.success || !res.student) {
        throw new Error(res?.error || 'Registration failed. Please check your connection and try again.');
      }

      // Compute display details for assigned route and bus (Bus 1 / Bus 2 mapping)
      const assignedRoute = activeRoutes.find(r => r.id === regStudentRouteId) || activeRoutes[0];
      const assignedBusName = (regStudentRouteId === 'R-102' || res.student.busId === 'BUS-02')
        ? 'Bus 2 (Patia Route • OD-02-BEC-1002)'
        : 'Bus 1 (Baramunda Route • OD-02-BEC-1001)';
      const startingStopName = assignedRoute?.stops?.[0]?.name || (regStudentRouteId === 'R-102' ? 'Patia Big Bazaar' : 'Baramunda Bus Stand');

      const fullStudentDetails = {
        ...res.student,
        assignedRoute,
        assignedBusName,
        startingStopName
      };

      // Set registered details & clear confirmation message
      setRegisteredSuccessData({
        student: fullStudentDetails,
        token: res?.token || `token-${Date.now()}`
      });

      setSuccessMsg('Registration completed successfully! Your bus pass has been created.');

      // Pre-fill student credentials for signing in
      setStudentName(name);
      setStudentIdentifier(cleanRollNo);
    } catch (err) {
      console.error('[Student Registration Failure]:', err);
      const msg = err.message || 'Registration could not be completed. Please verify your details and try again.';
      setErrorMsg(msg);
      setSuccessMsg('');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
      setStudentSubmittingStep('');
    }
  };

  // ==========================================
  // 2. DRIVER AUTHENTICATION HANDLERS
  // ==========================================
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg('');
    setSuccessMsg('');
    const targetDriverId = driverId.trim().toUpperCase();
    const enteredPin = driverPin.trim();

    if (!targetDriverId) {
      setErrorMsg('Please select a Driver Profile.');
      return;
    }
    if (!enteredPin) {
      setErrorMsg('Please enter Driver Access PIN.');
      return;
    }
    if (enteredPin !== '2026') {
      setErrorMsg('Invalid Access PIN. Driver login requires PIN 2026.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const res = await api.driverLogin({ driverId: targetDriverId, pin: enteredPin });
      if (res && res.driver) {
        setSuccessMsg(`Welcome, Driver ${res.driver.name}!`);
        // Navigate immediately without artificial delay
        onAuthenticated({
          role: 'driver',
          user: res.driver,
          token: res.token
        });
      } else {
        throw new Error('Driver verification failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Driver authentication failed.');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleDriverRegister = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg('');
    setSuccessMsg('');

    const name = regDriverName.trim();
    const id = regDriverId.trim().toUpperCase();
    const pin = regDriverPin.trim();
    const phone = regDriverPhone.trim();

    if (!name || name.length < 2) {
      setErrorMsg('Please enter Driver Full Name.');
      return;
    }
    if (!id || id.length < 3) {
      setErrorMsg('Please enter a valid Driver ID (e.g., DRV-03 or JITENDRA02).');
      return;
    }
    if (!pin || pin.length < 4) {
      setErrorMsg('Please create an Access PIN (at least 4 digits).');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      setErrorMsg('Please enter a valid Mobile Phone Number.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setDriverSubmittingStep('account');

    try {
      const payload = {
        name,
        driverId: id,
        id,
        pin,
        phone,
        licenseNumber: regDriverLicense.trim() || `OD-DL-${Math.floor(100000 + Math.random() * 900000)}`,
        busName: regDriverBus,
        experience: regDriverExp
      };

      const res = await api.registerDriver(payload, (step) => {
        setDriverSubmittingStep(step);
      });

      if (!res || !res.success || !res.driver) {
        throw new Error(res?.error || 'Driver registration failed.');
      }

      setSuccessMsg(`Welcome, Driver ${name}! Your fleet account is active.`);

      onAuthenticated({
        role: 'driver',
        user: res.driver,
        token: res?.token || `token-${Date.now()}`
      });
    } catch (err) {
      console.error('Driver registration error:', err);
      setErrorMsg(err.message || 'Driver registration failed. Please check your details.');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
      setDriverSubmittingStep('');
    }
  };

  // ==========================================
  // 3. ADMIN AUTHENTICATION HANDLERS (LOGIN ONLY)
  // ==========================================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg('');
    setSuccessMsg('');
    const enteredUsername = adminUsername.trim();
    const enteredPassword = adminPassword;

    if (!enteredUsername) {
      setErrorMsg('Please enter Admin Username.');
      return;
    }
    if (!enteredPassword) {
      setErrorMsg('Please enter Admin Password.');
      return;
    }
    if (enteredUsername !== 'admin' || enteredPassword !== 'ad2026') {
      setErrorMsg('Invalid administrator credentials.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const res = await api.adminLogin({ username: enteredUsername, password: enteredPassword });
      if (res && res.success) {
        setSuccessMsg('Administrator access granted.');
        // Navigate immediately without artificial delay
        onAuthenticated({
          role: 'admin',
          user: res.user || { name: 'Campus Transport Administrator', role: 'admin' },
          token: res.token
        });
      } else {
        throw new Error(res.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid administrator credentials.');
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 20%, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem', maxWidth: '620px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
          marginBottom: '1rem'
        }}>
          <Bus size={32} />
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          BEC Transit
        </h1>
        <p style={{ color: '#475569', fontSize: '1rem', marginTop: '0.35rem' }}>
          Bhubaneswar Engineering College • Campus Transport & Fleet Management
        </p>
      </div>

      {/* Main Authentication Card */}
      <div style={{
        width: '100%',
        maxWidth: selectedRole === 'student' && studentMode === 'register' ? '560px' : '520px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 20px 40px -15px rgba(2, 132, 199, 0.12), 0 0 1px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s ease'
      }}>
        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '5px',
          borderRadius: '14px',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => handleRoleTabChange('student')}
            id="tab-role-student"
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              background: selectedRole === 'student' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'transparent',
              color: selectedRole === 'student' ? '#ffffff' : '#64748b',
              boxShadow: selectedRole === 'student' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={16} /> Student
          </button>

          <button
            type="button"
            onClick={() => handleRoleTabChange('driver')}
            id="tab-role-driver"
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              background: selectedRole === 'driver' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'transparent',
              color: selectedRole === 'driver' ? '#ffffff' : '#64748b',
              boxShadow: selectedRole === 'driver' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Compass size={16} /> Driver
          </button>

          <button
            type="button"
            onClick={() => handleRoleTabChange('admin')}
            id="tab-role-admin"
            style={{
              flex: 1,
              padding: '0.65rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              background: selectedRole === 'admin' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'transparent',
              color: selectedRole === 'admin' ? '#ffffff' : '#64748b',
              boxShadow: selectedRole === 'admin' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={16} /> Admin
          </button>
        </div>

        {/* Status & Error Alerts */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #ef4444',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #22c55e',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#166534',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* 1. STUDENT AUTHENTICATION SECTION                     */}
        {/* ==================================================== */}
        {selectedRole === 'student' && (
          <div>
            {studentMode === 'login' ? (
              // Student Sign In View
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <User size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Student Sign In</h3>
                  <p style={{ color: '#64748b', fontSize: '0.825rem' }}>
                    Enter your Full Name & Registration ID to access your digital transit pass
                  </p>
                </div>

                <form onSubmit={handleStudentLogin}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Tanmay Mohanty"
                      value={studentName}
                      onChange={e => { setStudentName(e.target.value); if (errorMsg) setErrorMsg(''); }}
                      id="input-student-name"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                      Registration ID / Roll Number <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CS-2024-001 or 25078"
                      value={studentIdentifier}
                      onChange={e => { setStudentIdentifier(e.target.value); if (errorMsg) setErrorMsg(''); }}
                      id="input-student-roll"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    id="btn-submit-student-login"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    <LogIn size={18} />
                    <span>{loading ? 'Authenticating...' : 'Sign In to Student Portal'}</span>
                  </button>
                </form>

                {/* Clearly visible Register / Sign Up option below Student Login */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    New student or don't have a registered account yet?
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStudentMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                    id="btn-goto-student-register"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid #0284c7',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '0.925rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UserPlus size={18} />
                    <span>Register / Sign Up as Student</span>
                  </button>
                </div>
              </div>
            ) : registeredSuccessData ? (
              // Student Registration Success View (Requirements 3 & 4)
              <div id="student-registration-success-card">
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.65rem',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                  }}>
                    <CheckCircle2 size={30} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, margin: '0 0 6px 0' }}>
                    Registration completed successfully!
                  </h3>
                  <p style={{ color: '#166534', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                    Your bus pass has been created and approved for campus transit.
                  </p>
                </div>

                {/* Student's Registered Details & Bus Assignment Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bus size={18} style={{ color: '#0284c7' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                        Registered Pass Details
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} /> Active & Approved
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '0.825rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Student Name</span>
                      <b style={{ color: '#0f172a', fontSize: '0.9rem' }}>{registeredSuccessData.student.name}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Registration ID / Roll No</span>
                      <b style={{ color: '#0284c7', fontSize: '0.9rem' }}>{registeredSuccessData.student.rollNo}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Department</span>
                      <b style={{ color: '#334155' }}>{registeredSuccessData.student.department}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Year of Study</span>
                      <b style={{ color: '#334155' }}>{registeredSuccessData.student.year}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Contact Phone</span>
                      <b style={{ color: '#334155' }}>{registeredSuccessData.student.phone}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Bus Route</span>
                      <b style={{ color: '#0284c7' }}>
                        {registeredSuccessData.student.assignedRoute?.code ? `${registeredSuccessData.student.assignedRoute.code} - ` : ''}{registeredSuccessData.student.assignedRoute?.name || 'Assigned Transit Route'}
                      </b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Fleet Bus</span>
                      <b style={{ color: '#0f172a' }}>
                        {registeredSuccessData.student.assignedBusName}
                      </b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Digital Pass Status</span>
                      <b style={{ color: '#16a34a' }}>Approved • Ready to Board</b>
                    </div>
                  </div>
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      onAuthenticated({
                        role: 'student',
                        user: registeredSuccessData.student,
                        token: registeredSuccessData.token
                      });
                    }}
                    id="btn-proceed-to-student-portal"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Proceed to Student Portal / View Pass</span>
                    <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('login');
                      setStudentName(registeredSuccessData.student.name);
                      setStudentIdentifier(registeredSuccessData.student.rollNo);
                      setRegisteredSuccessData(null);
                      setSuccessMsg('Registration completed! Please sign in with your Name and Registration ID.');
                    }}
                    id="btn-goto-signin-with-registered-creds"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid #0284c7',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '0.925rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <LogIn size={18} />
                    <span>Sign In with Registered ID</span>
                  </button>
                </div>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisteredSuccessData(null);
                      setRegStudentName('');
                      setRegStudentRoll('');
                      setRegStudentPhone('');
                      setRegStudentEmail('');
                      setSuccessMsg('');
                      setErrorMsg('');
                    }}
                    id="btn-register-another-student"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    + Register another student
                  </button>
                </div>
              </div>
            ) : (
              // Student Registration Form View
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => { setStudentMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                    id="btn-back-to-student-login"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px 0'
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Sign In
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                    New Student
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <UserPlus size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Student Registration</h3>
                  <p style={{ color: '#64748b', fontSize: '0.825rem' }}>
                    Fill in your details to create an approved campus bus pass
                  </p>
                </div>

                <form onSubmit={handleStudentRegister}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        Full Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rohan Verma"
                        value={regStudentName}
                        onChange={e => setRegStudentName(e.target.value)}
                        id="reg-student-name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        Registration ID / Roll No <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. CS-2026-888"
                        value={regStudentRoll}
                        onChange={e => setRegStudentRoll(e.target.value)}
                        id="reg-student-roll"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        Phone Number <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="+91 98765 43210"
                        value={regStudentPhone}
                        onChange={e => setRegStudentPhone(e.target.value)}
                        id="reg-student-phone"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        College Email (Optional)
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="student@bec.edu.in"
                        value={regStudentEmail}
                        onChange={e => setRegStudentEmail(e.target.value)}
                        id="reg-student-email"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        Department
                      </label>
                      <select
                        className="form-select"
                        value={regStudentDept}
                        onChange={e => setRegStudentDept(e.target.value)}
                        id="reg-student-dept"
                      >
                        <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                        <option value="Electronics & Communication">Electronics & Communication</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                        <option value="Management Studies / MBA">Management Studies / MBA</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                        Year of Study
                      </label>
                      <select
                        className="form-select"
                        value={regStudentYear}
                        onChange={e => setRegStudentYear(e.target.value)}
                        id="reg-student-year"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                      Assigned Bus Route <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      value={regStudentRouteId}
                      onChange={e => setRegStudentRouteId(e.target.value)}
                      id="reg-student-route"
                      required
                    >
                      {activeRoutes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.code ? `${r.code} - ` : ''}{r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    id="btn-submit-student-register"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.85 : 1
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="pulse-dot online" style={{ width: '10px', height: '10px', background: '#ffffff', flexShrink: 0 }} />
                        <span>
                          {studentSubmittingStep === 'account'
                            ? 'Creating Student Account...'
                            : studentSubmittingStep === 'pass'
                            ? 'Generating Bus Pass...'
                            : 'Creating Account & Pass...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        <span>Create Account & Pass</span>
                      </>
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Already have a registered pass?{' '}
                    <button
                      type="button"
                      onClick={() => { setStudentMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. DRIVER AUTHENTICATION SECTION                      */}
        {/* ==================================================== */}
        {selectedRole === 'driver' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <Compass size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Driver Sign In</h3>
              <p style={{ color: '#64748b', fontSize: '0.825rem' }}>
                Select your Driver Profile and enter Access PIN to launch the Driver Console
              </p>
            </div>

                <form onSubmit={handleDriverLogin}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                      Driver Profile <span style={{ color: '#dc2626' }}>*</span>
                    </label>

                    {/* Driver profile selectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: driverId === 'PRAGNYA01' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: driverId === 'PRAGNYA01' ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="driverOption"
                          value="PRAGNYA01"
                          checked={driverId === 'PRAGNYA01'}
                          onChange={() => setDriverId('PRAGNYA01')}
                          style={{ accentColor: '#0284c7' }}
                        />
                        <div>
                          <b style={{ color: '#0f172a', display: 'block' }}>Pragnya (Bus 1)</b>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC ↔ Baramunda • OD-02-AX-1001</span>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: driverId === 'JITENDRA01' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: driverId === 'JITENDRA01' ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="driverOption"
                          value="JITENDRA01"
                          checked={driverId === 'JITENDRA01'}
                          onChange={() => setDriverId('JITENDRA01')}
                          style={{ accentColor: '#0284c7' }}
                        />
                        <div>
                          <b style={{ color: '#0f172a', display: 'block' }}>Jitendra (Bus 2)</b>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC ↔ Patia • OD-02-AX-2002</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                      Enter Access PIN <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showDriverPin ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter Access PIN"
                        value={driverPin}
                        onChange={e => setDriverPin(e.target.value)}
                        id="input-driver-pin"
                        required
                        style={{ paddingRight: '44px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDriverPin(prev => !prev)}
                        aria-label={showDriverPin ? 'Hide Driver PIN' : 'Show Driver PIN'}
                        id="btn-toggle-driver-pin"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b'
                        }}
                      >
                        {showDriverPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    id="btn-submit-driver-login"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    <Compass size={18} />
                    <span>{loading ? 'Verifying Driver...' : 'Sign In to Driver Console'}</span>
                  </button>
                </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. ADMIN AUTHENTICATION SECTION (STRICTLY LOGIN ONLY) */}
        {/* ==================================================== */}
        {selectedRole === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <Shield size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Admin Sign In</h3>
              <p style={{ color: '#64748b', fontSize: '0.825rem' }}>
                Authorized transport officers & campus administrators only
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Admin Username <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Admin Username"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                id="input-admin-username"
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Admin Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter Admin Password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  id="input-admin-password"
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(prev => !prev)}
                  aria-label={showAdminPassword ? 'Hide Admin Password' : 'Show Admin Password'}
                  id="btn-toggle-admin-password"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}
                >
                  {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="btn-submit-admin-login"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Shield size={18} />
              <span>{loading ? 'Verifying Admin...' : 'Log In to Admin Dashboard'}</span>
            </button>

            {/* Note confirming strict restriction */}
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                🔒 Access restricted to authorized administrative personnel. Public registration is disabled.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
