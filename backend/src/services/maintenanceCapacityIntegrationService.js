const MaintenanceRequest = require('../models/MaintenanceRequest');
const { raw } = require('objection');

class MaintenanceCapacityIntegrationService {
  /**
   * Get stands that are unavailable due to maintenance during a specific time period
   * @param {string} startDateISO - Start of the time period (ISO format)
   * @param {string} endDateISO - End of the time period (ISO format)
   * @param {Array} standIds - Optional array of specific stand IDs to check
   * @returns {Promise<Array>} Array of objects with stand_id and the time periods they're unavailable
   */
  async getUnavailableStands(startDateISO, endDateISO, standIds = null) {
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);

    let query = MaintenanceRequest.query()
      .select('stand_id', 'start_datetime', 'end_datetime')
      .whereIn('status_id', [2, 4]) // Approved or In Progress
      .where('start_datetime', '<=', endDateISO) // Maintenance starts before period ends
      .where('end_datetime', '>=', startDateISO); // Maintenance ends after period starts
    
    if (standIds && standIds.length > 0) {
      query = query.whereIn('stand_id', standIds);
    }
    
    return await query.orderBy('stand_id').orderBy('start_datetime');
  }
  
  /**
   * Calculate the capacity impact of maintenance for a specific time period
   * @param {string} startDateISO - Start of the time period (ISO format)
   * @param {string} endDateISO - End of the time period (ISO format)
   * @returns {Promise<Object>} Impact summary
   */
  async calculateCapacityImpact(startDateISO, endDateISO) {
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);
    
    const maintenancePeriods = await this.getUnavailableStands(startDateISO, endDateISO);
    
    if (!maintenancePeriods.length) {
      return {
        totalStandsAffected: 0,
        totalMaintenanceHours: 0,
        impactByStand: [],
        impactByDay: {}
      };
    }
    
    const standImpactMap = {};
    const dayImpactMap = {};
    
    for (const period of maintenancePeriods) {
      const standId = period.stand_id;
      const periodStart = new Date(period.start_datetime);
      const periodEnd = new Date(period.end_datetime);
      
      const overlapStart = new Date(Math.max(periodStart, startDate));
      const overlapEnd = new Date(Math.min(periodEnd, endDate));
      
      const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      if (overlapHours <= 0) continue; // Skip if no actual overlap
      
      if (!standImpactMap[standId]) {
        standImpactMap[standId] = { standId, totalHours: 0, periods: [] };
      }
      standImpactMap[standId].totalHours += overlapHours;
      standImpactMap[standId].periods.push({ start: period.start_datetime, end: period.end_datetime, hours: overlapHours });
      
      let currentDay = new Date(overlapStart);
      currentDay.setHours(0, 0, 0, 0);
      const endDayLimit = new Date(overlapEnd);
      
      while (currentDay < endDayLimit) {
        const dayStr = currentDay.toISOString().split('T')[0];
        
        if (!dayImpactMap[dayStr]) {
          dayImpactMap[dayStr] = { date: dayStr, standsAffected: new Set(), totalHours: 0 };
        }
        
        const dayStart = new Date(currentDay);
        const dayEnd = new Date(currentDay);
        dayEnd.setDate(dayEnd.getDate() + 1); // Start of next day
        
        const dayOverlapStart = new Date(Math.max(overlapStart, dayStart));
        const dayOverlapEnd = new Date(Math.min(overlapEnd, dayEnd));
        const dayOverlapHours = (dayOverlapEnd - dayOverlapStart) / (1000 * 60 * 60);
        
        if (dayOverlapHours > 0) {
            dayImpactMap[dayStr].standsAffected.add(standId);
            dayImpactMap[dayStr].totalHours += dayOverlapHours;
        }
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
    
    const impactByStand = Object.values(standImpactMap);
    const impactByDay = {};
    for (const [day, impact] of Object.entries(dayImpactMap)) {
      impactByDay[day] = {
        date: impact.date,
        standsAffected: Array.from(impact.standsAffected).length,
        totalHours: impact.totalHours
      };
    }
    
    const totalStandsAffected = impactByStand.length;
    const totalMaintenanceHours = impactByStand.reduce((sum, stand) => sum + stand.totalHours, 0);
    
    return {
      totalStandsAffected,
      totalMaintenanceHours,
      impactByStand,
      impactByDay
    };
  }
}

module.exports = new MaintenanceCapacityIntegrationService(); 