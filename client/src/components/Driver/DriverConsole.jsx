import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Square, AlertOctagon, CheckCircle, QrCode, 
  MapPin, Clock, Users, Fuel, AlertTriangle, Radio, 
  Navigation2, Send, Sparkles, Phone, 
  ArrowRightLeft, ShieldCheck
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
  onDataRefresh
}) {
  const [activeTab, setActiveTab] = useState('console'); // 'console' | 'passengers' | 'schedule'
  const [isTripActive, setIsTripActive] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(true);
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [qrInput, setQrInput] = useState('');
  const [incidentType, setIncidentType] = useState('traffic');
  const [incidentDelay, setIncidentDelay] = useState(15);
  const [incidentDesc, setIncidentDesc] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [tripDirection, setTripDirection] = useState('morning'); // 'morning' | 'evening'

  // Find Driver's Assigned Bus & Route (Bus 1 permanently Pragnya, Bus 2 permanently Jitendra)
  const bus = buses.find(b => b.id === driver?.busId) || (driver?.id === 'PRAGNYA01' ? buses[0] : buses[1]) || buses[0];
  const route = routes.find(r => r.id === (driver?.routeId || bus?.routeId)) || routes[0];
  const routeStudents = students.filter(s => s.routeId === route?.id);

  // Trip Direction Labels for Bus 1 and Bus 2
  const destination = bus?.id === 'BUS-02' || route?.id === 'R-102' ? 'Patia' : 'Baramunda';
  const morningLabel = `From BEC College → ${destination}`;
  const eveningLabel = `From ${destination} → BEC College`;

  // Bidirectional active stops
  // Morning: From BEC College → Destination
  // Evening: From Destination → BEC College
  const activeStops = useMemo(() => {
    if (!route?.stops) return [];
    return tripDirection === 'morning' ? [...route.stops].reverse() : route.stops;
  }, [route, tripDirection]);

  // Identify Co-Driver
  const coDriver = useMemo(() => {
    return drivers.find(d => d.id !== driver?.id) || (driver?.id === 'PRAGNYA01' ? drivers.find(d => d.id === 'JITENDRA01') : drivers.find(d => d.id === 'PRAGNYA01'));
  }, [drivers, driver]);

  // Sync trip active status
  useEffect(() => {
    if (bus?.status === 'on_trip') {
      setIsTripActive(true);
    }
  }, [bus]);

  // GPS Simulation Loop (works in chosen direction!)
  useEffect(() => {
    let intervalId = null;

    if (isTripActive && isSimulatingGps && !useDeviceGps && activeStops.length > 1) {
      intervalId = setInterval(() => {
        setCurrentWaypointIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % activeStops.length;
          const nextStop = activeStops[nextIndex];

          const lat = nextStop.lat;
          const lng = nextStop.lng;
          const speed = Math.floor(32 + Math.random() * 12);
          const heading = Math.floor(Math.random() * 360);

          // Emit to Socket.IO backend
          socket.emit('driver:location_update', {
            busId: bus.id,
            routeId: route.id,
            lat,
            lng,
            speed,
            heading,
            nextStopId: nextStop.id
          });

          return nextIndex;
        });
      }, Math.max(1000, 3000 / simSpeed));
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTripActive, isSimulatingGps, useDeviceGps, simSpeed, activeStops, route, bus]);

  // Real Device GPS handler
  useEffect(() => {
    let watchId = null;
    if (isTripActive && useDeviceGps && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading } = pos.coords;
          socket.emit('driver:location_update', {
            busId: bus.id,
            routeId: route.id,
            lat: latitude,
            lng: longitude,
            speed: speed ? Math.round(speed * 3.6) : 35,
            heading: heading || 0
          });
        },
        (err) => console.error('GPS Geolocation Error:', err),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTripActive, useDeviceGps, bus, route]);

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

  // Board Student (QR or 1-tap manual)
  const handleBoardStudent = async (studentId, method = 'manual') => {
    try {
      await api.boardStudent({
        studentId,
        busId: bus.id,
        method
      });
      confetti({ particleCount: 30, spread: 45 });
      setQrInput('');
      setStatusMessage(`Student boarded successfully!`);
      if (onDataRefresh) onDataRefresh();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* SOS Alert Banner if in emergency */}
      {bus?.status === 'emergency' && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'emergency-throb 1s infinite alternate'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertOctagon size={32} style={{ color: '#dc2626' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#991b1b' }}>
                🚨 EMERGENCY SOS ACTIVE FOR THIS BUS
              </div>
              <div style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                Campus transport authorities and police dispatch have been notified of your location.
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={async () => {
              await api.updateBus(bus.id, { status: 'on_trip' });
              if (onDataRefresh) onDataRefresh();
            }}
          >
            Clear SOS Flag
          </button>
        </div>
      )}

      {/* Driver Header Card with Complete Profile & Call Controls */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 3px 12px rgba(2, 132, 199, 0.3)',
              flexShrink: 0
            }}>
              {driver?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#0f172a' }}>{driver?.name}</h2>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 800 }}>
                  ID: {driver?.id}
                </span>
                <span className="badge badge-green">On Duty</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '3px' }}>
                <span>Assigned Bus: <b style={{ color: '#0284c7' }}>{bus?.fleetNumber} ({bus?.busNo})</b></span>
                <span>Route: <b style={{ color: '#0f172a' }}>{route?.name}</b></span>
                <span>License: <b style={{ color: '#334155' }}>{driver?.licenseNo}</b></span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons: Driver Phone Call */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 700 }}>YOUR PHONE</div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{driver?.phone}</div>
              </div>
              <a
                href={`tel:${driver?.phone ? driver.phone.replace(/\s+/g, '') : ''}`}
                className="btn btn-sm"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.35rem 0.7rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none'
                }}
                title={`Open dialer for ${driver?.name} (${driver?.phone})`}
              >
                <Phone size={13} /> Call
              </a>
            </div>
          </div>
        </div>

        {/* Lower Row: Bidirectional Trip Direction Selector & Co-Driver Coordination */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Direction Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Trip Direction:</span>
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #cbd5e1',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setTripDirection('morning')}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tripDirection === 'morning' ? '#0284c7' : 'transparent',
                  color: tripDirection === 'morning' ? '#ffffff' : '#475569',
                  boxShadow: tripDirection === 'morning' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                ☀️ Morning: {morningLabel}
              </button>
              <button
                type="button"
                onClick={() => setTripDirection('evening')}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tripDirection === 'evening' ? '#7c3aed' : 'transparent',
                  color: tripDirection === 'evening' ? '#ffffff' : '#475569',
                  boxShadow: tripDirection === 'evening' ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🌙 Evening: {eveningLabel}
              </button>
            </div>
          </div>

          {/* Co-Driver Quick Call Block */}
          {coDriver && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem'
            }}>
              <span style={{ color: '#64748b' }}>Co-Driver ({coDriver.busName || (coDriver.id === 'PRAGNYA01' ? 'Bus 1' : 'Bus 2')}):</span>
              <b style={{ color: '#0f172a' }}>{coDriver.name}</b>
              <span style={{ color: '#475569' }}>{coDriver.phone}</span>
              <a
                href={`tel:${coDriver.phone.replace(/\s+/g, '')}`}
                className="btn btn-sm"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none'
                }}
                title={`Call Co-Driver ${coDriver.name} at ${coDriver.phone}`}
              >
                <Phone size={11} /> Call Co-Driver
              </a>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 'var(--radius-md)',
          color: '#0284c7',
          fontSize: '0.9rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontWeight: 600
        }}>
          <CheckCircle size={18} /> {statusMessage}
        </div>
      )}

      {/* Driver Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          <Radio size={16} /> Live Trip Console & Telemetry
        </button>
        <button
          className={`tab-btn ${activeTab === 'passengers' ? 'active' : ''}`}
          onClick={() => setActiveTab('passengers')}
        >
          <Users size={16} /> Student Attendance & QR Scan ({bus?.occupied || 0}/{bus?.capacity || 45})
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Clock size={16} /> Route Waypoints & Stops ({route?.stops?.length || 0})
        </button>
      </div>

      {activeTab === 'console' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Trip Controller & GPS Simulation Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Trip Controller Card */}
            <div className="glass-card" style={{ borderLeft: `5px solid ${isTripActive ? '#059669' : '#0284c7'}` }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Trip Operations Controller
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: isTripActive ? '#059669' : '#0f172a' }}>
                    {isTripActive ? 'Trip In Progress' : 'Bus Idle / Ready'}
                  </h3>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {isTripActive ? 'GPS location stream is active' : 'Press Start Trip to begin telemetry broadcast'}
                  </div>
                </div>
                <span className={`badge ${isTripActive ? 'badge-green' : 'badge-blue'}`} style={{ padding: '0.4rem 0.8rem' }}>
                  <span className={`pulse-dot ${isTripActive ? 'online' : ''}`} />
                  {isTripActive ? 'Broadcasting Live' : 'Standby'}
                </span>
              </div>

              {/* Start / End Trip Big Button */}
              {!isTripActive ? (
                <button
                  className="btn btn-success btn-lg"
                  onClick={handleStartTrip}
                  style={{ width: '100%', gap: '0.75rem', fontWeight: 800 }}
                >
                  <Play size={22} fill="white" /> START TRIP & SHARE LOCATION
                </button>
              ) : (
                <button
                  className="btn btn-danger btn-lg"
                  onClick={handleEndTrip}
                  style={{ width: '100%', gap: '0.75rem', fontWeight: 800 }}
                >
                  <Square size={20} fill="white" /> END TRIP & CONCLUDE ROUTE
                </button>
              )}

              {/* Quick Incident Reporting Button */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowIncidentModal(true)}
                  style={{ flex: 1 }}
                >
                  <AlertTriangle size={15} style={{ color: '#d97706' }} /> Report Traffic / Delay
                </button>
              </div>
            </div>

            {/* GPS Telemetry & Simulation Controls */}
            <div className="glass-card">
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Navigation2 size={18} style={{ color: '#0284c7' }} /> GPS & Transmitter Controls
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CURRENT SPEED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>
                    {bus?.speed || 0} <span style={{ fontSize: '0.8rem' }}>km/h</span>
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>FUEL STATUS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                    {bus?.fuelPercent || 88}%
                  </div>
                </div>
              </div>

              {/* Mode Toggle: Auto Simulator vs Real Mobile GPS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>GPS Mode:</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className={`btn btn-sm ${!useDeviceGps ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setUseDeviceGps(false)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Route Simulation
                    </button>
                    <button
                      className={`btn btn-sm ${useDeviceGps ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setUseDeviceGps(true)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Device GPS (Phone)
                    </button>
                  </div>
                </div>

                {!useDeviceGps && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Simulation Pace:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 4].map(s => (
                        <button
                          key={s}
                          className={`btn btn-sm ${simSpeed === s ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setSimSpeed(s)}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Driver Route Map View */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                Assigned Route Map: {route?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Lat: {bus?.currentLat.toFixed(4)}, Lng: {bus?.currentLng.toFixed(4)}
              </div>
            </div>
            <LiveMap
              routes={route ? [route] : []}
              buses={bus ? [bus] : []}
              highlightBusId={bus?.id}
              height="380px"
              autoCenterBus={true}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Student Attendance & QR Scan */}
      {activeTab === 'passengers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Quick QR Scanner Simulator Card */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <QrCode size={18} style={{ color: '#0284c7' }} /> Student QR Pass Scanner
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Scan the student's digital college ID or enter their Roll Number to mark boarding.
            </p>

            <div style={{
              background: '#f0f9ff',
              border: '2px dashed #bae6fd',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              <QrCode size={56} style={{ color: '#0284c7', margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Ready to Scan Pass</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Camera scanner ready or enter Roll Number below
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Student Roll No or Token..."
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (qrInput.trim()) {
                    handleBoardStudent(qrInput.trim(), 'qr');
                  }
                }}
              >
                Scan & Board
              </button>
            </div>
          </div>

          {/* Route Student Checklist Manifest */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', color: '#0f172a' }}>Passenger Manifest ({routeStudents.length})</h4>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Students registered for {route?.code}</div>
              </div>
              <span className="badge badge-blue">
                {routeStudents.filter(s => s.boardedToday).length} Boarded
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
              {routeStudents.map(student => (
                <div
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: student.boardedToday ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${student.boardedToday ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{student.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {student.rollNo} • Stop: {route?.stops?.find(s => s.id === student.stopId)?.name || 'Stop'}
                    </div>
                  </div>

                  {student.boardedToday ? (
                    <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                      <CheckCircle size={12} /> {student.boardedTime || 'Boarded'}
                    </span>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleBoardStudent(student.id, 'manual')}
                      style={{ fontSize: '0.75rem', borderColor: '#bbf7d0', color: '#059669', background: '#ffffff' }}
                    >
                      Mark Boarded
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Route Schedule & Stops */}
      {activeTab === 'schedule' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '1.2rem', color: '#0f172a' }}>
              Schedule & Stops: {route?.name}
            </h4>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: tripDirection === 'morning' ? '#e0f2fe' : '#f5f3ff', color: tripDirection === 'morning' ? '#0369a1' : '#6d28d9', borderRadius: '4px', fontWeight: 700 }}>
              {tripDirection === 'morning' ? `☀️ Morning: ${morningLabel}` : `🌙 Evening: ${eveningLabel}`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeStops.map((stop, i) => (
              <div
                key={stop.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{stop.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Coordinates: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Morning Schedule</div>
                    <div style={{ fontWeight: 700, color: '#059669' }}>{stop.morningTime}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Evening Return</div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{stop.eveningTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident Report Modal */}
      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <AlertTriangle style={{ color: '#d97706' }} /> Report Route Delay or Issue
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Broadcast an immediate notification to students waiting at upcoming stops.
            </p>

            <form onSubmit={handleReportIncident}>
              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select className="form-select" value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                  <option value="traffic">Heavy Traffic Jam</option>
                  <option value="breakdown">Bus Mechanical Breakdown</option>
                  <option value="weather">Heavy Rain / Waterlogging</option>
                  <option value="roadblock">Road Construction / Diversion</option>
                </select>
              </div>

              {incidentType === 'traffic' && (
                <div className="form-group">
                  <label className="form-label">Estimated Delay (Minutes)</label>
                  <select className="form-select" value={incidentDelay} onChange={e => setIncidentDelay(e.target.value)}>
                    <option value={10}>10 Minutes Delay</option>
                    <option value={15}>15 Minutes Delay</option>
                    <option value={25}>25 Minutes Delay</option>
                    <option value={40}>40+ Minutes Delay</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Remarks / Location Note</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Stuck near Silk Board flyover due to heavy bottleneck..."
                  value={incidentDesc}
                  onChange={e => setIncidentDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowIncidentModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <Send size={16} /> Broadcast Incident Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
