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
      return;
    }

    console.log('[MongoDB] Collections empty. Migrating existing dataset into MongoDB Atlas...');

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
    await University.deleteMany({});
    await University.create(sourceData.university);

    // 2. Routes (Strictly 2 routes)
    await Route.deleteMany({});
    await Route.insertMany(initialData.routes);

    // 3. Buses (Strictly 2 buses)
    await Bus.deleteMany({});
    await Bus.insertMany(initialData.buses);

    // 4. Drivers (Strictly 2 drivers)
    await Driver.deleteMany({});
    await Driver.insertMany(initialData.drivers);

    // 5. Students
    await Student.deleteMany({});
    const studentsToInsert = (sourceData.students && sourceData.students.length > 0)
      ? sourceData.students
      : initialData.students;
    await Student.insertMany(studentsToInsert);

    // 6. Complaints
    await Complaint.deleteMany({});
    const complaintsToInsert = (sourceData.complaints && sourceData.complaints.length > 0)
      ? sourceData.complaints
      : initialData.complaints;
    await Complaint.insertMany(complaintsToInsert);

    // 7. Route Change Requests
    await RouteChangeRequest.deleteMany({});
    const reqsToInsert = (sourceData.routeChangeRequests && sourceData.routeChangeRequests.length > 0)
      ? sourceData.routeChangeRequests
      : initialData.routeChangeRequests;
    await RouteChangeRequest.insertMany(reqsToInsert);

    // 8. Notifications
    await Notification.deleteMany({});
    const notifsToInsert = (sourceData.notifications && sourceData.notifications.length > 0)
      ? sourceData.notifications
      : initialData.notifications;
    await Notification.insertMany(notifsToInsert);

    // 9. Active Trips
    await ActiveTrip.deleteMany({});
    const tripsToInsert = (sourceData.activeTrips && sourceData.activeTrips.length > 0)
      ? sourceData.activeTrips
      : initialData.activeTrips;
    await ActiveTrip.insertMany(tripsToInsert);

    console.log('✅ [MongoDB] Initial migration and seeding completed successfully!');
    console.log(`   - University: ${sourceData.university.name}`);
    console.log(`   - Buses: 2 (Bus 1 - Pragnya, Bus 2 - Jitendra)`);
    console.log(`   - Drivers: 2 (Pragnya +919040833547, Jitendra +916370998587)`);
    console.log(`   - Routes: 2 (BEC College ↔ Baramunda, BEC College ↔ Patia)`);
    console.log(`   - Students: ${studentsToInsert.length}`);
  } catch (err) {
    console.error('❌ [MongoDB] Error during seeding:', err.message);
  }
}
