import React, { useState, useEffect } from 'react';
import { X, MessageSquare, AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react';
import { api } from '../../services/api';

export default function ComplaintModal({ student, complaints = [], onComplaintSubmitted, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [category, setCategory] = useState('Timing & Punctuality');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const myComplaints = complaints.filter(c => c.studentId === student?.id || c.studentRoll === student?.rollNo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      await api.submitComplaint({
        studentId: student.id,
        studentName: student.name,
        studentRoll: student.rollNo,
        category,
        subject,
        message
      });

      setSuccessMsg('Your report has been submitted to the Transport Desk.');
      setSubject('');
      setMessage('');
      if (onComplaintSubmitted) onComplaintSubmitted();
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('history');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
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
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0f172a' }}>Feedback & Issues Desk</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Direct line to Apex University Transport Management</p>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            File New Issue
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            My Reports ({myComplaints.length})
          </button>
        </div>

        {successMsg && (
          <div style={{ padding: '0.75rem 1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 'var(--radius-md)', color: '#0284c7', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        {activeTab === 'new' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Issue Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Timing & Punctuality">Timing & Schedule Delay</option>
                <option value="Driver Behavior">Driver Behavior / Rash Driving</option>
                <option value="Cleanliness & AC">Cleanliness & AC / Heating</option>
                <option value="Overcrowding">Overcrowding / Standing Space</option>
                <option value="Route & Stops">Skipped Stop / Route Deviation</option>
                <option value="Other">Other Suggestions</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject / Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bus departed 5 mins early at Silk Board"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-textarea"
                placeholder="Provide date, time, and specific details so transport authorities can take prompt action..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 2 }}>
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit to Transport Desk'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
            {myComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <CheckCircle2 size={36} style={{ color: '#059669', opacity: 0.6, margin: '0 auto 0.5rem' }} />
                <p>No complaints reported. Safe travels!</p>
              </div>
            ) : (
              myComplaints.map(item => (
                <div key={item.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                    <span className={`badge ${item.status === 'resolved' ? 'badge-blue' : item.status === 'in_review' ? 'badge-amber' : 'badge-blue'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.3rem' }}>
                    {item.subject}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.825rem', marginBottom: '0.6rem' }}>
                    {item.message}
                  </div>

                  {item.adminReply && (
                    <div style={{
                      background: '#f0f9ff',
                      borderLeft: '3px solid #0284c7',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.75rem', marginBottom: '2px' }}>
                        Transport Desk Response:
                      </div>
                      <div style={{ color: '#334155' }}>{item.adminReply}</div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'right' }}>
                    Submitted {item.createdAt}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
