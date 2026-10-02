import React, { useState, useEffect } from 'react';
import { QrCode, X, CheckCircle, ShieldCheck, Phone, Bus, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

export default function DigitalPassModal({ student, route, stop, bus, driver, onClose, onDataRefresh }) {
  const [tokenInput, setTokenInput] = useState('');
  const [isBoarding, setIsBoarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isBoarded, setIsBoarded] = useState(Boolean(student?.boardedToday));
  const [boardedTime, setBoardedTime] = useState(student?.boardedTime || null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (student?.boardedToday) {
      setIsBoarded(true);
      if (student.boardedTime) {
        setBoardedTime(student.boardedTime);
      }
    }
  }, [student?.boardedToday, student?.boardedTime]);

  if (!student) return null;

  const expectedToken = (student.qrToken || (student.rollNo ? `APEX-${student.rollNo}` : student.id) || '').trim();

  const handleConfirmBoarding = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Prevent duplicate boarding if already marked as boarded
    if (isBoarded) {
      setErrorMessage(`Already Boarded at ${boardedTime || 'today'}`);
      return;
    }

    const cleanEntered = tokenInput.trim();
    if (!cleanEntered) {
      setErrorMessage('Please enter the boarding token shown on your bus pass.');
      return;
    }

    // Verify token strictly against this passenger's active bus pass
    const validTokens = [
      expectedToken.toUpperCase(),
      (student.qrToken || '').toUpperCase(),
      (student.rollNo ? `APEX-${student.rollNo}` : '').toUpperCase(),
      (student.rollNo || '').toUpperCase(),
      (student.id || '').toUpperCase()
    ].filter(Boolean);

    if (!validTokens.includes(cleanEntered.toUpperCase())) {
      setErrorMessage('Invalid boarding token. Please enter the exact token shown on your bus pass.');
      return;
    }

    setIsBoarding(true);
    try {
      const now = new Date();
      const exactTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const res = await api.boardStudent({
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        qrToken: cleanEntered,
        token: cleanEntered,
        busId: student.busId || bus?.id,
        routeId: student.routeId || route?.id,
        method: 'token_self'
      });

      if (res && res.alreadyBoarded) {
        const time = res.student?.boardedTime || boardedTime || exactTime;
        setIsBoarded(true);
        setBoardedTime(time);
        setErrorMessage(`Already Boarded at ${time}`);
        return;
      }

      const confirmedTime = res?.boardedTime || res?.student?.boardedTime || exactTime;
      setIsBoarded(true);
      setBoardedTime(confirmedTime);
      setSuccessMessage(`Boarded at: ${confirmedTime}`);
      setTokenInput('');

      try {
        confetti({ particleCount: 50, spread: 60 });
      } catch (e) {}

      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to confirm boarding. Please check your token.');
    } finally {
      setIsBoarding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
        <button
          onClick={onClose}
          id="btn-close-digital-pass"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: '#f1f5f9',
            color: '#475569',
            cursor: 'pointer',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            transition: 'background 0.15s ease'
          }}
          title="Close Pass"
        >
          <X size={20} />
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
                  background: '#0284c7',
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
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {isBoarded ? (
              <span className="badge badge-blue" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', fontWeight: 800 }}>
                <CheckCircle size={15} /> BOARDED • Boarded at: {boardedTime || '07:56 AM'}
              </span>
            ) : (
              <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                ⏳ Ready for Boarding
              </span>
            )}
          </div>

          {/* Token Boarding Input Form */}
          <div style={{
            marginTop: '1.25rem',
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid #bae6fd',
            textAlign: 'left',
            boxShadow: '0 1px 4px rgba(2, 132, 199, 0.06)'
          }}>
            <label
              htmlFor="boarding-token-input"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '6px'
              }}
            >
              Enter Boarding Token
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="boarding-token-input"
                type="text"
                className="form-input"
                placeholder="Enter Boarding Token"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                disabled={isBoarded || isBoarding}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmBoarding(e);
                }}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: isBoarded ? '#f8fafc' : '#ffffff',
                  borderColor: errorMessage ? '#ef4444' : (successMessage ? '#10b981' : '#cbd5e1')
                }}
              />
              <button
                type="button"
                id="btn-confirm-boarding"
                className="android-touch-btn"
                onClick={handleConfirmBoarding}
                disabled={isBoarded || isBoarding}
                style={{
                  width: 'auto',
                  padding: '0 1.25rem',
                  background: isBoarded ? '#94a3b8' : '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  cursor: isBoarded ? 'not-allowed' : 'pointer'
                }}
              >
                {isBoarding ? 'Verifying...' : (isBoarded ? 'Boarded' : 'Confirm Boarding')}
              </button>
            </div>

            {/* Error feedback */}
            {errorMessage && (
              <div style={{
                marginTop: '8px',
                padding: '8px 10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#b91c1c',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={14} /> {errorMessage}
              </div>
            )}

            {/* Success feedback */}
            {successMessage && (
              <div style={{
                marginTop: '8px',
                padding: '8px 10px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                color: '#047857',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={14} /> {successMessage}
              </div>
            )}
          </div>
        </div>

        <button
          className="android-touch-btn"
          onClick={onClose}
          style={{
            marginTop: '1.5rem',
            background: '#f1f5f9',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            fontWeight: 700
          }}
        >
          Close Pass
        </button>
      </div>
    </div>
  );
}
