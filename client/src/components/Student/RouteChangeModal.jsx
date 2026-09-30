import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export default function RouteChangeModal({ student, currentRoute, routes = [], onRequestSubmitted, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [targetRouteId, setTargetRouteId] = useState(routes[1]?.id || routes[0]?.id || '');
  const selectedRouteObj = routes.find(r => r.id === targetRouteId) || routes[0];
  const [targetStopId, setTargetStopId] = useState(selectedRouteObj?.stops?.[0]?.id || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      const targetStopObj = selectedRouteObj?.stops?.find(s => s.id === targetStopId);
      await api.submitChangeRequest({
        studentId: student.id,
        studentName: student.name,
        studentRoll: student.rollNo,
        currentRoute: `${currentRoute?.code || 'RT-01'} (${currentRoute?.name || 'Current'})`,
        requestedRoute: `${selectedRouteObj?.code} (${selectedRouteObj?.name})`,
        currentStop: student.stopId || 'Current Stop',
        requestedStop: targetStopObj ? targetStopObj.name : 'Selected Stop',
        reason
      });

      setSuccess(true);
      if (onRequestSubmitted) onRequestSubmitted();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0f172a' }}>Apply for Route Change</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Request reallocation to a different campus transit corridor</p>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={48} style={{ color: '#059669', margin: '0 auto 1rem' }} />
            <h4 style={{ color: '#0f172a' }}>Application Submitted!</h4>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Transport Administration will review your relocation and update your bus pass status shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{
              background: '#f0f9ff',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              border: '1px solid #bae6fd',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: '#64748b' }}>Currently Assigned:</span>{' '}
              <b style={{ color: '#0284c7' }}>{currentRoute ? `${currentRoute.code} - ${currentRoute.name}` : 'Route 1'}</b>
            </div>

            <div className="form-group">
              <label className="form-label">New Desired Route</label>
              <select
                className="form-select"
                value={targetRouteId}
                onChange={e => {
                  setTargetRouteId(e.target.value);
                  const rt = routes.find(r => r.id === e.target.value);
                  if (rt && rt.stops.length > 0) {
                    setTargetStopId(rt.stops[0].id);
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

            <div className="form-group">
              <label className="form-label">Preferred Boarding Stop</label>
              <select
                className="form-select"
                value={targetStopId}
                onChange={e => setTargetStopId(e.target.value)}
              >
                {selectedRouteObj?.stops?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Morning Pickup: {s.morningTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Relocation / Change</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Relocated residence to BTM Layout / change of semester timetable..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 2 }}>
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Request to Admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
