/**
 * Script to populate database tables with test data for the Capacity Impact Analyzer
 */

const db = require('../../utils/db');

async function populateTestData() {
  try {
    console.log('Starting database population...');

    // Check if tables exist
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    console.log('Existing tables:', tableNames);
    
    // Clear existing data
    console.log('Clearing existing data...');
    
    if (tableNames.includes('maintenance_requests')) {
      await db('maintenance_requests').del();
    }
    if (tableNames.includes('stand_aircraft_constraints')) {
      await db('stand_aircraft_constraints').del();
    }
    if (tableNames.includes('stands')) {
      await db('stands').del();
    }
    if (tableNames.includes('aircraft_types')) {
      await db('aircraft_types').del();
    }
    if (tableNames.includes('maintenance_status_types')) {
      await db('maintenance_status_types').del();
    }
    if (tableNames.includes('operational_settings')) {
      await db('operational_settings').del();
    }
    if (tableNames.includes('time_slots')) {
      await db('time_slots').del();
    }
    
    // 1. Insert maintenance status types
    console.log('Inserting maintenance status types...');
    if (tableNames.includes('maintenance_status_types')) {
      await db('maintenance_status_types').insert([
        { id: 1, name: 'Requested' },
        { id: 2, name: 'Approved' },
        { id: 3, name: 'Rejected' },
        { id: 4, name: 'In Progress' },
        { id: 5, name: 'Completed' },
        { id: 6, name: 'Cancelled' }
      ]);
    } else {
      console.log('Creating maintenance_status_types table...');
      await db.schema.createTable('maintenance_status_types', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
      });
      
      await db('maintenance_status_types').insert([
        { id: 1, name: 'Requested' },
        { id: 2, name: 'Approved' },
        { id: 3, name: 'Rejected' },
        { id: 4, name: 'In Progress' },
        { id: 5, name: 'Completed' },
        { id: 6, name: 'Cancelled' }
      ]);
    }
    
    // 2. Insert aircraft types
    console.log('Inserting aircraft types...');
    if (tableNames.includes('aircraft_types')) {
      // Get the column names from the aircraft_types table
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'aircraft_types'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Aircraft types columns:', columnNames);
      
      // Create aircraft type data without average_turnaround_minutes
      const aircraftTypesData = [
        { 
          id: 1, 
          icao_code: 'A320', 
          iata_code: '320', 
          name: 'Airbus A320', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Airbus',
          model: 'A320'
        },
        { 
          id: 2, 
          icao_code: 'B738', 
          iata_code: '738', 
          name: 'Boeing 737-800', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Boeing',
          model: '737-800'
        },
        { 
          id: 3, 
          icao_code: 'E190', 
          iata_code: 'E90', 
          name: 'Embraer 190', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Embraer',
          model: '190'
        },
        { 
          id: 4, 
          icao_code: 'B77W', 
          iata_code: '77W', 
          name: 'Boeing 777-300ER', 
          size_category_code: 'E', 
          is_active: true, 
          body_type: 'wideBody',
          manufacturer: 'Boeing',
          model: '777-300ER'
        },
        { 
          id: 5, 
          icao_code: 'A350', 
          iata_code: '350', 
          name: 'Airbus A350', 
          size_category_code: 'E', 
          is_active: true, 
          body_type: 'wideBody',
          manufacturer: 'Airbus',
          model: 'A350-900'
        }
      ];
      
      // Filter out any fields that don't exist in the table
      const validAircraftTypesData = aircraftTypesData.map(data => {
        const validData = {};
        for (const [key, value] of Object.entries(data)) {
          if (columnNames.includes(key)) {
            validData[key] = value;
          }
        }
        return validData;
      });
      
      await db('aircraft_types').insert(validAircraftTypesData);
    } else {
      console.log('Creating aircraft_types table...');
      await db.schema.createTable('aircraft_types', table => {
        table.increments('id').primary();
        table.string('icao_code').notNullable();
        table.string('iata_code').notNullable();
        table.string('name').notNullable();
        table.string('manufacturer');
        table.string('model');
        table.string('size_category_code');
        table.boolean('is_active').defaultTo(true);
        table.string('body_type');
        table.float('wingspan_meters');
        table.float('length_meters');
        table.timestamps(true, true);
      });
      
      await db('aircraft_types').insert([
        { 
          id: 1, 
          icao_code: 'A320', 
          iata_code: '320', 
          name: 'Airbus A320', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Airbus',
          model: 'A320'
        },
        { 
          id: 2, 
          icao_code: 'B738', 
          iata_code: '738', 
          name: 'Boeing 737-800', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Boeing',
          model: '737-800'
        },
        { 
          id: 3, 
          icao_code: 'E190', 
          iata_code: 'E90', 
          name: 'Embraer 190', 
          size_category_code: 'C', 
          is_active: true, 
          body_type: 'narrowBody',
          manufacturer: 'Embraer',
          model: '190'
        },
        { 
          id: 4, 
          icao_code: 'B77W', 
          iata_code: '77W', 
          name: 'Boeing 777-300ER', 
          size_category_code: 'E', 
          is_active: true, 
          body_type: 'wideBody',
          manufacturer: 'Boeing',
          model: '777-300ER'
        },
        { 
          id: 5, 
          icao_code: 'A350', 
          iata_code: '350', 
          name: 'Airbus A350', 
          size_category_code: 'E', 
          is_active: true, 
          body_type: 'wideBody',
          manufacturer: 'Airbus',
          model: 'A350-900'
        }
      ]);
    }
    
    // 3. Insert stands
    console.log('Inserting stands...');
    if (tableNames.includes('stands')) {
      // Get the column names from the stands table
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stands'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Stands columns:', columnNames);
      
      // Create stands data with required fields
      const standsData = [
        { id: 1, code: 'S101', name: 'Stand 101', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 2, code: 'S102', name: 'Stand 102', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 3, code: 'S103', name: 'Stand 103', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 4, code: 'S104', name: 'Stand 104', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 5, code: 'S105', name: 'Stand 105', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 6, code: 'L101', name: 'Large Stand 101', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 7, code: 'L102', name: 'Large Stand 102', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 8, code: 'L103', name: 'Large Stand 103', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true }
      ];
      
      // Filter out any fields that don't exist in the table
      const validStandsData = standsData.map(data => {
        const validData = {};
        for (const [key, value] of Object.entries(data)) {
          if (columnNames.includes(key)) {
            validData[key] = value;
          }
        }
        return validData;
      });
      
      await db('stands').insert(validStandsData);
    } else {
      console.log('Creating stands table...');
      await db.schema.createTable('stands', table => {
        table.increments('id').primary();
        table.string('code').notNullable();
        table.string('name').notNullable();
        table.string('max_aircraft_size_code');
        table.boolean('is_active').defaultTo(true);
        table.integer('pier_id').notNullable();
        table.string('terminal');
        table.boolean('is_test_data').defaultTo(true);
        table.text('description');
        table.boolean('has_jetbridge').defaultTo(false);
        table.float('max_wingspan_meters');
        table.float('max_length_meters');
        table.float('latitude');
        table.float('longitude');
        table.timestamps(true, true);
      });
      
      await db('stands').insert([
        { id: 1, code: 'S101', name: 'Stand 101', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 2, code: 'S102', name: 'Stand 102', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 3, code: 'S103', name: 'Stand 103', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 4, code: 'S104', name: 'Stand 104', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 5, code: 'S105', name: 'Stand 105', max_aircraft_size_code: 'C', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 6, code: 'L101', name: 'Large Stand 101', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 7, code: 'L102', name: 'Large Stand 102', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true },
        { id: 8, code: 'L103', name: 'Large Stand 103', max_aircraft_size_code: 'E', is_active: true, pier_id: 1, terminal: 'T1', is_test_data: true }
      ]);
    }
    
    // 4. Insert stand-aircraft constraints
    console.log('Inserting stand-aircraft constraints...');
    if (tableNames.includes('stand_aircraft_constraints')) {
      // Get the column names from the stand_aircraft_constraints table
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stand_aircraft_constraints'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Stand aircraft constraints columns:', columnNames);
      
      // Create stand aircraft constraints data
      const standAircraftConstraintsData = [
        { id: 1, stand_id: 1, aircraft_type_id: 1, is_allowed: true },
        { id: 2, stand_id: 1, aircraft_type_id: 2, is_allowed: true },
        { id: 3, stand_id: 1, aircraft_type_id: 3, is_allowed: true },
        { id: 4, stand_id: 2, aircraft_type_id: 1, is_allowed: true },
        { id: 5, stand_id: 2, aircraft_type_id: 2, is_allowed: true },
        { id: 6, stand_id: 2, aircraft_type_id: 3, is_allowed: true },
        { id: 7, stand_id: 3, aircraft_type_id: 1, is_allowed: true },
        { id: 8, stand_id: 3, aircraft_type_id: 2, is_allowed: true },
        { id: 9, stand_id: 3, aircraft_type_id: 3, is_allowed: true },
        { id: 10, stand_id: 6, aircraft_type_id: 4, is_allowed: true },
        { id: 11, stand_id: 6, aircraft_type_id: 5, is_allowed: true },
        { id: 12, stand_id: 7, aircraft_type_id: 4, is_allowed: true },
        { id: 13, stand_id: 7, aircraft_type_id: 5, is_allowed: true }
      ];
      
      // Filter out any fields that don't exist in the table
      const validConstraintsData = standAircraftConstraintsData.map(data => {
        const validData = {};
        for (const [key, value] of Object.entries(data)) {
          if (columnNames.includes(key)) {
            validData[key] = value;
          }
        }
        return validData;
      });
      
      await db('stand_aircraft_constraints').insert(validConstraintsData);
    } else {
      console.log('Creating stand_aircraft_constraints table...');
      await db.schema.createTable('stand_aircraft_constraints', table => {
        table.increments('id').primary();
        table.integer('stand_id').references('id').inTable('stands');
        table.integer('aircraft_type_id').references('id').inTable('aircraft_types');
        table.boolean('is_allowed').defaultTo(true);
        table.string('constraint_reason');
        table.timestamps(true, true);
      });
      
      await db('stand_aircraft_constraints').insert([
        { stand_id: 1, aircraft_type_id: 1, is_allowed: true },
        { stand_id: 1, aircraft_type_id: 2, is_allowed: true },
        { stand_id: 1, aircraft_type_id: 3, is_allowed: true },
        { stand_id: 2, aircraft_type_id: 1, is_allowed: true },
        { stand_id: 2, aircraft_type_id: 2, is_allowed: true },
        { stand_id: 2, aircraft_type_id: 3, is_allowed: true },
        { stand_id: 3, aircraft_type_id: 1, is_allowed: true },
        { stand_id: 3, aircraft_type_id: 2, is_allowed: true },
        { stand_id: 3, aircraft_type_id: 3, is_allowed: true },
        { stand_id: 6, aircraft_type_id: 4, is_allowed: true },
        { stand_id: 6, aircraft_type_id: 5, is_allowed: true },
        { stand_id: 7, aircraft_type_id: 4, is_allowed: true },
        { stand_id: 7, aircraft_type_id: 5, is_allowed: true }
      ]);
    }
    
    // 5. Insert operational settings
    console.log('Inserting operational settings...');
    if (tableNames.includes('operational_settings')) {
      // Get the column names from the operational_settings table
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'operational_settings'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Operational settings columns:', columnNames);
      
      // Create operational settings data
      const opSettingsData = {
        id: 1,
        default_gap_minutes: 15,
        slot_duration_minutes: 60,
        operating_start_time: '06:00:00',
        operating_end_time: '22:00:00'
      };
      
      // Filter out any fields that don't exist in the table
      const validOpSettingsData = {};
      for (const [key, value] of Object.entries(opSettingsData)) {
        if (columnNames.includes(key)) {
          validOpSettingsData[key] = value;
        }
      }
      
      if (Object.keys(validOpSettingsData).length > 0) {
        await db('operational_settings').insert(validOpSettingsData);
      } else {
        console.log('No valid columns found for operational_settings table. Skipping insert.');
      }
    } else {
      console.log('Creating operational_settings table...');
      await db.schema.createTable('operational_settings', table => {
        table.increments('id').primary();
        table.integer('default_gap_minutes').defaultTo(15);
        table.integer('slot_duration_minutes').defaultTo(60);
        table.string('operating_start_time').defaultTo('06:00:00');
        table.string('operating_end_time').defaultTo('22:00:00');
      });
      
      await db('operational_settings').insert({
        id: 1,
        default_gap_minutes: 15,
        slot_duration_minutes: 60,
        operating_start_time: '06:00:00',
        operating_end_time: '22:00:00'
      });
    }
    
    // 6. Insert time slots
    console.log('Inserting time slots...');
    if (tableNames.includes('time_slots')) {
      const timeSlots = [];
      for (let hour = 6; hour < 22; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${hour.toString().padStart(2, '0')}:59:00`;
        const name = `${startTime.substring(0, 5)}-${endTime.substring(0, 5)}`;
        
        timeSlots.push({
          name,
          start_time: startTime,
          end_time: endTime,
          is_active: true
        });
      }
      
      await db('time_slots').insert(timeSlots);
    } else {
      console.log('Creating time_slots table...');
      await db.schema.createTable('time_slots', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('start_time').notNullable();
        table.string('end_time').notNullable();
        table.boolean('is_active').defaultTo(true);
      });
      
      const timeSlots = [];
      for (let hour = 6; hour < 22; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
        const endTime = `${hour.toString().padStart(2, '0')}:59:00`;
        const name = `${startTime.substring(0, 5)}-${endTime.substring(0, 5)}`;
        
        timeSlots.push({
          name,
          start_time: startTime,
          end_time: endTime,
          is_active: true
        });
      }
      
      await db('time_slots').insert(timeSlots);
    }
    
    // 7. Insert maintenance requests - some for Dec 15-17, 2023
    console.log('Inserting maintenance requests...');
    if (tableNames.includes('maintenance_requests')) {
      // Get the column names from the maintenance_requests table
      const columns = await db.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'maintenance_requests'
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Maintenance requests columns:', columnNames);
      
      // Create maintenance requests data
      const maintenanceRequestsData = [
        {
          id: 'b7f6a5e7-1e2d-4c3b-8a9f-0d1c2b3a4e5f',
          stand_id: 1,
          title: 'S101 Pavement Repair',
          description: 'Repair damaged concrete slabs at stand S101',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T08:00:00Z',
          end_datetime: '2023-12-15T14:00:00Z',
          requestor_name: 'John Smith',
          requestor_email: 'john.smith@airport.com',
          requestor_department: 'Maintenance',
          priority: 'Medium'
        },
        {
          id: 'c8e7d6c5-2f3e-5d4c-9b0a-1e2d3f4e5f6a',
          stand_id: 2,
          title: 'S102 Jetbridge Maintenance',
          description: 'Scheduled maintenance of jetbridge at S102',
          status_id: 1, // Requested
          start_datetime: '2023-12-15T10:00:00Z',
          end_datetime: '2023-12-15T12:00:00Z',
          requestor_name: 'Sarah Johnson',
          requestor_email: 'sarah.johnson@airport.com',
          requestor_department: 'Operations',
          priority: 'Low'
        },
        {
          id: 'd9f8e7d6-3f4f-6e5d-0c1b-2a3b4c5d6e7f',
          stand_id: 6,
          title: 'L101 Lighting System Upgrade',
          description: 'Upgrade existing lighting system at L101',
          status_id: 4, // In Progress
          start_datetime: '2023-12-15T09:00:00Z',
          end_datetime: '2023-12-15T17:00:00Z',
          requestor_name: 'Mike Johnson',
          requestor_email: 'mike.johnson@airport.com',
          requestor_department: 'Facilities',
          priority: 'High'
        },
        {
          id: 'e0a9b8c7-4d5e-7f6e-1d2c-3b4a5c6d7e8f',
          stand_id: 7,
          title: 'L102 Drainage System Repair',
          description: 'Fix drainage issues at stand L102',
          status_id: 5, // Completed
          start_datetime: '2023-12-14T08:00:00Z',
          end_datetime: '2023-12-15T10:00:00Z',
          requestor_name: 'Lisa Brown',
          requestor_email: 'lisa.brown@airport.com',
          requestor_department: 'Engineering',
          priority: 'High'
        },
        {
          id: 'f1b0c9d8-5e6f-8a7b-2e3d-4c5b6a7d8e9f',
          stand_id: 3,
          title: 'S103 Power Cable Installation',
          description: 'Install new power cables for stand S103',
          status_id: 1, // Requested
          start_datetime: '2023-12-16T07:00:00Z',
          end_datetime: '2023-12-16T15:00:00Z',
          requestor_name: 'David Wilson',
          requestor_email: 'david.wilson@airport.com',
          requestor_department: 'Electrical',
          priority: 'Medium'
        },
        {
          id: 'a2c1d0e9-6f7e-9a8b-3f4e-5d6c7b8a9f0a',
          stand_id: 4,
          title: 'S104 GPU Replacement',
          description: 'Replace faulty GPU at stand S104',
          status_id: 2, // Approved
          start_datetime: '2023-12-16T08:00:00Z',
          end_datetime: '2023-12-16T12:00:00Z',
          requestor_name: 'Robert Taylor',
          requestor_email: 'robert.taylor@airport.com',
          requestor_department: 'Ground Operations',
          priority: 'High'
        },
        {
          id: 'b3d2e1f0-7a8b-0c9d-4e5f-6e7d8c9b0a1b',
          stand_id: 7,
          title: 'L102 Temporary Closure - Construction',
          description: 'Temporary closure of L102 for terminal expansion project',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T00:00:00Z',
          end_datetime: '2023-12-17T23:59:59Z',
          requestor_name: 'Jennifer Davis',
          requestor_email: 'jennifer.davis@airport.com',
          requestor_department: 'Construction',
          priority: 'High'
        },
        {
          id: 'c4e3f2a1-8b9c-1d0e-5f6a-7f8e9d0c1b2c',
          stand_id: 8,
          title: 'L103 Safety Inspection',
          description: 'Annual safety inspection of stand L103',
          status_id: 4, // In Progress
          start_datetime: '2023-12-15T13:00:00Z',
          end_datetime: '2023-12-15T15:00:00Z',
          requestor_name: 'Thomas Clark',
          requestor_email: 'thomas.clark@airport.com',
          requestor_department: 'Safety',
          priority: 'Medium'
        },
        {
          id: 'd5f4a3b2-9c0d-2e1f-6a7b-8a9f0e1d2c3d',
          stand_id: 3,
          title: 'S103 Line Repainting',
          description: 'Repainting of stand markings at S103',
          status_id: 2, // Approved
          start_datetime: '2023-12-17T07:00:00Z',
          end_datetime: '2023-12-17T11:00:00Z',
          requestor_name: 'Emily Martinez',
          requestor_email: 'emily.martinez@airport.com',
          requestor_department: 'Ground Operations',
          priority: 'Low'
        },
        {
          id: 'e6a5b4c3-0d1e-3f2a-7b8c-9b0a1f2e3d4e',
          stand_id: 4,
          title: 'S104 Emergency Repair',
          description: 'Emergency repair of damaged fuel hydrant at S104',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T15:00:00Z',
          end_datetime: '2023-12-15T18:00:00Z',
          requestor_name: 'Kevin White',
          requestor_email: 'kevin.white@airport.com',
          requestor_department: 'Fuel Services',
          priority: 'High'
        }
      ];
      
      // Filter out any fields that don't exist in the table
      const validMaintenanceRequestsData = maintenanceRequestsData.map(data => {
        const validData = {};
        for (const [key, value] of Object.entries(data)) {
          if (columnNames.includes(key)) {
            validData[key] = value;
          }
        }
        return validData;
      });
      
      if (validMaintenanceRequestsData.length > 0) {
        await db('maintenance_requests').insert(validMaintenanceRequestsData);
      } else {
        console.log('No valid data for maintenance_requests table. Skipping insert.');
      }
    } else {
      console.log('Creating maintenance_requests table...');
      await db.schema.createTable('maintenance_requests', table => {
        table.uuid('id').primary();
        table.integer('stand_id').references('id').inTable('stands');
        table.string('title').notNullable();
        table.text('description');
        table.integer('status_id').references('id').inTable('maintenance_status_types');
        table.timestamp('start_datetime').notNullable();
        table.timestamp('end_datetime').notNullable();
        table.string('requestor_name');
        table.string('requestor_email');
        table.string('requestor_department');
        table.string('priority');
        table.text('impact_description');
        table.timestamps(true, true);
      });
      
      await db('maintenance_requests').insert([
        {
          id: 'b7f6a5e7-1e2d-4c3b-8a9f-0d1c2b3a4e5f',
          stand_id: 1,
          title: 'S101 Pavement Repair',
          description: 'Repair damaged concrete slabs at stand S101',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T08:00:00Z',
          end_datetime: '2023-12-15T14:00:00Z',
          requestor_name: 'John Smith',
          requestor_email: 'john.smith@airport.com',
          requestor_department: 'Maintenance',
          priority: 'Medium'
        },
        {
          id: 'c8e7d6c5-2f3e-5d4c-9b0a-1e2d3f4e5f6a',
          stand_id: 2,
          title: 'S102 Jetbridge Maintenance',
          description: 'Scheduled maintenance of jetbridge at S102',
          status_id: 1, // Requested
          start_datetime: '2023-12-15T10:00:00Z',
          end_datetime: '2023-12-15T12:00:00Z',
          requestor_name: 'Sarah Johnson',
          requestor_email: 'sarah.johnson@airport.com',
          requestor_department: 'Operations',
          priority: 'Low'
        },
        {
          id: 'd9f8e7d6-3f4f-6e5d-0c1b-2a3b4c5d6e7f',
          stand_id: 6,
          title: 'L101 Lighting System Upgrade',
          description: 'Upgrade existing lighting system at L101',
          status_id: 4, // In Progress
          start_datetime: '2023-12-15T09:00:00Z',
          end_datetime: '2023-12-15T17:00:00Z',
          requestor_name: 'Mike Johnson',
          requestor_email: 'mike.johnson@airport.com',
          requestor_department: 'Facilities',
          priority: 'High'
        },
        {
          id: 'e0a9b8c7-4d5e-7f6e-1d2c-3b4a5c6d7e8f',
          stand_id: 7,
          title: 'L102 Drainage System Repair',
          description: 'Fix drainage issues at stand L102',
          status_id: 5, // Completed
          start_datetime: '2023-12-14T08:00:00Z',
          end_datetime: '2023-12-15T10:00:00Z',
          requestor_name: 'Lisa Brown',
          requestor_email: 'lisa.brown@airport.com',
          requestor_department: 'Engineering',
          priority: 'High'
        },
        {
          id: 'f1b0c9d8-5e6f-8a7b-2e3d-4c5b6a7d8e9f',
          stand_id: 3,
          title: 'S103 Power Cable Installation',
          description: 'Install new power cables for stand S103',
          status_id: 1, // Requested
          start_datetime: '2023-12-16T07:00:00Z',
          end_datetime: '2023-12-16T15:00:00Z',
          requestor_name: 'David Wilson',
          requestor_email: 'david.wilson@airport.com',
          requestor_department: 'Electrical',
          priority: 'Medium'
        },
        {
          id: 'a2c1d0e9-6f7e-9a8b-3f4e-5d6c7b8a9f0a',
          stand_id: 4,
          title: 'S104 GPU Replacement',
          description: 'Replace faulty GPU at stand S104',
          status_id: 2, // Approved
          start_datetime: '2023-12-16T08:00:00Z',
          end_datetime: '2023-12-16T12:00:00Z',
          requestor_name: 'Robert Taylor',
          requestor_email: 'robert.taylor@airport.com',
          requestor_department: 'Ground Operations',
          priority: 'High'
        },
        {
          id: 'b3d2e1f0-7a8b-0c9d-4e5f-6e7d8c9b0a1b',
          stand_id: 7,
          title: 'L102 Temporary Closure - Construction',
          description: 'Temporary closure of L102 for terminal expansion project',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T00:00:00Z',
          end_datetime: '2023-12-17T23:59:59Z',
          requestor_name: 'Jennifer Davis',
          requestor_email: 'jennifer.davis@airport.com',
          requestor_department: 'Construction',
          priority: 'High'
        },
        {
          id: 'c4e3f2a1-8b9c-1d0e-5f6a-7f8e9d0c1b2c',
          stand_id: 8,
          title: 'L103 Safety Inspection',
          description: 'Annual safety inspection of stand L103',
          status_id: 4, // In Progress
          start_datetime: '2023-12-15T13:00:00Z',
          end_datetime: '2023-12-15T15:00:00Z',
          requestor_name: 'Thomas Clark',
          requestor_email: 'thomas.clark@airport.com',
          requestor_department: 'Safety',
          priority: 'Medium'
        },
        {
          id: 'd5f4a3b2-9c0d-2e1f-6a7b-8a9f0e1d2c3d',
          stand_id: 3,
          title: 'S103 Line Repainting',
          description: 'Repainting of stand markings at S103',
          status_id: 2, // Approved
          start_datetime: '2023-12-17T07:00:00Z',
          end_datetime: '2023-12-17T11:00:00Z',
          requestor_name: 'Emily Martinez',
          requestor_email: 'emily.martinez@airport.com',
          requestor_department: 'Ground Operations',
          priority: 'Low'
        },
        {
          id: 'e6a5b4c3-0d1e-3f2a-7b8c-9b0a1f2e3d4e',
          stand_id: 4,
          title: 'S104 Emergency Repair',
          description: 'Emergency repair of damaged fuel hydrant at S104',
          status_id: 2, // Approved
          start_datetime: '2023-12-15T15:00:00Z',
          end_datetime: '2023-12-15T18:00:00Z',
          requestor_name: 'Kevin White',
          requestor_email: 'kevin.white@airport.com',
          requestor_department: 'Fuel Services',
          priority: 'High'
        }
      ]);
    }
    
    console.log('Database populated successfully!');
    return true;
  } catch (error) {
    console.error('Error populating database:', error);
    return false;
  } finally {
    await db.destroy();
  }
}

// Run the population script
populateTestData().then(success => {
  if (success) {
    console.log('All done! Database is ready for testing.');
    process.exit(0);
  } else {
    console.error('Failed to populate database.');
    process.exit(1);
  }
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 