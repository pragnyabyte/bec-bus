import React, { useState } from 'react';
import { 
  Bus, User, Shield, Compass, Bell, Radio, 
  AlertTriangle, ShieldAlert, X, Check,
  LogOut
} from 'lucide-react';

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
  onOpenRegisterModal,
  onOpenAuthModal,
  onLogout
}) {
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const emergencyBus = buses.find(b => b.status === 'emergency');

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
          gap: '0.5rem'
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

          {/* Authenticated Portal Badge (Read-only, non-clickable) */}
          <div className="desktop-only-text" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.4rem 1rem',
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

          {/* Right Controls: Active Driver console switcher, Notification Bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
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
                <span style={{ color: '#0369a1', fontSize: '0.75rem', fontWeight: 700 }}>Active Driver:</span>
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
                    maxWidth: '220px'
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

            {/* Notification Bell */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              style={{ position: 'relative', padding: '0.45rem 0.65rem', background: '#ffffff', borderColor: '#cbd5e1' }}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 6px rgba(220, 38, 38, 0.5)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Universal Logout Button in Navbar */}
            {onLogout && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onLogout}
                id="nav-btn-logout"
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
                title="Log out and return to Login screen"
              >
                <LogOut size={15} /> Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notification Drawer */}
      {showNotifDrawer && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          width: '360px',
          maxHeight: '480px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Recent Transport Notifications</span>
            <button onClick={() => setShowNotifDrawer(false)} style={{ background: 'transparent', color: '#64748b' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No notifications right now.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: n.type === 'emergency' ? '#fef2f2' : n.type === 'delay' ? '#fffbeb' : '#f0f9ff',
                  border: `1px solid ${n.type === 'emergency' ? '#fecaca' : n.type === 'delay' ? '#fde68a' : '#bae6fd'}`
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '2px' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{n.message}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>{n.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
