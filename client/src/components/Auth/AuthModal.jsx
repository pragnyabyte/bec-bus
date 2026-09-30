import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, CheckCircle2, ShieldCheck, AlertCircle, 
  Bus, MapPin, Phone, User, Mail, GraduationCap, ArrowRight 
} from 'lucide-react';
import { api } from '../../services/api';

export default function AuthModal({ routes = [], onRegistered, onClose }) {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState('1st Year');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || 'R-101');
  
  const selectedRouteObj = routes.find(r => r.id === selectedRouteId) || routes[0];
  const [selectedStopId, setSelectedStopId] = useState(selectedRouteObj?.stops?.[0]?.id || '');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState(null);

  // When selected route changes, ensure selected stop defaults to first stop of new route
  useEffect(() => {
    if (selectedRouteObj?.stops?.length > 0) {
      const stopExists = selectedRouteObj.stops.some(s => s.id === selectedStopId);
      if (!stopExists) {
        setSelectedStopId(selectedRouteObj.stops[0].id);
      }
    }
  }, [selectedRouteId, selectedRouteObj, selectedStopId]);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    if (!name.trim()) {
      return 'Please enter your Full Name.';
    }
    if (name.trim().length < 2) {
      return 'Full Name must be at least 2 characters long.';
    }
    if (!rollNo.trim()) {
      return 'Please enter your College Roll Number / Student ID.';
    }
    if (rollNo.trim().length < 3) {
      return 'Roll Number must be at least 3 characters long.';
    }
    if (!phone.trim()) {
      return 'Please enter your Contact Mobile number.';
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      return 'Please enter a valid phone number (at least 7 digits).';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid College Email address.';
    }
    if (!selectedRouteId) {
      return 'Please select a preferred Bus Route.';
    }
    if (!selectedStopId) {
      return 'Please select a preferred Boarding Stop.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
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

      setRegisteredStudent(created);
      setSuccess(true);
      setErrorMsg('');

      // Notify parent app immediately so state & localStorage are synchronized
      if (onRegistered) {
        onRegistered(created);
      }
    } catch (err) {
      console.error('[Registration Error]:', err);
      setErrorMsg(err.message || 'Registration failed. Please verify your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (onRegistered && registeredStudent) {
      onRegistered(registeredStudent);
    }
    onClose();
  };

  const assignedStopObj = selectedRouteObj?.stops?.find(s => s.id === (registeredStudent?.stopId || selectedStopId)) || selectedRouteObj?.stops?.[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: '#64748b' }}
          title="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
          }}>
            <UserPlus size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', color: '#0f172a' }}>Student Transit Registration</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Register for campus bus pass, assigned route, live fleet tracking, and digital attendance
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success View */}
        {success && registeredStudent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              border: '2px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#15803d'
            }}>
              <CheckCircle2 size={38} />
            </div>

            <h4 style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
              Registration Successful!
            </h4>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
              Welcome, <b style={{ color: '#0284c7' }}>{registeredStudent.name}</b>! Your bus pass has been created and assigned to the Student Dashboard.
            </p>

            {/* Summary Details Card */}
            <div style={{
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Student Name:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{registeredStudent.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>College Roll No:</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>{registeredStudent.rollNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Department & Year:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{registeredStudent.department} ({registeredStudent.year})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Assigned Route:</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>{selectedRouteObj?.code} - {selectedRouteObj?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Boarding Stop:</span>
                <span style={{ fontWeight: 700, color: '#b45309' }}>{assignedStopObj?.name || 'Assigned Stop'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Pass Status:</span>
                <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  ✓ Active Digital Pass
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <span>Continue to Student Dashboard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
              />
            </div>

            {/* Roll Number & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Roll Number / ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS-2024-042"
                  value={rollNo}
                  onChange={e => {
                    setRollNo(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Contact Mobile <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  required
                />
              </div>
            </div>

            {/* College Email */}
            <div className="form-group">
              <label className="form-label">
                College Email Address <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>(Optional - defaults to rollNo@apex.edu)</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. alex.johnson@apex.edu"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </div>

            {/* Department & Academic Year */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Department / Branch <span style={{ color: '#dc2626' }}>*</span></label>
                <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Tech">Information Tech</option>
                  <option value="Electronics & Comm">Electronics & Comm</option>
                  <option value="Mechanical Engg">Mechanical Engg</option>
                  <option value="Civil Engg">Civil Engg</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Management Studies">Management Studies</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Year <span style={{ color: '#dc2626' }}>*</span></label>
                <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
                  <option value="1st Year">1st Year (Freshman)</option>
                  <option value="2nd Year">2nd Year (Sophomore)</option>
                  <option value="3rd Year">3rd Year (Junior)</option>
                  <option value="4th Year">4th Year (Senior)</option>
                </select>
              </div>
            </div>

            {/* Preferred Bus Route */}
            <div className="form-group">
              <label className="form-label">Preferred Bus Route <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="form-select"
                value={selectedRouteId}
                onChange={e => {
                  const newRouteId = e.target.value;
                  setSelectedRouteId(newRouteId);
                  const rt = routes.find(r => r.id === newRouteId);
                  if (rt && rt.stops && rt.stops.length > 0) {
                    setSelectedStopId(rt.stops[0].id);
                  }
                }}
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name} ({r.distanceKm} km)
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Boarding Stop */}
            <div className="form-group">
              <label className="form-label">Preferred Boarding Stop <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="form-select"
                value={selectedStopId}
                onChange={e => setSelectedStopId(e.target.value)}
              >
                {selectedRouteObj?.stops?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Pickup: {s.morningTime} • Drop: {s.eveningTime})
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting} 
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {submitting ? (
                  <>
                    <span className="pulse-dot online" style={{ width: '8px', height: '8px' }} />
                    <span>Registering Student...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Register for Bus Pass</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
