import React, { useState } from 'react';
import { 
  Bus, User, Compass, Shield, LogIn, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import { api } from '../../services/api';

export default function AuthPage({ routes = [], onAuthenticated }) {
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'driver' | 'admin'

  // Student Login State
  const [studentName, setStudentName] = useState('');
  const [studentIdentifier, setStudentIdentifier] = useState('');

  // Driver Login State
  const [driverId, setDriverId] = useState('PRAGNYA01');
  const [driverPin, setDriverPin] = useState('');

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Student Login
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const enteredName = studentName.trim();
    const id = studentIdentifier.trim();

    if (!enteredName) {
      setErrorMsg('Please enter your Name.');
      return;
    }
    if (!id) {
      setErrorMsg('Please enter your Registration ID.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginStudent({ name: enteredName, identifier: id, registrationId: id });
      if (res && res.student) {
        const normalize = str => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalize(res.student.name) !== normalize(enteredName)) {
          throw new Error(`The entered Name "${enteredName}" does not match the registered record for Registration ID "${id}".`);
        }
        setSuccessMsg(`Welcome back, ${res.student.name}!`);
        setTimeout(() => {
          onAuthenticated({
            role: 'student',
            user: res.student,
            token: res.token
          });
        }, 300);
      } else {
        throw new Error('Could not retrieve student profile');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please verify your Name and Registration ID.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Driver Login
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!driverPin.trim()) {
      setErrorMsg('Please enter Driver Access PIN.');
      return;
    }
    if (driverPin.trim() !== '2026') {
      setErrorMsg('Invalid Driver Access PIN.');
      return;
    }
    setLoading(true);

    try {
      const res = await api.driverLogin({ driverId, pin: driverPin.trim() });
      if (res && res.driver) {
        setSuccessMsg(`Welcome, Driver ${res.driver.name}!`);
        setTimeout(() => {
          onAuthenticated({
            role: 'driver',
            user: res.driver,
            token: res.token
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
    if (!adminUsername.trim()) {
      setErrorMsg('Please enter Admin Username.');
      return;
    }
    if (!adminPassword) {
      setErrorMsg('Please enter Admin Password.');
      return;
    }
    setLoading(true);

    try {
      const res = await api.adminLogin({ username: adminUsername.trim(), password: adminPassword });
      if (res && res.success) {
        setSuccessMsg('Administrator access granted.');
        setTimeout(() => {
          onAuthenticated({
            role: 'admin',
            user: res.user || { name: 'Campus Transport Administrator', role: 'admin' },
            token: res.token
          });
        }, 300);
      } else {
        throw new Error(res.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid administrator credentials.');
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

        {/* 1. STUDENT AUTHENTICATION */}
        {selectedRole === 'student' && (
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
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>Student Sign In</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Only authorized/registered students can log in with their Name & Registration ID
              </p>
            </div>

            <form onSubmit={handleStudentLogin}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                  Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your Full Name"
                  value={studentName}
                  onChange={e => { setStudentName(e.target.value); if (errorMsg) setErrorMsg(''); }}
                  id="input-student-name"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                  Registration ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Registration ID"
                  value={studentIdentifier}
                  onChange={e => { setStudentIdentifier(e.target.value); if (errorMsg) setErrorMsg(''); }}
                  id="input-student-roll"
                  required
                />
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  Enter your registered Full Name and Registration ID to verify your pass and access your dashboard.
                </p>
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
                <span>{loading ? 'Authenticating...' : 'Log In to Student Portal'}</span>
              </button>
            </form>
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
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>Driver Sign In</h3>
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
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC College ↔ Baramunda • OD-02-AX-1001</span>
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
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: BEC College ↔ Patia • OD-02-AX-2002</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Driver Access PIN <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter Access PIN"
                value={driverPin}
                onChange={e => setDriverPin(e.target.value)}
                id="input-driver-pin"
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
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
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
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>Admin Sign In</h3>
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
                placeholder="Enter Admin Username"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                id="input-admin-username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                Admin Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter Admin Password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                id="input-admin-password"
                required
              />
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
          </form>
        )}
      </div>
    </div>
  );
}
