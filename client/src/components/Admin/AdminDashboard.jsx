import React, { useState } from 'react';
import { 
  Bus, Users, MapPin, AlertCircle, ShieldAlert, CheckCircle2, 
  XCircle, Plus, BarChart3, Settings, 
  FileText, Activity, Compass, ArrowRightLeft, MessageSquare,
  Phone, ShieldCheck, Edit3, Trash2
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
  onOpenAuthModal
}) {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'fleet' | 'routes' | 'approvals' | 'complaints' | 'requests' | 'analytics'
  const [statusMsg, setStatusMsg] = useState('');

  // Add Bus Form State
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [busNo, setBusNo] = useState('');
  const [fleetNumber, setFleetNumber] = useState('');
  const [capacity, setCapacity] = useState(45);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');

  // Complaint Reply State
  const [replyComplaintId, setReplyComplaintId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Pending student registrations
  const pendingStudents = students.filter(s => s.status === 'pending_approval');
  const pendingRequests = changeRequests.filter(r => r.status === 'pending');
  const openComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in_review');

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


  // Handle Add Bus
  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      await api.addBus({
        busNo,
        fleetNumber: fleetNumber || `Bus #${buses.length + 1}`,
        capacity: Number(capacity),
        driverId: selectedDriverId || null,
        routeId: selectedRouteId || null
      });
      setShowAddBusModal(false);
      setBusNo('');
      setFleetNumber('');
      setStatusMsg('New fleet bus registered.');
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Admin KPI Header Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: Active Fleet */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ACTIVE FLEET</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
            {buses.filter(b => b.status === 'on_trip').length} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ {buses.length}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            ● {buses.filter(b => b.status === 'on_trip').length} buses broadcasting live GPS
          </div>
        </div>

        {/* KPI 2: On-Duty Drivers */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LICENSED DRIVERS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
            {drivers.length} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Drivers</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Avg Rating: ★ 4.8 / 5.0
          </div>
        </div>

        {/* KPI 3: Registered Students & Attendance */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>STUDENT RIDERSHIP</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
            {students.filter(s => s.boardedToday).length || students.length} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/ 40</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px', fontWeight: 600 }}>
            {Math.round(((students.filter(s => s.boardedToday).length || students.length) / 40) * 100)}% Boarded Today
          </div>
        </div>
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
          className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <Activity size={16} /> Live Fleet Map ({buses.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          <Bus size={16} /> Manage Buses & Drivers
        </button>
        <button
          className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <MapPin size={16} /> Routes & Stops ({routes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          <Users size={16} /> Student Registrations {pendingStudents.length > 0 && <span className="badge badge-amber" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{pendingStudents.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          <MessageSquare size={16} /> Complaints {openComplaints.length > 0 && <span className="badge badge-red" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{openComplaints.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <ArrowRightLeft size={16} /> Route Changes {pendingRequests.length > 0 && <span className="badge badge-amber" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{pendingRequests.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} /> Reports & Analytics
        </button>
      </div>

      {/* TAB 1: LIVE ALL-BUS MONITORING MAP */}
      {activeTab === 'monitoring' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <span className="pulse-dot online" /> Central Transport Command Center
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Visualizing all {routes.length} transit corridors and active buses in real-time (OpenStreetMap)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className="badge badge-blue">
                {buses.filter(b => b.status === 'on_trip').length} Active On Route
              </span>
              <span className="badge badge-green">
                {buses.filter(b => b.status === 'available').length} Available in Depot
              </span>
            </div>
          </div>

          <LiveMap
            routes={routes}
            buses={buses}
            height="520px"
          />

          {/* Quick bus telemetry strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.75rem',
            marginTop: '1rem'
          }}>
            {buses.map(bus => (
              <div key={bus.id} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                    {bus.fleetNumber} ({bus.busNo})
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Route: {routes.find(r => r.id === bus.routeId)?.name || 'Not assigned'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${bus.status === 'on_trip' ? 'badge-green' : bus.status === 'emergency' ? 'badge-red' : 'badge-blue'}`}>
                    {bus.status}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
                    {bus.speed || 0} km/h • {bus.occupied}/{bus.capacity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE BUSES & DRIVERS (STRICT 2 BUSES & 2 DRIVERS) */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>Fixed Campus Fleet ({buses.length} Buses & {drivers.length} Drivers)</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Permanent allocation: Bus 1 ↔ Pragnya (Baramunda) • Bus 2 ↔ Jitendra (Patia)</p>
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
                <ShieldCheck size={16} /> Exactly 2 Buses & 2 Drivers
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
                  {buses.map(bus => {
                    const driverObj = drivers.find(d => d.id === bus.driverId) || (bus.id === 'BUS-01' ? drivers.find(d => d.id === 'PRAGNYA01') : drivers.find(d => d.id === 'JITENDRA01'));
                    const routeObj = routes.find(r => r.id === bus.routeId);
                    return (
                      <tr key={bus.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Bus size={15} style={{ color: '#0284c7' }} />
                            {bus.fleetNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#334155', fontWeight: 600 }}>{bus.busNo}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{driverObj ? driverObj.name : 'Pragnya'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>ID: {driverObj ? driverObj.id : (bus.id === 'BUS-01' ? 'PRAGNYA01' : 'JITENDRA01')}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600 }}>
                              {driverObj?.phone || (bus.id === 'BUS-01' ? '+919040833547' : '+916370998587')}
                            </span>
                            <a
                              href={`tel:${(driverObj?.phone || (bus.id === 'BUS-01' ? '+919040833547' : '+916370998587')).replace(/\s+/g, '')}`}
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
                              title={`Call ${driverObj?.name || 'Driver'}`}
                            >
                              <Phone size={12} /> Call
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#0f172a' }}>
                          <span style={{ fontWeight: 600 }}>{routeObj ? routeObj.name : (bus.id === 'BUS-01' ? 'BEC College ↔ Baramunda' : 'BEC College ↔ Patia')}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#0f172a' }}>
                          <b>{bus.occupied}</b> / {bus.capacity} seats
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${bus.status === 'on_trip' ? 'badge-green' : bus.status === 'emergency' ? 'badge-red' : 'badge-blue'}`}>
                            {bus.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={async () => {
                              const nextStatus = bus.status === 'maintenance' ? 'available' : 'maintenance';
                              await api.updateBus(bus.id, { status: nextStatus });
                              if (onDataRefresh) onDataRefresh();
                            }}
                          >
                            Toggle Maintenance
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Drivers List with Details & Call Buttons */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>Licensed Drivers ({drivers.length} Drivers Assigned)</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Official drivers with contact dialer links and assigned buses</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {drivers.map(drv => {
                const assignedBusObj = buses.find(b => b.driverId === drv.id) || (drv.id === 'PRAGNYA01' ? buses[0] : buses[1]);
                const assignedRouteObj = routes.find(r => r.id === (drv.routeId || assignedBusObj?.routeId));
                return (
                  <div key={drv.id} style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: 'white',
                        boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
                        flexShrink: 0
                      }}>
                        {drv.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>{drv.name}</span>
                          <span style={{ fontSize: '0.725rem', padding: '2px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 800 }}>
                            ID: {drv.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Experience: <b style={{ color: '#0f172a' }}>{drv.id === 'PRAGNYA01' ? '2 Years Exp' : drv.id === 'JITENDRA01' ? '3 Years Exp' : `${drv.experienceYears || 2} Years Exp`}</b> • License: <b style={{ color: '#334155' }}>{drv.licenseNo}</b> • ★ {drv.rating}
                        </div>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Active</span>
                    </div>

                    {/* Assigned Bus & Route Details */}
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
                        <b style={{ color: '#0284c7' }}>{assignedBusObj ? assignedBusObj.fleetNumber : (drv.id === 'PRAGNYA01' ? 'Bus 1' : 'Bus 2')} ({assignedBusObj?.busNo})</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Route:</span>
                        <b style={{ color: '#0f172a' }}>{assignedRouteObj ? assignedRouteObj.name : (drv.id === 'PRAGNYA01' ? 'BEC College ↔ Baramunda' : 'BEC College ↔ Patia')}</b>
                      </div>
                    </div>

                    {/* Phone Number & Dedicated Call Button */}
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
                        <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>PHONE NUMBER</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{drv.phone || (drv.id === 'PRAGNYA01' ? '+919040833547' : '+916370998587')}</div>
                      </div>
                      <a
                        href={`tel:${(drv.phone || (drv.id === 'PRAGNYA01' ? '+919040833547' : '+916370998587')).replace(/\s+/g, '')}`}
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
                        title={`Open dialer to call ${drv.name} at ${drv.phone}`}
                      >
                        <Phone size={14} /> Call Driver
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTES & STOPS */}
      {activeTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {routes.map(r => (
            <div key={r.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: r.color || '#0284c7' }} />
                    <h4 style={{ fontSize: '1.2rem', color: '#0f172a' }}>{r.code}: {r.name}</h4>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    From: <b>{r.startPoint}</b> → Campus: <b>{r.endPoint}</b> ({r.distanceKm} km • ~{r.totalDurationMin} mins)
                  </div>
                </div>
                <span className="badge badge-blue">
                  {students.filter(s => s.routeId === r.id).length} Students Assigned
                </span>
              </div>

              {/* Stops Timeline */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem'
              }}>
                {r.stops.map((stop, idx) => (
                  <div key={stop.id} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>#{idx + 1}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Pickup: {stop.morningTime}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Drop: {stop.eveningTime}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: STUDENT REGISTRATIONS & APPROVALS */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
              Pending Student Approvals ({pendingStudents.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Review college credentials, assign bus seats, and authorize digital bus passes.
            </p>

            {pendingStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <CheckCircle2 size={40} style={{ color: '#059669', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <p>All student registrations have been reviewed.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingStudents.map(student => (
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
                        Requested Route: <b>{routes.find(r => r.id === student.routeId)?.name || student.routeId}</b>
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
            )}
          </div>

          {/* All Registered Students Directory */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>Active Student Transit Registry ({students.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem' }}>Student</th>
                    <th style={{ padding: '0.75rem' }}>Roll No</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Route</th>
                    <th style={{ padding: '0.75rem' }}>Stop</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Today's Boarding</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const r = routes.find(rt => rt.id === s.routeId);
                    const st = r?.stops?.find(sp => sp.id === s.stopId);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                        <td style={{ padding: '0.75rem', color: '#0284c7' }}>{s.rollNo}</td>
                        <td style={{ padding: '0.75rem', color: '#475569' }}>{s.department}</td>
                        <td style={{ padding: '0.75rem' }}>{r ? r.code : '-'}</td>
                        <td style={{ padding: '0.75rem', color: '#b45309' }}>{st ? st.name : '-'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${s.status === 'approved' ? 'badge-green' : 'badge-amber'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {s.boardedToday ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ {s.boardedTime || 'Boarded'}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Not Boarded</span>
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
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINTS & FEEDBACK DESK */}
      {activeTab === 'complaints' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            Student Complaints & Grievance Desk ({complaints.length})
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Review reported issues regarding driver behavior, timing delays, AC, and cleanliness.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {complaints.map(item => (
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
        </div>
      )}

      {/* TAB 6: ROUTE CHANGE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            Route & Stop Relocation Requests ({changeRequests.length})
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Process student requests to switch transit corridors due to relocation or schedule changes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {changeRequests.map(req => (
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
        </div>
      )}


      {/* TAB 8: REPORTS & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a' }}>Fleet Route Utilization</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {routes.map(r => {
                const count = students.filter(s => s.routeId === r.id).length;
                const percent = Math.min(100, Math.round((count / 45) * 100));
                return (
                  <div key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.name} ({r.code})</span>
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>{count} / 45 seats ({percent}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: r.color || '#0284c7', borderRadius: '9999px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a' }}>Driver Performance & Safety</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drivers.map(drv => (
                <div key={drv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{drv.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{drv.id === 'PRAGNYA01' ? '2 Years Exp' : drv.id === 'JITENDRA01' ? '3 Years Exp' : `${drv.experienceYears || 2} Years Exp`} • {drv.licenseNo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#d97706' }}>★ {drv.rating}</div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>98.4% On-Time</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Bus Modal */}
      {showAddBusModal && (
        <div className="modal-overlay" onClick={() => setShowAddBusModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#0f172a' }}>Add Bus to Campus Fleet</h3>
            <form onSubmit={handleCreateBus}>
              <div className="form-group">
                <label className="form-label">Fleet Display Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bus #04"
                  value={fleetNumber}
                  onChange={e => setFleetNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registration / License Plate</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. KA-01-F-4025"
                  value={busNo}
                  onChange={e => setBusNo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Seating Capacity</label>
                <input
                  type="number"
                  className="form-input"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Driver</label>
                <select className="form-select" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                  <option value="">-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Route</label>
                <select className="form-select" value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}>
                  <option value="">-- Select Route --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddBusModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
