import React, { useEffect, useMemo } from 'react';
import { 
  X, LogOut, User, Bus, MapPin, ShieldCheck, 
  Award, Key, Phone, CheckCircle2, AlertCircle,
  GraduationCap, ArrowRightLeft, Shield
} from 'lucide-react';

export default function ProfileModal({
  isOpen,
  onClose,
  currentRole,
  student,
  driver,
  drivers = [],
  authSession,
  buses = [],
  routes = [],
  onLogout
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open, but keep bottom nav intact
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Resolve Student assigned Bus, Route, Driver, and Telemetry (Identical to Student Tracker page)
  const studentBusInfo = useMemo(() => {
    if (currentRole !== 'student') return null;
    const isBus2 = 
      student?.busId === 'BUS-02' ||
      student?.busId === 'BUS-2' ||
      student?.fleetNumber === 'Bus 2' ||
      student?.bus === 'Bus 2' ||
      student?.routeId === 'R-102' ||
      student?.routeId === 'RT-02';

    const assignedBus = buses.find(b => 
      isBus2 ? (b.id === 'BUS-02' || b.fleetNumber === 'Bus 2') : (b.id === 'BUS-01' || b.fleetNumber === 'Bus 1')
    ) || (isBus2 ? buses[1] : buses[0]) || {
      id: isBus2 ? 'BUS-02' : 'BUS-01',
      fleetNumber: isBus2 ? 'Bus 2' : 'Bus 1',
      busNo: isBus2 ? 'OD-02-AX-2002' : 'OD-02-AX-1001',
      capacity: 50,
      occupied: 0,
      speed: 0,
      status: 'idle'
    };

    const assignedRoute = routes.find(r => 
      isBus2 ? (r.id === 'R-102' || r.code === 'RT-02') : (r.id === 'R-101' || r.code === 'RT-01')
    ) || (isBus2 ? routes[1] : routes[0]) || {
      id: isBus2 ? 'R-102' : 'R-101',
      code: isBus2 ? 'RT-02' : 'RT-01',
      name: isBus2 ? 'BEC College ↔ Patia' : 'BEC College ↔ Baramunda'
    };

    const assignedDriver = isBus2
      ? (drivers.find(d => d.id === 'JITENDRA01' || d.name === 'Jitendra' || d.busId === 'BUS-02') || {
          id: 'JITENDRA01',
          name: 'Jitendra',
          phone: '+916370998587',
          rating: 4.8
        })
      : (drivers.find(d => d.id === 'PRAGNYA01' || d.name === 'Pragnya' || d.busId === 'BUS-01') || {
          id: 'PRAGNYA01',
          name: 'Pragnya',
          phone: '+919040833547',
          rating: 4.9
        });

    const isEnRoute = assignedBus && (assignedBus.status === 'on_trip' || assignedBus.status === 'emergency');
    let movementState = 'not_started';
    let movementLabel = 'Has not started route';
    let movementBadgeBg = '#f1f5f9';
    let movementBadgeColor = '#64748b';
    let movementBadgeBorder = '#cbd5e1';

    if (!isEnRoute) {
      movementState = 'not_started';
      movementLabel = 'Has not started route';
      movementBadgeBg = '#f1f5f9';
      movementBadgeColor = '#64748b';
      movementBadgeBorder = '#cbd5e1';
    } else if (assignedBus.speed && assignedBus.speed > 3) {
      movementState = 'moving';
      movementLabel = `Moving (${assignedBus.speed} km/h)`;
      movementBadgeBg = '#e0f2fe';
      movementBadgeColor = '#0284c7';
      movementBadgeBorder = '#bae6fd';
    } else {
      movementState = 'stopped';
      movementLabel = 'Stopped (0 km/h)';
      movementBadgeBg = '#fef3c7';
      movementBadgeColor = '#b45309';
      movementBadgeBorder = '#fde68a';
    }

    const assignedStop = assignedRoute?.stops?.find(s => s.id === student?.stopId) || assignedRoute?.stops?.[0];

    return { 
      isBus2, 
      assignedBus, 
      assignedRoute, 
      assignedDriver, 
      assignedStop,
      movementState,
      movementLabel,
      movementBadgeBg,
      movementBadgeColor,
      movementBadgeBorder
    };
  }, [currentRole, student, buses, routes, drivers]);

  // Resolve Driver assigned Bus & Route
  const driverBusInfo = useMemo(() => {
    if (currentRole !== 'driver') return null;
    const isBus2 = driver?.id === 'JITENDRA01' || driver?.busId === 'BUS-02';
    
    const bus = buses.find(b => b.id === driver?.busId) || 
      (driver?.id === 'PRAGNYA01' ? buses[0] : buses[1]) || 
      (isBus2 ? buses[1] : buses[0]) || {
        fleetNumber: isBus2 ? 'Bus 2' : 'Bus 1',
        busNo: isBus2 ? 'OD-02-AX-2002' : 'OD-02-AX-1001'
      };

    const route = routes.find(r => r.id === (driver?.routeId || bus?.routeId)) || 
      (isBus2 ? routes[1] : routes[0]) || {
        code: isBus2 ? 'RT-02' : 'RT-01',
        name: isBus2 ? 'BEC College ↔ Patia' : 'BEC College ↔ Baramunda'
      };

    return { bus, route };
  }, [currentRole, driver, buses, routes]);

  if (!isOpen) return null;

  return (
    <>
      {/* Click-outside backdrop overlay (does NOT cover bottom nav because of top clearance and click listener) */}
      <div
        className="profile-modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1050,
          animation: 'fadeIn 0.2s ease-out'
        }}
        aria-hidden="true"
      />

      {/* Profile Panel Popover / Modal */}
      <div
        className="profile-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="User Profile"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '56px',
          right: '12px',
          width: '390px',
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 136px)',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1.5px solid #bae6fd',
          boxShadow: '0 12px 36px rgba(2, 132, 199, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)',
          zIndex: 1060,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Top Header with Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentRole === 'admin' ? <Shield size={16} /> : currentRole === 'driver' ? <Bus size={16} /> : <User size={16} />}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
              {currentRole === 'admin' ? 'Administrator Profile' : currentRole === 'driver' ? 'Driver Profile' : 'Student Profile'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="btn-close-profile-modal"
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            title="Close Profile"
          >
            <X size={18} />
          </button>
        </div>

        {/* =========================================================
            STUDENT PROFILE VIEW
           ========================================================= */}
        {currentRole === 'student' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Student Avatar & Basic Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              padding: '1rem'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.45rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}>
                {student?.name?.charAt(0) || 'S'}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                    {student?.name || 'Enrolled Student'}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                  Roll: <b style={{ color: '#0284c7' }}>{student?.rollNo || student?.id || 'STU-01'}</b>
                </div>
              </div>
            </div>

            {/* Personal Details Card */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0.85rem'
            }}>
              {/* Pass Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#0284c7' }} /> Pass Status
                </span>
                <span className={`badge ${student?.status === 'approved' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.72rem', padding: '3px 10px', fontWeight: 800 }}>
                  {student?.status === 'approved' ? 'Active Pass' : 'Pending Approval'}
                </span>
              </div>

              {/* Department */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={15} style={{ color: '#0284c7' }} /> Department
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                  {student?.department || 'Computer Science & Engineering'}
                </span>
              </div>

              {/* Designated Stop */}
              {studentBusInfo?.assignedStop && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} style={{ color: '#0284c7' }} /> Designated Stop
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    {studentBusInfo.assignedStop.name}
                  </span>
                </div>
              )}
            </div>

            {/* =========================================================
                ASSIGNED FLEET BUS INFORMATION CARD
                (Identical to the Student Tracker page card design & style)
               ========================================================= */}
            <div className="android-card" style={{
              borderLeft: '4px solid #0284c7',
              background: '#ffffff',
              padding: '1rem',
              borderRadius: '16px',
              border: '1px solid #e0f2fe',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)'
            }}>
              {/* Bus Header & Live Movement Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Assigned Fleet Bus
                  </span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                    {studentBusInfo?.assignedBus?.fleetNumber} • {studentBusInfo?.assignedRoute?.code}
                  </h4>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: studentBusInfo?.movementBadgeBg,
                  color: studentBusInfo?.movementBadgeColor,
                  border: `1px solid ${studentBusInfo?.movementBadgeBorder}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {studentBusInfo?.movementState === 'moving' && <span className="pulse-dot online" />}
                  {studentBusInfo?.movementLabel}
                </span>
              </div>

              {/* Driver Box & Touch Call Button */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '0.85rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      flexShrink: 0
                    }}>
                      {studentBusInfo?.assignedDriver?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {studentBusInfo?.assignedDriver?.name}
                      </div>
                      <div style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 700 }}>
                        ★ {studentBusInfo?.assignedDriver?.rating || 4.9} • ID: {studentBusInfo?.assignedDriver?.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>BUS PLATE</div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                      {studentBusInfo?.assignedBus?.busNo}
                    </div>
                  </div>
                </div>

                {/* Touch Call Driver Button (min 44px height) */}
                <a
                  href={`tel:${(studentBusInfo?.assignedDriver?.phone || (studentBusInfo?.isBus2 ? '+916370998587' : '+919040833547')).replace(/\s+/g, '')}`}
                  className="android-touch-btn"
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                    minHeight: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                  id="btn-profile-call-driver"
                  title={`Call ${studentBusInfo?.assignedDriver?.name}`}
                >
                  <Phone size={15} /> Call Driver ({studentBusInfo?.assignedDriver?.name})
                </a>
              </div>

              {/* Status chips: Speed, Capacity, Route */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap', gap: '4px' }}>
                <span>Speed: <b style={{ color: '#0284c7' }}>{studentBusInfo?.assignedBus?.speed || 0} km/h</b></span>
                <span>Capacity: <b style={{ color: '#0f172a' }}>{studentBusInfo?.assignedBus?.occupied || 0}/{studentBusInfo?.assignedBus?.capacity || 50}</b></span>
                <span>Route: <b style={{ color: '#0f172a' }}>{studentBusInfo?.assignedRoute?.name}</b></span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            DRIVER PROFILE VIEW
           ========================================================= */}
        {currentRole === 'driver' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Driver Avatar & Basic Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              padding: '1rem'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.45rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}>
                {driver?.name?.charAt(0) || 'D'}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                  {driver?.name || 'Fleet Driver'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                  Driver ID: <b style={{ color: '#0284c7' }}>{driver?.id || driver?.driverId || 'PRAGNYA01'}</b>
                </div>
              </div>
            </div>

            {/* Detailed Properties Card */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0.85rem'
            }}>
              {/* Driver ID */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#0284c7' }} /> Driver ID
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7' }}>
                  {driver?.id || driver?.driverId || 'PRAGNYA01'}
                </span>
              </div>

              {/* Driver Rating */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={15} style={{ color: '#d97706' }} /> Driver Rating
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b45309', background: '#fffbeb', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                  ★ {driver?.rating || (driver?.id === 'PRAGNYA01' ? 4.9 : 4.8)} / 5.0
                </span>
              </div>

              {/* Assigned Bus */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bus size={15} style={{ color: '#0284c7' }} /> Assigned Bus
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                  {driverBusInfo?.bus?.fleetNumber || (driver?.id === 'PRAGNYA01' ? 'Bus 1' : 'Bus 2')}
                </span>
              </div>

              {/* Bus Plate Number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={15} style={{ color: '#0284c7' }} /> Bus Plate Number
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', letterSpacing: '0.5px' }}>
                  {driverBusInfo?.bus?.busNo || (driver?.id === 'PRAGNYA01' ? 'OD-02-AX-1001' : 'OD-02-AX-2002')}
                </span>
              </div>

              {/* Assigned Route */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRightLeft size={15} style={{ color: '#0284c7', flexShrink: 0 }} /> Assigned Route
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', textAlign: 'right', maxWidth: '200px' }}>
                  {driverBusInfo?.route?.code} ({driverBusInfo?.route?.name})
                </span>
              </div>

              {/* Driver Phone & License */}
              {driver?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={15} style={{ color: '#0284c7' }} /> Contact Phone
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    {driver.phone}
                  </span>
                </div>
              )}

              {/* Driving License */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#059669' }} /> License Auth
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  {driver?.licenseNo || driver?.licenseNumber || 'OD-02-2016-DL8812'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ADMIN PROFILE VIEW
           ========================================================= */}
        {currentRole === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Admin Avatar & Basic Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '1rem'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #16a34a)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.45rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}>
                <ShieldCheck size={26} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                  {authSession?.user?.name || 'Transport Admin'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                  System Administrator (Central Command)
                </div>
              </div>
            </div>

            {/* Detailed Properties Card */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0.85rem'
            }}>
              {/* Admin ID */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#16a34a' }} /> Admin Identifier
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d' }}>
                  ADMIN-01
                </span>
              </div>

              {/* Institution */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={15} style={{ color: '#0284c7' }} /> Institution
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                  Bhubaneswar Eng. College
                </span>
              </div>

              {/* Fleet Oversight */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bus size={15} style={{ color: '#0284c7' }} /> Supervised Fleet
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', background: '#f0f9ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                  2 Buses Fleet Live
                </span>
              </div>

              {/* Corridors */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRightLeft size={15} style={{ color: '#0284c7' }} /> Corridors
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>
                  RT-01 (Baramunda) & RT-02 (Patia)
                </span>
              </div>

              {/* Transport Helpline */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} style={{ color: '#0284c7' }} /> Helpline
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                  +91 674 246 8000
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            UNIVERSAL LOGOUT ACTION BUTTON
           ========================================================= */}
        {onLogout && (
          <div style={{ marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              id="btn-profile-logout"
              style={{
                width: '100%',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              <LogOut size={16} /> Sign Out of BEC Transit
            </button>
          </div>
        )}
      </div>
    </>
  );
}
