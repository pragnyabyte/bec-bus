import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Square, AlertOctagon, CheckCircle, QrCode, 
  MapPin, Clock, Users, Fuel, AlertTriangle, Radio, 
  Navigation2, Send, Sparkles, Phone, 
  ArrowRightLeft, ShieldCheck, LogOut, Navigation, Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LiveMap from '../Map/LiveMap';
import { api, socket } from '../../services/api';

export default function DriverConsole({
  driver,
  drivers = [],
  buses = [],
  routes = [],
  students = [],
  tripDirection: propTripDirection,
  onTripDirectionChange,
  onDataRefresh,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'passengers' | 'schedule'
  const [isTripActive, setIsTripActive] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(true);
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [qrInput, setQrInput] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentRollInput, setStudentRollInput] = useState('');
  const [boardedOverrides, setBoardedOverrides] = useState({});
  const [manualBoardedStudents, setManualBoardedStudents] = useState([]);
  const [incidentType, setIncidentType] = useState('traffic');
  const [incidentDelay, setIncidentDelay] = useState(15);
  const [incidentDesc, setIncidentDesc] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [localTripDirection, setLocalTripDirection] = useState('morning');
  const tripDirection = propTripDirection !== undefined ? propTripDirection : localTripDirection;
  const setTripDirection = onTripDirectionChange || setLocalTripDirection;
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => new Date().toLocaleTimeString());

  // Find Driver's Assigned Bus & Route (Bus 1 permanently Pragnya, Bus 2 permanently Jitendra)
  const bus = buses.find(b => b.id === driver?.busId) || (driver?.id === 'PRAGNYA01' ? buses[0] : buses[1]) || buses[0];
  const route = routes.find(r => r.id === (driver?.routeId || bus?.routeId)) || routes[0];

  // Merge prop students with optimistic boardedOverrides & newly manualBoardedStudents
  const mergedStudents = useMemo(() => {
    // 1. Apply overrides to existing students
    const list = students.map(s => {
      const override = 
        boardedOverrides[s.id] || 
        boardedOverrides[s.id?.toLowerCase()] || 
        (s.rollNo ? boardedOverrides[s.rollNo] : null) || 
        (s.rollNo ? boardedOverrides[s.rollNo.toLowerCase()] : null);
      if (override) {
        return { ...s, ...override };
      }
      return s;
    });

    // 2. Append newly manually boarded students if not already present
    for (const mb of manualBoardedStudents) {
      const alreadyInList = list.some(s => 
        (s.id && mb.id && s.id.toLowerCase() === mb.id.toLowerCase()) ||
        (s.rollNo && mb.rollNo && s.rollNo.toLowerCase() === mb.rollNo.toLowerCase())
      );
      if (!alreadyInList) {
        list.push(mb);
      }
    }
    return list;
  }, [students, boardedOverrides, manualBoardedStudents]);

  // Strict Bus 1 and Bus 2 passenger segregation:
  // Bus 1 passengers only show up/count towards Bus 1; Bus 2 passengers only towards Bus 2
  const routeStudents = useMemo(() => {
    const targetBusId = bus?.id || (driver?.id === 'PRAGNYA01' ? 'BUS-01' : 'BUS-02');
    const targetRouteId = route?.id || (targetBusId === 'BUS-02' ? 'R-102' : 'R-101');
    return mergedStudents.filter(s => {
      if (s.busId) {
        return s.busId === targetBusId;
      }
      if (s.routeId) {
        return s.routeId === targetRouteId;
      }
      return targetBusId === 'BUS-01';
    });
  }, [mergedStudents, route?.id, bus?.id, driver?.id]);

  // Real-time synchronization when a student boards via their digital pass token
  useEffect(() => {
    const handleStudentBoarded = (data) => {
      if (!data) return;
      const boardedStu = data.student;
      const timestamp = data.timestamp || boardedStu?.boardedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (boardedStu) {
        setBoardedOverrides(prev => ({
          ...prev,
          [boardedStu.id]: { boardedToday: true, boardedTime: timestamp },
          ...(boardedStu.id ? { [boardedStu.id.toLowerCase()]: { boardedToday: true, boardedTime: timestamp } } : {}),
          ...(boardedStu.rollNo ? { [boardedStu.rollNo]: { boardedToday: true, boardedTime: timestamp } } : {}),
          ...(boardedStu.rollNo ? { [boardedStu.rollNo.toLowerCase()]: { boardedToday: true, boardedTime: timestamp } } : {})
        }));
      }
    };

    socket.on('student:boarded', handleStudentBoarded);
    return () => {
      socket.off('student:boarded', handleStudentBoarded);
    };
  }, []);

  // Check valid GPS availability
  const hasValidGps = Boolean(
    bus?.currentLat && 
    bus?.currentLng && 
    !isNaN(bus.currentLat) && 
    !isNaN(bus.currentLng) && 
    (bus.currentLat !== 0 || bus.currentLng !== 0)
  );

  // Sync Last updated timestamp when telemetry changes
  useEffect(() => {
    if (bus?.lastUpdated) {
      try {
        setLastUpdatedTime(new Date(bus.lastUpdated).toLocaleTimeString());
      } catch (e) {
        setLastUpdatedTime(new Date().toLocaleTimeString());
      }
    } else {
      setLastUpdatedTime(new Date().toLocaleTimeString());
    }
  }, [bus?.lastUpdated, bus?.currentLat, bus?.currentLng]);

  // Trip Direction Labels for Bus 1 and Bus 2
  const destination = bus?.id === 'BUS-02' || route?.id === 'R-102' ? 'Patia' : 'Baramunda';
  const morningLabel = `BEC College → ${destination}`;
  const eveningLabel = `${destination} → BEC College`;

  // Bidirectional active stops
  const activeStops = useMemo(() => {
    if (!route?.stops) return [];
    return tripDirection === 'morning' ? [...route.stops].reverse() : route.stops;
  }, [route, tripDirection]);

  // Next stop calculation
  const nextStop = useMemo(() => {
    if (bus?.nextStopId && route?.stops) {
      const found = route.stops.find(s => s.id === bus.nextStopId);
      if (found) return found;
    }
    if (activeStops.length > 0) {
      return activeStops[currentWaypointIndex % activeStops.length];
    }
    return null;
  }, [bus?.nextStopId, route, activeStops, currentWaypointIndex]);

  // Nearest stop and readable location
  const nearestStop = useMemo(() => {
    if (!hasValidGps || !route?.stops?.length) return null;
    let closest = null;
    let minDist = Infinity;
    for (const stop of route.stops) {
      const dist = Math.hypot(stop.lat - bus.currentLat, stop.lng - bus.currentLng);
      if (dist < minDist) {
        minDist = dist;
        closest = stop;
      }
    }
    return minDist < 0.015 ? closest : null;
  }, [hasValidGps, route, bus?.currentLat, bus?.currentLng]);

  const locationDisplay = hasValidGps 
    ? (nearestStop ? `${nearestStop.name}` : `${bus.currentLat.toFixed(4)}, ${bus.currentLng.toFixed(4)}`)
    : 'Location unavailable';

  const busTitle = `${bus?.fleetNumber || (driver?.id === 'PRAGNYA01' ? 'Bus 1' : 'Bus 2')} - Live Location`;


  // Sync trip active status
  useEffect(() => {
    if (bus?.status === 'on_trip') {
      setIsTripActive(true);
    }
  }, [bus]);

  const lastFirestoreSyncRef = useRef(0);

  const broadcastGpsLocation = useCallback((lat, lng, speed, heading, nextStopId = null) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    // 1. Immediate Socket.IO broadcast for local Express backend
    socket.emit('driver:location_update', {
      busId: bus.id,
      routeId: route.id,
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      status: 'on_trip',
      nextStopId
    });

    // 2. Continuous Firestore synchronization for Firebase deployment (throttled to 2.5s)
    const now = Date.now();
    if (now - lastFirestoreSyncRef.current >= 2500) {
      lastFirestoreSyncRef.current = now;
      api.updateBus(bus.id, {
        currentLat: lat,
        currentLng: lng,
        speed: speed || 0,
        heading: heading || 0,
        status: 'on_trip',
        lastUpdated: new Date().toISOString(),
        ...(nextStopId ? { nextStopId } : {})
      }).catch(err => console.warn('[GPS Sync] Notice:', err.message));
    }
  }, [bus?.id, route?.id]);

  // GPS Simulation Loop (works in chosen direction)
  useEffect(() => {
    let intervalId = null;

    if (isTripActive && isSimulatingGps && !useDeviceGps && activeStops.length > 1) {
      intervalId = setInterval(() => {
        setCurrentWaypointIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % activeStops.length;
          const targetStop = activeStops[nextIndex];

          const lat = targetStop.lat;
          const lng = targetStop.lng;
          const speed = Math.floor(32 + Math.random() * 12);
          const heading = Math.floor(Math.random() * 360);

          broadcastGpsLocation(lat, lng, speed, heading, targetStop.id);
          return nextIndex;
        });
      }, Math.max(1000, 3000 / simSpeed));
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTripActive, isSimulatingGps, useDeviceGps, simSpeed, activeStops, broadcastGpsLocation]);

  // Real Device GPS handler (actual driver's phone GPS hardware)
  useEffect(() => {
    let watchId = null;
    if (isTripActive && useDeviceGps && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading } = pos.coords;
          broadcastGpsLocation(
            latitude,
            longitude,
            speed ? Math.round(speed * 3.6) : 32,
            heading || 0,
            nextStop?.id || null
          );
        },
        (err) => console.error('GPS Geolocation Error:', err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTripActive, useDeviceGps, broadcastGpsLocation, nextStop?.id]);

  // Start Trip
  const handleStartTrip = async () => {
    try {
      await api.startTrip({
        busId: bus.id,
        routeId: route.id,
        driverId: driver.id,
        tripType: tripDirection === 'morning' ? 'morning_pickup' : 'evening_drop'
      });
      setIsTripActive(true);
      setStatusMessage(`Trip started (${tripDirection === 'morning' ? morningLabel : eveningLabel})! Live GPS broadcasting active.`);
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // End Trip
  const handleEndTrip = async () => {
    try {
      await api.endTrip({
        busId: bus.id,
        summary: 'Completed regular pickup cycle. All students safely dropped at campus.'
      });
      setIsTripActive(false);
      confetti({ particleCount: 70, spread: 60 });
      setStatusMessage('Trip successfully concluded. Bus status set to Available.');
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Unified Board Student logic for both Manual Form and Passenger Manifest
  const handleBoardStudent = async ({ studentId, rollNo, name, stopId, method = 'manual' }) => {
    const targetRoll = (rollNo || studentId || '').trim();
    const targetName = (name || '').trim();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Immediate optimistic UI updates:
    const overrideKey = studentId || targetRoll;
    setBoardedOverrides(prev => ({
      ...prev,
      [overrideKey]: { boardedToday: true, boardedTime: currentTime },
      ...(targetRoll ? { [targetRoll.toLowerCase()]: { boardedToday: true, boardedTime: currentTime } } : {}),
      ...(studentId ? { [studentId.toLowerCase()]: { boardedToday: true, boardedTime: currentTime } } : {})
    }));

    // If student entered manually, add to manualBoardedStudents list optimistically
    if (targetName && targetRoll) {
      setManualBoardedStudents(prev => {
        const exists = prev.some(s => 
          (s.rollNo && s.rollNo.toLowerCase() === targetRoll.toLowerCase()) || 
          (s.id && s.id.toLowerCase() === overrideKey.toLowerCase())
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: studentId || `STU-${targetRoll}`,
            name: targetName,
            rollNo: targetRoll,
            routeId: route?.id,
            busId: bus?.id,
            boardedToday: true,
            boardedTime: currentTime,
            stopId: stopId || (route?.stops?.[0]?.id || 'STOP-01')
          }
        ];
      });
    }

    // Trigger visual celebration and status message immediately
    confetti({ particleCount: 35, spread: 50 });
    setStatusMessage(`${targetName || targetRoll} boarded successfully!`);
    setStudentNameInput('');
    setStudentRollInput('');
    setQrInput('');

    // 2. Persist to Backend API / Database
    try {
      const res = await api.boardStudent({
        studentId: studentId || targetRoll,
        rollNo: targetRoll,
        name: targetName,
        studentName: targetName,
        busId: bus.id,
        routeId: route.id,
        stopId: stopId || (route?.stops?.[0]?.id || null),
        method
      });

      if (res && res.student) {
        setBoardedOverrides(prev => ({
          ...prev,
          [res.student.id]: { boardedToday: true, boardedTime: res.student.boardedTime || currentTime },
          [res.student.id.toLowerCase()]: { boardedToday: true, boardedTime: res.student.boardedTime || currentTime },
          ...(res.student.rollNo ? { [res.student.rollNo.toLowerCase()]: { boardedToday: true, boardedTime: res.student.boardedTime || currentTime } } : {})
        }));
      }

      // 3. Refresh app state from database so all components stay 100% in sync
      if (onDataRefresh) {
        await onDataRefresh();
      }
    } catch (err) {
      console.error('Error boarding student:', err);
    } finally {
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleManualBoardSubmit = () => {
    const cleanName = studentNameInput.trim();
    const cleanRoll = studentRollInput.trim();
    if (!cleanName || !cleanRoll) {
      setStatusMessage('Please enter both Student Name and Roll Number.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    handleBoardStudent({
      studentId: cleanRoll,
      rollNo: cleanRoll,
      name: cleanName,
      method: 'manual'
    });
  };

  // Report Traffic / Breakdown Incident
  const handleReportIncident = async (e) => {
    e.preventDefault();
    try {
      await api.reportIncident({
        busId: bus.id,
        type: incidentType,
        delayMinutes: Number(incidentDelay),
        description: incidentDesc || `${incidentType.toUpperCase()} encountered on route.`
      });
      setShowIncidentModal(false);
      setStatusMessage('Incident reported and broadcast to waiting students.');
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="android-driver-app">
      {/* SOS Emergency Banner if Active */}
      {bus?.status === 'emergency' && (
        <div className="android-card" style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={24} style={{ color: '#dc2626' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b' }}>
                🚨 EMERGENCY SOS ACTIVE
              </div>
              <div style={{ color: '#b91c1c', fontSize: '0.75rem' }}>
                Campus transport authorities and dispatch are monitoring this bus.
              </div>
            </div>
          </div>
          <button
            className="android-touch-btn"
            style={{ background: '#dc2626', color: '#ffffff', minHeight: '38px', fontSize: '0.8rem' }}
            onClick={async () => {
              await api.updateBus(bus.id, { status: 'on_trip' });
              if (onDataRefresh) onDataRefresh();
            }}
          >
            Clear SOS Flag
          </button>
        </div>
      )}

      {/* Status Snackbar Notification */}
      {statusMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0f9ff',
          border: '1.5px solid #bae6fd',
          borderRadius: '14px',
          color: '#0284c7',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ==========================================
          2. TAB 1: BUS TRACKER & TELEMETRY STREAM
          ========================================== */}
      {activeTab === 'tracker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* PRIMARY TRIP CONTROLS CARD */}
          <div className="android-card">
            <div style={{ marginBottom: '0.85rem' }}>
              {!isTripActive ? (
                <button
                  className="android-touch-btn"
                  onClick={handleStartTrip}
                  id="btn-driver-start-trip"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    boxShadow: '0 3px 12px rgba(2, 132, 199, 0.35)'
                  }}
                >
                  <Play size={20} fill="white" /> START TRIP & SHARE LOCATION
                </button>
              ) : (
                <button
                  className="android-touch-btn"
                  onClick={handleEndTrip}
                  id="btn-driver-end-trip"
                  style={{
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    boxShadow: '0 3px 12px rgba(220, 38, 38, 0.35)'
                  }}
                >
                  <Square size={18} fill="white" /> END TRIP & CONCLUDE ROUTE
                </button>
              )}
            </div>

            {/* GPS Broadcast Mode Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                <span>GPS TRANSMITTER MODE</span>
                <span>{useDeviceGps ? 'Phone Hardware GPS' : `Virtual Sim (${simSpeed}x)`}</span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="android-segment-btn"
                  onClick={() => setUseDeviceGps(false)}
                  style={{
                    background: !useDeviceGps ? '#0284c7' : '#f1f5f9',
                    color: !useDeviceGps ? '#ffffff' : '#64748b',
                    fontSize: '0.75rem'
                  }}
                >
                  Simulation
                </button>
                <button
                  type="button"
                  className="android-segment-btn"
                  onClick={() => setUseDeviceGps(true)}
                  style={{
                    background: useDeviceGps ? '#0284c7' : '#f1f5f9',
                    color: useDeviceGps ? '#ffffff' : '#64748b',
                    fontSize: '0.75rem'
                  }}
                >
                  Phone GPS
                </button>
              </div>

              {!useDeviceGps && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSimSpeed(s)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: simSpeed === s ? '#e0f2fe' : '#ffffff',
                        color: simSpeed === s ? '#0284c7' : '#64748b'
                      }}
                    >
                      {s}x Speed
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TELEMETRY STATS GRID (Android Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="android-stat-card">
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SPEED</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', marginTop: '2px' }}>
                {bus?.speed || 0} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>km/h</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: isTripActive ? '#0284c7' : '#64748b', fontWeight: 700, marginTop: '2px' }}>
                {isTripActive ? '● Broadcasting' : '○ Standby'}
              </div>
            </div>

            <div className="android-stat-card">
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>LOCATION</div>
              <div style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: hasValidGps ? '#0284c7' : '#d97706',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={locationDisplay}>
                {locationDisplay}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                {hasValidGps ? `${bus.currentLat.toFixed(3)}, ${bus.currentLng.toFixed(3)}` : 'Awaiting signal'}
              </div>
            </div>

            <div className="android-stat-card">
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>NEXT STOP</div>
              <div style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: '#0f172a',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {nextStop?.name || 'BEC Campus'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                Upcoming Waypoint
              </div>
            </div>

            <div className="android-stat-card">
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>FUEL & ATTENDANCE</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0284c7', marginTop: '2px' }}>
                {bus?.fuelPercent || 88}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                {routeStudents.filter(s => s.boardedToday).length}/{routeStudents.length} Boarded
              </div>
            </div>
          </div>

          {/* LIVE MAP CARD */}
          <div className="android-card" style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-dot blue" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Live Route Map</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Updated: <b style={{ color: '#0f172a' }}>{lastUpdatedTime}</b>
              </div>
            </div>

            <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {hasValidGps ? (
                <LiveMap
                  routes={route ? [route] : []}
                  buses={bus ? [bus] : []}
                  highlightBusId={bus?.id}
                  height="340px"
                  autoCenterBus={true}
                />
              ) : (
                <div style={{
                  height: '240px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <AlertTriangle size={36} style={{ color: '#d97706' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    Location unavailable
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    Tap <b>Start Trip & Share Location</b> to broadcast real-time GPS coordinates.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          3. TAB 2: STUDENT PASSENGERS & QR SCANNER
          ========================================== */}
      {activeTab === 'passengers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* QR Pass Scanner Card */}
          <div className="android-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
              <QrCode size={18} style={{ color: '#0284c7' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Student Pass Scanner
              </h3>
            </div>

            <div style={{
              background: '#f0f9ff',
              border: '2px dashed #bae6fd',
              borderRadius: '14px',
              padding: '1.25rem 1rem',
              textAlign: 'center',
              marginBottom: '0.85rem'
            }}>
              <QrCode size={44} style={{ color: '#0284c7', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Scan Pass or Enter Details</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Enter student name and roll number to board
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Student Name"
                value={studentNameInput}
                onChange={e => setStudentNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleManualBoardSubmit();
                }}
                style={{ width: '100%', minHeight: '44px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Student Roll No"
                  value={studentRollInput}
                  onChange={e => setStudentRollInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleManualBoardSubmit();
                  }}
                  style={{ flex: 1, minHeight: '44px' }}
                />
                <button
                  className="android-touch-btn"
                  onClick={handleManualBoardSubmit}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    width: 'auto',
                    padding: '0 1.25rem',
                    flexShrink: 0,
                    fontWeight: 700
                  }}
                >
                  Board
                </button>
              </div>
            </div>
          </div>

          {/* Passenger Manifest Card */}
          <div className="android-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Passenger Manifest ({routeStudents.length})
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Registered students for {route?.code}
                </div>
              </div>
              <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                {routeStudents.filter(s => s.boardedToday).length} Boarded
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {routeStudents.map(student => (
                <div
                  key={student.id}
                  className="android-list-card"
                  style={{
                    background: student.boardedToday ? '#f0f9ff' : '#ffffff',
                    borderColor: student.boardedToday ? '#bae6fd' : '#e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        {student.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                        Roll: <b style={{ color: '#0284c7' }}>{student.rollNo}</b> • Stop: {route?.stops?.find(s => s.id === student.stopId)?.name || 'Designated Stop'}
                      </div>
                    </div>

                    {student.boardedToday ? (
                      <span className="badge badge-blue" style={{ fontSize: '0.74rem', fontWeight: 800, padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> BOARDED • {student.boardedTime || 'Boarded'}
                      </span>
                    ) : (
                      <button
                        className="android-touch-btn"
                        onClick={() => handleBoardStudent({
                          studentId: student.id,
                          rollNo: student.rollNo,
                          name: student.name,
                          stopId: student.stopId,
                          method: 'manifest'
                        })}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #bae6fd',
                          color: '#0284c7',
                          width: 'auto',
                          padding: '0.35rem 0.75rem',
                          minHeight: '34px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Mark Boarded
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          4. TAB 3: ROUTE STOPS & TIMETABLE
          ========================================== */}
      {activeTab === 'schedule' && (
        <div className="android-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '4px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {route?.code}: {route?.name}
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {activeStops.length} Designated Waypoint Stops
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>
              {tripDirection === 'morning' ? '☀️ Morning' : '🌙 Evening'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activeStops.map((stop, i) => (
              <div
                key={stop.id}
                className="android-list-card"
                style={{ padding: '0.75rem 0.85rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                      {tripDirection === 'morning' ? 'Pickup' : 'Drop'}
                    </div>
                    <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}>
                      {tripDirection === 'morning' ? stop.morningTime : stop.eveningTime}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          5. ANDROID BOTTOM NAVIGATION BAR
          ========================================== */}
      <nav className="android-bottom-nav">
        <button
          type="button"
          className={`android-nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}
          id="driver-bottom-nav-tracker"
          aria-label="Bus Tracker"
        >
          <div className="android-nav-pill">
            <Compass size={20} />
          </div>
          <span className="android-nav-label">Tracker</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'passengers' ? 'active' : ''}`}
          onClick={() => setActiveTab('passengers')}
          id="driver-bottom-nav-passengers"
          aria-label="Passengers"
        >
          <div className="android-nav-pill">
            <Users size={20} />
          </div>
          <span className="android-nav-label">Passengers</span>
        </button>

        <button
          type="button"
          className="android-nav-item"
          onClick={() => setShowIncidentModal(true)}
          id="driver-bottom-nav-delay"
          aria-label="Report Delay"
        >
          <div className="android-nav-pill">
            <AlertTriangle size={20} />
          </div>
          <span className="android-nav-label">Report Delay</span>
        </button>
      </nav>

      {/* ==========================================
          6. INCIDENT REPORT MODAL (ANDROID DIALOG)
          ========================================== */}
      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
              <AlertTriangle style={{ color: '#d97706' }} size={22} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Report Route Delay
              </h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Broadcast an immediate notification to students waiting at upcoming stops.
            </p>

            <form onSubmit={handleReportIncident}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Incident Type</label>
                <select className="form-select" value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                  <option value="traffic">Heavy Traffic Jam</option>
                  <option value="breakdown">Bus Mechanical Breakdown</option>
                  <option value="weather">Heavy Rain / Waterlogging</option>
                  <option value="roadblock">Road Construction / Diversion</option>
                </select>
              </div>

              {incidentType === 'traffic' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Estimated Delay</label>
                  <select className="form-select" value={incidentDelay} onChange={e => setIncidentDelay(e.target.value)}>
                    <option value={10}>10 Minutes Delay</option>
                    <option value={15}>15 Minutes Delay</option>
                    <option value={25}>25 Minutes Delay</option>
                    <option value={40}>40+ Minutes Delay</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Remarks / Location Note</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Stuck near flyover due to heavy bottleneck..."
                  value={incidentDesc}
                  onChange={e => setIncidentDesc(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="android-touch-btn"
                  onClick={() => setShowIncidentModal(false)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="android-touch-btn"
                  style={{ flex: 2, background: '#0284c7', color: '#ffffff' }}
                >
                  <Send size={16} /> Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
