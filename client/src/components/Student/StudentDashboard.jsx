import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, MapPin, Clock, ShieldCheck, UserCheck, AlertTriangle, 
  QrCode, ArrowRightLeft, MessageSquare, Phone, BellRing, 
  Navigation, CheckCircle2, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import LiveMap from '../Map/LiveMap';
import DigitalPassModal from './DigitalPassModal';
import ComplaintModal from './ComplaintModal';
import RouteChangeModal from './RouteChangeModal';

export default function StudentDashboard({
  student,
  routes = [],
  buses = [],
  drivers = [],
  complaints = [],
  notifications = [],
  onDataRefresh
}) {
  // Modal states strictly initialized as closed (false)
  const [showPassModal, setShowPassModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showRouteChangeModal, setShowRouteChangeModal] = useState(false);

  // Explicitly ensure Student Dashboard loads directly with NO pop-ups or overlays covering the view
  useEffect(() => {
    setShowPassModal(false);
    setShowComplaintModal(false);
    setShowRouteChangeModal(false);
  }, []);

  const [activeTab, setActiveTab] = useState('live_track'); // 'live_track' | 'route_details' | 'history'
  const [userLiveLocation, setUserLiveLocation] = useState(null); // Real device GPS from browser
  const [routeDirection, setRouteDirection] = useState('morning'); // 'morning' (To BEC College) | 'evening' (From BEC College)

  // Identify assigned Route, Bus, Stop, and Driver
  const assignedRoute = useMemo(() => {
    return routes.find(r => r.id === student?.routeId) || routes[0];
  }, [routes, student]);

  const assignedBus = useMemo(() => {
    if (student?.busId) {
      const bus = buses.find(b => b.id === student.busId);
      if (bus) return bus;
    }
    return buses.find(b => b.routeId === assignedRoute?.id) || buses[0];
  }, [buses, student, assignedRoute]);

  const assignedStop = useMemo(() => {
    return assignedRoute?.stops?.find(s => s.id === student?.stopId) || assignedRoute?.stops?.[2] || assignedRoute?.stops?.[0];
  }, [assignedRoute, student]);

  const assignedDriver = useMemo(() => {
    return drivers.find(d => d.id === assignedBus?.driverId) || drivers[0];
  }, [drivers, assignedBus]);

  // Bidirectional stops calculation
  const displayStops = useMemo(() => {
    if (!assignedRoute?.stops) return [];
    if (routeDirection === 'evening') {
      return [...assignedRoute.stops].reverse();
    }
    return assignedRoute.stops;
  }, [assignedRoute, routeDirection]);

  // Real device GPS distances
  const userDistances = useMemo(() => {
    if (!userLiveLocation) return null;
    const R = 6371;

    let distToStop = null;
    if (assignedStop?.lat && assignedStop?.lng) {
      const dLat = (assignedStop.lat - userLiveLocation.lat) * Math.PI / 180;
      const dLon = (assignedStop.lng - userLiveLocation.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLiveLocation.lat * Math.PI / 180) * Math.cos(assignedStop.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      distToStop = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
    }

    let distToBus = null;
    if (assignedBus?.currentLat && assignedBus?.currentLng) {
      const dLat = (assignedBus.currentLat - userLiveLocation.lat) * Math.PI / 180;
      const dLon = (assignedBus.currentLng - userLiveLocation.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLiveLocation.lat * Math.PI / 180) * Math.cos(assignedBus.currentLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      distToBus = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
    }

    return { distToStop, distToBus };
  }, [userLiveLocation, assignedStop, assignedBus]);

  // Dynamic ETA & Distance calculation
  const { etaMinutes, distanceKm } = useMemo(() => {
    if (!assignedBus || !assignedStop) {
      return { etaMinutes: 12, distanceKm: 4.2 };
    }

    // Haversine formula
    const R = 6371;
    const dLat = (assignedStop.lat - assignedBus.currentLat) * Math.PI / 180;
    const dLon = (assignedStop.lng - assignedBus.currentLng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(assignedBus.currentLat * Math.PI / 180) * Math.cos(assignedStop.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    // Estimate based on current bus speed (or default 30 km/h)
    const effectiveSpeed = (assignedBus.speed && assignedBus.speed > 5) ? assignedBus.speed : 28;
    const minutes = Math.max(1, Math.round((dist / effectiveSpeed) * 60));

    return {
      etaMinutes: minutes,
      distanceKm: dist.toFixed(1)
    };
  }, [assignedBus, assignedStop]);

  // Route specific alerts
  const routeNotifications = useMemo(() => {
    return notifications.filter(n => n.target === 'all' || n.target === assignedRoute?.id || n.target === 'students');
  }, [notifications, assignedRoute]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Main Student Header Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Welcome, {student?.name}</h2>
              <span className={`badge ${student?.status === 'approved' ? 'badge-green' : 'badge-amber'}`}>
                {student?.status === 'approved' ? 'Active Pass' : 'Verification Pending'}
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              <span>Roll: <b style={{ color: '#0284c7' }}>{student?.rollNo}</b></span>
              <span>Branch: <b style={{ color: '#0f172a' }}>{student?.department} ({student?.year})</b></span>
              <span>Assigned Route: <b style={{ color: '#0284c7' }}>{assignedRoute?.code} ({assignedRoute?.name})</b></span>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowPassModal(true)}
            >
              <QrCode size={15} /> Digital Bus Pass
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowRouteChangeModal(true)}
            >
              <ArrowRightLeft size={15} /> Change Route
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowComplaintModal(true)}
            >
              <MessageSquare size={15} /> Report Issue
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Metric Cards: Assigned Bus, Stop & Timing, Attendance */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Live Transit Status */}
        <div className="glass-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Assigned Fleet Bus
              </span>
              <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginTop: '2px' }}>
                {assignedBus?.fleetNumber}
              </h3>
            </div>
            <span className={`badge ${assignedBus?.status === 'on_trip' ? 'badge-green' : assignedBus?.status === 'emergency' ? 'badge-red' : 'badge-blue'}`}>
              <span className={`pulse-dot ${assignedBus?.status === 'on_trip' ? 'online' : ''}`} />
              {assignedBus?.status === 'on_trip' ? 'En Route' : assignedBus?.status?.toUpperCase()}
            </span>
          </div>

          {/* Driver Profile & Quick Call Box */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            border: '1.5px solid #bae6fd',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.25rem',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}>
                {assignedDriver?.name?.charAt(0) || 'D'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{assignedDriver?.name}</span>
                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 800 }}>
                    ID: {assignedDriver?.id}
                  </span>
                </div>
                <div style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                  Assigned Bus: <b>{assignedBus?.fleetNumber}</b> • ★ {assignedDriver?.rating || 4.9}
                </div>
              </div>
            </div>

            {/* Driver Phone & Call Button Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bae6fd',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>DRIVER PHONE</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  {assignedDriver?.phone || (assignedBus?.id === 'BUS-01' || assignedDriver?.id === 'PRAGNYA01' ? '+919040833547' : '+916370998587')}
                </div>
              </div>
              <a
                href={`tel:${(assignedDriver?.phone || (assignedBus?.id === 'BUS-01' || assignedDriver?.id === 'PRAGNYA01' ? '+919040833547' : '+916370998587')).replace(/\s+/g, '')}`}
                className="btn btn-sm"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                }}
                title={`Call ${assignedDriver?.name || 'Driver'}`}
              >
                <Phone size={14} /> Call Driver
              </a>
            </div>

            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Route: <b style={{ color: '#0284c7' }}>{assignedRoute?.name}</b></span>
              <span>License: <b style={{ color: '#334155' }}>{assignedDriver?.licenseNo}</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
            <span>Speed: <b style={{ color: '#0284c7' }}>{assignedBus?.speed || 0} km/h</b></span>
            <span>Capacity: <b style={{ color: '#0f172a' }}>{assignedBus?.occupied || 0}/{assignedBus?.capacity || 45}</b></span>
            <span>Plate: <b style={{ color: '#0f172a' }}>{assignedBus?.busNo}</b></span>
          </div>
        </div>

        {/* Card 2: Your Stop & Live ETA */}
        <div className="glass-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Your Boarding Stop
              </span>
              <h3 style={{ fontSize: '1.3rem', color: '#b45309', marginTop: '2px' }}>
                {assignedStop?.name}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Scheduled</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{assignedStop?.morningTime}</div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #bae6fd',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>ESTIMATED TIME TO ARRIVE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', lineHeight: 1.1 }}>
                ~{etaMinutes} <span style={{ fontSize: '1rem', fontWeight: 600 }}>mins</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Remaining Distance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{distanceKm} km</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            Evening Drop scheduled at <b>{assignedStop?.eveningTime}</b>
          </div>
        </div>

        {/* Card 3: Boarding & Attendance Status */}
        <div className="glass-card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Today's Trip Attendance
              </span>
              <h3 style={{ fontSize: '1.4rem', color: student?.boardedToday ? '#15803d' : '#d97706', marginTop: '2px' }}>
                {student?.boardedToday ? 'Boarded ✓' : 'Awaiting Boarding'}
              </h3>
            </div>
            <span className={`badge ${student?.boardedToday ? 'badge-green' : 'badge-amber'}`}>
              {student?.boardedToday ? 'Checked-In' : 'Pending'}
            </span>
          </div>

          <div style={{
            background: student?.boardedToday ? '#f0fdf4' : '#fffbeb',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${student?.boardedToday ? '#bbf7d0' : '#fde68a'}`,
            marginBottom: '0.85rem'
          }}>
            {student?.boardedToday ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>BOARDED TIMESTAMP</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d' }}>
                  {student?.boardedTime || '07:56 AM'} (Verified via QR)
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>PASS NOT YET SCANNED</div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                  Tap below to display your student QR pass for the driver.
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowPassModal(true)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <QrCode size={14} /> View Student Transit Pass
          </button>
        </div>
      </div>

      {/* Tabs: Live Bus Tracking Map vs Full Route Stops & Timetable vs Trip History */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`tab-btn ${activeTab === 'live_track' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_track')}
        >
          <Navigation size={16} /> Live GPS Map & Route View
        </button>
        <button
          className={`tab-btn ${activeTab === 'route_details' ? 'active' : ''}`}
          onClick={() => setActiveTab('route_details')}
        >
          <MapPin size={16} /> Stops Sequence & Timetable ({assignedRoute?.stops?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} /> Trip History & Requests
        </button>
      </div>

      {/* Tab 1: Live Interactive Leaflet Map */}
      {activeTab === 'live_track' && (
        <div className="glass-card" style={{ padding: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <span className="pulse-dot online" /> Live Fleet Tracking: {assignedRoute?.name}
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Map follows your real device GPS location • Bus position tracked from driver GPS
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              {userLiveLocation && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                  📍 My GPS: {userLiveLocation.lat.toFixed(4)}, {userLiveLocation.lng.toFixed(4)}
                  {userDistances?.distToStop && ` • ${userDistances.distToStop} km to Stop`}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d97706' }} />
                Your Stop ({assignedStop?.name})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} />
                Active Bus
              </span>
            </div>
          </div>

          <LiveMap
            routes={assignedRoute ? [assignedRoute] : routes}
            buses={assignedBus ? [assignedBus] : buses}
            highlightStopId={assignedStop?.id}
            highlightBusId={assignedBus?.id}
            height="480px"
            autoCenterBus={false}
            onUserLocationChange={setUserLiveLocation}
          />
        </div>
      )}

      {/* Tab 2: Route Stops & Timetable */}
      {activeTab === 'route_details' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#0f172a' }}>
                {assignedRoute?.code}: {assignedRoute?.name}
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Total Distance: <b>{assignedRoute?.distanceKm} km</b> • Estimated transit time: <b>{assignedRoute?.totalDurationMin} mins</b> • Fixed Bus: <b>{assignedBus?.fleetNumber} (Driver: {assignedDriver?.name})</b>
              </p>
            </div>

            {/* Bidirectional Route Switcher */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #cbd5e1',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setRouteDirection('morning')}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: routeDirection === 'morning' ? '#0284c7' : 'transparent',
                  color: routeDirection === 'morning' ? '#ffffff' : '#475569',
                  boxShadow: routeDirection === 'morning' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                ☀️ Morning Pickup (To Campus)
              </button>
              <button
                type="button"
                onClick={() => setRouteDirection('evening')}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: routeDirection === 'evening' ? '#7c3aed' : 'transparent',
                  color: routeDirection === 'evening' ? '#ffffff' : '#475569',
                  boxShadow: routeDirection === 'evening' ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🌙 Evening Return (From Campus)
              </button>
            </div>
          </div>

          {/* Direction Banner */}
          <div style={{
            background: routeDirection === 'morning' ? '#f0f9ff' : '#f5f3ff',
            border: `1px solid ${routeDirection === 'morning' ? '#bae6fd' : '#ddd6fe'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: routeDirection === 'morning' ? '#0369a1' : '#6d28d9', fontWeight: 700 }}>
              {routeDirection === 'morning'
                ? `Direction: ${assignedRoute?.startPoint} ➔ BEC College Main Campus (Morning Inbound)`
                : `Direction: BEC College Main Campus ➔ ${assignedRoute?.startPoint} (Evening Outbound)`}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Showing {displayStops.length} stops in sequence
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayStops.map((stop, index) => {
              const isMyStop = stop.id === assignedStop?.id;
              return (
                <div
                  key={stop.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: isMyStop ? '#fffbeb' : '#f8fafc',
                    border: `1.5px solid ${isMyStop ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isMyStop ? '#d97706' : (routeDirection === 'morning' ? '#0284c7' : '#7c3aed'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: isMyStop ? '#92400e' : '#0f172a', fontSize: '0.95rem' }}>
                        {stop.name} {isMyStop && <span className="badge badge-amber" style={{ marginLeft: '6px' }}>Your Stop</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        Coordinates: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                    <div style={{ opacity: routeDirection === 'morning' ? 1 : 0.65 }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Morning Pickup</div>
                      <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>{stop.morningTime}</div>
                    </div>
                    <div style={{ opacity: routeDirection === 'evening' ? 1 : 0.65 }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Evening Drop</div>
                      <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.9rem' }}>{stop.eveningTime}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Trip History & Requests */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Attendance History */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <UserCheck size={18} style={{ color: '#059669' }} /> Recent Attendance History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Today (Morning Trip)</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{assignedStop?.name}</div>
                </div>
                <span className={`badge ${student?.boardedToday ? 'badge-green' : 'badge-amber'}`}>
                  {student?.boardedToday ? `Boarded (${student.boardedTime})` : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Yesterday (Morning Trip)</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{assignedStop?.name}</div>
                </div>
                <span className="badge badge-green">Boarded (07:58 AM)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Yesterday (Evening Drop)</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Apex University Main Gate</div>
                </div>
                <span className="badge badge-green">Boarded (04:35 PM)</span>
              </div>
            </div>
          </div>

          {/* Transport Announcements */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <BellRing size={18} style={{ color: '#0284c7' }} /> Route & Fleet Alerts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {routeNotifications.slice(0, 3).map(n => (
                <div key={n.id} style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: n.type === 'emergency' ? '#fef2f2' : n.type === 'delay' ? '#fffbeb' : '#f0f9ff',
                  border: `1px solid ${n.type === 'emergency' ? '#fecaca' : n.type === 'delay' ? '#fde68a' : '#bae6fd'}`
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '2px' }}>
                    {n.title}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem' }}>{n.message}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>{n.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPassModal && (
        <DigitalPassModal
          student={student}
          route={assignedRoute}
          stop={assignedStop}
          bus={assignedBus}
          driver={assignedDriver}
          onClose={() => setShowPassModal(false)}
        />
      )}

      {showComplaintModal && (
        <ComplaintModal
          student={student}
          complaints={complaints}
          onComplaintSubmitted={() => {
            if (onDataRefresh) onDataRefresh();
          }}
          onClose={() => setShowComplaintModal(false)}
        />
      )}

      {showRouteChangeModal && (
        <RouteChangeModal
          student={student}
          currentRoute={assignedRoute}
          routes={routes}
          onRequestSubmitted={() => {
            if (onDataRefresh) onDataRefresh();
          }}
          onClose={() => setShowRouteChangeModal(false)}
        />
      )}
    </div>
  );
}
