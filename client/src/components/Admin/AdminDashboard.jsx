import React, { useState, useMemo } from 'react';
import { 
  Bus, Users, MapPin, AlertCircle, ShieldAlert, CheckCircle2, 
  XCircle, Plus, BarChart3, Settings, 
  FileText, Activity, Compass, ArrowRightLeft, MessageSquare,
  Phone, ShieldCheck, Edit3, Trash2, LogOut, Clock, Navigation, X, RefreshCw
} from 'lucide-react';
import LiveMap from '../Map/LiveMap';
import { api } from '../../services/api';

export default function AdminDashboard({
  overview = {},
  buses = [],
  routes = [],
  drivers = [],
  students = [],
  complaints = [],
  changeRequests = [],
  notifications = [],
  onDataRefresh,
  onOpenAuthModal,
  onLogout
}) {
  // 1. Bus Selection State: 'BUS-01' (Bus 1 – Pragnya) | 'BUS-02' (Bus 2 – Jitendra)
  const [selectedBusId, setSelectedBusId] = useState('BUS-01');

  // Navigation tab inside selected bus dashboard: 'overview' | 'students' | 'complaints' | 'requests' | 'register'
  const [activeTab, setActiveTab] = useState('overview');
  const [statusMsg, setStatusMsg] = useState('');

  // Complaint / Issue Reply & Filter State
  const [replyComplaintId, setReplyComplaintId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [issueFilter, setIssueFilter] = useState('all'); // 'all' | 'pending' | 'resolved'

  // New User Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regRole, setRegRole] = useState('student'); // 'student' | 'driver' | 'admin'
  const [regName, setRegName] = useState('');
  const [regUserId, setRegUserId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science');
  const [regYear, setRegYear] = useState('1st Year');
  const [regBusId, setRegBusId] = useState('BUS-01');
  const [regStopId, setRegStopId] = useState('');
  const [regLicenseNo, setRegLicenseNo] = useState('');
  const [regExperience, setRegExperience] = useState('5');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState('');

  // Coordinate validity helper (Odisha / Bhubaneswar region)
  const isCoordValid = (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
    return lat >= 19.5 && lat <= 21.0 && lng >= 85.0 && lng <= 86.5;
  };

  // Haversine distance in km
  const calcHaversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ==========================================
  // ISOLATED SELECTED BUS DATA (STRICT FILTERING)
  // ==========================================
  const selectedBus = useMemo(() => {
    const found = buses.find(b => b.id === selectedBusId || (selectedBusId === 'BUS-01' ? b.fleetNumber === 'Bus 1' : b.fleetNumber === 'Bus 2'));
    if (found) return found;
    return selectedBusId === 'BUS-01' ? {
      id: 'BUS-01',
      fleetNumber: 'Bus 1',
      busNo: 'OD-02-AX-1001',
      driverId: 'PRAGNYA01',
      driverName: 'Pragnya',
      routeId: 'R-101',
      capacity: 45,
      occupied: 0,
      status: 'idle',
      speed: 0
    } : {
      id: 'BUS-02',
      fleetNumber: 'Bus 2',
      busNo: 'OD-02-AX-2002',
      driverId: 'JITENDRA01',
      driverName: 'Jitendra',
      routeId: 'R-102',
      capacity: 45,
      occupied: 0,
      status: 'idle',
      speed: 0
    };
  }, [buses, selectedBusId]);

  const selectedDriver = useMemo(() => {
    const targetDriverId = selectedBusId === 'BUS-01' ? 'PRAGNYA01' : 'JITENDRA01';
    const found = drivers.find(d => d.id === targetDriverId || (selectedBusId === 'BUS-01' ? d.name === 'Pragnya' : d.name === 'Jitendra'));
    if (found) return found;
    return selectedBusId === 'BUS-01' ? {
      id: 'PRAGNYA01',
      name: 'Pragnya',
      phone: '+919040833547',
      experienceYears: 2,
      licenseNo: 'OD-02-2016-004581',
      rating: 4.9,
      busId: 'BUS-01',
      routeId: 'R-101'
    } : {
      id: 'JITENDRA01',
      name: 'Jitendra',
      phone: '+916370998587',
      experienceYears: 3,
      licenseNo: 'OD-02-2014-009122',
      rating: 4.8,
      busId: 'BUS-02',
      routeId: 'R-102'
    };
  }, [drivers, selectedBusId]);

  const selectedRoute = useMemo(() => {
    const targetRouteId = selectedBusId === 'BUS-01' ? 'R-101' : 'R-102';
    const found = routes.find(r => r.id === targetRouteId || (selectedBusId === 'BUS-01' ? r.code === 'RT-01' : r.code === 'RT-02'));
    if (found) return found;
    return routes[selectedBusId === 'BUS-01' ? 0 : 1] || null;
  }, [routes, selectedBusId]);

  const targetRouteId = selectedBusId === 'BUS-01' ? 'R-101' : 'R-102';
  const targetRouteCode = selectedBusId === 'BUS-01' ? 'RT-01' : 'RT-02';

  // Strict student isolation for selected bus
  const selectedStudents = useMemo(() => {
    return students.filter(s => {
      if (s.busId === selectedBusId) return true;
      if (s.routeId === targetRouteId || s.routeId === targetRouteCode) return true;
      const rName = (s.routeName || '').toLowerCase();
      if (selectedBusId === 'BUS-01' && (rName.includes('baramunda') || rName.includes('rt-01') || rName.includes('bus 1'))) return true;
      if (selectedBusId === 'BUS-02' && (rName.includes('patia') || rName.includes('rt-02') || rName.includes('bus 2'))) return true;
      return false;
    });
  }, [students, selectedBusId, targetRouteId, targetRouteCode]);

  const selectedPendingStudents = useMemo(() => {
    return selectedStudents.filter(s => s.status === 'pending_approval');
  }, [selectedStudents]);

  // Strict complaints isolation for selected bus
  const selectedComplaints = useMemo(() => {
    const studentIds = new Set(selectedStudents.map(s => s.id));
    return complaints.filter(c => 
      c.busId === selectedBusId || 
      c.routeId === targetRouteId || 
      c.routeId === targetRouteCode ||
      studentIds.has(c.studentId)
    );
  }, [complaints, selectedBusId, selectedStudents, targetRouteId, targetRouteCode]);

  // Strict route changes isolation for selected bus
  const selectedChangeRequests = useMemo(() => {
    const targetRouteName = selectedBusId === 'BUS-01' ? 'Baramunda' : 'Patia';
    return changeRequests.filter(req => 
      req.currentRoute?.includes(targetRouteName) || 
      req.requestedRoute?.includes(targetRouteName) ||
      req.currentRouteId === targetRouteId || 
      req.requestedRouteId === targetRouteId
    );
  }, [changeRequests, selectedBusId, targetRouteId]);

  // Telemetry, Movement, Nearest & Next Stop for selected bus
  const trackingInfo = useMemo(() => {
    const hasValidCoords = selectedBus && isCoordValid(selectedBus.currentLat, selectedBus.currentLng);
    const isEnRoute = selectedBus && (selectedBus.status === 'on_trip' || selectedBus.status === 'emergency');

    let movementState = 'not_started';
    let movementLabel = 'Has not started route';
    let movementBadgeBg = '#f1f5f9';
    let movementBadgeColor = '#64748b';
    let movementBadgeBorder = '#cbd5e1';

    if (!isEnRoute || !hasValidCoords) {
      movementState = 'not_started';
      movementLabel = 'Has not started route';
      movementBadgeBg = '#f1f5f9';
      movementBadgeColor = '#64748b';
      movementBadgeBorder = '#cbd5e1';
    } else if (selectedBus.speed && selectedBus.speed > 3) {
      movementState = 'moving';
      movementLabel = `Moving (${selectedBus.speed} km/h)`;
      movementBadgeBg = '#dcfce7';
      movementBadgeColor = '#15803d';
      movementBadgeBorder = '#86efac';
    } else {
      movementState = 'stopped';
      movementLabel = 'Stopped (0 km/h)';
      movementBadgeBg = '#fef3c7';
      movementBadgeColor = '#b45309';
      movementBadgeBorder = '#fde68a';
    }

    const isLiveAvailable = hasValidCoords && isEnRoute;
    let locationText = 'Live location unavailable';
    let nearestStop = null;
    let nearestDistKm = null;
    let nextStop = null;
    let nextStopDistKm = null;
    let etaMinutes = null;

    if (isLiveAvailable && selectedRoute?.stops?.length > 0) {
      let minDist = Infinity;
      let nearestIdx = 0;

      selectedRoute.stops.forEach((stop, idx) => {
        const d = calcHaversineKm(selectedBus.currentLat, selectedBus.currentLng, stop.lat, stop.lng);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
          nearestIdx = idx;
          nearestDistKm = d;
        }
      });

      if (nearestDistKm <= 0.15) {
        locationText = `At ${nearestStop.name} (Stop #${nearestStop.sequence || nearestIdx + 1})`;
      } else {
        locationText = `Near ${nearestStop.name} (${nearestDistKm.toFixed(1)} km away)`;
      }

      if (selectedBus.nextStopId) {
        nextStop = selectedRoute.stops.find(s => s.id === selectedBus.nextStopId);
      }
      if (!nextStop) {
        if (nearestIdx < selectedRoute.stops.length - 1) {
          nextStop = selectedRoute.stops[nearestIdx + 1];
        } else {
          nextStop = selectedRoute.stops[selectedRoute.stops.length - 1];
        }
      }

      if (nextStop) {
        nextStopDistKm = calcHaversineKm(selectedBus.currentLat, selectedBus.currentLng, nextStop.lat, nextStop.lng);
        const speed = (selectedBus.speed && selectedBus.speed > 5) ? selectedBus.speed : 28;
        etaMinutes = Math.max(1, Math.round((nextStopDistKm / speed) * 60));
      }
    } else {
      locationText = 'Live location unavailable';
    }

    return {
      isLiveAvailable,
      movementState,
      movementLabel,
      movementBadgeBg,
      movementBadgeColor,
      movementBadgeBorder,
      locationText,
      nearestStop,
      nextStop,
      etaMinutes
    };
  }, [selectedBus, selectedRoute]);

  // Handle Approve / Reject Student Registration
  const handleStudentApproval = async (id, status) => {
    try {
      await api.updateStudentStatus(id, status);
      setStatusMsg(`Student ${status === 'approved' ? 'approved' : 'rejected'} successfully.`);
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Permanent Delete Student
  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete student "${student.name}" (${student.rollNo})?\n\nThis will immediately remove their registration and revoke login access from MongoDB Atlas database.`
    );
    if (!confirmed) return;

    try {
      await api.deleteStudent(student.id || student.rollNo);
      setStatusMsg(`Student ${student.name} (${student.rollNo}) deleted successfully from MongoDB Atlas.`);
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error('Delete student failed:', err);
      alert(err.message || 'Failed to delete student.');
    }
  };

  // Handle Route Change Request
  const handleRequestAction = async (id, action) => {
    try {
      await api.actionChangeRequest(id, action);
      setStatusMsg(`Route change request marked as ${action}.`);
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Complaint / Issue Reply & Status Update
  const handleResolveComplaint = async (id) => {
    if (!replyText.trim()) return;
    try {
      await api.replyComplaint(id, { adminReply: replyText.trim(), status: 'Resolved' });
      setReplyComplaintId(null);
      setReplyText('');
      setStatusMsg('Official response recorded and issue marked as Resolved.');
      if (onDataRefresh) await onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateIssueStatus = async (id, newStatus) => {
    try {
      await api.replyComplaint(id, { status: newStatus });
      setStatusMsg(`Issue status updated to ${newStatus}.`);
      if (onDataRefresh) await onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  // Available stops for registration based on selected bus/route
  const regRouteStops = useMemo(() => {
    const targetRouteId = regBusId === 'BUS-02' ? 'R-102' : 'R-101';
    const r = routes.find(item => item.id === targetRouteId || (regBusId === 'BUS-02' ? item.code === 'RT-02' : item.code === 'RT-01'));
    return r?.stops || [];
  }, [routes, regBusId]);

  // Handle New User Registration Submit
  const handleRegisterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setRegErrorMsg('');
    setRegSuccessMsg('');

    if (!regName.trim()) {
      setRegErrorMsg('Full Name is required.');
      return;
    }
    if (!regUserId.trim()) {
      setRegErrorMsg(regRole === 'student' ? 'Student Roll Number / User ID is required.' : 'User ID / Identifier is required.');
      return;
    }

    setRegSubmitting(true);
    try {
      const payload = {
        role: regRole,
        name: regName.trim(),
        userId: regUserId.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        busId: regBusId,
        routeId: regBusId === 'BUS-02' ? 'R-102' : 'R-101',
        stopId: regStopId || undefined,
        department: regDepartment,
        year: regYear,
        licenseNo: regLicenseNo.trim(),
        experienceYears: regExperience
      };

      const response = await api.adminRegisterUser(payload);
      const successText = response?.message || `Successfully registered new ${regRole}: ${regName.trim()} (${regUserId.trim()})`;
      setRegSuccessMsg(successText);
      setStatusMsg(successText);

      // Reset text inputs
      setRegName('');
      setRegUserId('');
      setRegPhone('');
      setRegEmail('');
      setRegLicenseNo('');

      // Refresh real-time lists
      if (onDataRefresh) {
        await onDataRefresh();
      }

      setTimeout(() => {
        setStatusMsg('');
      }, 5000);
    } catch (err) {
      console.error('Registration failed:', err);
      setRegErrorMsg(err.message || 'Registration failed. Please check the entered fields.');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Reusable Registration Form Component (Android App Styled)
  const renderRegistrationForm = (isModal = false) => (
    <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Role Switcher */}
      <div>
        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '4px' }}>
          Select Role <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div className="android-segmented-control" style={{ minHeight: '38px' }}>
          <button
            type="button"
            className={`android-segment-btn ${regRole === 'student' ? 'active-blue' : ''}`}
            onClick={() => { setRegRole('student'); setRegErrorMsg(''); }}
            id="reg-role-student"
          >
            <Users size={14} /> Student
          </button>
          <button
            type="button"
            className={`android-segment-btn ${regRole === 'driver' ? 'active-blue' : ''}`}
            onClick={() => { setRegRole('driver'); setRegErrorMsg(''); }}
            id="reg-role-driver"
          >
            <Compass size={14} /> Driver
          </button>
          <button
            type="button"
            className={`android-segment-btn ${regRole === 'admin' ? 'active-blue' : ''}`}
            onClick={() => { setRegRole('admin'); setRegErrorMsg(''); }}
            id="reg-role-admin"
          >
            <ShieldCheck size={14} /> Admin
          </button>
        </div>
      </div>

      {/* Notifications */}
      {regErrorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
          {regErrorMsg}
        </div>
      )}
      {regSuccessMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
          {regSuccessMsg}
        </div>
      )}

      {/* Input Fields */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Full Name *</label>
        <input
          type="text"
          className="form-input"
          id="reg-name"
          placeholder="e.g. Pragnya Panda"
          value={regName}
          onChange={e => setRegName(e.target.value)}
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
          {regRole === 'student' ? 'Roll Number / ID *' : regRole === 'driver' ? 'Driver ID *' : 'Admin Username *'}
        </label>
        <input
          type="text"
          className="form-input"
          id="reg-userid"
          placeholder={regRole === 'student' ? 'e.g. 2101289123' : regRole === 'driver' ? 'e.g. DRV-03' : 'e.g. admin2'}
          value={regUserId}
          onChange={e => setRegUserId(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Phone</label>
          <input
            type="tel"
            className="form-input"
            id="reg-phone"
            placeholder="+91..."
            value={regPhone}
            onChange={e => setRegPhone(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Email</label>
          <input
            type="email"
            className="form-input"
            id="reg-email"
            placeholder="user@bec.edu"
            value={regEmail}
            onChange={e => setRegEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Student Specific Fields */}
      {regRole === 'student' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Department</label>
              <select className="form-select" id="reg-dept" value={regDepartment} onChange={e => setRegDepartment(e.target.value)}>
                <option value="Computer Science">Computer Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
                <option value="Electrical">Electrical</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Year</label>
              <select className="form-select" id="reg-year" value={regYear} onChange={e => setRegYear(e.target.value)}>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Assigned Fleet Bus</label>
            <select className="form-select" id="reg-bus" value={regBusId} onChange={e => setRegBusId(e.target.value)}>
              <option value="BUS-01">Bus 1 – Pragnya (Route RT-01: Baramunda)</option>
              <option value="BUS-02">Bus 2 – Jitendra (Route RT-02: Patia)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Designated Boarding Stop</label>
            <select className="form-select" id="reg-select-stop" value={regStopId} onChange={e => setRegStopId(e.target.value)}>
              <option value="">-- First Stop (Default) --</option>
              {regRouteStops.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (Stop #{s.sequence} • {s.morningTime})
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Driver Specific Fields */}
      {regRole === 'driver' && (
        <>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Assigned Fleet Bus</label>
            <select className="form-select" id="reg-driver-bus" value={regBusId} onChange={e => setRegBusId(e.target.value)}>
              <option value="BUS-01">Bus 1 – Pragnya (Route RT-01: Baramunda)</option>
              <option value="BUS-02">Bus 2 – Jitendra (Route RT-02: Patia)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>License No</label>
              <input
                type="text"
                className="form-input"
                id="reg-driver-license"
                placeholder="OD-02-..."
                value={regLicenseNo}
                onChange={e => setRegLicenseNo(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Exp (Years)</label>
              <input
                type="number"
                className="form-input"
                id="reg-driver-exp"
                min="1"
                max="40"
                value={regExperience}
                onChange={e => setRegExperience(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Admin Specific Privileges */}
      {regRole === 'admin' && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.78rem',
          color: '#0369a1'
        }}>
          <b>Administrator Privileges:</b> Full access for fleet supervision, student approvals, route management, and complaint resolution.
        </div>
      )}

      {/* Submit Button */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
        {isModal && (
          <button
            type="button"
            className="android-touch-btn"
            onClick={() => setShowRegisterModal(false)}
            style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}
          >
            Close
          </button>
        )}
        <button
          type="submit"
          className="android-touch-btn"
          id="btn-submit-registration"
          disabled={regSubmitting}
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            color: '#ffffff'
          }}
        >
          {regSubmitting ? 'Registering...' : (
            <>
              <Plus size={16} /> Register {regRole.charAt(0).toUpperCase() + regRole.slice(1)}
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="android-admin-app">
      {/* ==========================================
          1. ANDROID APP PROFILE & ADMIN HEADER CARD
          ========================================== */}
      <div className="android-card" style={{ padding: '1rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Admin Avatar */}
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #7c3aed)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.25rem',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
            }}>
              <ShieldCheck size={22} />
            </div>

            {/* Admin Info */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                  Transport Admin
                </h2>
                <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  ADMIN-01
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Campus Fleet & Transit Central Command
              </div>
            </div>
          </div>

          {/* Compact Logout Icon Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              id="btn-admin-logout"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Bus Selection Segmented Control (Bus 1 vs Bus 2) */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            SELECT FLEET BUS:
          </div>
          <div className="android-segmented-control">
            <button
              type="button"
              className={`android-segment-btn ${selectedBusId === 'BUS-01' ? 'active-blue' : ''}`}
              onClick={() => setSelectedBusId('BUS-01')}
              id="admin-select-bus-1"
            >
              <Bus size={15} /> Bus 1 – Pragnya
            </button>
            <button
              type="button"
              className={`android-segment-btn ${selectedBusId === 'BUS-02' ? 'active-purple' : ''}`}
              onClick={() => setSelectedBusId('BUS-02')}
              id="admin-select-bus-2"
            >
              <Bus size={15} /> Bus 2 – Jitendra
            </button>
          </div>
        </div>

        {/* Selected Bus Sub-Banner */}
        <div style={{
          background: selectedBusId === 'BUS-01' ? '#f0f9ff' : '#f5f3ff',
          border: `1px solid ${selectedBusId === 'BUS-01' ? '#bae6fd' : '#ddd6fe'}`,
          borderRadius: '12px',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          flexWrap: 'wrap',
          gap: '4px'
        }}>
          <span style={{ color: selectedBusId === 'BUS-01' ? '#0369a1' : '#6d28d9', fontWeight: 700 }}>
            Corridor: <b>{selectedRoute?.code} ({selectedRoute?.name})</b>
          </span>
          <span style={{
            fontSize: '0.7rem',
            background: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 800
          }}>
            {selectedStudents.length} Students Assigned
          </span>
        </div>
      </div>

      {/* Status Snackbar Notification */}
      {statusMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#dcfce7',
          border: '1.5px solid #bbf7d0',
          borderRadius: '14px',
          color: '#15803d',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)'
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ==========================================
          2. TAB 1: OVERVIEW & LIVE MAP
          ========================================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* LIVE TELEMETRY CARD */}
          <div className="android-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`pulse-dot ${trackingInfo.movementState === 'moving' ? 'online' : trackingInfo.movementState === 'stopped' ? 'amber' : ''}`} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  {selectedBus.fleetNumber} Telemetry
                </span>
              </div>
              <span className={`badge ${selectedBus.status === 'on_trip' ? 'badge-green' : selectedBus.status === 'emergency' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                {selectedBus.status.replace('_', ' ')}
              </span>
            </div>

            <div style={{
              background: trackingInfo.movementBadgeBg,
              border: `1px solid ${trackingInfo.movementBadgeBorder}`,
              color: trackingInfo.movementBadgeColor,
              borderRadius: '10px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <MapPin size={14} />
              <span>{trackingInfo.locationText}</span>
            </div>

            {trackingInfo.nextStop && (
              <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginBottom: '0.75rem' }}>
                ➔ Next Stop: <b>{trackingInfo.nextStop.name}</b> {trackingInfo.etaMinutes ? `(~${trackingInfo.etaMinutes} mins)` : ''}
              </div>
            )}

            {/* Stat Chips Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
              <div className="android-stat-card">
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>CURRENT SPEED</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', marginTop: '2px' }}>
                  {selectedBus.speed || 0} km/h
                </div>
                <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                  {selectedBus.status === 'on_trip' ? 'Broadcasting' : 'Standby'}
                </div>
              </div>

              <div className="android-stat-card">
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>OCCUPANCY</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0284c7', marginTop: '2px' }}>
                  {selectedBus.occupied || selectedStudents.length} / {selectedBus.capacity || 45}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Seats ({Math.min(100, Math.round(((selectedBus.occupied || selectedStudents.length) / (selectedBus.capacity || 45)) * 100))}%)
                </div>
              </div>

              <div className="android-stat-card">
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>LICENSE PLATE</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>
                  {selectedBus.busNo}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Authorized BEC Transit</div>
              </div>

              <div className="android-stat-card">
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>TODAY'S BOARDING</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#16a34a', marginTop: '2px' }}>
                  {selectedStudents.filter(s => s.boardedToday).length} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ {selectedStudents.length}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Boarded Today</div>
              </div>
            </div>
          </div>

          {/* LIVE MAP CARD */}
          <div className="android-card" style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={16} style={{ color: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Live Fleet Map</span>
              </div>
              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                {selectedBus.fleetNumber}
              </span>
            </div>

            <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <LiveMap
                routes={selectedRoute ? [selectedRoute] : []}
                buses={selectedBus ? [selectedBus] : []}
                highlightBusId={selectedBus.id}
                height="320px"
              />
            </div>
          </div>

          {/* DRIVER & VEHICLE DETAILS CARD */}
          <div className="android-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Assigned Driver & Vehicle
              </h3>
              <button
                className="android-touch-btn"
                onClick={async () => {
                  const nextStatus = selectedBus.status === 'maintenance' ? 'available' : 'maintenance';
                  await api.updateBus(selectedBus.id, { status: nextStatus });
                  if (onDataRefresh) onDataRefresh();
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  width: 'auto',
                  padding: '0.25rem 0.65rem',
                  minHeight: '32px',
                  fontSize: '0.72rem'
                }}
              >
                {selectedBus.status === 'maintenance' ? 'Exit Maint.' : 'Set Maintenance'}
              </button>
            </div>

            <div className="android-list-card" style={{ background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: selectedBusId === 'BUS-01' ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  {selectedDriver.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{selectedDriver.name}</span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 800 }}>
                      ID: {selectedDriver.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {selectedDriver.experienceYears || 2} Yrs Exp • Lic: {selectedDriver.licenseNo} • ★ {selectedDriver.rating}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700 }}>
                  {selectedDriver.phone}
                </span>
                <a
                  href={`tel:${selectedDriver.phone.replace(/\s+/g, '')}`}
                  className="android-touch-btn"
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    width: 'auto',
                    padding: '0.3rem 0.75rem',
                    minHeight: '34px',
                    fontSize: '0.75rem',
                    textDecoration: 'none'
                  }}
                  title={`Call ${selectedDriver.name}`}
                >
                  <Phone size={13} /> Call Driver
                </a>
              </div>
            </div>
          </div>

          {/* ROUTE TIMETABLE SUMMARY CARD */}
          {selectedRoute && (
            <div className="android-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Route Timetable ({selectedRoute.code})
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {selectedRoute.distanceKm} km • ~{selectedRoute.totalDurationMin} mins • {selectedRoute.stops.length} stops
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedRoute.stops.map((stop, i) => (
                  <div key={stop.id} className="android-list-card" style={{ padding: '0.65rem 0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                          {stop.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#166534', fontWeight: 700 }}>🌅 {stop.morningTime}</span>
                        <span style={{ color: '#991b1b', fontWeight: 700 }}>🌆 {stop.eveningTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          3. TAB 2: STUDENTS ROSTER & APPROVALS
          ========================================== */}
      {activeTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Pending Approvals Card (if any) */}
          {selectedPendingStudents.length > 0 && (
            <div className="android-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Pending Passes ({selectedPendingStudents.length})
                </h3>
                <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Action Required</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectedPendingStudents.map(student => (
                  <div key={student.id} className="android-list-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{student.name}</span>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>Pending</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                      Roll: <b style={{ color: '#0284c7' }}>{student.rollNo}</b> • Dept: {student.department} ({student.year})
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '0.35rem' }}>
                      <button
                        className="android-touch-btn"
                        onClick={() => handleStudentApproval(student.id, 'rejected')}
                        style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', minHeight: '34px', fontSize: '0.75rem' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        className="android-touch-btn"
                        onClick={() => handleStudentApproval(student.id, 'approved')}
                        style={{ flex: 2, background: '#16a34a', color: '#ffffff', minHeight: '34px', fontSize: '0.75rem' }}
                      >
                        <CheckCircle2 size={14} /> Approve Pass
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Students Stream */}
          <div className="android-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Assigned Students ({selectedStudents.length})
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {selectedBus.fleetNumber} ({selectedRoute?.name})
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                ✓ {selectedStudents.filter(s => s.boardedToday).length} Boarded
              </span>
            </div>

            {selectedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                <Users size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No students registered for {selectedBus.fleetNumber}.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {selectedStudents.map(s => {
                  const st = selectedRoute?.stops?.find(sp => sp.id === s.stopId);
                  return (
                    <div key={s.id} className="android-list-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                            Roll: <b style={{ color: '#0284c7' }}>{s.rollNo}</b> • {s.department}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                            Stop: {st ? st.name : (s.stopName || 'Designated Stop')}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                          <span className={`badge ${s.status === 'approved' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                            {s.status}
                          </span>
                          {s.boardedToday ? (
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} /> {s.boardedTime || 'Boarded'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Not Boarded</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => onOpenAuthModal && onOpenAuthModal('update', s)}
                          className="android-touch-btn"
                          style={{
                            flex: 1,
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#059669',
                            minHeight: '32px',
                            fontSize: '0.72rem'
                          }}
                          title="Edit user in MongoDB"
                        >
                          <Edit3 size={13} /> Edit User
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="android-touch-btn btn-delete-student"
                          style={{
                            flex: 1,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            minHeight: '32px',
                            fontSize: '0.72rem'
                          }}
                          title="Delete student permanently"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          4. TAB 3: STUDENT ISSUES & GRIEVANCES
          ========================================== */}
      {activeTab === 'complaints' && (
        <div className="android-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Student Issues ({complaints.length})
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                All student grievances, reports & concerns
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setIssueFilter('all')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: issueFilter === 'all' ? '#ffffff' : 'transparent',
                  color: issueFilter === 'all' ? '#0284c7' : '#64748b',
                  boxShadow: issueFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                All ({complaints.length})
              </button>
              <button
                type="button"
                onClick={() => setIssueFilter('pending')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: issueFilter === 'pending' ? '#ffffff' : 'transparent',
                  color: issueFilter === 'pending' ? '#d97706' : '#64748b',
                  boxShadow: issueFilter === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Pending ({complaints.filter(c => !c.status || c.status.toLowerCase() === 'pending' || c.status.toLowerCase() === 'open').length})
              </button>
              <button
                type="button"
                onClick={() => setIssueFilter('resolved')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: issueFilter === 'resolved' ? '#ffffff' : 'transparent',
                  color: issueFilter === 'resolved' ? '#059669' : '#64748b',
                  boxShadow: issueFilter === 'resolved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Resolved ({complaints.filter(c => c.status?.toLowerCase() === 'resolved').length})
              </button>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <CheckCircle2 size={32} style={{ color: '#059669', margin: '0 auto 0.5rem', opacity: 0.8 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No student issues reported.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {complaints
                .filter(c => {
                  const isPending = !c.status || c.status.toLowerCase() === 'pending' || c.status.toLowerCase() === 'open';
                  const isResolved = c.status?.toLowerCase() === 'resolved';
                  if (issueFilter === 'pending') return isPending;
                  if (issueFilter === 'resolved') return isResolved;
                  return true;
                })
                .map(item => {
                  const isResolved = item.status?.toLowerCase() === 'resolved';
                  const formattedDate = item.createdAtString || (item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently');
                  return (
                    <div key={item.id} className="android-list-card" style={{ borderLeft: `4px solid ${isResolved ? '#059669' : '#f59e0b'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            {item.issueType || item.category || item.subject || 'Student Issue'}
                          </span>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>
                            {item.studentName || 'Student'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Registration ID: <b style={{ color: '#0284c7' }}>{item.studentRoll || item.studentId || 'N/A'}</b>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span className={`badge ${isResolved ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                            {isResolved ? 'Resolved' : 'Pending'}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '2px' }} />
                            {formattedDate}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.82rem',
                        color: '#334155',
                        marginTop: '0.5rem',
                        lineHeight: 1.45
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>
                          Description
                        </div>
                        {item.description || item.message || 'No description provided.'}
                      </div>

                      {item.adminReply && (
                        <div style={{
                          background: '#f0fdf4',
                          borderLeft: '3px solid #059669',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: '#15803d',
                          marginTop: '0.45rem'
                        }}>
                          <b>Official Response:</b> {item.adminReply}
                        </div>
                      )}

                      {/* Action buttons: Update status & Reply */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                        {isResolved ? (
                          <button
                            className="android-touch-btn"
                            onClick={() => handleUpdateIssueStatus(item.id, 'Pending')}
                            style={{
                              flex: 1,
                              background: '#fffbeb',
                              border: '1px solid #fef3c7',
                              color: '#b45309',
                              minHeight: '34px',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} /> Mark as Pending
                          </button>
                        ) : (
                          <button
                            className="android-touch-btn"
                            onClick={() => handleUpdateIssueStatus(item.id, 'Resolved')}
                            style={{
                              flex: 1,
                              background: '#059669',
                              color: '#ffffff',
                              minHeight: '34px',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle2 size={12} /> Mark as Resolved
                          </button>
                        )}

                        <button
                          className="android-touch-btn"
                          onClick={() => {
                            setReplyComplaintId(replyComplaintId === item.id ? null : item.id);
                            setReplyText(item.adminReply || '');
                          }}
                          style={{
                            flex: 1,
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            color: '#0284c7',
                            minHeight: '34px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <MessageSquare size={12} /> {item.adminReply ? 'Edit Response' : 'Respond & Resolve'}
                        </button>
                      </div>

                      {replyComplaintId === item.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.65rem' }}>
                          <textarea
                            className="form-textarea"
                            placeholder="Type official response to student..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            style={{ minHeight: '65px', fontSize: '0.8rem' }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="android-touch-btn"
                              onClick={() => setReplyComplaintId(null)}
                              style={{ flex: 1, background: '#f1f5f9', color: '#475569', minHeight: '32px', fontSize: '0.75rem' }}
                            >
                              Cancel
                            </button>
                            <button
                              className="android-touch-btn"
                              onClick={() => handleResolveComplaint(item.id)}
                              style={{ flex: 2, background: '#0284c7', color: '#ffffff', minHeight: '32px', fontSize: '0.75rem' }}
                            >
                              Submit Response & Resolve
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          5. TAB 4: ROUTE CHANGE REQUESTS
          ========================================== */}
      {activeTab === 'requests' && (
        <div className="android-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Relocation Requests ({selectedChangeRequests.length})
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Route change requests for {selectedBus.fleetNumber}
              </div>
            </div>
          </div>

          {selectedChangeRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <ArrowRightLeft size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No route change requests pending for {selectedBus.fleetNumber}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {selectedChangeRequests.map(req => (
                <div key={req.id} className="android-list-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                      {req.studentName} ({req.studentRoll})
                    </span>
                    <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                      {req.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>From: <b>{req.currentRoute}</b></span>
                    <span>➔</span>
                    <span>To: <b style={{ color: '#059669' }}>{req.requestedRoute}</b></span>
                  </div>

                  {req.reason && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
                      "{req.reason}"
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '0.35rem' }}>
                      <button
                        className="android-touch-btn"
                        onClick={() => handleRequestAction(req.id, 'rejected')}
                        style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', minHeight: '32px', fontSize: '0.75rem' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        className="android-touch-btn"
                        onClick={() => handleRequestAction(req.id, 'approved')}
                        style={{ flex: 2, background: '#16a34a', color: '#ffffff', minHeight: '32px', fontSize: '0.75rem' }}
                      >
                        <CheckCircle2 size={14} /> Approve & Reassign
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          6. TAB 5: NEW USER REGISTRATION
          ========================================== */}
      {activeTab === 'register' && (
        <div className="android-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
            <Plus size={18} style={{ color: '#0284c7' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              New User Registration
            </h3>
          </div>
          {renderRegistrationForm(false)}
        </div>
      )}

      {/* ==========================================
          7. ANDROID BOTTOM NAVIGATION BAR
          ========================================== */}
      <nav className="android-bottom-nav">
        <button
          type="button"
          className={`android-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          id="admin-bottom-nav-overview"
          aria-label="Overview & Map"
        >
          <div className="android-nav-pill">
            <Compass size={20} />
          </div>
          <span className="android-nav-label">Overview</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
          id="admin-bottom-nav-students"
          aria-label="Students"
        >
          <div className="android-nav-pill" style={{ position: 'relative' }}>
            <Users size={20} />
            {selectedPendingStudents.length > 0 && (
              <span className="android-nav-badge">{selectedPendingStudents.length}</span>
            )}
          </div>
          <span className="android-nav-label">Students</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
          id="admin-bottom-nav-issues"
          aria-label="Issues"
        >
          <div className="android-nav-pill" style={{ position: 'relative' }}>
            <MessageSquare size={20} />
            {selectedComplaints.filter(c => c.status === 'pending' || c.status === 'open').length > 0 && (
              <span className="android-nav-badge">{selectedComplaints.filter(c => c.status === 'pending' || c.status === 'open').length}</span>
            )}
          </div>
          <span className="android-nav-label">Issues</span>
        </button>


        <button
          type="button"
          className={`android-nav-item ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('register');
            setRegSuccessMsg('');
            setRegErrorMsg('');
          }}
          id="admin-bottom-nav-register"
          aria-label="Register"
        >
          <div className="android-nav-pill">
            <Plus size={20} />
          </div>
          <span className="android-nav-label">Register</span>
        </button>
      </nav>

      {/* Reusable Registration Modal Popup */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: '#0284c7' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>New Registration</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            {renderRegistrationForm(true)}
          </div>
        </div>
      )}
    </div>
  );
}
