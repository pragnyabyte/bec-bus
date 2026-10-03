import React, { useState, useMemo } from 'react';
import { 
  Bus, User, Shield, Compass, 
  ShieldAlert
} from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function Navbar({
  currentRole,
  onRoleChange,
  students = [],
  currentStudent,
  onStudentChange,
  drivers = [],
  currentDriver,
  onDriverChange,
  notifications = [],
  buses = [],
  routes = [],
  authSession,
  driverTripDirection = 'morning',
  onDriverTripDirectionChange,
  onDataRefresh,
  onOpenRegisterModal,
  onOpenAuthModal,
  onLogout
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const emergencyBus = buses.find(b => b.status === 'emergency');

  const userInitial = useMemo(() => {
    if (currentRole === 'student') {
      return currentStudent?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';
    }
    if (currentRole === 'driver') {
      return currentDriver?.name?.trim()?.charAt(0)?.toUpperCase() || 'D';
    }
    if (currentRole === 'admin') {
      return (authSession?.user?.name || 'Admin').trim().charAt(0).toUpperCase() || 'A';
    }
    return 'U';
  }, [currentRole, currentStudent, currentDriver, authSession]);

  const userDisplayName = useMemo(() => {
    if (currentRole === 'student') return currentStudent?.name || 'Student';
    if (currentRole === 'driver') return currentDriver?.name || 'Driver';
    if (currentRole === 'admin') return authSession?.user?.name || 'Admin';
    return 'User';
  }, [currentRole, currentStudent, currentDriver, authSession]);

  return (
    <>
      {/* Topmost Critical SOS Emergency Alert if any bus has triggered SOS */}
      {emergencyBus && (
        <div style={{
          background: 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)',
          color: '#ffffff',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          fontWeight: 800,
          fontSize: '0.9rem',
          letterSpacing: '0.5px',
          animation: 'emergency-throb 1s infinite alternate',
          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
          zIndex: 1100
        }}>
          <ShieldAlert size={20} />
          <span>🚨 PRIORITY ALERT: {emergencyBus.fleetNumber} ({emergencyBus.busNo}) has activated EMERGENCY SOS! Transport security alerted.</span>
        </div>
      )}

      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e0f2fe',
        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 900,
        padding: '0.5rem 1rem'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              flexShrink: 0
            }}>
              <Bus size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2 }}>
                BEC Transit
                <span className="desktop-only-text" style={{ fontSize: '0.65rem', padding: '2px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '4px', border: '1px solid #bae6fd', textTransform: 'uppercase', fontWeight: 800 }}>
                  2 Buses Fleet
                </span>
              </div>
              <div className="desktop-only-text" style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Bhubaneswar Engineering College • Live Bus Telemetry
              </div>
            </div>
          </div>

          {/* Right Section: Active Driver switcher (Driver view), Role Status Badge & ONE Profile Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'nowrap' }}>
            {/* Active Driver Switcher when on Driver */}
            {currentRole === 'driver' && drivers.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: 'var(--radius-md)',
                padding: '0.3rem 0.65rem',
                fontSize: '0.8rem'
              }}>
                <Compass size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
                <span className="desktop-only-text" style={{ color: '#0369a1', fontSize: '0.75rem', fontWeight: 700 }}>Active Driver:</span>
                <select
                  value={currentDriver?.id || ''}
                  onChange={e => onDriverChange && onDriverChange(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '160px'
                  }}
                  title="Switch driver console"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id} • {d.busName || (d.id === 'PRAGNYA01' ? 'Bus 1' : 'Bus 2')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Authenticated Portal Badge (Read-only, desktop only) */}
            <div className="desktop-only-text" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.4rem 0.9rem',
              background: currentRole === 'admin' ? '#f0fdf4' : currentRole === 'driver' ? '#f0f9ff' : '#eff6ff',
              border: `1.5px solid ${currentRole === 'admin' ? '#bbf7d0' : currentRole === 'driver' ? '#bae6fd' : '#bfdbfe'}`,
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: currentRole === 'admin' ? '#15803d' : currentRole === 'driver' ? '#0369a1' : '#1d4ed8'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentRole === 'admin' ? '#16a34a' : currentRole === 'driver' ? '#0284c7' : '#2563eb',
                boxShadow: `0 0 6px ${currentRole === 'admin' ? 'rgba(22, 163, 74, 0.6)' : currentRole === 'driver' ? 'rgba(2, 132, 199, 0.6)' : 'rgba(37, 99, 235, 0.6)'}`
              }} />
              {currentRole === 'admin' && <><Shield size={14} /> Admin Console</>}
              {currentRole === 'driver' && <><Compass size={14} /> Driver Console</>}
              {currentRole === 'student' && <><User size={14} /> Student Portal</>}
            </div>

            {/* ONE Profile Icon in the TOP-RIGHT corner of the application header */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(prev => !prev)}
              id="header-profile-btn"
              aria-label="User Profile"
              title={`View ${userDisplayName} Profile`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: currentRole === 'admin' 
                  ? 'linear-gradient(135deg, #0284c7, #16a34a)' 
                  : 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                border: isProfileOpen ? '2px solid #0284c7' : '2px solid #ffffff',
                boxShadow: isProfileOpen 
                  ? '0 0 0 3px rgba(2, 132, 199, 0.35), 0 2px 8px rgba(2, 132, 199, 0.3)' 
                  : '0 2px 8px rgba(2, 132, 199, 0.25)',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {userInitial}
              {/* Online indicator dot */}
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
                boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)'
              }} />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Dropdown / Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentRole={currentRole}
        student={currentStudent}
        driver={currentDriver}
        drivers={drivers}
        students={students}
        authSession={authSession}
        buses={buses}
        routes={routes}
        driverTripDirection={driverTripDirection}
        onDriverTripDirectionChange={onDriverTripDirectionChange}
        onDataRefresh={onDataRefresh}
        onLogout={onLogout}
      />
    </>
  );
}

