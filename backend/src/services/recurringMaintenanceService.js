const RecurringMaintenanceSchedule = require('../models/RecurringMaintenanceSchedule');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { transaction, ValidationError } = require('objection');
const cron = require('node-cron');

class RecurringMaintenanceService {
  constructor() {
    if (process.env.NODE_ENV !== 'test') { // Don't schedule in test environment
      // Run daily at 1:00 AM server time
      cron.schedule('0 1 * * *', this.generateMaintenanceRequests.bind(this), {
        scheduled: true,
        timezone: process.env.TIMEZONE || "Etc/UTC" // Use server timezone or UTC
      });
      console.log('Recurring maintenance job scheduled.');
    } else {
        console.log('Recurring maintenance job NOT scheduled in test environment.');
    }
  }
  
  async getAllSchedules(filters = {}) {
    let query = RecurringMaintenanceSchedule.query().withGraphFetched('[stand(selectName), status(selectName)]');
    if (filters.standId) query = query.where('stand_id', filters.standId);
    if (filters.isActive !== undefined) query = query.where('is_active', filters.isActive);
    const orderBy = filters.orderBy || 'created_at';
    const order = filters.order === 'asc' ? 'asc' : 'desc';
    return await query.orderBy(orderBy, order);
  }
  
  async getScheduleById(id) {
    return await RecurringMaintenanceSchedule.query().findById(id).withGraphFetched('[stand, status]');
  }
  
  async createSchedule(scheduleData) {
    this.validateRecurrencePattern(scheduleData);
    return await RecurringMaintenanceSchedule.query().insert(scheduleData);
  }
  
  async updateSchedule(id, scheduleData) {
    const existingSchedule = await RecurringMaintenanceSchedule.query().findById(id);
    if (!existingSchedule) {
        throw new ValidationError({ type: 'NotFound', message: 'Recurring schedule not found' });
    }
    if (scheduleData.recurrence_pattern || scheduleData.day_of_week || scheduleData.day_of_month || scheduleData.month_of_year) {
        const mergedData = { ...existingSchedule, ...scheduleData };
        this.validateRecurrencePattern(mergedData);
    }
    return await RecurringMaintenanceSchedule.query().patchAndFetchById(id, scheduleData);
  }
  
  async deactivateSchedule(id) {
    return await RecurringMaintenanceSchedule.query().patchAndFetchById(id, { is_active: false });
  }
  
  async generateMaintenanceRequests(daysInAdvance = 90) {
    console.log(`[${new Date().toISOString()}] Running recurring maintenance generation job for ${daysInAdvance} days in advance...`);
    const schedules = await RecurringMaintenanceSchedule.query()
      .where('is_active', true)
      .where(function() {
          this.whereNull('end_date').orWhere('end_date', '>=', raw('CURRENT_DATE'))
      });
    
    if (!schedules.length) {
      console.log('No active recurring schedules to process.');
      return [];
    }
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDateLimit = new Date(today); endDateLimit.setDate(endDateLimit.getDate() + daysInAdvance);
    let createdCount = 0;

    for (const schedule of schedules) {
      try {
        await transaction(MaintenanceRequest.knex(), async (trx) => {
          const scheduleStartDate = new Date(schedule.start_date); scheduleStartDate.setHours(0, 0, 0, 0);
          const scheduleEndDate = schedule.end_date ? new Date(schedule.end_date) : null;
          
          const generationStartDate = new Date(Math.max(today.getTime(), scheduleStartDate.getTime()));
          const generationEndDate = scheduleEndDate ? new Date(Math.min(endDateLimit.getTime(), scheduleEndDate.getTime())) : new Date(endDateLimit);
          
          const maintenanceDates = this.generateRecurringDates(schedule, generationStartDate, generationEndDate);
          if (!maintenanceDates.length) return; // No dates to generate in the window

          // Efficiently check for existing requests in the date range for this stand
          const existingRequests = await MaintenanceRequest.query(trx)
            .select('start_datetime', 'end_datetime')
            .where('stand_id', schedule.stand_id)
            .where('start_datetime', '<', new Date(generationEndDate.getTime() + 86400000)) // Add a day buffer to end date
            .where('end_datetime', '>', generationStartDate);

          for (const date of maintenanceDates) {
            const [hours, minutes] = schedule.start_time.split(':').map(Number);
            const startDateTime = new Date(date); startDateTime.setHours(hours, minutes, 0, 0);
            const endDateTime = new Date(startDateTime); endDateTime.setHours(startDateTime.getHours() + schedule.duration_hours);
            
            const hasOverlap = existingRequests.some(req => {
              const reqStart = new Date(req.start_datetime);
              const reqEnd = new Date(req.end_datetime);
              return startDateTime < reqEnd && endDateTime > reqStart;
            });
            
            if (!hasOverlap) {
              await MaintenanceRequest.query(trx).insert({
                stand_id: schedule.stand_id,
                title: `${schedule.title} (Recurring)`, // Indicate it's from recurring
                description: `${schedule.description}\n\nGenerated from recurring schedule: ${schedule.id}`,
                requestor_name: schedule.requestor_name,
                requestor_email: schedule.requestor_email,
                requestor_department: schedule.requestor_department,
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                status_id: schedule.status_id || 2, // Default approved
                priority: schedule.priority || 'Medium'
              });
              createdCount++;
            }
          }
        });
      } catch (error) {
        console.error(`Error processing recurring schedule ${schedule.id}:`, error.message);
      }
    }
    
    console.log(`Recurring maintenance job completed. Generated ${createdCount} new maintenance requests.`);
    return { generatedCount: createdCount };
  }
  
  generateRecurringDates(schedule, startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
      let include = false;
      switch (schedule.recurrence_pattern) {
        case 'daily': include = true; break;
        case 'weekly': include = currentDate.getDay() === schedule.day_of_week; break;
        case 'monthly': include = currentDate.getDate() === schedule.day_of_month; break;
        case 'yearly': include = (currentDate.getMonth() + 1 === schedule.month_of_year) && (currentDate.getDate() === schedule.day_of_month); break;
      }
      if (include) dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }
  
  validateRecurrencePattern(schedule) {
    switch (schedule.recurrence_pattern) {
        case 'daily': break;
        case 'weekly':
            if (schedule.day_of_week === undefined || schedule.day_of_week === null) throw new ValidationError({ message: 'day_of_week is required for weekly recurrence' });
            if (schedule.day_of_week < 0 || schedule.day_of_week > 6) throw new ValidationError({ message: 'day_of_week must be between 0 (Sun) and 6 (Sat)' });
            break;
        case 'monthly':
            if (schedule.day_of_month === undefined || schedule.day_of_month === null) throw new ValidationError({ message: 'day_of_month is required for monthly recurrence' });
            if (schedule.day_of_month < 1 || schedule.day_of_month > 31) throw new ValidationError({ message: 'day_of_month must be between 1 and 31' });
            break;
        case 'yearly':
            if (schedule.day_of_month === undefined || schedule.day_of_month === null) throw new ValidationError({ message: 'day_of_month is required for yearly recurrence' });
            if (schedule.month_of_year === undefined || schedule.month_of_year === null) throw new ValidationError({ message: 'month_of_year is required for yearly recurrence' });
            if (schedule.day_of_month < 1 || schedule.day_of_month > 31) throw new ValidationError({ message: 'day_of_month must be between 1 and 31' });
            if (schedule.month_of_year < 1 || schedule.month_of_year > 12) throw new ValidationError({ message: 'month_of_year must be between 1 and 12' });
            break;
        default: throw new ValidationError({ message: `Invalid recurrence pattern: ${schedule.recurrence_pattern}` });
    }
  }
}

module.exports = new RecurringMaintenanceService(); 