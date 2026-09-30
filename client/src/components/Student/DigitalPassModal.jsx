import React, { useEffect } from 'react';
import { QrCode, X, CheckCircle, ShieldCheck, Phone, Bus } from 'lucide-react';

export default function DigitalPassModal({ student, route, stop, bus, driver, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!student) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: '4px', border: 'none' }}
          title="Close Pass"
        >
          <X size={22} />
        </button>

        {/* Card Header */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#e0f2fe', borderRadius: '9999px', color: '#0284c7', fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', border: '1px solid #bae6fd' }}>
          <ShieldCheck size={14} /> OFFICIAL CAMPUS BUS PASS • 2024-25
        </div>

        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', color: '#0f172a' }}>BEC College Transit</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Present this QR token to driver when boarding</p>

        {/* Pass Graphic Card */}
        <div style={{
          background: 'linear-gradient(145deg, #f0f9ff, #e0f2fe)',
          border: '1.5px solid #bae6fd',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle accent glow */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Student Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', marginBottom: '1.25rem', borderBottom: '1px solid #bae6fd', paddingBottom: '1rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)'
            }}>
              {student.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{student.name}</div>
              <div style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: 700 }}>{student.rollNo}</div>
              <div style={{ color: '#475569', fontSize: '0.75rem' }}>{student.department} • {student.year}</div>
            </div>
          </div>

          {/* Route & Stop Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            textAlign: 'left',
            background: '#ffffff',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            border: '1px solid #bae6fd',
            boxShadow: '0 1px 4px rgba(2, 132, 199, 0.06)'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Route</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{route ? route.code : 'RT-01'}</div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>{route ? route.name : 'North Express'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Boarding Stop</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>{stop ? stop.name : 'Main Stop'}</div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>Time: {stop ? stop.morningTime : '08:00 AM'}</div>
            </div>
          </div>

          {/* Driver Details & Quick Call Dialer */}
          {driver && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              border: '1px solid #bae6fd',
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.06)',
              textAlign: 'left',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assigned Driver ({bus?.fleetNumber || 'Bus'})
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  {driver.name} <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>({driver.id})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  {driver.phone || (driver?.id === 'PRAGNYA01' || bus?.id === 'BUS-01' ? '+919040833547' : '+916370998587')}
                </div>
              </div>
              <a
                href={`tel:${(driver.phone || (driver?.id === 'PRAGNYA01' || bus?.id === 'BUS-01' ? '+919040833547' : '+916370998587')).replace(/\s+/g, '')}`}
                className="btn btn-sm"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none'
                }}
                title={`Call Driver ${driver.name}`}
              >
                <Phone size={13} /> Call Driver
              </a>
            </div>
          )}

          {/* High-Contrast QR Code */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'inline-block',
            margin: '0 auto',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <svg viewBox="0 0 100 100" width="140" height="140" style={{ display: 'block' }}>
              {/* Corner position markers */}
              <rect x="5" y="5" width="28" height="28" fill="#0f172a" rx="4" />
              <rect x="9" y="9" width="20" height="20" fill="#ffffff" rx="2" />
              <rect x="13" y="13" width="12" height="12" fill="#0284c7" rx="2" />

              <rect x="67" y="5" width="28" height="28" fill="#0f172a" rx="4" />
              <rect x="71" y="9" width="20" height="20" fill="#ffffff" rx="2" />
              <rect x="75" y="13" width="12" height="12" fill="#0284c7" rx="2" />

              <rect x="5" y="67" width="28" height="28" fill="#0f172a" rx="4" />
              <rect x="9" y="71" width="20" height="20" fill="#ffffff" rx="2" />
              <rect x="13" y="75" width="12" height="12" fill="#0284c7" rx="2" />

              {/* Data blocks */}
              <rect x="38" y="8" width="8" height="8" fill="#0284c7" />
              <rect x="50" y="14" width="8" height="6" fill="#0f172a" />
              <rect x="42" y="24" width="6" height="8" fill="#0f172a" />
              <rect x="10" y="42" width="14" height="6" fill="#0f172a" />
              <rect x="28" y="40" width="8" height="8" fill="#0284c7" />
              <rect x="42" y="42" width="16" height="16" fill="#0f172a" rx="3" />
              <rect x="65" y="38" width="10" height="8" fill="#0f172a" />
              <rect x="80" y="44" width="12" height="6" fill="#0284c7" />
              <rect x="38" y="68" width="8" height="12" fill="#0f172a" />
              <rect x="52" y="72" width="12" height="8" fill="#0284c7" />
              <rect x="70" y="68" width="8" height="8" fill="#0f172a" />
              <rect x="84" y="75" width="8" height="15" fill="#0f172a" />
            </svg>
            <div style={{ color: '#334155', fontSize: '0.65rem', fontWeight: 700, marginTop: '4px', letterSpacing: '0.5px' }}>
              TOKEN: {student.qrToken || `APEX-${student.rollNo}`}
            </div>
          </div>

          {/* Today's boarding status */}
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {student.boardedToday ? (
              <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                <CheckCircle size={14} /> Boarded Today at {student.boardedTime || '07:56 AM'}
              </span>
            ) : (
              <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                ⏳ Ready for Boarding Scan
              </span>
            )}
          </div>
        </div>

        <button className="btn btn-outline" onClick={onClose} style={{ marginTop: '1.5rem', width: '100%' }}>
          Close Pass
        </button>
      </div>
    </div>
  );
}
