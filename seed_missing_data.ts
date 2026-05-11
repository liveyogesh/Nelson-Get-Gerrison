import db from './server/db.js';

async function seedMissingData() {
  try {
    console.log("Seeding dummy data for missing tables...");

    const [facCount]: any = await db.query('SELECT facility_id FROM org_facilities LIMIT 1');
    const facilityId = facCount.length > 0 ? facCount[0].facility_id : null;

    // Asset Categories
    await db.query(`INSERT IGNORE INTO asset_categories (category_name, description) VALUES 
      ('IT Equipment', 'Laptops, desktops, monitors'),
      ('Medical Devices', 'Specialized medical equipment'),
      ('Furniture', 'Desks, chairs, beds')`);
      
    const [categories]: any = await db.query('SELECT category_id FROM asset_categories');

    // Asset Master
    if (categories.length > 0 && facilityId) {
      await db.query(`INSERT IGNORE INTO asset_master (category_id, asset_name, asset_code, facility_id, status) VALUES 
        (?, 'ThinkPad T14', 'AST-IT-001', ?, 'ACTIVE'),
        (?, 'X-Ray Machine', 'AST-MED-001', ?, 'ACTIVE')`, 
        [categories[0].category_id, facilityId, categories[1].category_id, facilityId]);
    }

    // Contractor Master
    if (facilityId) {
      await db.query(`INSERT IGNORE INTO contractor_master (contractor_name, contact_number, company_name, facility_id, status) VALUES 
        ('John Smith', '1234567890', 'Smith Construction', ?, 'ACTIVE'),
        ('Alice Johnson', '0987654321', 'Johnson Cleaning Services', ?, 'ACTIVE')`,
        [facilityId, facilityId]);
    }

    // Vehicle Master
    await db.query(`INSERT IGNORE INTO vehicle_master (registration_number, vehicle_type, owner_name, owner_contact) VALUES 
      ('MH-01-AB-1234', 'CAR', 'John Smith', '1234567890'),
      ('MH-02-CD-5678', 'TRUCK', 'Alice Johnson', '0987654321')`);
      
    console.log("Data seeding complete!");
  } catch(e) {
    console.error("Seeding failed:", e);
  } finally {
    process.exit(0);
  }
}

seedMissingData();
