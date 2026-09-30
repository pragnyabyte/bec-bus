import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import StudentDashboard from './components/Student/StudentDashboard';
import DriverConsole from './components/Driver/DriverConsole';
import AdminDashboard from './components/Admin/AdminDashboard';
import AuthModal from './components/Auth/AuthModal';
import { api, socket } from './services/api';

export default function App() {
  const [currentRole, setCurrentRole] = useState('student'); // 'student' | 'driver' | 'admin'
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Core Data State
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);

  // Active student and driver profiles with localStorage persistence
  const [currentStudentId, setCurrentStudentId] = useState(() => {
    return localStorage.getItem('apextransit_active_student_id') || 'STU-01';
  });
  const [currentDriverId, setCurrentDriverId] = useState(() => {
    return localStorage.getItem('apextransit_active_driver_id') || 'PRAGNYA01';
  });

  const handleDriverChange = useCallback((id) => {
    setCurrentDriverId(id);
    localStorage.setItem('apextransit_active_driver_id', id);
  }, []);

  // Load all data from API
  const loadData = useCallback(async () => {
    try {
      const [overviewData, routesData, busesData, driversData, studentsData, complaintsData, requestsData, notifsData] = await Promise.all([
        api.getOverview().catch(() => ({})),
        api.getRoutes().catch(() => []),
        api.getBuses().catch(() => []),
        api.getOverview().then(o => o.drivers || []).catch(() => []),
        api.getStudents().catch(() => []),
        api.getComplaints().catch(() => []),
        api.getChangeRequests().catch(() => []),
        api.getNotifications().catch(() => [])
      ]);

      if (overviewData?.stats) setOverview(overviewData);
      if (routesData?.length) setRoutes(routesData);
      if (busesData?.length) setBuses(busesData);
      if (driversData?.length) setDrivers(driversData);
      if (studentsData?.length) setStudents(studentsData);
      if (complaintsData?.length) setComplaints(complaintsData);
      if (requestsData?.length) setChangeRequests(requestsData);
      if (notifsData?.length) setNotifications(notifsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStudentChange = useCallback((id) => {
    setCurrentStudentId(id);
    localStorage.setItem('apextransit_active_student_id', id);
    const s = students.find(item => item.id === id);
    if (s) {
      localStorage.setItem('apextransit_active_student_data', JSON.stringify(s));
    }
  }, [students]);

  const handleStudentRegistered = useCallback(async (newStudent) => {
    if (newStudent && newStudent.id) {
      localStorage.setItem('apextransit_active_student_id', newStudent.id);
      localStorage.setItem('apextransit_active_student_data', JSON.stringify(newStudent));
      setCurrentStudentId(newStudent.id);
    }
    setCurrentRole('student');
    await loadData();
    setShowRegisterModal(false);
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Socket.IO event listeners for real-time synchronization
    socket.on('initial:state', (data) => {
      if (data.buses) setBuses(data.buses);
      if (data.routes) setRoutes(data.routes);
      if (data.notifications) setNotifications(data.notifications);
    });

    socket.on('bus:telemetry', (telemetry) => {
      setBuses(prevBuses => {
        return prevBuses.map(b => {
          if (b.id === telemetry.busId) {
            return {
              ...b,
              currentLat: telemetry.lat,
              currentLng: telemetry.lng,
              speed: telemetry.speed,
              heading: telemetry.heading,
              status: telemetry.status || b.status,
              occupied: telemetry.occupied !== undefined ? telemetry.occupied : b.occupied,
              lastUpdated: telemetry.lastUpdated || new Date().toISOString()
            };
          }
          return b;
        });
      });
    });

    socket.on('buses:updated', (updatedBuses) => {
      setBuses(updatedBuses);
    });

    socket.on('students:updated', (updatedStudents) => {
      setStudents(updatedStudents);
    });

    socket.on('complaints:updated', (updatedComplaints) => {
      setComplaints(updatedComplaints);
    });

    socket.on('change_requests:updated', (updatedReqs) => {
      setChangeRequests(updatedReqs);
    });

    socket.on('notification:new', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
      socket.off('initial:state');
      socket.off('bus:telemetry');
      socket.off('buses:updated');
      socket.off('students:updated');
      socket.off('complaints:updated');
      socket.off('change_requests:updated');
      socket.off('notification:new');
    };
  }, [loadData]);

  const currentStudent = useMemo(() => {
    const found = students.find(s => s.id === currentStudentId);
    if (found) return found;
    try {
      const cached = localStorage.getItem('apextransit_active_student_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.id === currentStudentId || !currentStudentId)) {
          return parsed;
        }
      }
    } catch (e) {}
    return students[0] || null;
  }, [students, currentStudentId]);

  const currentDriver = drivers.find(d => d.id === currentDriverId) || drivers[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#0f172a' }}>
      {/* Top Navbar with Instant 3-Role Switcher */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        students={students}
        currentStudent={currentStudent}
        onStudentChange={handleStudentChange}
        drivers={drivers}
        currentDriver={currentDriver}
        onDriverChange={handleDriverChange}
        notifications={notifications}
        buses={buses}
        onOpenRegisterModal={() => setShowRegisterModal(true)}
      />

      {/* Main Role Content View */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
            <div className="pulse-dot online" style={{ width: '16px', height: '16px', marginBottom: '1rem' }} />
            <h3 style={{ color: '#0f172a' }}>Connecting to Apex Transit Fleet...</h3>
          </div>
        ) : (
          <>
            {currentRole === 'student' && (
              <StudentDashboard
                student={currentStudent}
                routes={routes}
                buses={buses}
                drivers={drivers}
                complaints={complaints}
                notifications={notifications}
                onDataRefresh={loadData}
              />
            )}

            {currentRole === 'driver' && (
              <DriverConsole
                driver={currentDriver}
                drivers={drivers}
                buses={buses}
                routes={routes}
                students={students}
                onDataRefresh={loadData}
              />
            )}

            {currentRole === 'admin' && (
              <AdminDashboard
                overview={overview}
                buses={buses}
                routes={routes}
                drivers={drivers}
                students={students}
                complaints={complaints}
                changeRequests={changeRequests}
                notifications={notifications}
                onDataRefresh={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Light Footer */}
      <footer style={{
        borderTop: '1px solid #e0f2fe',
        background: '#ffffff',
        padding: '1.25rem 2rem',
        fontSize: '0.825rem',
        color: '#64748b',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 -2px 10px rgba(2, 132, 199, 0.03)'
      }}>
        <div>
          <b style={{ color: '#0f172a' }}>BECTransit™</b> • Bhubaneswar Engineering College • 2 Buses & 2 Drivers Live Fleet
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', color: '#475569' }}>
          <span>Campus Transport Office: <b style={{ color: '#0284c7' }}>+91 674 246 8000</b></span>
          <span>Security Emergency: <b style={{ color: '#dc2626' }}>1800-425-9999</b></span>
          <span>Node.js + Socket.IO + OpenStreetMap + React</span>
        </div>
      </footer>

      {/* Student Onboarding & Registration Modal */}
      {showRegisterModal && (
        <AuthModal
          routes={routes}
          onRegistered={handleStudentRegistered}
          onClose={() => setShowRegisterModal(false)}
        />
      )}
    </div>
  );
}
