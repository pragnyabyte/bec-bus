import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, AlertTriangle, Crosshair, Compass } from 'lucide-react';

export default function LiveMap({
  routes = [],
  buses = [],
  highlightStopId = null,
  highlightBusId = null,
  height = '480px',
  interactive = true,
  autoCenterBus = false,
  onUserLocationChange = null,
  showUserLocation = true,
  mode = 'default', // 'default' | 'admin'
  busLiveLabel = '',
  busLocationUnavailable = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ buses: {}, stops: {}, routeLines: {} });
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);

  // User Live Geolocation State (only used when showUserLocation is true)
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, accuracy }
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading' | 'granted' | 'denied' | 'unavailable'
  const [errorMessage, setErrorMessage] = useState('');
  const [autoFollow, setAutoFollow] = useState(true);
  const watchIdRef = useRef(null);
  const hasCenteredInitiallyRef = useRef(false);

  const getBusLabel = useCallback((bus) => {
    if (busLiveLabel) return busLiveLabel;
    if (bus.id === 'BUS-01' || bus.fleetNumber === 'Bus 1') return 'Bus 1 – Live Location';
    if (bus.id === 'BUS-02' || bus.fleetNumber === 'Bus 2') return 'Bus 2 – Live Location';
    return `${bus.fleetNumber || 'Bus'} – Live Location`;
  }, [busLiveLabel]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Determine initial center
    let initialCenter = [20.2961, 85.8245]; // Bhubaneswar region default
    let initialZoom = 12;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: interactive,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive
    });

    // Standard free OpenStreetMap tile layer (No API Key Required!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Initial positioning for Admin mode or route fitting
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        // If buses are provided with valid coordinates, focus on the bus
        const validBus = buses.find(b => b && b.currentLat && b.currentLng && !isNaN(b.currentLat) && !isNaN(b.currentLng) && b.currentLat !== 0);
        if (validBus) {
          mapInstanceRef.current.setView([validBus.currentLat, validBus.currentLng], 14, { animate: false });
          hasCenteredInitiallyRef.current = true;
        } else if (routes.length > 0 && routes[0]?.stops?.length > 0) {
          const bounds = L.latLngBounds(routes[0].stops.map(s => [s.lat, s.lng]));
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      userAccuracyCircleRef.current = null;
      markersRef.current = { buses: {}, stops: {}, routeLines: {} };
      hasCenteredInitiallyRef.current = false;
    };
  }, [interactive]);

  // Request & Watch Real Browser Geolocation (Only active when showUserLocation is true)
  const startWatchingLocation = useCallback((highAccuracy = true) => {
    if (!showUserLocation) return;
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('loading');
    setErrorMessage('');

    // Clear previous watch if active
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const newCoords = { lat: latitude, lng: longitude, accuracy, heading, speed };

        setUserLocation(newCoords);
        setLocationStatus('granted');
        setErrorMessage('');

        if (onUserLocationChange) {
          onUserLocationChange(newCoords);
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        // Create or update "My Live Location" pulsing marker
        const userIcon = L.divIcon({
          className: 'user-live-marker-wrapper',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
              <div style="
                position: absolute;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(2, 132, 199, 0.25);
                border: 1.5px solid rgba(2, 132, 199, 0.6);
                animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
              "></div>
              <div style="
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #0284c7;
                border: 3px solid #ffffff;
                box-shadow: 0 0 12px rgba(2, 132, 199, 0.9);
                z-index: 3;
              "></div>
              <div style="
                margin-top: 6px;
                padding: 3px 8px;
                background: #ffffff;
                color: #0284c7;
                font-family: inherit;
                font-weight: 800;
                font-size: 11px;
                border-radius: 6px;
                border: 1px solid #bae6fd;
                box-shadow: 0 2px 8px rgba(0,0,0,0.12);
                white-space: nowrap;
                z-index: 4;
                letter-spacing: -0.2px;
              ">
                📍 My Live Location
              </div>
            </div>
          `,
          iconSize: [48, 56],
          iconAnchor: [24, 24]
        });

        // Update/create Marker
        if (!userMarkerRef.current) {
          const marker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 4px;">
              <div style="font-weight: 800; color: #0284c7; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                <span>📍</span> My Real Live Location
              </div>
              <div style="color: #475569; margin-bottom: 2px;">Latitude: <b>${latitude.toFixed(6)}</b></div>
              <div style="color: #475569; margin-bottom: 2px;">Longitude: <b>${longitude.toFixed(6)}</b></div>
              <div style="color: #64748b; font-size: 11px; margin-top: 4px;">GPS Accuracy: ±${Math.round(accuracy)} meters</div>
            </div>
          `);
          userMarkerRef.current = marker;
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }

        // Update/create Accuracy Circle
        if (!userAccuracyCircleRef.current) {
          const circle = L.circle([latitude, longitude], {
            radius: Math.max(accuracy, 20),
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.12,
            weight: 1
          }).addTo(map);
          userAccuracyCircleRef.current = circle;
        } else {
          userAccuracyCircleRef.current.setLatLng([latitude, longitude]);
          userAccuracyCircleRef.current.setRadius(Math.max(accuracy, 20));
        }

        // Center on User location on first fix or when auto-follow is active
        if (!hasCenteredInitiallyRef.current) {
          map.setView([latitude, longitude], 15, { animate: true });
          hasCenteredInitiallyRef.current = true;
        } else if (autoFollow) {
          map.panTo([latitude, longitude], { animate: true, duration: 0.8 });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setErrorMessage('Location permission is required to show your live location.');
        } else if (error.code === error.TIMEOUT && highAccuracy) {
          startWatchingLocation(false);
          return;
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus('unavailable');
          setErrorMessage('GPS signal or device location is currently unavailable.');
        } else {
          setLocationStatus('denied');
          setErrorMessage('Location permission is required to show your live location.');
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 10000 : 20000,
        maximumAge: 0
      }
    );
  }, [showUserLocation, autoFollow, onUserLocationChange]);

  useEffect(() => {
    if (showUserLocation) {
      startWatchingLocation();
    } else {
      // Ensure user markers are removed if showUserLocation is turned off
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [showUserLocation, startWatchingLocation]);

  // Handle map resize invalidation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [height, routes, buses]);

  // Center on User's real GPS position manually (student/driver mode)
  const centerOnUser = () => {
    const map = mapInstanceRef.current;
    if (map && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
      setAutoFollow(true);
    } else {
      startWatchingLocation();
    }
  };

  // Center on Selected Bus
  const centerOnBus = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const validBus = buses.find(b => b && b.currentLat && b.currentLng && !isNaN(b.currentLat) && !isNaN(b.currentLng) && b.currentLat !== 0);
    if (validBus) {
      map.setView([validBus.currentLat, validBus.currentLng], 15, { animate: true });
    }
  }, [buses]);

  // Reset view to fit all markers and route
  const fitAllMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points = [];
    if (showUserLocation && userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    Object.values(markersRef.current.buses).forEach(m => points.push(m.getLatLng()));
    Object.values(markersRef.current.stops).forEach(m => points.push(m.getLatLng()));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      setAutoFollow(false);
    } else if (routes.length > 0 && routes[0]?.stops?.length > 0) {
      const bounds = L.latLngBounds(routes[0].stops.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [showUserLocation, userLocation, routes]);

  // Update Route Polylines and Stops
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old route lines and stop markers
    Object.values(markersRef.current.routeLines).forEach(line => map.removeLayer(line));
    Object.values(markersRef.current.stops).forEach(marker => map.removeLayer(marker));
    markersRef.current.routeLines = {};
    markersRef.current.stops = {};

    routes.forEach(route => {
      if (!route.stops || route.stops.length === 0) return;

      const latlngs = route.stops.map(s => [s.lat, s.lng]);

      const polyline = L.polyline(latlngs, {
        color: route.color || (route.id === 'R-102' ? '#7c3aed' : '#0284c7'),
        weight: 5,
        opacity: 0.9,
        smoothFactor: 1
      }).addTo(map);

      polyline.bindTooltip(`<b>${route.code}</b>: ${route.name}`, { sticky: true });
      markersRef.current.routeLines[route.id] = polyline;

      // Stop Markers
      route.stops.forEach((stop, index) => {
        const isUserStop = stop.id === highlightStopId;

        const stopIcon = L.divIcon({
          className: 'stop-marker-wrapper',
          html: `
            <div style="
              width: ${isUserStop ? '26px' : '18px'};
              height: ${isUserStop ? '26px' : '18px'};
              background: ${isUserStop ? '#d97706' : (route.color || (route.id === 'R-102' ? '#7c3aed' : '#0284c7'))};
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 2px 8px ${isUserStop ? 'rgba(217, 119, 6, 0.6)' : 'rgba(2, 132, 199, 0.4)'};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: ${isUserStop ? '12px' : '10px'};
              font-weight: 800;
              transition: all 0.3s;
            ">
              ${isUserStop ? '★' : (index + 1)}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        stopMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #0f172a; padding: 4px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 4px;">
              ${isUserStop ? '⭐ Your Stop: ' : ''}${stop.name}
            </div>
            <div style="color: #64748b; margin-bottom: 3px;">Route: <b style="color: #0284c7;">${route.name}</b></div>
            <div style="color: #059669; font-weight: 600;">Morning Pickup: ${stop.morningTime || stop.morningPickup}</div>
            <div style="color: #475569;">Evening Drop: ${stop.eveningTime || stop.eveningDrop}</div>
            ${isUserStop ? '<div style="margin-top: 6px; padding: 4px 8px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; font-weight: 700; font-size: 11px;">Assigned Boarding Stop</div>' : ''}
          </div>
        `);

        markersRef.current.stops[`${route.id}-${stop.id}`] = stopMarker;
      });
    });

  }, [routes, highlightStopId]);

  // Update Bus Live Markers (Actual real-time location of the bus)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    buses.forEach(bus => {
      if (!bus.currentLat || !bus.currentLng || isNaN(bus.currentLat) || isNaN(bus.currentLng) || bus.currentLat === 0) return;
      const isEmergency = bus.status === 'emergency';
      const label = getBusLabel(bus);
      const isBus2 = bus.id === 'BUS-02' || bus.fleetNumber === 'Bus 2';

      // Clear marker labeled "Bus 1 – Live Location" or "Bus 2 – Live Location"
      const busIcon = L.divIcon({
        className: 'bus-marker-wrapper',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <!-- Pulsing Radar Halo -->
            <div style="
              position: absolute;
              top: -4px;
              width: 52px;
              height: 52px;
              border-radius: 50%;
              background: ${isEmergency ? 'rgba(220, 38, 38, 0.25)' : (isBus2 ? 'rgba(124, 58, 237, 0.25)' : 'rgba(2, 132, 199, 0.25)')};
              border: 1.5px solid ${isEmergency ? 'rgba(220, 38, 38, 0.6)' : (isBus2 ? 'rgba(124, 58, 237, 0.6)' : 'rgba(2, 132, 199, 0.6)')};
              animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            "></div>

            <!-- Core Bus Vehicle Icon Circle -->
            <div style="
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: ${isEmergency ? '#dc2626' : (isBus2 ? '#7c3aed' : '#0284c7')};
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              z-index: 3;
            ">
              <span style="font-size: 20px; line-height: 1;">🚌</span>
            </div>

            <!-- Clear Marker Label Pill -->
            <div style="
              margin-top: 4px;
              padding: 3px 8px;
              background: #0f172a;
              color: #ffffff;
              font-family: inherit;
              font-weight: 800;
              font-size: 11px;
              border-radius: 6px;
              border: 1.5px solid ${isBus2 ? '#a78bfa' : '#38bdf8'};
              box-shadow: 0 2px 10px rgba(0,0,0,0.25);
              white-space: nowrap;
              z-index: 4;
              letter-spacing: -0.2px;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
              ${label}
            </div>
          </div>
        `,
        iconSize: [160, 68],
        iconAnchor: [80, 22]
      });

      if (!markersRef.current.buses[bus.id]) {
        const marker = L.marker([bus.currentLat, bus.currentLng], { icon: busIcon, zIndexOffset: 3000 }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; min-width: 190px; color: #0f172a; padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 800; font-size: 14px; color: #0f172a;">${label}</span>
              <span style="
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 800;
                background: ${bus.status === 'on_trip' ? '#dcfce7' : bus.status === 'emergency' ? '#fee2e2' : '#e0f2fe'};
                color: ${bus.status === 'on_trip' ? '#15803d' : bus.status === 'emergency' ? '#b91c1c' : '#0369a1'};
              ">
                ${(bus.status || 'ACTIVE').toUpperCase()}
              </span>
            </div>
            <div style="color: #475569; margin-bottom: 3px;">Plate: <b style="color: #0f172a;">${bus.busNo}</b></div>
            <div style="color: #475569; margin-bottom: 3px;">Driver: <b style="color: #0284c7;">${bus.driverName || (bus.id === 'BUS-01' ? 'Pragnya' : 'Jitendra')}</b></div>
            <div style="color: #475569; margin-bottom: 3px;">Speed: <b style="color: #0284c7;">${bus.speed || 0} km/h</b></div>
            <div style="color: #475569; margin-bottom: 3px;">Occupancy: <b>${bus.occupied || 0}/${bus.capacity || 45} seats</b></div>
            <div style="color: #059669; font-size: 11px; margin-top: 6px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #22c55e;"></span>
              Real Driver GPS Live
            </div>
          </div>
        `);
        markersRef.current.buses[bus.id] = marker;
      } else {
        const marker = markersRef.current.buses[bus.id];
        marker.setLatLng([bus.currentLat, bus.currentLng]);
        marker.setIcon(busIcon);
      }

      // In Admin mode or when autoCenterBus is enabled, smoothly center on the bus
      if (mode === 'admin' || autoCenterBus) {
        if (!hasCenteredInitiallyRef.current) {
          map.setView([bus.currentLat, bus.currentLng], 15, { animate: true });
          hasCenteredInitiallyRef.current = true;
        } else {
          map.panTo([bus.currentLat, bus.currentLng], { animate: true, duration: 0.8 });
        }
      }
    });

    const activeBusIds = new Set(buses.map(b => b.id));
    Object.keys(markersRef.current.buses).forEach(id => {
      if (!activeBusIds.has(id)) {
        map.removeLayer(markersRef.current.buses[id]);
        delete markersRef.current.buses[id];
      }
    });

  }, [buses, mode, autoCenterBus, getBusLabel]);

  // Selected bus helper for admin status pill
  const activeBus = buses[0] || null;
  const hasActiveBusCoords = Boolean(activeBus && activeBus.currentLat && activeBus.currentLng && !isNaN(activeBus.currentLat) && !isNaN(activeBus.currentLng) && activeBus.currentLat !== 0);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid #bae6fd', boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)' }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Bus Location Unavailable Notice (Admin Mode) */}
      {busLocationUnavailable && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 500,
          background: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: '9999px',
          padding: '0.45rem 1rem',
          color: '#b45309',
          fontSize: '0.8rem',
          fontWeight: 800,
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.22)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}>
          <AlertTriangle size={15} />
          <span>Bus live location unavailable</span>
        </div>
      )}

      {/* Permission Denied Banner (Only shown in student/driver personal GPS mode) */}
      {showUserLocation && (locationStatus === 'denied' || locationStatus === 'unavailable') && (
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#fef2f2',
          border: '1.5px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 1.25rem',
          color: '#991b1b',
          boxShadow: '0 4px 18px rgba(220, 38, 38, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '92%',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{errorMessage || 'Location permission is required to show your live location.'}</span>
          <button
            onClick={startWatchingLocation}
            className="btn btn-sm btn-primary"
            style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.25rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          >
            Allow / Retry
          </button>
        </div>
      )}

      {/* Map Control Buttons Overlay (Top Right) */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 500,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {/* Student/Driver Location controls (Disabled/Removed on Admin map) */}
        {showUserLocation && (
          <>
            <button
              onClick={centerOnUser}
              className="btn btn-sm"
              style={{
                background: '#ffffff',
                color: userLocation ? '#0284c7' : '#64748b',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)',
                border: '1.5px solid #bae6fd',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Center on My Real Live Location"
            >
              <Crosshair size={15} />
              {userLocation ? 'My Live Location' : 'Locate Me'}
            </button>

            {userLocation && (
              <button
                onClick={() => setAutoFollow(!autoFollow)}
                className="btn btn-sm"
                style={{
                  background: autoFollow ? '#dcfce7' : '#ffffff',
                  color: autoFollow ? '#15803d' : '#475569',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: `1.5px solid ${autoFollow ? '#bbf7d0' : '#e2e8f0'}`,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Automatically keep map centered on your moving live location"
              >
                <Compass size={14} />
                {autoFollow ? 'Follow Me: ON' : 'Follow Me: OFF'}
              </button>
            )}
          </>
        )}

        {/* Center on Bus Button (Admin Mode) */}
        {!showUserLocation && hasActiveBusCoords && (
          <button
            onClick={centerOnBus}
            className="btn btn-sm"
            style={{
              background: '#ffffff',
              color: '#0284c7',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)',
              border: '1.5px solid #bae6fd',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Center on Selected Bus Live Location"
          >
            <Crosshair size={15} />
            Center Bus
          </button>
        )}

        {/* Fit Route Button (Available on both Admin and Student maps) */}
        <button
          onClick={fitAllMarkers}
          className="btn btn-outline btn-sm"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1.5px solid #cbd5e1',
            fontWeight: 700
          }}
          title="Fit route and stops to view"
        >
          Fit Route
        </button>
      </div>

      {/* Floating GPS Status Pill (Bottom Left) */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 500,
        background: '#ffffff',
        border: '1px solid #bae6fd',
        borderRadius: 'var(--radius-full)',
        padding: '0.35rem 0.85rem',
        fontSize: '0.75rem',
        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#0f172a',
        fontWeight: 700
      }}>
        {showUserLocation ? (
          <>
            <span className={`pulse-dot ${locationStatus === 'granted' ? 'online' : 'danger'}`} />
            <span>
              {locationStatus === 'granted'
                ? `Real GPS Live (${userLocation?.lat.toFixed(4)}, ${userLocation?.lng.toFixed(4)})`
                : locationStatus === 'loading'
                ? 'Acquiring GPS fix...'
                : 'GPS Location Required'}
            </span>
          </>
        ) : (
          <>
            <span className={`pulse-dot ${hasActiveBusCoords ? 'online' : 'amber'}`} />
            <span>
              {hasActiveBusCoords
                ? `Live Bus GPS (${activeBus.currentLat.toFixed(4)}, ${activeBus.currentLng.toFixed(4)})`
                : 'Bus live location unavailable'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
