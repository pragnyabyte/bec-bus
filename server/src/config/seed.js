import {
  University,
  Route,
  Bus,
  Driver,
  Student,
  Complaint,
  RouteChangeRequest,
  Notification,
  ActiveTrip
} from '../models/index.js';
import { initialData } from '../mockData.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'db_storage.json');

export async function seedDatabaseIfEmpty() {
  try {
    const busCount = await Bus.countDocuments();
    if (busCount > 0) {
      console.log(`[MongoDB] Database already populated with ${busCount} buses. Checking fleet invariant...`);
      // Verify the 2-bus & 2-driver invariant in MongoDB
      const buses = await Bus.find({});
      if (buses.length !== 2) {
        console.warn(`[MongoDB] Bus fleet count is ${buses.length}. Resetting to strict 2 buses (Bus 1 - Pragnya, Bus 2 - Jitendra)...`);
        await Bus.deleteMany({});
        await Driver.deleteMany({});
        await Route.deleteMany({});
        await Bus.insertMany(initialData.buses);
        await Driver.insertMany(initialData.drivers);
        await Route.insertMany(initialData.routes);
        console.log(`[MongoDB] Re-seeded strict 2 buses and 2 drivers.`);
      }
    }

    console.log('[MongoDB] Checking and migrating collections into MongoDB Atlas...');

    // Load from db_storage.json if exists and valid, otherwise initialData
    let sourceData = initialData;
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
          sourceData = parsed;
          console.log('[MongoDB] Using persistent db_storage.json as migration source.');
        }
      } catch (e) {
        console.warn('[MongoDB] Error reading db_storage.json, falling back to initialData:', e.message);
      }
    }

    // 1. University
    const uniCount = await University.countDocuments();
    if (uniCount === 0) {
      await University.create(sourceData.university);
    }

    // 2. Routes (Strictly 2 routes)
    const routeCount = await Route.countDocuments();
    if (routeCount !== 2) {
      await Route.deleteMany({});
      await Route.insertMany(initialData.routes);
    }

    // 3. Buses (Strictly 2 buses)
    const busCountInDb = await Bus.countDocuments();
    if (busCountInDb !== 2) {
      await Bus.deleteMany({});
      await Bus.insertMany(initialData.buses);
    }

    // 4. Drivers (Strictly 2 drivers)
    const driverCountInDb = await Driver.countDocuments();
    if (driverCountInDb !== 2) {
      await Driver.deleteMany({});
      await Driver.insertMany(initialData.drivers);
    }

    // 5. Students
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      const studentsToInsert = ((sourceData.students && sourceData.students.length > 0)
        ? sourceData.students
        : initialData.students).map(s => {
          const item = { ...s };
          delete item._id;
          delete item.createdAt;
          delete item.updatedAt;
          return item;
        });
      await Student.insertMany(studentsToInsert);
    }

    // 6. Complaints
    const complaintCount = await Complaint.countDocuments();
    if (complaintCount === 0) {
      const complaintsToInsert = ((sourceData.complaints && sourceData.complaints.length > 0)
        ? sourceData.complaints
        : initialData.complaints).map(c => {
          const item = { ...c };
          delete item._id;
          if (typeof item.createdAt === 'string') {
            item.createdAtString = item.createdAtString || item.createdAt;
            delete item.createdAt;
          }
          delete item.updatedAt;
          return item;
        });
      if (complaintsToInsert.length > 0) {
        await Complaint.insertMany(complaintsToInsert);
      }
    }

    // 7. Route Change Requests
    const reqCount = await RouteChangeRequest.countDocuments();
    if (reqCount === 0) {
      const reqsToInsert = ((sourceData.routeChangeRequests && sourceData.routeChangeRequests.length > 0)
        ? sourceData.routeChangeRequests
        : initialData.routeChangeRequests).map(r => {
          const item = { ...r };
          delete item._id;
          if (typeof item.submittedAt === 'string') {
            item.submittedAtString = item.submittedAtString || item.submittedAt;
            delete item.submittedAt;
          }
          delete item.createdAt;
          delete item.updatedAt;
          return item;
        });
      if (reqsToInsert.length > 0) {
        await RouteChangeRequest.insertMany(reqsToInsert);
      }
    }

    // 8. Notifications
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      const notifsToInsert = ((sourceData.notifications && sourceData.notifications.length > 0)
        ? sourceData.notifications
        : initialData.notifications).map(n => {
          const item = { ...n };
          delete item._id;
          delete item.createdAt;
          delete item.updatedAt;
          return item;
        });
      if (notifsToInsert.length > 0) {
        await Notification.insertMany(notifsToInsert);
      }
    }

    // 9. Active Trips
    const tripCount = await ActiveTrip.countDocuments();
    if (tripCount === 0) {
      const tripsToInsert = ((sourceData.activeTrips && sourceData.activeTrips.length > 0)
        ? sourceData.activeTrips
        : initialData.activeTrips).map(t => {
          const item = { ...t };
          delete item._id;
          delete item.createdAt;
          delete item.updatedAt;
          return item;
        });
      if (tripsToInsert.length > 0) {
        await ActiveTrip.insertMany(tripsToInsert);
      }
    }

    console.log('✅ [MongoDB] Initial migration and seeding completed successfully!');
  } catch (err) {
    console.error('❌ [MongoDB] Error during seeding:', err.message);
  }
}
