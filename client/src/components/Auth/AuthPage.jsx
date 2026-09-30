import React, { useState } from 'react';
import { 
  Bus, User, Compass, Shield, LogIn, UserPlus, 
  CheckCircle2, AlertCircle, Phone, Mail, GraduationCap, 
  MapPin, ArrowRight, Lock, KeyRound, Check
} from 'lucide-react';
import { api } from '../../services/api';

export default function AuthPage({ routes = [], onAuthenticated }) {
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'driver' | 'admin'
  const [studentTab, setStudentTab] = useState('login'); // 'login' | 'signup'

  // Student Login State
  const [studentIdentifier, setStudentIdentifier] = useState('');
  
  // Student Sign Up State
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState('1st Year');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || 'R-101');
  const selectedRouteObj = routes.find(r => r.id === selectedRouteId) || routes[0];
  const [selectedStopId, setSelectedStopId] = useState(selectedRouteObj?.stops?.[0]?.id || '');

  // Driver Login State
  const [driverId, setDriverId] = useState('PRAGNYA01');
  const [driverPin, setDriverPin] = useState('2026');

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Student Login
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const id = studentIdentifier.trim();
    if (!id) {
      setErrorMsg('Please enter your College Roll Number or Email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginStudent({ identifier: id });
      if (res && res.student) {
        setSuccessMsg(`Welcome back, ${res.student.name}!`);
        setTimeout(() => {
          onAuthenticated({
            role: 'student',
            user: res.student
          });
        }, 300);
      } else {
        throw new Error('Could not retrieve student profile');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please verify your Roll Number.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Sign Up
  const handleStudentSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }
    if (!rollNo.trim()) {
      setErrorMsg('Please enter your College Roll Number.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your Mobile number.');
      return;
    }

    setLoading(true);
    try {
      const finalEmail = email.trim() || `${rollNo.trim().toLowerCase()}@bec.edu.in`;
      const created = await api.registerStudent({
        name: name.trim(),
        rollNo: rollNo.trim().toUpperCase(),
        department,
        year,
        phone: phone.trim(),
        email: finalEmail,
        routeId: selectedRouteId,
        stopId: selectedStopId || selectedRouteObj?.stops?.[0]?.id
      });

      setSuccessMsg(`Registration successful! Welcome, ${created.name}.`);
      setTimeout(() => {
        onAuthenticated({
          role: 'student',
          user: created
        });
      }, 400);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Sign up failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Driver Login
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.driverLogin({ driverId, pin: driverPin });
      if (res && res.driver) {
        setSuccessMsg(`Welcome, Driver ${res.driver.name}!`);
        setTimeout(() => {
          onAuthenticated({
            role: 'driver',
            user: res.driver
          });
        }, 300);
      } else {
        throw new Error('Driver verification failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Driver authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.adminLogin({ username: adminUsername.trim(), password: adminPassword });
      if (res && res.success) {
        setSuccessMsg('Administrator access granted.');
        setTimeout(() => {
          onAuthenticated({
            role: 'admin',
            user: res.user || { name: 'Campus Transport Administrator', role: 'admin' }
          });
        }, 300);
      } else {
        throw new Error(res.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid administrator credentials. (Default: admin / admin123)');
    } finally {
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
      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '600px' }}>
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.75rem', border: '1px solid #bae6fd' }}>
          <span>🔒 Please authenticate to enter your transit dashboard</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 20px 40px -15px rgba(2, 132, 199, 0.12), 0 0 1px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
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
            onClick={() => { setSelectedRole('student'); setErrorMsg(''); setSuccessMsg(''); }}
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
            onClick={() => { setSelectedRole('driver'); setErrorMsg(''); setSuccessMsg(''); }}
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
              background: selectedRole === 'driver' ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'transparent',
              color: selectedRole === 'driver' ? '#ffffff' : '#64748b',
              boxShadow: selectedRole === 'driver' ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Compass size={16} /> Driver
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setErrorMsg(''); setSuccessMsg(''); }}
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
              background: selectedRole === 'admin' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
              color: selectedRole === 'admin' ? '#ffffff' : '#64748b',
              boxShadow: selectedRole === 'admin' ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
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

        {/* 1. STUDENT AUTHENTICATION */}
        {selectedRole === 'student' && (
          <div>
            {/* Student Login vs Sign Up toggle */}
            <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setStudentTab('login'); setErrorMsg(''); }}
                id="btn-student-tab-login"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: studentTab === 'login' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                  color: studentTab === 'login' ? '#0284c7' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => { setStudentTab('signup'); setErrorMsg(''); }}
                id="btn-student-tab-signup"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: studentTab === 'signup' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                  color: studentTab === 'signup' ? '#0284c7' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                Sign Up / Register Pass
              </button>
            </div>

            {studentTab === 'login' ? (
              /* Student Login Form */
              <form onSubmit={handleStudentLogin}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                    College Roll Number or Registered Email <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS-2024-042 or student@bec.edu.in"
                    value={studentIdentifier}
                    onChange={e => { setStudentIdentifier(e.target.value); if (errorMsg) setErrorMsg(''); }}
                    id="input-student-roll"
                    required
                    autoFocus
                  />
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                    Enter your Roll Number to access your Digital Bus Pass, live GPS tracking, and route.
                  </p>
                </div>

                {/* Quick 1-click Test Logins */}
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    Quick Select Registered Student:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['CS-2024-042', 'EC-2024-089', 'CS-2024-999', '3456'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStudentIdentifier(r)}
                        style={{
                          background: studentIdentifier === r ? '#0284c7' : '#ffffff',
                          color: studentIdentifier === r ? '#ffffff' : '#0284c7',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  id="btn-submit-student-login"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <LogIn size={18} />
                  <span>{loading ? 'Authenticating...' : 'Log In to Student Portal'}</span>
                </button>
              </form>
            ) : (
              /* Student Sign Up Form */
              <form onSubmit={handleStudentSignUp}>
                <div className="form-group">
                  <label className="form-label">Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Johnson"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Roll Number <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CS-2026-101"
                      value={rollNo}
                      onChange={e => setRollNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. rollno@bec.edu.in"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Tech">Information Tech</option>
                      <option value="Electronics & Comm">Electronics & Comm</option>
                      <option value="Mechanical Engg">Mechanical Engg</option>
                      <option value="Civil Engg">Civil Engg</option>
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Bus Route <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    className="form-select"
                    value={selectedRouteId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedRouteId(id);
                      const rt = routes.find(r => r.id === id);
                      if (rt && rt.stops && rt.stops.length > 0) {
                        setSelectedStopId(rt.stops[0].id);
                      }
                    }}
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Boarding Stop <span style={{ color: '#dc2626' }}>*</span></label>
                  <select
                    className="form-select"
                    value={selectedStopId}
                    onChange={e => setSelectedStopId(e.target.value)}
                  >
                    {selectedRouteObj?.stops?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Pickup: {s.morningTime})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  id="btn-submit-student-signup"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1.25rem' }}
                >
                  <UserPlus size={18} />
                  <span>{loading ? 'Creating Pass in MongoDB...' : 'Sign Up & Enter Student Portal'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2. DRIVER AUTHENTICATION */}
        {selectedRole === 'driver' && (
          <form onSubmit={handleDriverLogin}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f5f3ff',
                color: '#7c3aed',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <Compass size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a' }}>Fleet Driver Sign In</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Select your driver profile to start route navigation and passenger boarding
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Assigned Driver Profile
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: driverId === 'PRAGNYA01' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: driverId === 'PRAGNYA01' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="driverOption"
                    value="PRAGNYA01"
                    checked={driverId === 'PRAGNYA01'}
                    onChange={() => setDriverId('PRAGNYA01')}
                  />
                  <div>
                    <b style={{ color: '#0f172a', display: 'block' }}>Pragnya (Bus 1)</b>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC College ↔ Baramunda • OD-02-AX-1001</span>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: driverId === 'JITENDRA01' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: driverId === 'JITENDRA01' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="driverOption"
                    value="JITENDRA01"
                    checked={driverId === 'JITENDRA01'}
                    onChange={() => setDriverId('JITENDRA01')}
                  />
                  <div>
                    <b style={{ color: '#0f172a', display: 'block' }}>Jitendra (Bus 2)</b>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC College ↔ Patia • OD-02-AX-2002</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Driver Access PIN
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Access PIN (Default: 2026)"
                value={driverPin}
                onChange={e => setDriverPin(e.target.value)}
                required
              />
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
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)'
              }}
            >
              <Compass size={18} />
              <span>{loading ? 'Authenticating Driver...' : 'Log In to Driver Console'}</span>
            </button>
          </form>
        )}

        {/* 3. ADMIN AUTHENTICATION */}
        {selectedRole === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <Shield size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a' }}>Transport Administration</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
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
                placeholder="Username (e.g. admin)"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                id="input-admin-username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Admin Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Password (e.g. admin123)"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                id="input-admin-password"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.4rem' }}>
                Default: <code>admin</code> / <code>admin123</code>
              </span>
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
                background: 'linear-gradient(135deg, #059669, #10b981)'
              }}
            >
              <Shield size={18} />
              <span>{loading ? 'Verifying Admin...' : 'Log In to Admin Dashboard'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
