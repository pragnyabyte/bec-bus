import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import StudentDashboard from './components/Student/StudentDashboard';
import DriverConsole from './components/Driver/DriverConsole';
import AdminDashboard from './components/Admin/AdminDashboard';
import AuthModal from './components/Auth/AuthModal';
import AuthPage from './components/Auth/AuthPage';
import { api, socket } from './services/api';

export default function App() {
  // Authentication session state: null on initial website open
  const [authSession, setAuthSession] = useState(() => {
    try {
      const saved = localStorage.getItem('bectransit_auth_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('bectransit_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role) return parsed.role;
      }
    } catch (e) {}
    return 'student';
  });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('register'); // 'login' | 'register' | 'update'
  const [targetEditStudent, setTargetEditStudent] = useState(null);

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

  // Open modal in specified mode ('login' | 'register' | 'update')
  const handleOpenAuthModal = useCallback((mode = 'register', student = null) => {
    setAuthModalMode(mode);
    setTargetEditStudent(student || null);
    setShowRegisterModal(true);
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

  const handleStudentLoggedIn = useCallback((loggedInStudent) => {
    if (loggedInStudent && loggedInStudent.id) {
      localStorage.setItem('apextransit_active_student_id', loggedInStudent.id);
      localStorage.setItem('apextransit_active_student_data', JSON.stringify(loggedInStudent));
      setCurrentStudentId(loggedInStudent.id);
    }
    setCurrentRole('student');
    setShowRegisterModal(false);
  }, []);

  const handleStudentUpdated = useCallback(async (updatedStudent) => {
    if (updatedStudent && updatedStudent.id) {
      localStorage.setItem('apextransit_active_student_id', updatedStudent.id);
      localStorage.setItem('apextransit_active_student_data', JSON.stringify(updatedStudent));
      setCurrentStudentId(updatedStudent.id);
    }
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    await loadData();
    setShowRegisterModal(false);
  }, [loadData]);

  const handleAuthenticated = useCallback((session) => {
    setAuthSession(session);
    localStorage.setItem('bectransit_auth_session', JSON.stringify(session));
    setCurrentRole(session.role);
    if (session.role === 'student' && session.user?.id) {
      setCurrentStudentId(session.user.id);
      localStorage.setItem('apextransit_active_student_id', session.user.id);
      localStorage.setItem('apextransit_active_student_data', JSON.stringify(session.user));
    } else if (session.role === 'driver' && session.user?.id) {
      setCurrentDriverId(session.user.id);
      localStorage.setItem('apextransit_active_driver_id', session.user.id);
    }
    loadData();
  }, [loadData]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('bectransit_auth_session');
    setAuthSession(null);
  }, []);

  useEffect(() => {
    setShowRegisterModal(false);
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
    const found = students.find(s => s.id === currentStudentId || s.rollNo === currentStudentId);
    if (found) return found;
    if (authSession?.role === 'student' && authSession?.user) return authSession.user;
    try {
      const cached = localStorage.getItem('apextransit_active_student_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch (e) {}
    return students[0] || null;
  }, [students, currentStudentId, authSession]);

  const currentDriver = useMemo(() => {
    const found = drivers.find(d => d.id === currentDriverId);
    if (found) return found;
    if (authSession?.role === 'driver' && authSession?.user) return authSession.user;
    return drivers[0] || null;
  }, [drivers, currentDriverId, authSession]);

  // GATE: When website is opened, the first screen must be Login / Sign Up
  if (!authSession) {
    return (
      <AuthPage
        routes={routes.length > 0 ? routes : [
          { id: 'R-101', code: 'RT-01', name: 'BEC College ↔ Baramunda' },
          { id: 'R-102', code: 'RT-02', name: 'BEC College ↔ Patia' }
        ]}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#0f172a' }}>
      {/* Top Navbar with Instant 3-Role Switcher and Logout */}
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
        onOpenRegisterModal={() => handleOpenAuthModal('register')}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main Role Content View */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
            <div className="pulse-dot online" style={{ width: '16px', height: '16px', marginBottom: '1rem' }} />
            <h3 style={{ color: '#0f172a' }}>Connecting to BEC Transit Fleet...</h3>
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
                onOpenAuthModal={handleOpenAuthModal}
                onLogout={handleLogout}
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
                onLogout={handleLogout}
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
                onOpenAuthModal={handleOpenAuthModal}
                onLogout={handleLogout}
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
          <b style={{ color: '#0f172a' }}>BECTransit</b> • Bhubaneswar Engineering College • 2 Buses & 2 Drivers Live Fleet
        </div>
        <div style={{ color: '#475569' }}>
          <span>Campus Transport Office: <b style={{ color: '#0284c7' }}>+91 674 246 8000</b></span>
        </div>
      </footer>

      {/* Student Onboarding, Login & Update User Modal */}
      {showRegisterModal && (
        <AuthModal
          routes={routes}
          initialMode={authModalMode}
          currentStudent={targetEditStudent || currentStudent}
          onRegistered={handleStudentRegistered}
          onLoggedIn={handleStudentLoggedIn}
          onUpdated={handleStudentUpdated}
          onClose={() => {
            setShowRegisterModal(false);
            setTargetEditStudent(null);
          }}
        />
      )}
    </div>
  );
}
