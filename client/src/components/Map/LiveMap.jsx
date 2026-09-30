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
  onUserLocationChange = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ buses: {}, stops: {}, routeLines: {} });
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);

  // User Live Geolocation State
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, accuracy }
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading' | 'granted' | 'denied' | 'unavailable'
  const [errorMessage, setErrorMessage] = useState('');
  const [autoFollow, setAutoFollow] = useState(true);
  const watchIdRef = useRef(null);
  const hasCenteredInitiallyRef = useRef(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map without hard-coded coordinates
    const map = L.map(mapContainerRef.current, {
      center: [20, 0], // Neutral global view until user's real GPS coordinates arrive
      zoom: 3,
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

    // Invalidate size after mount to prevent render clipping
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
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

  // Request & Watch Real Browser Geolocation
  const startWatchingLocation = useCallback((highAccuracy = true) => {
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
              <!-- Outer Radar Pulse Wave -->
              <div style="
                position: absolute;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(2, 132, 199, 0.25);
                border: 1.5px solid rgba(2, 132, 199, 0.6);
                animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
              "></div>
              <!-- Inner Core Dot -->
              <div style="
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #0284c7;
                border: 3px solid #ffffff;
                box-shadow: 0 0 12px rgba(2, 132, 199, 0.9);
                z-index: 3;
              "></div>
              <!-- Location Badge Pill -->
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
        console.warn('[Geolocation Error]:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setErrorMessage('Location permission is required to show your live location.');
        } else if (error.code === error.TIMEOUT && highAccuracy) {
          console.warn('[Geolocation] High accuracy GPS timed out, falling back to standard accuracy...');
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
  }, [autoFollow, onUserLocationChange]);

  useEffect(() => {
    startWatchingLocation();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startWatchingLocation]);

  // Handle map resize invalidation
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 200);
    }
  }, [height, routes, buses]);

  // Center on User's real GPS position manually
  const centerOnUser = () => {
    const map = mapInstanceRef.current;
    if (map && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
      setAutoFollow(true);
    } else {
      startWatchingLocation();
    }
  };

  // Reset view to fit all markers
  const fitAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points = [];
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    Object.values(markersRef.current.buses).forEach(m => points.push(m.getLatLng()));
    Object.values(markersRef.current.stops).forEach(m => points.push(m.getLatLng()));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      setAutoFollow(false);
    }
  };

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
        color: route.color || '#0284c7',
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
              background: ${isUserStop ? '#d97706' : (route.color || '#0284c7')};
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
            <div style="color: #059669; font-weight: 600;">Morning Pickup: ${stop.morningTime}</div>
            <div style="color: #475569;">Evening Drop: ${stop.eveningTime}</div>
            ${isUserStop ? '<div style="margin-top: 6px; padding: 4px 8px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; font-weight: 700; font-size: 11px;">Assigned Boarding Stop</div>' : ''}
          </div>
        `);

        markersRef.current.stops[`${route.id}-${stop.id}`] = stopMarker;
      });
    });

  }, [routes, highlightStopId]);

  // Update Bus Live Markers (from Driver / Bus GPS Telemetry)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    buses.forEach(bus => {
      if (!bus.currentLat || !bus.currentLng) return;
      const isEmergency = bus.status === 'emergency';
      const isHighlighted = bus.id === highlightBusId;

      const busIcon = L.divIcon({
        className: 'bus-marker-icon',
        html: `
          <div style="
            background: ${isEmergency ? '#dc2626' : isHighlighted ? '#0284c7' : '#0ea5e9'};
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 12px ${isEmergency ? 'rgba(220, 38, 38, 0.7)' : 'rgba(2, 132, 199, 0.5)'};
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s;
          ">
            <span style="font-size: 18px; line-height: 1;">🚌</span>
            <span style="font-size: 9px; font-weight: 800; letter-spacing: -0.3px;">${bus.fleetNumber || 'Bus'}</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      if (!markersRef.current.buses[bus.id]) {
        const marker = L.marker([bus.currentLat, bus.currentLng], { icon: busIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; min-width: 180px; color: #0f172a; padding: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 800; font-size: 15px; color: #0f172a;">${bus.fleetNumber}</span>
              <span style="
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                background: ${bus.status === 'on_trip' ? '#dcfce7' : bus.status === 'emergency' ? '#fee2e2' : '#e0f2fe'};
                color: ${bus.status === 'on_trip' ? '#15803d' : bus.status === 'emergency' ? '#b91c1c' : '#0369a1'};
              ">
                ${bus.status.toUpperCase()}
              </span>
            </div>
            <div style="color: #475569; margin-bottom: 3px;">Plate: <b style="color: #0f172a;">${bus.busNo}</b></div>
            <div style="color: #475569; margin-bottom: 3px;">Speed: <b style="color: #0284c7;">${bus.speed || 0} km/h</b></div>
            <div style="color: #475569; margin-bottom: 3px;">Occupancy: <b>${bus.occupied || 0}/${bus.capacity || 45} seats</b></div>
            <div style="color: #059669; font-size: 11px; margin-top: 6px; font-weight: 600;">● Bus GPS Active</div>
          </div>
        `);
        markersRef.current.buses[bus.id] = marker;
      } else {
        const marker = markersRef.current.buses[bus.id];
        marker.setLatLng([bus.currentLat, bus.currentLng]);
        marker.setIcon(busIcon);
      }

      if (autoCenterBus && isHighlighted) {
        map.panTo([bus.currentLat, bus.currentLng], { animate: true, duration: 1 });
      }
    });

    const activeBusIds = new Set(buses.map(b => b.id));
    Object.keys(markersRef.current.buses).forEach(id => {
      if (!activeBusIds.has(id)) {
        map.removeLayer(markersRef.current.buses[id]);
        delete markersRef.current.buses[id];
      }
    });

  }, [buses, highlightBusId, autoCenterBus]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid #bae6fd', boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Permission Denied Banner */}
      {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
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

      {/* Live Geolocation Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 500,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {/* Center on My Live Location Button */}
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

        {/* Auto-Follow Toggle */}
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

        {/* Reset / Fit View */}
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
          title="Fit route and buses to view"
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
        fontWeight: 600
      }}>
        <span className={`pulse-dot ${locationStatus === 'granted' ? 'online' : 'danger'}`} />
        <span>
          {locationStatus === 'granted'
            ? `Real GPS Live (${userLocation?.lat.toFixed(4)}, ${userLocation?.lng.toFixed(4)})`
            : locationStatus === 'loading'
            ? 'Acquiring GPS fix...'
            : 'GPS Location Required'}
        </span>
      </div>
    </div>
  );
}
