#!/usr/bin/env node

/**
 * Update Maintenance Request Dates
 * 
 * This script updates all maintenance request dates from 2023 to 2025
 */

const db = require('../utils/db');

async function updateMaintenanceDates() {
  try {
    console.log('Starting maintenance date update script...');

    // Initialize database connection
    await db.initialize();

    // Get all maintenance requests
    const requests = await db('maintenance_requests')
                        .select('id', 'start_datetime', 'end_datetime');
    
    console.log(`Found ${requests.length} maintenance requests to update`);

    // Process each request to update dates from 2023 to 2025
    let updatedCount = 0;
    for (const request of requests) {
      const startDate = new Date(request.start_datetime);
      const endDate = new Date(request.end_datetime);
      
      // Check if date is in 2023
      if (startDate.getFullYear() === 2023 || endDate.getFullYear() === 2023) {
        // Update to 2025 - add 2 years (730 days)
        const newStartDate = new Date(startDate);
        newStartDate.setFullYear(2025);
        
        const newEndDate = new Date(endDate);
        newEndDate.setFullYear(2025);
        
        // Update the request
        await db('maintenance_requests')
          .where('id', request.id)
          .update({
            start_datetime: newStartDate,
            end_datetime: newEndDate,
            updated_at: db.fn.now()
          });
        
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} maintenance requests from 2023 to 2025.`);
    console.log('Script completed successfully.');
  } catch (error) {
    console.error('Error updating maintenance dates:', error);
  } finally {
    // Close database connection
    await db.destroy();
  }
}

// Run the function
updateMaintenanceDates(); 