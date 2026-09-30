import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, MapPin, Clock, ShieldCheck, UserCheck, AlertTriangle, 
  QrCode, ArrowRightLeft, MessageSquare, Phone, BellRing, 
  Navigation, CheckCircle2, AlertCircle, Info, ChevronRight,
  Edit3, LogOut, Radio, Compass, Play, Pause, Square
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
  onDataRefresh,
  onOpenAuthModal,
  onLogout
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

  const [activeTab, setActiveTab] = useState('bus_tracker'); // 'bus_tracker' | 'live_track' | 'route_details' | 'history'
  const [userLiveLocation, setUserLiveLocation] = useState(null); // Real device GPS from browser
  const [routeDirection, setRouteDirection] = useState('morning'); // 'morning' (To BEC College) | 'evening' (From BEC College)

  // Bus Tracker Section States
  const [trackerBusId, setTrackerBusId] = useState(student?.busId || 'BUS-01');
  const [trackerDirection, setTrackerDirection] = useState('morning'); // 'morning' | 'evening'

  // Coordinate validity check (strict Odisha / Bhubaneswar bounds - no Bangalore or random coordinates)
  const isCoordValid = (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
    return lat >= 19.5 && lat <= 21.0 && lng >= 85.0 && lng <= 86.5;
  };

  // Distance calculation using Haversine formula
  const calcHaversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Both Buses Data
  const bus1 = useMemo(() => {
    return buses.find(b => b.id === 'BUS-01' || b.fleetNumber === 'Bus 1') || {
      id: 'BUS-01',
      fleetNumber: 'Bus 1',
      busNo: 'OD-02-AX-1001',
      driverName: 'Pragnya',
      routeId: 'R-101',
      status: 'idle',
      speed: 0
    };
  }, [buses]);

  const bus2 = useMemo(() => {
    return buses.find(b => b.id === 'BUS-02' || b.fleetNumber === 'Bus 2') || {
      id: 'BUS-02',
      fleetNumber: 'Bus 2',
      busNo: 'OD-02-AX-2002',
      driverName: 'Jitendra',
      routeId: 'R-102',
      status: 'idle',
      speed: 0
    };
  }, [buses]);

  const route1 = useMemo(() => {
    return routes.find(r => r.id === 'R-101' || r.code === 'RT-01') || routes[0];
  }, [routes]);

  const route2 = useMemo(() => {
    return routes.find(r => r.id === 'R-102' || r.code === 'RT-02') || routes[1] || routes[0];
  }, [routes]);

  const driver1 = useMemo(() => {
    return drivers.find(d => d.id === 'PRAGNYA01' || d.name === 'Pragnya') || {
      id: 'PRAGNYA01',
      name: 'Pragnya',
      phone: '+919040833547'
    };
  }, [drivers]);

  const driver2 = useMemo(() => {
    return drivers.find(d => d.id === 'JITENDRA01' || d.name === 'Jitendra') || {
      id: 'JITENDRA01',
      name: 'Jitendra',
      phone: '+916370998587'
    };
  }, [drivers]);

  // Determine Tracking, Movement, Nearest & Next Stop for a bus
  const getBusTrackingDetails = (bus, route) => {
    const hasValidCoords = bus && isCoordValid(bus.currentLat, bus.currentLng);
    const isEnRoute = bus && (bus.status === 'on_trip' || bus.status === 'emergency');

    // 1. Movement Status: moving, stopped, or has not started its route
    let movementState = 'not_started'; // 'moving' | 'stopped' | 'not_started'
    let movementLabel = 'Has not started route';
    let movementBadgeBg = '#f1f5f9';
    let movementBadgeColor = '#64748b';
    let movementBadgeBorder = '#cbd5e1';

    if (!isEnRoute || !hasValidCoords) {
      movementState = 'not_started';
      movementLabel = 'Has not started route';
      movementBadgeBg = '#f1f5f9';
      movementBadgeColor = '#64748b';
      movementBadgeBorder = '#cbd5e1';
    } else if (bus.speed && bus.speed > 3) {
      movementState = 'moving';
      movementLabel = `Moving (${bus.speed} km/h)`;
      movementBadgeBg = '#dcfce7';
      movementBadgeColor = '#15803d';
      movementBadgeBorder = '#86efac';
    } else {
      movementState = 'stopped';
      movementLabel = 'Stopped (0 km/h)';
      movementBadgeBg = '#fef3c7';
      movementBadgeColor = '#b45309';
      movementBadgeBorder = '#fde68a';
    }

    // 2. Location / Nearest Stop & Next Stop
    const isLiveAvailable = hasValidCoords && isEnRoute;
    let locationText = 'Live location unavailable';
    let nearestStop = null;
    let nearestDistKm = null;
    let nextStop = null;
    let nextStopDistKm = null;
    let etaMinutes = null;

    if (isLiveAvailable && route?.stops?.length > 0) {
      let minDist = Infinity;
      let nearestIdx = 0;

      route.stops.forEach((stop, idx) => {
        const d = calcHaversineKm(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
          nearestIdx = idx;
          nearestDistKm = d;
        }
      });

      if (nearestDistKm <= 0.15) {
        locationText = `At ${nearestStop.name} (Stop #${nearestStop.sequence})`;
      } else {
        locationText = `Near ${nearestStop.name} (${nearestDistKm.toFixed(1)} km away)`;
      }

      // Next Stop determination
      if (bus.nextStopId) {
        nextStop = route.stops.find(s => s.id === bus.nextStopId);
      }
      if (!nextStop) {
        if (nearestIdx < route.stops.length - 1) {
          nextStop = route.stops[nearestIdx + 1];
        } else {
          nextStop = route.stops[route.stops.length - 1];
        }
      }

      if (nextStop) {
        nextStopDistKm = calcHaversineKm(bus.currentLat, bus.currentLng, nextStop.lat, nextStop.lng);
        const speed = (bus.speed && bus.speed > 5) ? bus.speed : 28;
        etaMinutes = Math.max(1, Math.round((nextStopDistKm / speed) * 60));
      }
    } else {
      locationText = 'Live location unavailable';
    }

    return {
      isLiveAvailable,
      movementState,
      movementLabel,
      movementBadgeBg,
      movementBadgeColor,
      movementBadgeBorder,
      locationText,
      nearestStop,
      nearestDistKm,
      nextStop,
      nextStopDistKm,
      etaMinutes
    };
  };

  const bus1Tracking = useMemo(() => getBusTrackingDetails(bus1, route1), [bus1, route1]);
  const bus2Tracking = useMemo(() => getBusTrackingDetails(bus2, route2), [bus2, route2]);

  const activeTrackerBus = trackerBusId === 'BUS-02' ? bus2 : bus1;
  const activeTrackerRoute = trackerBusId === 'BUS-02' ? route2 : route1;
  const activeTrackerDriver = trackerBusId === 'BUS-02' ? driver2 : driver1;
  const activeTrackerInfo = trackerBusId === 'BUS-02' ? bus2Tracking : bus1Tracking;

  const trackerDisplayStops = useMemo(() => {
    if (!activeTrackerRoute?.stops) return [];
    if (trackerDirection === 'evening') {
      return [...activeTrackerRoute.stops].reverse();
    }
    return activeTrackerRoute.stops;
  }, [activeTrackerRoute, trackerDirection]);

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
              className="btn btn-outline btn-sm"
              onClick={() => onOpenAuthModal && onOpenAuthModal('update', student)}
              id="btn-student-update-user"
              style={{ borderColor: '#10b981', color: '#059669', background: '#ecfdf5', fontWeight: 700 }}
              title="Update profile details in MongoDB Atlas"
            >
              <Edit3 size={15} /> Update User
            </button>
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
            {onLogout && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onLogout}
                id="btn-student-logout"
                style={{ borderColor: '#fca5a5', color: '#dc2626', background: '#fef2f2', fontWeight: 700 }}
                title="Log out and return to Login screen"
              >
                <LogOut size={15} /> Logout
              </button>
            )}
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

      {/* Navigation Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`tab-btn ${activeTab === 'bus_tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('bus_tracker')}
          id="tab-btn-bus-tracker"
          style={{ fontWeight: 700 }}
        >
          <Bus size={16} /> Bus Tracker
        </button>
        <button
          className={`tab-btn ${activeTab === 'live_track' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_track')}
          id="tab-btn-my-stop-map"
        >
          <Navigation size={16} /> My Boarding Stop Map
        </button>
        <button
          className={`tab-btn ${activeTab === 'route_details' ? 'active' : ''}`}
          onClick={() => setActiveTab('route_details')}
          id="tab-btn-assigned-route"
        >
          <MapPin size={16} /> Stops Sequence & Timetable ({assignedRoute?.stops?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          id="tab-btn-history"
        >
          <Clock size={16} /> Trip History & Requests
        </button>
      </div>

      {/* TAB 0: STUDENT BUS TRACKER SECTION (Both Buses, Live Tracking, Movement Status, Stops & Timetable) */}
      {activeTab === 'bus_tracker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tracker Header */}
          <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot online" />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    Student Bus Tracker
                  </h3>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '3px' }}>
                  Live tracking for both campus transit routes. Select a bus below to view live GPS position, stop sequences, and timetables.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0284c7',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <Radio size={14} className="pulse-dot" /> Live Telemetry Synced
                </span>
              </div>
            </div>
          </div>

          {/* Both Buses Overview Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* BUS 1 CARD: Pragnya – Bus 1: BEC College ↔ Baramunda */}
            <div 
              className="glass-card" 
              onClick={() => setTrackerBusId('BUS-01')}
              style={{
                cursor: 'pointer',
                border: trackerBusId === 'BUS-01' ? '2.5px solid #0284c7' : '1px solid #e2e8f0',
                background: trackerBusId === 'BUS-01' ? '#f0f9ff' : '#ffffff',
                boxShadow: trackerBusId === 'BUS-01' ? '0 8px 24px rgba(2, 132, 199, 0.15)' : 'none',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
              id="card-tracker-bus-1"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    BUS 1 • ROUTE RT-01
                  </span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    Pragnya – Bus 1: BEC College ↔ Baramunda
                  </h4>
                </div>
                {/* Movement Status Badge */}
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: bus1Tracking.movementBadgeBg,
                  color: bus1Tracking.movementBadgeColor,
                  border: `1px solid ${bus1Tracking.movementBadgeBorder}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}>
                  {bus1Tracking.movementState === 'moving' && <span className="pulse-dot online" />}
                  {bus1Tracking.movementLabel}
                </span>
              </div>

              {/* Status Metrics Box */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #bae6fd',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '0.85rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Current Location:</span>
                  <span style={{ fontWeight: 700, color: bus1Tracking.isLiveAvailable ? '#0f172a' : '#b45309' }}>
                    {bus1Tracking.isLiveAvailable ? (
                      `📍 ${bus1Tracking.locationText}`
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                        <AlertCircle size={14} /> Live location unavailable
                      </span>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Next Upcoming Stop:</span>
                  <span style={{ fontWeight: 700, color: bus1Tracking.isLiveAvailable && bus1Tracking.nextStop ? '#0284c7' : '#64748b' }}>
                    {bus1Tracking.isLiveAvailable && bus1Tracking.nextStop ? (
                      `⏭ ${bus1Tracking.nextStop.name}`
                    ) : (
                      'Route not started'
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Time Remaining to Next Stop:</span>
                  <span style={{ fontWeight: 800, color: bus1Tracking.isLiveAvailable && bus1Tracking.etaMinutes ? '#059669' : '#64748b' }}>
                    {bus1Tracking.isLiveAvailable && bus1Tracking.etaMinutes ? (
                      `⏱ ~${bus1Tracking.etaMinutes} mins (${bus1Tracking.nextStopDistKm?.toFixed(1)} km)`
                    ) : (
                      '--'
                    )}
                  </span>
                </div>
              </div>

              {/* Driver Details & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>DRIVER & BUS PLATE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Pragnya • <span style={{ color: '#0284c7' }}>OD-02-AX-1001</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a
                    href="tel:+919040833547"
                    onClick={e => e.stopPropagation()}
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: '#86efac', color: '#15803d', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                    title="Call Driver Pragnya"
                  >
                    <Phone size={13} /> Call Pragnya
                  </a>
                  <button
                    type="button"
                    onClick={() => setTrackerBusId('BUS-01')}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    {trackerBusId === 'BUS-01' ? 'Active' : 'Track Bus 1'}
                  </button>
                </div>
              </div>
            </div>

            {/* BUS 2 CARD: Jitendra – Bus 2: BEC College ↔ Patia */}
            <div 
              className="glass-card" 
              onClick={() => setTrackerBusId('BUS-02')}
              style={{
                cursor: 'pointer',
                border: trackerBusId === 'BUS-02' ? '2.5px solid #0284c7' : '1px solid #e2e8f0',
                background: trackerBusId === 'BUS-02' ? '#f0f9ff' : '#ffffff',
                boxShadow: trackerBusId === 'BUS-02' ? '0 8px 24px rgba(2, 132, 199, 0.15)' : 'none',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
              id="card-tracker-bus-2"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    BUS 2 • ROUTE RT-02
                  </span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    Jitendra – Bus 2: BEC College ↔ Patia
                  </h4>
                </div>
                {/* Movement Status Badge */}
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: bus2Tracking.movementBadgeBg,
                  color: bus2Tracking.movementBadgeColor,
                  border: `1px solid ${bus2Tracking.movementBadgeBorder}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}>
                  {bus2Tracking.movementState === 'moving' && <span className="pulse-dot online" />}
                  {bus2Tracking.movementLabel}
                </span>
              </div>

              {/* Status Metrics Box */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #bae6fd',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '0.85rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Current Location:</span>
                  <span style={{ fontWeight: 700, color: bus2Tracking.isLiveAvailable ? '#0f172a' : '#b45309' }}>
                    {bus2Tracking.isLiveAvailable ? (
                      `📍 ${bus2Tracking.locationText}`
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                        <AlertCircle size={14} /> Live location unavailable
                      </span>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Next Upcoming Stop:</span>
                  <span style={{ fontWeight: 700, color: bus2Tracking.isLiveAvailable && bus2Tracking.nextStop ? '#0284c7' : '#64748b' }}>
                    {bus2Tracking.isLiveAvailable && bus2Tracking.nextStop ? (
                      `⏭ ${bus2Tracking.nextStop.name}`
                    ) : (
                      'Route not started'
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Time Remaining to Next Stop:</span>
                  <span style={{ fontWeight: 800, color: bus2Tracking.isLiveAvailable && bus2Tracking.etaMinutes ? '#059669' : '#64748b' }}>
                    {bus2Tracking.isLiveAvailable && bus2Tracking.etaMinutes ? (
                      `⏱ ~${bus2Tracking.etaMinutes} mins (${bus2Tracking.nextStopDistKm?.toFixed(1)} km)`
                    ) : (
                      '--'
                    )}
                  </span>
                </div>
              </div>

              {/* Driver Details & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>DRIVER & BUS PLATE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Jitendra • <span style={{ color: '#0284c7' }}>OD-02-AX-2002</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a
                    href="tel:+916370998587"
                    onClick={e => e.stopPropagation()}
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: '#86efac', color: '#15803d', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                    title="Call Driver Jitendra"
                  >
                    <Phone size={13} /> Call Jitendra
                  </a>
                  <button
                    type="button"
                    onClick={() => setTrackerBusId('BUS-02')}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    {trackerBusId === 'BUS-02' ? 'Active' : 'Track Bus 2'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Bus Live Route Tracking & Stop Sequence */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            {/* Header for Selected Bus Tracker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeTrackerBus.fleetNumber}: {activeTrackerRoute.name}
                  </h4>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: activeTrackerInfo.movementBadgeBg,
                    color: activeTrackerInfo.movementBadgeColor,
                    border: `1px solid ${activeTrackerInfo.movementBadgeBorder}`
                  }}>
                    {activeTrackerInfo.movementLabel}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                  Driver: <b style={{ color: '#0f172a' }}>{activeTrackerDriver.name}</b> (<a href={`tel:${activeTrackerDriver.phone.replace(/\s+/g, '')}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}>{activeTrackerDriver.phone}</a>) • Plate: <b style={{ color: '#0f172a' }}>{activeTrackerBus.busNo}</b> • Total Distance: <b>{activeTrackerRoute.distanceKm} km</b>
                </p>
              </div>

              {/* Morning Pickup vs Evening Return Toggle */}
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
                  onClick={() => setTrackerDirection('morning')}
                  style={{
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: trackerDirection === 'morning' ? '#0284c7' : 'transparent',
                    color: trackerDirection === 'morning' ? '#ffffff' : '#475569',
                    boxShadow: trackerDirection === 'morning' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  ☀️ Morning Pickup (To Campus)
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerDirection('evening')}
                  style={{
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: trackerDirection === 'evening' ? '#7c3aed' : 'transparent',
                    color: trackerDirection === 'evening' ? '#ffffff' : '#475569',
                    boxShadow: trackerDirection === 'evening' ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🌙 Evening Return (From Campus)
                </button>
              </div>
            </div>

            {/* Live Location Alert / Status Banner */}
            {!activeTrackerInfo.isLiveAvailable ? (
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #f59e0b',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#92400e',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                <span>
                  <b>Live location unavailable:</b> Driver {activeTrackerDriver.name} is not currently broadcasting live GPS for this trip. The scheduled stop sequence and timetable below remain active.
                </span>
              </div>
            ) : (
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                color: '#166534',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="pulse-dot online" />
                  <span>
                    <b>Live GPS Active:</b> Bus is currently {activeTrackerInfo.locationText}. Next stop: <b>{activeTrackerInfo.nextStop?.name}</b> in ~{activeTrackerInfo.etaMinutes} mins.
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', color: '#15803d', fontWeight: 800 }}>
                  Speed: {activeTrackerBus.speed || 0} km/h
                </span>
              </div>
            )}

            {/* Live Interactive Leaflet Map for Selected Bus */}
            <div style={{ marginBottom: '1.5rem' }}>
              <LiveMap
                routes={[activeTrackerRoute]}
                buses={activeTrackerInfo.isLiveAvailable ? [activeTrackerBus] : []}
                highlightStopId={activeTrackerInfo.nearestStop?.id || assignedStop?.id}
                highlightBusId={activeTrackerBus?.id}
                height="400px"
                autoCenterBus={activeTrackerInfo.isLiveAvailable}
                onUserLocationChange={setUserLiveLocation}
              />
            </div>

            {/* Stop Sequence & Timetable Header */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h5 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Route Stop Sequence & Scheduled Timetable
                </h5>
                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {trackerDirection === 'morning'
                    ? `Direction: ${activeTrackerRoute.startPoint} ➔ BEC College Main Campus`
                    : `Direction: BEC College Main Campus ➔ ${activeTrackerRoute.startPoint}`}
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#0284c7', background: '#e0f2fe', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {trackerDisplayStops.length} Total Route Stops
              </span>
            </div>

            {/* Sequential Stops Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {trackerDisplayStops.map((stop, idx) => {
                const isNearest = activeTrackerInfo.isLiveAvailable && stop.id === activeTrackerInfo.nearestStop?.id;
                const isNext = activeTrackerInfo.isLiveAvailable && stop.id === activeTrackerInfo.nextStop?.id;
                const isMyAssignedStop = stop.id === assignedStop?.id;

                return (
                  <div
                    key={stop.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: isNearest ? '#f0fdf4' : isNext ? '#fffbeb' : isMyAssignedStop ? '#eff6ff' : '#f8fafc',
                      border: `1.5px solid ${isNearest ? '#86efac' : isNext ? '#fde68a' : isMyAssignedStop ? '#bae6fd' : '#e2e8f0'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isNearest ? '#16a34a' : isNext ? '#d97706' : isMyAssignedStop ? '#0284c7' : '#64748b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{stop.name}</span>
                          {isNearest && (
                            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                              📍 Nearest Location ({activeTrackerInfo.nearestDistKm?.toFixed(1)} km)
                            </span>
                          )}
                          {isNext && (
                            <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                              ⏭ Next Stop (~{activeTrackerInfo.etaMinutes} mins)
                            </span>
                          )}
                          {isMyAssignedStop && (
                            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                              ⭐ Your Assigned Stop
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                          GPS: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Timetable on Right */}
                    <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          Morning Pickup
                        </div>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
                          {stop.morningTime}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          Evening Drop
                        </div>
                        <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.9rem' }}>
                          {stop.eveningTime}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
