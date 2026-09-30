// BEC College (Bhubaneswar Engineering College) transport dataset
// STRICT REQUIREMENT: Exactly 2 buses and 2 drivers.
// Bus 1 must always be assigned to Pragnya (PRAGNYA01) on BEC College ↔ Baramunda.
// Bus 2 must always be assigned to Jitendra (JITENDRA01) on BEC College ↔ Patia.

export const initialData = {
  university: {
    name: "Bhubaneswar Engineering College (BEC)",
    campusLocation: { lat: 20.2185, lng: 85.7170, name: "BEC College Main Campus" },
    contact: "+91 674 246 8000",
    emergencyContact: "1800-425-9999"
  },
  routes: [
    {
      id: "R-101",
      code: "RT-01",
      name: "BEC College ↔ Baramunda",
      color: "#0284c7",
      startPoint: "Baramunda ISBT Terminal",
      endPoint: "BEC College Main Campus",
      distanceKm: 16.4,
      totalDurationMin: 38,
      busId: "BUS-01",
      driverId: "PRAGNYA01",
      stops: [
        { id: "S-101", name: "Baramunda ISBT Terminal", lat: 20.2798, lng: 85.7937, morningTime: "07:30 AM", eveningTime: "05:40 PM", sequence: 1 },
        { id: "S-102", name: "Fire Station Square", lat: 20.2745, lng: 85.7820, morningTime: "07:40 AM", eveningTime: "05:30 PM", sequence: 2 },
        { id: "S-103", name: "Khandagiri Square", lat: 20.2612, lng: 85.7745, morningTime: "07:50 AM", eveningTime: "05:20 PM", sequence: 3 },
        { id: "S-104", name: "Kalinga Vihar Overbridge", lat: 20.2390, lng: 85.7480, morningTime: "08:02 AM", eveningTime: "05:08 PM", sequence: 4 },
        { id: "S-105", name: "Pitapalli Junction", lat: 20.2240, lng: 85.7280, morningTime: "08:15 AM", eveningTime: "04:55 PM", sequence: 5 },
        { id: "S-106", name: "BEC College Main Campus", lat: 20.2185, lng: 85.7170, morningTime: "08:30 AM", eveningTime: "04:40 PM", sequence: 6 }
      ]
    },
    {
      id: "R-102",
      code: "RT-02",
      name: "BEC College ↔ Patia",
      color: "#059669",
      startPoint: "Patia Square (KIIT Road)",
      endPoint: "BEC College Main Campus",
      distanceKm: 21.8,
      totalDurationMin: 48,
      busId: "BUS-02",
      driverId: "JITENDRA01",
      stops: [
        { id: "S-201", name: "Patia Square (KIIT Road)", lat: 20.3541, lng: 85.8198, morningTime: "07:25 AM", eveningTime: "05:50 PM", sequence: 1 },
        { id: "S-202", name: "Infocity Campus Gate", lat: 20.3420, lng: 85.8080, morningTime: "07:35 AM", eveningTime: "05:40 PM", sequence: 2 },
        { id: "S-203", name: "Jayadev Vihar Junction", lat: 20.3015, lng: 85.8220, morningTime: "07:50 AM", eveningTime: "05:25 PM", sequence: 3 },
        { id: "S-204", name: "Nayapalli CRP Square", lat: 20.2880, lng: 85.8010, morningTime: "08:02 AM", eveningTime: "05:12 PM", sequence: 4 },
        { id: "S-205", name: "Dharmavihar / Khandagiri Link", lat: 20.2520, lng: 85.7650, morningTime: "08:14 AM", eveningTime: "05:00 PM", sequence: 5 },
        { id: "S-206", name: "BEC College Main Campus", lat: 20.2185, lng: 85.7170, morningTime: "08:30 AM", eveningTime: "04:45 PM", sequence: 6 }
      ]
    }
  ],
  buses: [
    {
      id: "BUS-01",
      busNo: "OD-02-AX-1001",
      fleetNumber: "Bus 1",
      capacity: 45,
      occupied: 38,
      driverId: "PRAGNYA01",
      driverName: "Pragnya",
      routeId: "R-101",
      routeName: "BEC College ↔ Baramunda",
      status: "on_trip",
      currentLat: 20.2612,
      currentLng: 85.7745,
      speed: 36,
      heading: 220,
      fuelPercent: 82,
      nextStopId: "S-104",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "BUS-02",
      busNo: "OD-02-AX-2002",
      fleetNumber: "Bus 2",
      capacity: 42,
      occupied: 34,
      driverId: "JITENDRA01",
      driverName: "Jitendra",
      routeId: "R-102",
      routeName: "BEC College ↔ Patia",
      status: "on_trip",
      currentLat: 20.3015,
      currentLng: 85.8220,
      speed: 32,
      heading: 205,
      fuelPercent: 88,
      nextStopId: "S-204",
      lastUpdated: new Date().toISOString()
    }
  ],
  drivers: [
    {
      id: "PRAGNYA01",
      name: "Pragnya",
      phone: "+91 98610 12345",
      licenseNo: "OD-02-2016-004581",
      experienceYears: 8,
      rating: 4.9,
      busId: "BUS-01",
      busName: "Bus 1",
      routeId: "R-101",
      routeName: "BEC College ↔ Baramunda",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      status: "active"
    },
    {
      id: "JITENDRA01",
      name: "Jitendra",
      phone: "+91 98610 67890",
      licenseNo: "OD-02-2014-009122",
      experienceYears: 11,
      rating: 4.8,
      busId: "BUS-02",
      busName: "Bus 2",
      routeId: "R-102",
      routeName: "BEC College ↔ Patia",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: "active"
    }
  ],
  students: [
    {
      id: "STU-01",
      name: "Alex Johnson",
      email: "alex.johnson@bec.edu.in",
      rollNo: "CS-2024-042",
      department: "Computer Science",
      year: "3rd Year",
      phone: "+91 91234 56780",
      routeId: "R-101",
      busId: "BUS-01",
      stopId: "S-103", // Khandagiri Square
      status: "approved",
      boardedToday: true,
      boardedTime: "07:52 AM",
      qrToken: "BEC-STU-01-CS042"
    },
    {
      id: "STU-02",
      name: "Priya Sharma",
      email: "priya.sharma@bec.edu.in",
      rollNo: "EC-2024-089",
      department: "Electronics & Comm",
      year: "2nd Year",
      phone: "+91 91234 56781",
      routeId: "R-101",
      busId: "BUS-01",
      stopId: "S-104", // Kalinga Vihar Overbridge
      status: "approved",
      boardedToday: false,
      boardedTime: null,
      qrToken: "BEC-STU-02-EC089"
    },
    {
      id: "STU-03",
      name: "Rohan Varma",
      email: "rohan.varma@bec.edu.in",
      rollNo: "ME-2024-015",
      department: "Mechanical Engg",
      year: "4th Year",
      phone: "+91 91234 56782",
      routeId: "R-102",
      busId: "BUS-02",
      stopId: "S-203", // Jayadev Vihar
      status: "approved",
      boardedToday: true,
      boardedTime: "07:54 AM",
      qrToken: "BEC-STU-03-ME015"
    },
    {
      id: "STU-04",
      name: "Ananya Deshmukh",
      email: "ananya.d@bec.edu.in",
      rollNo: "IT-2024-118",
      department: "Information Tech",
      year: "1st Year",
      phone: "+91 91234 56783",
      routeId: "R-102",
      busId: "BUS-02",
      stopId: "S-201", // Patia Square
      status: "pending_approval",
      boardedToday: false,
      boardedTime: null,
      qrToken: "BEC-STU-04-IT118"
    }
  ],
  notifications: [
    {
      id: "NOTIF-01",
      title: "Bus 1 En Route",
      message: "Bus 1 (Driver: Pragnya) is departing Khandagiri Square. Expected arrival at Kalinga Vihar in 10 mins.",
      type: "info",
      target: "R-101",
      timestamp: "8 mins ago",
      read: false
    },
    {
      id: "NOTIF-02",
      title: "Bus 2 Live GPS Update",
      message: "Bus 2 (Driver: Jitendra) approaching Jayadev Vihar Junction on Patia route.",
      type: "info",
      target: "R-102",
      timestamp: "15 mins ago",
      read: true
    }
  ],
  complaints: [
    {
      id: "CMP-01",
      studentId: "STU-02",
      studentName: "Priya Sharma",
      studentRoll: "EC-2024-089",
      category: "Timing & Schedule",
      subject: "Morning bus schedule inquiry",
      message: "Request driver Pragnya to pause for an additional minute at Kalinga Vihar overbridge.",
      status: "in_review",
      adminReply: "Noted. Transport supervisor contacted Pragnya to ensure timely pickup dwell time.",
      createdAt: "Yesterday, 04:30 PM"
    }
  ],
  routeChangeRequests: [
    {
      id: "REQ-01",
      studentId: "STU-01",
      studentName: "Alex Johnson",
      studentRoll: "CS-2024-042",
      currentRoute: "RT-01 (BEC College ↔ Baramunda)",
      requestedRoute: "RT-02 (BEC College ↔ Patia)",
      currentStop: "Khandagiri Square",
      requestedStop: "Jayadev Vihar Junction",
      reason: "Shifted residence towards Jayadev Vihar.",
      status: "pending",
      submittedAt: "Today, 06:15 AM"
    }
  ],
  activeTrips: [
    {
      id: "TRIP-01",
      busId: "BUS-01",
      routeId: "R-101",
      driverId: "PRAGNYA01",
      type: "morning_pickup",
      status: "in_progress",
      startTime: "07:30 AM",
      currentStopIndex: 2,
      totalBoarded: 24,
      boardedStudents: [
        { studentId: "STU-01", stopId: "S-103", time: "07:52 AM", method: "qr" }
      ]
    },
    {
      id: "TRIP-02",
      busId: "BUS-02",
      routeId: "R-102",
      driverId: "JITENDRA01",
      type: "morning_pickup",
      status: "in_progress",
      startTime: "07:25 AM",
      currentStopIndex: 2,
      totalBoarded: 28,
      boardedStudents: [
        { studentId: "STU-03", stopId: "S-203", time: "07:54 AM", method: "manual" }
      ]
    }
  ]
};
