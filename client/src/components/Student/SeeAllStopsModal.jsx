import React, { useEffect } from 'react';
import { X, MapPin, Bus, Clock, Navigation, CheckCircle2 } from 'lucide-react';

export default function SeeAllStopsModal({
  isOpen,
  onClose,
  bus,
  route,
  stops = [],
  nearestStopId = null,
  gpsCoords = null,
  calcHaversineKm
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          borderRadius: '16px',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-see-all-stops"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: '#f1f5f9',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: '#e0f2fe', borderRadius: '20px', color: '#0284c7', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', border: '1px solid #bae6fd' }}>
            <Bus size={13} /> {bus?.fleetNumber || 'Assigned Bus'} • ROUTE {route?.code || 'RT-01'}
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            All Bus Stops • {route?.name}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Showing all {stops.length} configured stops on your assigned bus route.
          </p>
        </div>

        {/* Live GPS Status Indicator Banner */}
        <div style={{
          background: gpsCoords ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${gpsCoords ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {gpsCoords ? (
            <>
              <span className="pulse-dot online" style={{ flexShrink: 0 }} />
              <span style={{ color: '#166534', fontWeight: 600 }}>
                <b>Live GPS Active:</b> Walking distances & times are calculated from your real location ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}).
              </span>
            </>
          ) : (
            <>
              <Navigation size={15} style={{ color: '#d97706', flexShrink: 0 }} />
              <span style={{ color: '#92400e', fontWeight: 600 }}>
                Location permission not enabled. Scheduled timetable shown below.
              </span>
            </>
          )}
        </div>

        {/* Scrollable Stops List */}
        <div style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          paddingRight: '4px',
          maxHeight: '460px'
        }}>
          {stops.map((stop, index) => {
            const isNearest = stop.id === nearestStopId;
            let distKm = null;
            let walkingMin = null;

            if (gpsCoords && typeof stop.lat === 'number' && typeof stop.lng === 'number' && calcHaversineKm) {
              distKm = calcHaversineKm(gpsCoords.lat, gpsCoords.lng, stop.lat, stop.lng);
              walkingMin = Math.max(1, Math.round((distKm / 4.8) * 60));
            }

            return (
              <div
                key={stop.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1rem',
                  borderRadius: '12px',
                  background: isNearest ? '#f0f9ff' : '#ffffff',
                  border: `1.5px solid ${isNearest ? '#0284c7' : '#e2e8f0'}`,
                  boxShadow: isNearest ? '0 4px 14px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                {/* Left: Sequence + Name + Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isNearest ? '#0284c7' : '#f1f5f9',
                      color: isNearest ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {stop.name}
                      </span>
                      {isNearest && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            background: '#0284c7',
                            color: '#ffffff',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <CheckCircle2 size={11} /> Nearest Stop
                        </span>
                      )}
                    </div>
                    {distKm !== null && (
                      <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🚶 ~{walkingMin} min walk</span>
                        <span>•</span>
                        <span>{distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`} away</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Timetable */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Morning Pickup
                    </div>
                    <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.875rem' }}>
                      {stop.morningPickup || stop.morningTime || '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Evening Drop
                    </div>
                    <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.875rem' }}>
                      {stop.eveningDrop || stop.eveningTime || '--'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={onClose}
            className="android-touch-btn"
            style={{
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              fontWeight: 700
            }}
          >
            Close Stops List
          </button>
        </div>
      </div>
    </div>
  );
}
