import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bus, MapPin, Clock, ShieldCheck, AlertTriangle, 
  QrCode, ArrowRightLeft, MessageSquare, Phone, 
  Navigation, CheckCircle2, AlertCircle, Info, ChevronRight,
  Edit3, LogOut, Radio, Compass, Footprints, RefreshCw, User
} from 'lucide-react';
import LiveMap from '../Map/LiveMap';
import DigitalPassModal from './DigitalPassModal';
import ComplaintModal from './ComplaintModal';
import RouteChangeModal from './RouteChangeModal';
import SeeAllStopsModal from './SeeAllStopsModal';
import { api } from '../../services/api';

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
  const [showSeeAllStopsModal, setShowSeeAllStopsModal] = useState(false);

  // Explicitly ensure Student Dashboard loads directly with NO pop-ups or overlays covering the view
  useEffect(() => {
    setShowPassModal(false);
    setShowComplaintModal(false);
    setShowRouteChangeModal(false);
    setShowSeeAllStopsModal(false);
  }, []);

  const [activeTab, setActiveTab] = useState('bus_tracker'); // 'bus_tracker' | 'live_track' | 'route_details' | 'issues'
  const [userLiveLocation, setUserLiveLocation] = useState(null); // Real device GPS from browser
  const [routeDirection, setRouteDirection] = useState('morning'); // 'morning' | 'evening'
  const [trackerDirection, setTrackerDirection] = useState('morning'); // 'morning' | 'evening'

  // Student Issue Reporting State
  const [issueType, setIssueType] = useState('Bus Delay & Timing');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState('');
  const [issueErrorMsg, setIssueErrorMsg] = useState('');

  // ==========================================
  // REAL-TIME DEVICE GEOLOCATION STATE
  // ==========================================
  const [gpsStatus, setGpsStatus] = useState('requesting'); // 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error'
  const [gpsCoords, setGpsCoords] = useState(null); // { lat, lng, accuracy }
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');

  // Coordinate validity check (strict Odisha / Bhubaneswar bounds)
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

  // ==========================================
  // STUDENT BUS ASSIGNMENT & PRIVACY FILTERING
  // If assigned to Bus 1: Student sees ONLY Bus 1 information.
  // If assigned to Bus 2: Student sees ONLY Bus 2 information.
  // ==========================================
  const assignedBusId = useMemo(() => {
    if (
      student?.busId === 'BUS-02' ||
      student?.busId === 'BUS-2' ||
      student?.fleetNumber === 'Bus 2' ||
      student?.bus === 'Bus 2' ||
      student?.routeId === 'R-102' ||
      student?.routeId === 'RT-02'
    ) {
      return 'BUS-02';
    }
    const r = routes.find(route => route.id === student?.routeId || route.code === student?.routeId);
    if (r && (r.busId === 'BUS-02' || r.id === 'R-102' || r.code === 'RT-02')) {
      return 'BUS-02';
    }
    return 'BUS-01';
  }, [student, routes]);

  const isBus2 = assignedBusId === 'BUS-02';

  // Strictly Assigned Bus Object
  const assignedBus = useMemo(() => {
    if (isBus2) {
      return buses.find(b => b.id === 'BUS-02' || b.fleetNumber === 'Bus 2') || {
        id: 'BUS-02',
        fleetNumber: 'Bus 2',
        busNo: 'OD-02-AX-2002',
        driverName: 'Jitendra',
        driverId: 'JITENDRA01',
        routeId: 'R-102',
        routeName: 'BEC College ↔ Patia',
        capacity: 50,
        status: 'idle',
        speed: 0,
        currentLat: 20.3548,
        currentLng: 85.8197
      };
    }
    return buses.find(b => b.id === 'BUS-01' || b.fleetNumber === 'Bus 1') || {
      id: 'BUS-01',
      fleetNumber: 'Bus 1',
      busNo: 'OD-02-AX-1001',
      driverName: 'Pragnya',
      driverId: 'PRAGNYA01',
      routeId: 'R-101',
      routeName: 'BEC College ↔ Baramunda',
      capacity: 50,
      status: 'idle',
      speed: 0,
      currentLat: 20.2798,
      currentLng: 85.7972
    };
  }, [buses, isBus2]);

  // Strictly Assigned Route Object
  const assignedRoute = useMemo(() => {
    if (isBus2) {
      return routes.find(r => r.id === 'R-102' || r.code === 'RT-02') || {
        id: 'R-102',
        code: 'RT-02',
        name: 'BEC College ↔ Patia',
        busId: 'BUS-02',
        startPoint: 'Patia Big Bazaar',
        distanceKm: 18.2,
        totalDurationMin: 45,
        stops: [
          { id: 'S-201', name: 'Patia Big Bazaar', lat: 20.3548, lng: 85.8197, morningPickup: '07:10 AM', eveningDrop: '05:35 PM', morningTime: '07:10 AM', eveningTime: '05:35 PM', sequence: 1 },
          { id: 'S-202', name: 'KIIT Square', lat: 20.3533, lng: 85.8166, morningPickup: '07:20 AM', eveningDrop: '05:25 PM', morningTime: '07:20 AM', eveningTime: '05:25 PM', sequence: 2 },
          { id: 'S-203', name: 'Damana Square', lat: 20.3275, lng: 85.8188, morningPickup: '07:30 AM', eveningDrop: '05:15 PM', morningTime: '07:30 AM', eveningTime: '05:15 PM', sequence: 3 },
          { id: 'S-204', name: 'Acharya Vihar', lat: 20.3032, lng: 85.8309, morningPickup: '07:45 AM', eveningDrop: '05:00 PM', morningTime: '07:45 AM', eveningTime: '05:00 PM', sequence: 4 },
          { id: 'S-205', name: 'BEC Campus Terminal', lat: 20.2195, lng: 85.7360, morningPickup: '08:15 AM', eveningDrop: '04:30 PM', morningTime: '08:15 AM', eveningTime: '04:30 PM', sequence: 5 }
        ]
      };
    }
    return routes.find(r => r.id === 'R-101' || r.code === 'RT-01') || {
      id: 'R-101',
      code: 'RT-01',
      name: 'BEC College ↔ Baramunda',
      busId: 'BUS-01',
      startPoint: 'Baramunda Bus Stand',
      distanceKm: 14.5,
      totalDurationMin: 40,
      stops: [
        { id: 'S-101', name: 'Baramunda Bus Stand', lat: 20.2798, lng: 85.7972, morningPickup: '07:15 AM', eveningDrop: '05:30 PM', morningTime: '07:15 AM', eveningTime: '05:30 PM', sequence: 1 },
        { id: 'S-102', name: 'Khandagiri Square', lat: 20.2601, lng: 85.7877, morningPickup: '07:25 AM', eveningDrop: '05:20 PM', morningTime: '07:25 AM', eveningTime: '05:20 PM', sequence: 2 },
        { id: 'S-103', name: 'Fire Station', lat: 20.2872, lng: 85.8142, morningPickup: '07:35 AM', eveningDrop: '05:10 PM', morningTime: '07:35 AM', eveningTime: '05:10 PM', sequence: 3 },
        { id: 'S-104', name: 'Jayadev Vihar', lat: 20.3015, lng: 85.8239, morningPickup: '07:45 AM', eveningDrop: '05:00 PM', morningTime: '07:45 AM', eveningTime: '05:00 PM', sequence: 4 },
        { id: 'S-105', name: 'BEC Campus Terminal', lat: 20.2195, lng: 85.7360, morningPickup: '08:15 AM', eveningDrop: '04:30 PM', morningTime: '08:15 AM', eveningTime: '04:30 PM', sequence: 5 }
      ]
    };
  }, [routes, isBus2]);

  // Strictly Assigned Driver Object
  const assignedDriver = useMemo(() => {
    if (isBus2) {
      return drivers.find(d => d.id === 'JITENDRA01' || d.name === 'Jitendra' || d.busId === 'BUS-02') || {
        id: 'JITENDRA01',
        name: 'Jitendra',
        phone: '+916370998587',
        licenseNo: 'OD-02-2018-DL9942',
        rating: 4.8
      };
    }
    return drivers.find(d => d.id === 'PRAGNYA01' || d.name === 'Pragnya' || d.busId === 'BUS-01') || {
      id: 'PRAGNYA01',
      name: 'Pragnya',
      phone: '+919040833547',
      licenseNo: 'OD-02-2016-DL8812',
      rating: 4.9
    };
  }, [drivers, isBus2]);

  // Assigned stop fallback to start point of route (index 0) instead of index 2
  const assignedStop = useMemo(() => {
    return assignedRoute?.stops?.find(s => s.id === student?.stopId) || assignedRoute?.stops?.[0];
  }, [assignedRoute, student]);

  // Configured stops for assigned route only (Candidate stops for nearest calculation)
  const candidateStops = useMemo(() => {
    return assignedRoute?.stops || [];
  }, [assignedRoute]);

  // ==========================================
  // REAL-TIME GEOLOCATION REQUEST & WATCH
  // Automatically requests location on load and watches continuously
  // ==========================================
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMsg('Geolocation is not supported by your browser.');
      return null;
    }

    setGpsStatus('requesting');
    setGpsErrorMsg('');

    // 1. Initial Position Request
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setGpsCoords(coords);
        setUserLiveLocation(coords);
        setGpsStatus('granted');
        setGpsErrorMsg('');
      },
      (err) => {
        console.warn('[GPS Position Warning]:', err.code, err.message);
        if (err.code === 1) { // PERMISSION_DENIED
          setGpsStatus('denied');
          setGpsErrorMsg('Location permission was denied. Please allow location access in your browser to detect your nearest bus stop.');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setGpsStatus('unavailable');
          setGpsErrorMsg('Location is unavailable. Please check that device GPS is enabled.');
        } else if (err.code === 3) { // TIMEOUT
          setGpsStatus('unavailable');
          setGpsErrorMsg('Location request timed out. Please try again.');
        } else {
          setGpsStatus('error');
          setGpsErrorMsg(err.message || 'Unable to retrieve your current location.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );

    // 2. Continuous watchPosition to track movement dynamically
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setGpsCoords(coords);
          setUserLiveLocation(coords);
          setGpsStatus('granted');
          setGpsErrorMsg('');
        },
        (err) => {
          if (err.code === 1) {
            setGpsStatus('denied');
            setGpsErrorMsg('Location permission was denied.');
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
      return id;
    } catch (e) {
      console.warn('[GPS Watch Exception]:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    const id = requestLocation();
    return () => {
      if (id !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, [requestLocation]);

  // ==========================================
  // DYNAMIC NEAREST BUS STOP CALCULATION
  // Compares student's real-time GPS location with configured stops
  // ==========================================
  const nearestBusStopData = useMemo(() => {
    if (!gpsCoords || !candidateStops.length) return null;

    let nearest = null;
    let minDistanceKm = Infinity;

    for (const stop of candidateStops) {
      if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
        const d = calcHaversineKm(gpsCoords.lat, gpsCoords.lng, stop.lat, stop.lng);
        if (d < minDistanceKm) {
          minDistanceKm = d;
          nearest = stop;
        }
      }
    }

    if (!nearest) return null;

    // Standard human walking speed: ~4.8 km/h (approx 80 meters per minute)
    const walkingMinutes = Math.max(1, Math.round((minDistanceKm / 4.8) * 60));

    return {
      stop: nearest,
      distanceKm: minDistanceKm,
      walkingMinutes
    };
  }, [gpsCoords, candidateStops]);

  // Helper to parse timetable time ("07:25 AM", "05:20 PM") into minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // ==========================================
  // NEXT BUS CALCULATION FOR DETECTED NEAREST STOP
  // Displays only the student's assigned bus and calculates next arrival
  // ==========================================
  const nextBusInfo = useMemo(() => {
    const targetStop = nearestBusStopData?.stop || candidateStops[0];
    if (!targetStop) return null;

    const fleetName = assignedBus?.fleetNumber || (isBus2 ? 'Bus 2' : 'Bus 1');
    const busStatus = assignedBus?.status || 'idle';
    const isEnRoute = (busStatus === 'on_trip' || busStatus === 'emergency') && isCoordValid(assignedBus?.currentLat, assignedBus?.currentLng);

    // 1. Bus is actively on trip with live GPS telemetry
    if (isEnRoute) {
      const isEvening = assignedBus?.activeTrip?.direction === 'evening' || (new Date().getHours() >= 12);
      const destination = isEvening 
        ? (isBus2 ? 'Patia' : 'Baramunda')
        : 'BEC College Main Campus';

      const distBusToStop = calcHaversineKm(assignedBus.currentLat, assignedBus.currentLng, targetStop.lat, targetStop.lng);
      const effectiveSpeed = (assignedBus.speed && assignedBus.speed > 5) ? assignedBus.speed : 28;
      const etaMin = Math.max(1, Math.round((distBusToStop / effectiveSpeed) * 60));

      const arrivalDate = new Date(Date.now() + etaMin * 60000);
      const arrivalTimeFormatted = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      return {
        operating: true,
        isLive: true,
        busName: fleetName,
        scheduledOrLiveTime: arrivalTimeFormatted,
        destination,
        statusLabel: `Live ETA (~${etaMin} min)`,
        badgeBg: '#e0f2fe',
        badgeColor: '#0284c7',
        badgeBorder: '#bae6fd'
      };
    }

    // 2. Bus is idle: calculate next scheduled run based on timetable
    const morningTimeStr = targetStop.morningPickup || targetStop.morningTime || '07:25 AM';
    const eveningTimeStr = targetStop.eveningDrop || targetStop.eveningTime || '05:20 PM';

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const morningMinutes = parseTimeToMinutes(morningTimeStr) ?? (7 * 60 + 25);
    const eveningMinutes = parseTimeToMinutes(eveningTimeStr) ?? (17 * 60 + 20);

    // Morning trip is upcoming or current
    if (currentMinutes <= morningMinutes + 35) {
      return {
        operating: true,
        isLive: false,
        busName: fleetName,
        scheduledOrLiveTime: morningTimeStr,
        destination: 'BEC College Main Campus',
        statusLabel: 'Scheduled Inbound',
        badgeBg: '#f0f9ff',
        badgeColor: '#0369a1',
        badgeBorder: '#bae6fd'
      };
    }

    // Evening drop trip is upcoming
    if (currentMinutes <= eveningMinutes + 45) {
      return {
        operating: true,
        isLive: false,
        busName: fleetName,
        scheduledOrLiveTime: eveningTimeStr,
        destination: isBus2 ? 'Patia' : 'Baramunda',
        statusLabel: 'Scheduled Outbound',
        badgeBg: '#faf5ff',
        badgeColor: '#7c3aed',
        badgeBorder: '#e9d5ff'
      };
    }

    // Past late evening run and bus is idle
    return {
      operating: false,
      isLive: false,
      busName: fleetName,
      scheduledOrLiveTime: 'No upcoming bus',
      destination: 'Service completed for today',
      statusLabel: 'Idle at Terminal',
      badgeBg: '#f1f5f9',
      badgeColor: '#64748b',
      badgeBorder: '#cbd5e1'
    };
  }, [nearestBusStopData, candidateStops, assignedBus, isBus2]);

  // Determine Tracking, Movement, Nearest & Next Stop for assigned bus
  const getBusTrackingDetails = (bus, route) => {
    const hasValidCoords = bus && isCoordValid(bus.currentLat, bus.currentLng);
    const isEnRoute = bus && (bus.status === 'on_trip' || bus.status === 'emergency');

    let movementState = 'not_started';
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
      movementBadgeBg = '#e0f2fe';
      movementBadgeColor = '#0284c7';
      movementBadgeBorder = '#bae6fd';
    } else {
      movementState = 'stopped';
      movementLabel = 'Stopped (0 km/h)';
      movementBadgeBg = '#fef3c7';
      movementBadgeColor = '#b45309';
      movementBadgeBorder = '#fde68a';
    }

    const isLiveAvailable = Boolean(hasValidCoords && isEnRoute);
    let locationText = 'Bus live location unavailable';
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
        locationText = `At ${nearestStop.name} (Stop #${nearestStop.sequence || nearestIdx + 1})`;
      } else {
        locationText = `Near ${nearestStop.name} (${nearestDistKm.toFixed(1)} km away)`;
      }

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
      locationText = 'Bus live location unavailable';
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

  const assignedTracking = useMemo(() => getBusTrackingDetails(assignedBus, assignedRoute), [assignedBus, assignedRoute]);

  // Stops for tracker display with direction reversing
  const trackerDisplayStops = useMemo(() => {
    if (!assignedRoute?.stops) return [];
    if (trackerDirection === 'evening') {
      return [...assignedRoute.stops].reverse();
    }
    return assignedRoute.stops;
  }, [assignedRoute, trackerDirection]);

  // Bidirectional stops calculation for timetable tab
  const displayStops = useMemo(() => {
    if (!assignedRoute?.stops) return [];
    if (routeDirection === 'evening') {
      return [...assignedRoute.stops].reverse();
    }
    return assignedRoute.stops;
  }, [assignedRoute, routeDirection]);

  // Distance from student GPS to assigned bus and boarding stop
  const userDistances = useMemo(() => {
    const coords = gpsCoords || userLiveLocation;
    if (!coords) return null;

    let distToStop = null;
    const refStop = nearestBusStopData?.stop || assignedStop;
    if (refStop?.lat && refStop?.lng) {
      distToStop = calcHaversineKm(coords.lat, coords.lng, refStop.lat, refStop.lng).toFixed(1);
    }

    let distToBus = null;
    if (assignedBus?.currentLat && assignedBus?.currentLng) {
      distToBus = calcHaversineKm(coords.lat, coords.lng, assignedBus.currentLat, assignedBus.currentLng).toFixed(1);
    }

    return { distToStop, distToBus };
  }, [gpsCoords, userLiveLocation, nearestBusStopData, assignedStop, assignedBus]);

  // Past reported issues by this student
  const myStudentIssues = useMemo(() => {
    return complaints.filter(c => 
      c.studentId === student?.id || 
      (c.studentRoll && student?.rollNo && c.studentRoll.toLowerCase() === student.rollNo.toLowerCase())
    );
  }, [complaints, student?.id, student?.rollNo]);

  // Handle student issue submission
  const handleStudentIssueSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!issueDescription.trim()) {
      setIssueErrorMsg('Please describe your issue before submitting.');
      return;
    }

    setIssueSubmitting(true);
    setIssueErrorMsg('');
    try {
      await api.submitComplaint({
        studentId: student?.id || 'STU-01',
        studentName: student?.name || 'Student',
        studentRoll: student?.rollNo || student?.id,
        issueType,
        category: issueType,
        subject: issueType,
        description: issueDescription.trim(),
        message: issueDescription.trim(),
        busId: assignedBus?.id,
        routeId: assignedRoute?.id,
        status: 'Pending'
      });

      setIssueSuccessMsg('Issue submitted successfully! Transport administration has been notified.');
      setIssueDescription('');
      if (onDataRefresh) await onDataRefresh();
      setTimeout(() => setIssueSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error submitting issue:', err);
      setIssueErrorMsg(err.message || 'Failed to submit issue. Please try again.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  return (
    <div className="android-student-app">
      {/* ==========================================
          1. ANDROID APP COMPACT PROFILE & ROUTE CARD
          ========================================== */}
      <div className="android-card" style={{ padding: '1rem', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Student Avatar */}
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.25rem',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}>
              {student?.name?.charAt(0) || 'S'}
            </div>

            {/* Student Info */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
                  {student?.name}
                </h2>
                <span className={`badge ${student?.status === 'approved' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  {student?.status === 'approved' ? 'Active Pass' : 'Pending'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span>Roll: <b style={{ color: '#0284c7' }}>{student?.rollNo}</b></span>
                <span>•</span>
                <span>{student?.department}</span>
              </div>
            </div>
          </div>

          {/* Compact Logout Icon Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              id="btn-student-logout"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Assigned Route Banner */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '0.55rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#0369a1', fontWeight: 700 }}>
              Route: <b>{assignedRoute?.code} ({assignedRoute?.name})</b>
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
            {assignedBus?.fleetNumber}
          </span>
        </div>
      </div>

      {/* ==========================================
          2. TAB 0: BUS TRACKER STREAM
          ========================================== */}
      {activeTab === 'bus_tracker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* CARD A: NEAREST BUS STOP (Clean modern Android card) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.45rem',
              padding: '0 4px'
            }}>
              <span style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.2px'
              }}>
                Nearest bus stop
              </span>
              <button
                type="button"
                onClick={() => setShowSeeAllStopsModal(true)}
                id="btn-nearest-bus-stop-see-all"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
                title="View all configured bus stops for your assigned bus"
              >
                See All
              </button>
            </div>

            <div
              className="android-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px'
              }}
            >
              {/* STATE 1: Real-time GPS Location Granted & Stop Found */}
              {gpsStatus === 'granted' && nearestBusStopData && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: '#f0f9ff',
                        border: '1.5px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        flexShrink: 0
                      }}>
                        🚌
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            color: '#0f172a',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={nearestBusStopData.stop.name}
                        >
                          {nearestBusStopData.stop.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {nearestBusStopData.distanceKm < 1
                            ? `${Math.round(nearestBusStopData.distanceKm * 1000)} m away`
                            : `${nearestBusStopData.distanceKm.toFixed(1)} km away`}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '0.95rem' }}>🚶</span>
                      <span>{nearestBusStopData.walkingMinutes} min</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.9rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px'
                    }}>
                      Next Bus
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                      {nextBusInfo?.busName || assignedBus?.fleetNumber}
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: nextBusInfo?.isLive ? '#0284c7' : '#0f172a'
                    }}>
                      {nextBusInfo?.scheduledOrLiveTime}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.35rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>
                      {nextBusInfo?.operating ? `To ${nextBusInfo?.destination}` : nextBusInfo?.destination}
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: nextBusInfo?.badgeBg,
                      color: nextBusInfo?.badgeColor,
                      border: `1px solid ${nextBusInfo?.badgeBorder}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {nextBusInfo?.isLive && <span className="pulse-dot blue" style={{ width: '6px', height: '6px' }} />}
                      {nextBusInfo?.statusLabel}
                    </span>
                  </div>
                </>
              )}

              {/* STATE 2: Requesting Location */}
              {gpsStatus === 'requesting' && (
                <div style={{
                  padding: '1.5rem 0.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem'
                }}>
                  <div className="pulse-dot blue" style={{ width: '16px', height: '16px' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      Requesting device location...
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                      Allow browser location to detect closest stop on {assignedBus?.fleetNumber}.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE 3: Location Denied */}
              {gpsStatus === 'denied' && (
                <div style={{
                  padding: '0.75rem 0.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#991b1b' }}>
                      Location Permission Required
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px', lineHeight: 1.35 }}>
                      Enable device GPS to detect your nearest bus stop automatically.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                    <button
                      onClick={requestLocation}
                      className="android-touch-btn"
                      style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                      id="btn-retry-location"
                    >
                      <Navigation size={13} /> Allow GPS Access
                    </button>
                    <button
                      onClick={() => setShowSeeAllStopsModal(true)}
                      className="android-touch-btn"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                    >
                      All Stops
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 4: GPS Unavailable */}
              {(gpsStatus === 'unavailable' || gpsStatus === 'error') && (
                <div style={{
                  padding: '0.75rem 0.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.55rem'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706'
                  }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e' }}>
                      GPS Signal Unavailable
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                      {gpsErrorMsg || 'Verify that location is enabled on your device.'}
                    </p>
                  </div>
                  <button
                    onClick={requestLocation}
                    className="android-touch-btn"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.8rem', maxWidth: '160px' }}
                  >
                    <RefreshCw size={13} /> Retry GPS
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD B: ASSIGNED FLEET BUS STATUS */}
          <div className="android-card" style={{ borderLeft: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assigned Fleet Bus
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                  {assignedBus?.fleetNumber} • {assignedRoute?.code}
                </h3>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: assignedTracking.movementBadgeBg,
                color: assignedTracking.movementBadgeColor,
                border: `1px solid ${assignedTracking.movementBadgeBorder}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {assignedTracking.movementState === 'moving' && <span className="pulse-dot online" />}
                {assignedTracking.movementLabel}
              </span>
            </div>

            {/* Driver Box & Touch Call Button */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0.85rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    flexShrink: 0
                  }}>
                    {assignedDriver?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {assignedDriver?.name}
                    </div>
                    <div style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 700 }}>
                      ★ {assignedDriver?.rating || 4.9} • ID: {assignedDriver?.id}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>BUS PLATE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                    {assignedBus?.busNo}
                  </div>
                </div>
              </div>

              {/* Touch Call Driver Button (min 44px height) */}
              <a
                href={`tel:${(assignedDriver?.phone || (isBus2 ? '+916370998587' : '+919040833547')).replace(/\s+/g, '')}`}
                className="android-touch-btn"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                }}
                id="btn-call-driver"
                title={`Call ${assignedDriver?.name}`}
              >
                <Phone size={15} /> Call Driver ({assignedDriver?.name})
              </a>
            </div>

            {/* Status chips */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
              <span>Speed: <b style={{ color: '#0284c7' }}>{assignedBus?.speed || 0} km/h</b></span>
              <span>Capacity: <b style={{ color: '#0f172a' }}>{assignedBus?.occupied || 0}/{assignedBus?.capacity || 50}</b></span>
              <span>Route: <b style={{ color: '#0f172a' }}>{assignedRoute?.name}</b></span>
            </div>
          </div>

          {/* CARD C: LIVE ROUTE MAP & DIRECTION SWITCH */}
          <div className="android-card">
            {/* Direction Segmented Control */}
            <div className="android-segmented-control" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={`android-segment-btn ${trackerDirection === 'morning' ? 'active-morning' : ''}`}
                onClick={() => setTrackerDirection('morning')}
              >
                ☀️ Morning Pickup
              </button>
              <button
                type="button"
                className={`android-segment-btn ${trackerDirection === 'evening' ? 'active-evening' : ''}`}
                onClick={() => setTrackerDirection('evening')}
              >
                🌙 Evening Return
              </button>
            </div>

            {/* Live Location Alert / Status Banner */}
            {!assignedTracking.isLiveAvailable ? (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '0.7rem 0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#92400e',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                <span>
                  <b>Driver offline:</b> Live GPS is currently inactive for this run. Timetable is displayed below.
                </span>
              </div>
            ) : (
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '0.7rem 0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                color: '#0369a1',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-dot blue" />
                  <span>
                    Next: <b>{assignedTracking.nextStop?.name}</b> in ~{assignedTracking.etaMinutes} mins.
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', color: '#0284c7', fontWeight: 800 }}>
                  {assignedBus.speed || 0} km/h
                </span>
              </div>
            )}

            {/* Mobile Leaflet Map (Height 320px for phones) */}
            <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem' }}>
              <LiveMap
                routes={[assignedRoute]}
                buses={assignedTracking.isLiveAvailable ? [assignedBus] : []}
                highlightStopId={nearestBusStopData?.stop?.id || assignedStop?.id}
                highlightBusId={assignedBus?.id}
                showUserLocation={false}
                mode="student"
                busLiveLabel={isBus2 ? 'Bus 2 – Live Location' : 'Bus 1 – Live Location'}
                busLocationUnavailable={!assignedTracking.isLiveAvailable}
                height="320px"
                autoCenterBus={assignedTracking.isLiveAvailable}
              />
            </div>

            {/* Stops Timeline Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Route Stops & Timetable
              </h5>
              <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                {trackerDisplayStops.length} Stops
              </span>
            </div>

            {/* Sequential Stops Timeline List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {trackerDisplayStops.map((stop, idx) => {
                const isNearest = nearestBusStopData?.stop?.id === stop.id;
                const isNext = assignedTracking.isLiveAvailable && stop.id === assignedTracking.nextStop?.id;
                const isMyAssignedStop = stop.id === assignedStop?.id;

                return (
                  <div
                    key={stop.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.85rem',
                      background: isNearest ? '#e0f2fe' : isNext ? '#fffbeb' : isMyAssignedStop ? '#eff6ff' : '#f8fafc',
                      border: `1.5px solid ${isNearest ? '#0284c7' : isNext ? '#fde68a' : isMyAssignedStop ? '#bae6fd' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      gap: '0.65rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isNearest ? '#0284c7' : isNext ? '#d97706' : isMyAssignedStop ? '#0284c7' : '#64748b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stop.name}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {isNearest && (
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              📍 Nearest ({nearestBusStopData ? `${nearestBusStopData.distanceKm < 1 ? Math.round(nearestBusStopData.distanceKm * 1000) + 'm' : nearestBusStopData.distanceKm.toFixed(1) + 'km'}` : ''})
                            </span>
                          )}
                          {isNext && (
                            <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              ⏭ Next (~{assignedTracking.etaMinutes}m)
                            </span>
                          )}
                          {isMyAssignedStop && !isNearest && (
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              ⭐ Your Stop
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        {trackerDirection === 'morning' ? 'Pickup' : 'Drop'}
                      </div>
                      <div style={{ fontWeight: 800, color: trackerDirection === 'morning' ? '#0284c7' : '#7c3aed', fontSize: '0.85rem' }}>
                        {trackerDirection === 'morning' ? (stop.morningPickup || stop.morningTime) : (stop.eveningDrop || stop.eveningTime)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          3. TAB 1: BUS LIVE VIEW
          ========================================== */}
      {activeTab === 'live_track' && (
        <div className="android-card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`pulse-dot ${assignedTracking.isLiveAvailable ? 'online' : 'amber'}`} /> Bus Live: {assignedRoute?.name}
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '2px 0 0 0' }}>
                {assignedTracking.isLiveAvailable
                  ? `Real-time GPS received from driver (${isBus2 ? 'Bus 2' : 'Bus 1'})`
                  : 'Bus live location unavailable (driver offline or GPS standby)'}
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '8px', fontWeight: 800 }}>
              {assignedBus?.fleetNumber}
            </span>
          </div>

          <div style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <LiveMap
              routes={[assignedRoute]}
              buses={assignedTracking.isLiveAvailable ? [assignedBus] : []}
              highlightStopId={nearestBusStopData?.stop?.id || assignedStop?.id}
              highlightBusId={assignedBus?.id}
              showUserLocation={false}
              mode="student"
              busLiveLabel={isBus2 ? 'Bus 2 – Live Location' : 'Bus 1 – Live Location'}
              busLocationUnavailable={!assignedTracking.isLiveAvailable}
              height="440px"
              autoCenterBus={assignedTracking.isLiveAvailable}
            />
          </div>
        </div>
      )}

      {/* ==========================================
          4. TAB 2: STOPS & TIMETABLE VIEW
          ========================================== */}
      {activeTab === 'route_details' && (
        <div className="android-card">
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              {assignedRoute?.code}: {assignedRoute?.name}
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
              Distance: <b>{assignedRoute?.distanceKm} km</b> • Duration: <b>~{assignedRoute?.totalDurationMin} mins</b> • Bus: <b>{assignedBus?.fleetNumber}</b>
            </p>
          </div>

          {/* Direction Switcher */}
          <div className="android-segmented-control" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className={`android-segment-btn ${routeDirection === 'morning' ? 'active-morning' : ''}`}
              onClick={() => setRouteDirection('morning')}
            >
              ☀️ Morning Pickup
            </button>
            <button
              type="button"
              className={`android-segment-btn ${routeDirection === 'evening' ? 'active-evening' : ''}`}
              onClick={() => setRouteDirection('evening')}
            >
              🌙 Evening Return
            </button>
          </div>

          {/* Direction Banner */}
          <div style={{
            background: routeDirection === 'morning' ? '#f0f9ff' : '#f5f3ff',
            border: `1px solid ${routeDirection === 'morning' ? '#bae6fd' : '#ddd6fe'}`,
            borderRadius: '12px',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
            fontSize: '0.78rem',
            color: routeDirection === 'morning' ? '#0369a1' : '#6d28d9',
            fontWeight: 700
          }}>
            {routeDirection === 'morning'
              ? `Direction: ${assignedRoute?.startPoint} ➔ BEC Campus`
              : `Direction: BEC Campus ➔ ${assignedRoute?.startPoint}`}
          </div>

          {/* Stops List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {displayStops.map((stop, index) => {
              const isNearest = nearestBusStopData?.stop?.id === stop.id;
              const isMyStop = stop.id === assignedStop?.id;
              return (
                <div
                  key={stop.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem',
                    background: isNearest ? '#f0f9ff' : isMyStop ? '#fffbeb' : '#f8fafc',
                    border: `1.5px solid ${isNearest ? '#0284c7' : isMyStop ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: '14px',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: isNearest ? '#0284c7' : isMyStop ? '#d97706' : (routeDirection === 'morning' ? '#0284c7' : '#7c3aed'),
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.name}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {isNearest && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Nearest Stop</span>}
                        {isMyStop && <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Your Stop</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      {routeDirection === 'morning' ? 'Pickup' : 'Drop'}
                    </div>
                    <div style={{ fontWeight: 800, color: routeDirection === 'morning' ? '#0284c7' : '#7c3aed', fontSize: '0.88rem' }}>
                      {routeDirection === 'morning' ? (stop.morningPickup || stop.morningTime) : (stop.eveningDrop || stop.eveningTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          4. TAB 3: REPORT AN ISSUE
          ========================================== */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="android-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Report an Issue
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Direct line to Campus Transport Desk
                </div>
              </div>
            </div>

            {issueSuccessMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{issueSuccessMsg}</span>
              </div>
            )}

            {issueErrorMsg && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={16} />
                <span>{issueErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStudentIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Issue Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={issueType}
                  onChange={e => setIssueType(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '0.88rem' }}
                >
                  <option value="Bus Delay & Timing">Bus Delay & Timing</option>
                  <option value="Overcrowding / Seating">Overcrowding / Seating</option>
                  <option value="Driver Behavior / Rash Driving">Driver Behavior / Rash Driving</option>
                  <option value="Route & Bus Stop Issue">Route & Bus Stop Issue</option>
                  <option value="Bus Pass / App Problem">Bus Pass / App Problem</option>
                  <option value="Cleanliness & AC / Fan">Cleanliness & AC / Fan</option>
                  <option value="Other / General Issue">Other / General Issue</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Description <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe your issue or concern in detail..."
                  value={issueDescription}
                  onChange={e => {
                    setIssueDescription(e.target.value);
                    if (issueErrorMsg) setIssueErrorMsg('');
                  }}
                  rows={4}
                  style={{ minHeight: '100px', fontSize: '0.88rem', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#64748b'
              }}>
                Reporting Student: <b style={{ color: '#0f172a' }}>{student?.name || 'Student'}</b> • Roll: <b style={{ color: '#0284c7' }}>{student?.rollNo}</b> • Route: {assignedRoute?.code || 'Assigned Route'}
              </div>

              <button
                type="submit"
                className="android-touch-btn"
                disabled={issueSubmitting}
                id="btn-submit-student-issue"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  minHeight: '46px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  cursor: issueSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {issueSubmitting ? 'Submitting...' : 'Submit Issue'}
              </button>
            </form>
          </div>

          {/* Past Reported Issues by this Student */}
          {myStudentIssues.length > 0 && (
            <div className="android-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  My Reported Issues ({myStudentIssues.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {myStudentIssues.map(issue => (
                  <div key={issue.id} className="android-list-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.75rem' }}>
                        {issue.issueType || issue.category || issue.subject}
                      </span>
                      <span className={`badge ${issue.status?.toLowerCase() === 'resolved' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                        {issue.status || 'Pending'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                      {issue.description || issue.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                      Submitted: {issue.createdAtString || issue.timestamp || 'Recently'}
                    </div>
                    {issue.adminReply && (
                      <div style={{
                        marginTop: '6px',
                        background: '#f0fdf4',
                        borderLeft: '3px solid #059669',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#15803d'
                      }}>
                        <b>Admin Response:</b> {issue.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          5. ANDROID BOTTOM NAVIGATION BAR (Fixed at bottom)
          ========================================== */}
      <nav className="android-bottom-nav">
        <button
          type="button"
          className={`android-nav-item ${activeTab === 'bus_tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('bus_tracker')}
          id="bottom-nav-tracker"
          aria-label="Bus Tracker"
        >
          <div className="android-nav-pill">
            <Bus size={20} />
          </div>
          <span className="android-nav-label">Tracker</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'live_track' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_track')}
          id="bottom-nav-map"
          aria-label="Bus Live"
        >
          <div className="android-nav-pill">
            <Navigation size={20} />
          </div>
          <span className="android-nav-label">Bus Live</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'route_details' ? 'active' : ''}`}
          onClick={() => setActiveTab('route_details')}
          id="bottom-nav-timetable"
          aria-label="Stops and Timetable"
        >
          <div className="android-nav-pill">
            <MapPin size={20} />
          </div>
          <span className="android-nav-label">Timetable</span>
        </button>

        <button
          type="button"
          className="android-nav-item"
          onClick={() => setShowPassModal(true)}
          id="bottom-nav-pass"
          aria-label="Digital Bus Pass"
        >
          <div className="android-nav-pill">
            <QrCode size={20} />
          </div>
          <span className="android-nav-label">Bus Pass</span>
        </button>

        <button
          type="button"
          className={`android-nav-item ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
          id="bottom-nav-issue"
          aria-label="Report Issue"
        >
          <div className="android-nav-pill">
            <AlertCircle size={20} />
          </div>
          <span className="android-nav-label">Issue</span>
        </button>
      </nav>

      {/* ==========================================
          6. MODALS & DIALOGS
          ========================================== */}
      {showPassModal && (
        <DigitalPassModal
          student={student}
          route={assignedRoute}
          stop={nearestBusStopData?.stop || assignedStop}
          bus={assignedBus}
          driver={assignedDriver}
          onClose={() => setShowPassModal(false)}
          onDataRefresh={onDataRefresh}
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

      {/* SEE ALL STOPS MODAL (Only shows stops for assigned route) */}
      <SeeAllStopsModal
        isOpen={showSeeAllStopsModal}
        onClose={() => setShowSeeAllStopsModal(false)}
        bus={assignedBus}
        route={assignedRoute}
        stops={candidateStops}
        nearestStopId={nearestBusStopData?.stop?.id}
        gpsCoords={gpsCoords}
        calcHaversineKm={calcHaversineKm}
      />
    </div>
  );
}
