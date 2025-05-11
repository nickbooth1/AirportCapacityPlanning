/**
 * This script updates the time slots used for stand capacity calculations
 */
const { db } = require('../utils/db');

async function updateTimeSlots() {
  try {
    console.log('Starting time slots update...');
    
    // Clear existing time slots
    console.log('Clearing existing time slots...');
    await db('time_slots').del();
    
    // Create time slots that span the entire day in 1-hour blocks
    const timeSlots = [];
    const hours = [
      '06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00',
      '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00',
      '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00', '23:00:00'
    ];
    
    for (let i = 0; i < hours.length - 1; i++) {
      timeSlots.push({
        name: `Time Slot ${i+1}`,
        start_time: hours[i],
        end_time: hours[i+1],
        description: `Time slot from ${hours[i]} to ${hours[i+1]}`,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    // Add the final slot
    timeSlots.push({
      name: 'Time Slot 18',
      start_time: '23:00:00',
      end_time: '23:59:59',
      description: 'Final time slot of the day',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Insert the time slots
    console.log(`Inserting ${timeSlots.length} time slots...`);
    await db('time_slots').insert(timeSlots);
    
    // Verify the time slots were added
    const count = await db('time_slots').count('* as count').first();
    console.log(`Successfully added ${count.count} time slots`);
    
    // Also update operational settings
    console.log('Updating operational settings...');
    
    // Check if settings table exists and its structure
    try {
      const settingsTable = await db.schema.hasTable('operational_settings');
      
      if (settingsTable) {
        // Try to get existing settings
        const settings = await db('operational_settings').first();
        console.log('Found existing settings:', settings);
        
        if (settings) {
          // Update existing settings
          if ('default_gap_minutes' in settings) {
            await db('operational_settings')
              .update({
                default_gap_minutes: 15,
                operating_start_time: '06:00:00',
                operating_end_time: '23:59:59',
                slot_duration_minutes: 60,
                updated_at: new Date()
              });
          } else {
            console.log('Settings table has a different structure than expected');
          }
        } else {
          // Insert new settings
          await db('operational_settings').insert({
            default_gap_minutes: 15,
            operating_start_time: '06:00:00',
            operating_end_time: '23:59:59',
            slot_duration_minutes: 60,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } else {
        console.log('operational_settings table does not exist');
      }
    } catch (error) {
      console.error('Error updating operational settings:', error);
      // Continue with the script even if this part fails
    }
    
    console.log('Time slots update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating time slots:', error);
    process.exit(1);
  }
}

// Run the function
updateTimeSlots(); 