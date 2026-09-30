import React, { useState, useMemo } from 'react';
import { 
  Bus, Users, MapPin, AlertCircle, ShieldAlert, CheckCircle2, 
  XCircle, Plus, BarChart3, Settings, 
  FileText, Activity, Compass, ArrowRightLeft, MessageSquare,
  Phone, ShieldCheck, Edit3, Trash2, LogOut, Clock, Navigation
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

  // Navigation tab inside selected bus dashboard
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'routes' | 'approvals' | 'complaints' | 'requests' | 'analytics'
  const [statusMsg, setStatusMsg] = useState('');

  // Complaint Reply State
  const [replyComplaintId, setReplyComplaintId] = useState(null);
  const [replyText, setReplyText] = useState('');

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

  // Handle Complaint Reply
  const handleResolveComplaint = async (id) => {
    if (!replyText.trim()) return;
    try {
      await api.replyComplaint(id, { adminReply: replyText, status: 'resolved' });
      setReplyComplaintId(null);
      setReplyText('');
      setStatusMsg('Official response recorded and complaint resolved.');
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Admin Title & Logout Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800 }}>Admin Console</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Campus Fleet & Transit Central Command Center</p>
        </div>
        {onLogout && (
          <button
            className="btn btn-outline btn-sm"
            onClick={onLogout}
            id="btn-admin-logout"
            style={{
              borderColor: '#fca5a5',
              color: '#dc2626',
              background: '#fef2f2',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Log out and return to Admin Sign In"
          >
            <LogOut size={15} /> Logout
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. BUS SELECTION CONTROL (TOP OF ADMIN PAGE) */}
      {/* ======================================================== */}
      <div className="glass-card" style={{
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
        border: '1.5px solid #bae6fd',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
        boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#0284c7',
              marginBottom: '4px'
            }}>
              Select Bus
            </div>
            <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
              {selectedBusId === 'BUS-01' ? 'Bus 1 – Pragnya' : 'Bus 2 – Jitendra'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.825rem', margin: '2px 0 0 0' }}>
              Showing isolated transit telemetry, driver records, route schedule, and student attendance for this bus only.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Bus 1 – Pragnya Option */}
            <button
              onClick={() => setSelectedBusId('BUS-01')}
              id="admin-select-bus-1"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selectedBusId === 'BUS-01' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                background: selectedBusId === 'BUS-01' ? '#0284c7' : '#ffffff',
                color: selectedBusId === 'BUS-01' ? '#ffffff' : '#334155',
                boxShadow: selectedBusId === 'BUS-01' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <Bus size={18} /> Bus 1 – Pragnya
            </button>

            {/* Bus 2 – Jitendra Option */}
            <button
              onClick={() => setSelectedBusId('BUS-02')}
              id="admin-select-bus-2"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selectedBusId === 'BUS-02' ? '2px solid #7c3aed' : '1.5px solid #cbd5e1',
                background: selectedBusId === 'BUS-02' ? '#7c3aed' : '#ffffff',
                color: selectedBusId === 'BUS-02' ? '#ffffff' : '#334155',
                boxShadow: selectedBusId === 'BUS-02' ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none'
              }}
            >
              <Bus size={18} /> Bus 2 – Jitendra
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3 & 4. SELECTED BUS COMPREHENSIVE OVERVIEW STRIP */}
      {/* ======================================================== */}
      <div className="glass-card" style={{
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
        borderLeft: selectedBusId === 'BUS-01' ? '4px solid #0284c7' : '4px solid #7c3aed',
        background: '#ffffff'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Card 1: Live Status & Location */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              {selectedBus.fleetNumber} • Live Telemetry
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: trackingInfo.movementBadgeBg,
                color: trackingInfo.movementBadgeColor,
                border: `1px solid ${trackingInfo.movementBadgeBorder}`
              }}>
                <span className={`pulse-dot ${trackingInfo.movementState === 'moving' ? 'online' : trackingInfo.movementState === 'stopped' ? 'amber' : ''}`} />
                {trackingInfo.movementLabel}
              </span>
              <span className={`badge ${selectedBus.status === 'on_trip' ? 'badge-green' : selectedBus.status === 'emergency' ? 'badge-red' : 'badge-blue'}`}>
                {selectedBus.status.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} style={{ color: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed', flexShrink: 0 }} />
              <span>{trackingInfo.locationText}</span>
            </div>
            {trackingInfo.nextStop && (
              <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                ➔ Next Stop: <b>{trackingInfo.nextStop.name}</b> {trackingInfo.etaMinutes ? `(~${trackingInfo.etaMinutes} mins)` : ''}
              </div>
            )}
          </div>

          {/* Card 2: Driver & Contact */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              {selectedBus.fleetNumber} Driver
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: selectedBusId === 'BUS-01' ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: '#ffffff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}>
                {selectedDriver.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{selectedDriver.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>ID: {selectedDriver.id}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>{selectedDriver.phone}</span>
              <a
                href={`tel:${selectedDriver.phone.replace(/\s+/g, '')}`}
                className="btn btn-sm"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  textDecoration: 'none'
                }}
                title={`Call ${selectedDriver.name}`}
              >
                <Phone size={12} /> Call
              </a>
            </div>
          </div>

          {/* Card 3: Route & Schedule Summary */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Assigned Route & Schedule
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px' }}>
              {selectedRoute?.code}: {selectedRoute?.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {selectedRoute?.distanceKm} km • ~{selectedRoute?.totalDurationMin} mins • {selectedRoute?.stops?.length || 0} stops
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginTop: '4px' }}>
              First Pickup: <b>{selectedRoute?.stops?.[0]?.morningTime || '07:30 AM'}</b> • Final Drop: <b>{selectedRoute?.stops?.[selectedRoute?.stops?.length - 1]?.eveningTime || '04:40 PM'}</b>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BUS LIVE TRACKER SECTION */}
      {/* ======================================================== */}
      <div className="glass-card" style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        border: '1.5px solid #bae6fd',
        boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={22} style={{ color: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed' }} />
                Bus Live Tracker
              </h3>
              <span style={{
                background: selectedBusId === 'BUS-01' ? '#e0f2fe' : '#f3e8ff',
                color: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed',
                border: `1.5px solid ${selectedBusId === 'BUS-01' ? '#bae6fd' : '#ddd6fe'}`,
                padding: '2px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 800
              }}>
                {selectedBus.fleetNumber}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Live telemetry, transit corridor, and location tracking for {selectedBus.fleetNumber}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 800,
              background: trackingInfo.movementBadgeBg,
              color: trackingInfo.movementBadgeColor,
              border: `1px solid ${trackingInfo.movementBadgeBorder}`
            }}>
              <span className={`pulse-dot ${trackingInfo.movementState === 'moving' ? 'online' : trackingInfo.movementState === 'stopped' ? 'amber' : ''}`} />
              {trackingInfo.movementLabel}
            </span>
            <span className="badge badge-blue">
              {selectedBus.busNo}
            </span>
          </div>
        </div>

        {/* Live Tracking Information Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {/* 1. Bus Name & Plate */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>BUS</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>
              {selectedBus.fleetNumber}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{selectedBus.busNo}</div>
          </div>

          {/* 2. Current Location */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>CURRENT LOCATION</div>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0284c7', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={trackingInfo.locationText}>
              {trackingInfo.locationText}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {selectedBus.currentLat && selectedBus.currentLng ? `${selectedBus.currentLat.toFixed(4)}, ${selectedBus.currentLng.toFixed(4)}` : 'Campus Route'}
            </div>
          </div>

          {/* 3. Current Speed */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>CURRENT SPEED</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginTop: '2px' }}>
              {selectedBus.speed || 0} km/h
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
              {selectedBus.status === 'on_trip' ? 'En Route' : selectedBus.status}
            </div>
          </div>

          {/* 4. Current Route */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>CURRENT ROUTE</div>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedRoute ? `${selectedRoute.code}: ${selectedRoute.name}` : ''}>
              {selectedRoute ? `${selectedRoute.code}: ${selectedRoute.name}` : 'Transit Corridor'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {selectedRoute?.distanceKm} km • ~{selectedRoute?.totalDurationMin} mins
            </div>
          </div>

          {/* 5. Next Stop */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>NEXT STOP</div>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#059669', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {trackingInfo.nextStop ? trackingInfo.nextStop.name : 'BEC College Campus'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Stop #{trackingInfo.nextStop?.sequence || 1}
            </div>
          </div>

          {/* 6. Estimated Arrival / Time */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ESTIMATED ARRIVAL</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0284c7', marginTop: '2px' }}>
              {trackingInfo.etaMinutes ? `~${trackingInfo.etaMinutes} mins` : (trackingInfo.isLiveAvailable ? 'Approaching' : 'Scheduled')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>to next designated stop</div>
          </div>
        </div>

        {/* Live Map Area (Reusing existing LiveMap component) */}
        <LiveMap
          routes={selectedRoute ? [selectedRoute] : []}
          buses={selectedBus ? [selectedBus] : []}
          highlightBusId={selectedBus.id}
          height="480px"
        />
      </div>

      {statusMsg && (
        <div style={{
          padding: '0.75rem 1.25rem',
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          color: '#15803d',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} /> {statusMsg}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          <Bus size={16} /> Driver & Vehicle ({selectedDriver.name})
        </button>
        <button
          className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <MapPin size={16} /> Route & Timetable ({selectedRoute?.code})
        </button>
        <button
          className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          <Users size={16} /> Students & Attendance ({selectedStudents.length})
          {selectedPendingStudents.length > 0 && (
            <span className="badge badge-amber" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem', marginLeft: '4px' }}>
              {selectedPendingStudents.length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          <MessageSquare size={16} /> Complaints ({selectedComplaints.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <ArrowRightLeft size={16} /> Route Changes ({selectedChangeRequests.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} /> Reports & Analytics
        </button>
      </div>

      {/* TAB 2: DRIVER & VEHICLE DETAILS FOR SELECTED BUS */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Selected Bus Vehicle Record */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>{selectedBus.fleetNumber} Fleet Specifications</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Authorized campus vehicle details for {selectedBus.fleetNumber}</p>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#e0f2fe',
                border: '1.5px solid #bae6fd',
                color: '#0284c7',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 800,
                fontSize: '0.8rem'
              }}>
                <ShieldCheck size={16} /> Active Authorized Vehicle
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem' }}>Fleet #</th>
                    <th style={{ padding: '0.75rem' }}>License Plate</th>
                    <th style={{ padding: '0.75rem' }}>Assigned Driver & ID</th>
                    <th style={{ padding: '0.75rem' }}>Driver Contact & Call</th>
                    <th style={{ padding: '0.75rem' }}>Assigned Route</th>
                    <th style={{ padding: '0.75rem' }}>Occupancy</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Bus size={15} style={{ color: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed' }} />
                        {selectedBus.fleetNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#334155', fontWeight: 600 }}>{selectedBus.busNo}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedDriver.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>ID: {selectedDriver.id}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600 }}>
                          {selectedDriver.phone}
                        </span>
                        <a
                          href={`tel:${selectedDriver.phone.replace(/\s+/g, '')}`}
                          className="btn btn-sm"
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            textDecoration: 'none'
                          }}
                          title={`Call ${selectedDriver.name}`}
                        >
                          <Phone size={12} /> Call
                        </a>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#0f172a' }}>
                      <span style={{ fontWeight: 600 }}>{selectedRoute ? selectedRoute.name : 'BEC College Transit'}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#0f172a' }}>
                      <b>{selectedBus.occupied}</b> / {selectedBus.capacity} seats
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${selectedBus.status === 'on_trip' ? 'badge-green' : selectedBus.status === 'emergency' ? 'badge-red' : 'badge-blue'}`}>
                        {selectedBus.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={async () => {
                          const nextStatus = selectedBus.status === 'maintenance' ? 'available' : 'maintenance';
                          await api.updateBus(selectedBus.id, { status: nextStatus });
                          if (onDataRefresh) onDataRefresh();
                        }}
                      >
                        Toggle Maintenance
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Driver Profile Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>{selectedBus.fleetNumber} Assigned Driver Profile</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Official campus transit personnel assigned exclusively to {selectedBus.fleetNumber}</p>
              </div>
            </div>

            <div style={{ maxWidth: '580px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: selectedBusId === 'BUS-01' ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: 'white',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
                    flexShrink: 0
                  }}>
                    {selectedDriver.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>{selectedDriver.name}</span>
                      <span style={{ fontSize: '0.725rem', padding: '2px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 800 }}>
                        ID: {selectedDriver.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Experience: <b style={{ color: '#0f172a' }}>{selectedDriver.experienceYears || 2} Years Exp</b> • License: <b style={{ color: '#334155' }}>{selectedDriver.licenseNo}</b> • ★ {selectedDriver.rating}
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Active Driver</span>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #bae6fd',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '0.825rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Assigned Bus:</span>
                    <b style={{ color: '#0284c7' }}>{selectedBus.fleetNumber} ({selectedBus.busNo})</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Assigned Corridor:</span>
                    <b style={{ color: '#0f172a' }}>{selectedRoute?.code}: {selectedRoute?.name}</b>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>DIRECT CONTACT NUMBER</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{selectedDriver.phone}</div>
                  </div>
                  <a
                    href={`tel:${selectedDriver.phone.replace(/\s+/g, '')}`}
                    className="btn btn-sm"
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                    }}
                    title={`Open dialer to call ${selectedDriver.name} at ${selectedDriver.phone}`}
                  >
                    <Phone size={14} /> Call Driver
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTE & TIMETABLE FOR SELECTED BUS */}
      {activeTab === 'routes' && selectedRoute && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedRoute.color || '#0284c7' }} />
                  <h4 style={{ fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>{selectedRoute.code}: {selectedRoute.name}</h4>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                  From: <b>{selectedRoute.startPoint}</b> → College Campus: <b>{selectedRoute.endPoint}</b> ({selectedRoute.distanceKm} km • ~{selectedRoute.totalDurationMin} mins)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-blue">
                  {selectedStudents.length} Students Assigned
                </span>
                <span className="badge badge-green">
                  {selectedBus.fleetNumber} Only
                </span>
              </div>
            </div>

            {/* Timetable Header */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0369a1'
            }}>
              <Clock size={16} /> <b>Official Daily Timetable:</b> Morning pick-up route to BEC College and Evening return drop schedule
            </div>

            {/* Stops Sequence and Timetable */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem'
            }}>
              {selectedRoute.stops.map((stop, idx) => (
                <div key={stop.id} style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stop.name}
                    </div>
                  </div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    fontWeight: 700,
                    marginBottom: '4px'
                  }}>
                    🌅 Pickup: {stop.morningTime}
                  </div>
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    color: '#991b1b',
                    fontWeight: 700
                  }}>
                    🌆 Drop: {stop.eveningTime}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STUDENTS ASSIGNED & ATTENDANCE FOR SELECTED BUS */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pending Registrations for this bus only */}
          {selectedPendingStudents.length > 0 && (
            <div className="glass-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
                Pending Student Approvals for {selectedBus.fleetNumber} ({selectedPendingStudents.length})
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Review and authorize student passes assigned to {selectedBus.fleetNumber}.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedPendingStudents.map(student => (
                  <div key={student.id} style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{student.name}</span>
                        <span className="badge badge-amber">Pending Approval</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                        Roll No: <b style={{ color: '#0284c7' }}>{student.rollNo}</b> • Dept: {student.department} ({student.year}) • Phone: {student.phone}
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                        Corridor: <b>{selectedRoute?.name}</b>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleStudentApproval(student.id, 'rejected')}
                        style={{ color: '#dc2626' }}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleStudentApproval(student.id, 'approved')}
                      >
                        <CheckCircle2 size={15} /> Approve & Issue Pass
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Students & Attendance for this bus only */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                  {selectedBus.fleetNumber} Assigned Students & Attendance ({selectedStudents.length})
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Active student registry and live daily boarding attendance exclusively for {selectedBus.fleetNumber} ({selectedRoute?.name})
                </p>
              </div>
              <div style={{
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}>
                ✓ {selectedStudents.filter(s => s.boardedToday).length} / {selectedStudents.length} Boarded Today
              </div>
            </div>

            {selectedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No students currently registered for {selectedBus.fleetNumber}.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: '0.75rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem' }}>Roll No</th>
                      <th style={{ padding: '0.75rem' }}>Department</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Stop</th>
                      <th style={{ padding: '0.75rem' }}>Pass Status</th>
                      <th style={{ padding: '0.75rem' }}>Today's Boarding</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudents.map(s => {
                      const st = selectedRoute?.stops?.find(sp => sp.id === s.stopId);
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                          <td style={{ padding: '0.75rem', color: '#0284c7', fontWeight: 700 }}>{s.rollNo}</td>
                          <td style={{ padding: '0.75rem', color: '#475569' }}>{s.department} ({s.year || 'Student'})</td>
                          <td style={{ padding: '0.75rem', color: '#b45309', fontWeight: 600 }}>{st ? st.name : (s.stopName || 'Assigned Stop')}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className={`badge ${s.status === 'approved' ? 'badge-green' : 'badge-amber'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {s.boardedToday ? (
                              <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={14} /> {s.boardedTime || 'Boarded'}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Not Boarded</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => onOpenAuthModal && onOpenAuthModal('update', s)}
                                className="btn btn-outline btn-sm"
                                style={{ 
                                  padding: '0.25rem 0.6rem', 
                                  fontSize: '0.75rem', 
                                  borderColor: '#10b981', 
                                  color: '#059669', 
                                  background: '#ecfdf5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 700
                                }}
                                title="Edit and update user in MongoDB Atlas"
                              >
                                <Edit3 size={13} /> Edit User
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s)}
                                className="btn btn-outline btn-sm btn-delete-student"
                                style={{ 
                                  padding: '0.25rem 0.6rem', 
                                  fontSize: '0.75rem', 
                                  borderColor: '#ef4444', 
                                  color: '#dc2626', 
                                  background: '#fef2f2',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 700
                                }}
                                title="Delete student and revoke pass from database"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINTS FOR SELECTED BUS */}
      {activeTab === 'complaints' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            {selectedBus.fleetNumber} Grievances & Issue Reports ({selectedComplaints.length})
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Review reported issues specifically concerning {selectedBus.fleetNumber}, Driver {selectedDriver.name}, or {selectedRoute?.name}.
          </p>

          {selectedComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <CheckCircle2 size={36} style={{ color: '#059669', margin: '0 auto 0.5rem', opacity: 0.8 }} />
              <p>No complaints reported for {selectedBus.fleetNumber}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedComplaints.map(item => (
                <div key={item.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        From: <b style={{ color: '#0f172a' }}>{item.studentName}</b> ({item.studentRoll})
                      </span>
                    </div>
                    <span className={`badge ${item.status === 'resolved' ? 'badge-green' : item.status === 'in_review' ? 'badge-amber' : 'badge-red'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    {item.subject}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
                    {item.message}
                  </div>

                  {item.adminReply ? (
                    <div style={{
                      background: '#f0fdf4',
                      borderLeft: '3px solid #059669',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: '#15803d'
                    }}>
                      <b style={{ color: '#166534' }}>Official Admin Response:</b> {item.adminReply}
                    </div>
                  ) : (
                    <div>
                      {replyComplaintId === item.id ? (
                        <div style={{ marginTop: '0.75rem' }}>
                          <textarea
                            className="form-textarea"
                            placeholder="Type official response / action taken..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setReplyComplaintId(null)}>
                              Cancel
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleResolveComplaint(item.id)}>
                              Submit Response & Resolve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => { setReplyComplaintId(item.id); setReplyText(''); }}
                        >
                          Reply & Resolve Complaint
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ROUTE CHANGES FOR SELECTED BUS */}
      {activeTab === 'requests' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            {selectedBus.fleetNumber} Route Relocation Requests ({selectedChangeRequests.length})
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Process student requests involving {selectedBus.fleetNumber} transit corridor ({selectedRoute?.name}).
          </p>

          {selectedChangeRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <ArrowRightLeft size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p>No route change requests pending for {selectedBus.fleetNumber}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedChangeRequests.map(req => (
                <div key={req.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{req.studentName}</span>
                      <span style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: 600 }}>({req.studentRoll})</span>
                      <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                        {req.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>From: <b style={{ color: '#0f172a' }}>{req.currentRoute}</b> ({req.currentStop})</span>
                      <span style={{ color: '#0284c7' }}>➔</span>
                      <span style={{ color: '#64748b' }}>To: <b style={{ color: '#059669' }}>{req.requestedRoute}</b> ({req.requestedStop})</span>
                    </div>

                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                      Reason: <i>"{req.reason}"</i>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRequestAction(req.id, 'rejected')}
                        style={{ color: '#dc2626' }}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleRequestAction(req.id, 'approved')}
                      >
                        <CheckCircle2 size={15} /> Approve & Reassign
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: REPORTS & ANALYTICS FOR SELECTED BUS */}
      {activeTab === 'analytics' && selectedRoute && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a' }}>
              {selectedBus.fleetNumber} Capacity & Utilization
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const count = selectedStudents.length;
                const capacity = selectedBus.capacity || 45;
                const percent = Math.min(100, Math.round((count / capacity) * 100));
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedRoute.name} ({selectedRoute.code})</span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>{count} / {capacity} seats ({percent}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: selectedBusId === 'BUS-01' ? '#0284c7' : '#7c3aed', borderRadius: '9999px' }} />
                    </div>
                  </div>
                );
              })()}

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.825rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vehicle Status:</span>
                  <b style={{ color: '#0f172a' }}>{selectedBus.status}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Occupied Seats:</span>
                  <b style={{ color: '#0284c7' }}>{selectedBus.occupied || selectedStudents.length} / {selectedBus.capacity || 45}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Today's Attendance:</span>
                  <b style={{ color: '#059669' }}>{selectedStudents.filter(s => s.boardedToday).length} Boarded</b>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a' }}>
              Driver Safety & On-Time Performance ({selectedDriver.name})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{selectedDriver.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                    {selectedDriver.experienceYears || 2} Years Experience • License: {selectedDriver.licenseNo}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#d97706', fontSize: '1rem' }}>★ {selectedDriver.rating}</div>
                  <div style={{ fontSize: '0.725rem', color: '#059669', fontWeight: 700 }}>98.6% On-Time Record</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
