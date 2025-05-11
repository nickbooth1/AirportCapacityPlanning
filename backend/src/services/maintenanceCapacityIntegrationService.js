const MaintenanceRequest = require('../models/MaintenanceRequest');
const { raw } = require('objection');
const standCapacityService = require('./standCapacityService');
const standCapacityToolService = require('./standCapacityToolService');

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

  /**
   * Calculate capacity impact for a specific maintenance request
   * @param {string} requestId - Maintenance request ID 
   * @param {string} startDateISO - Optional override start date
   * @param {string} endDateISO - Optional override end date
   * @returns {Promise<Object>} Impact analysis including capacity before and after maintenance
   */
  async calculateRequestCapacityImpact(requestId, startDateISO = null, endDateISO = null) {
    try {
      console.log(`Calculating capacity impact for maintenance request ${requestId}`);
      // Get the maintenance request details
      const request = await MaintenanceRequest.query()
        .findById(requestId)
        .withGraphFetched('stand');
      
      if (!request) {
        throw new Error(`Maintenance request with ID ${requestId} not found`);
      }

      // Use provided dates or fall back to request dates
      const startDate = startDateISO || request.start_datetime;
      const endDate = endDateISO || request.end_datetime;
      
      console.log(`Time period for analysis: ${startDate} to ${endDate}`);
      
      // Get baseline capacity (without maintenance)
      const baselineCapacity = await this.getBaselineCapacity(startDate, endDate);
      console.log(`Baseline capacity calculation complete`);
      
      // Get capacity with the maintenance applied
      const impactedCapacity = await this.getCapacityWithMaintenance(
        startDate, 
        endDate,
        request.stand_id
      );
      console.log(`Impacted capacity calculation complete`);
      
      // Generate impact analysis
      const impactAnalysis = this.generateImpactAnalysis(
        baselineCapacity, 
        impactedCapacity, 
        requestId,
        request
      );
      
      return impactAnalysis;
    } catch (error) {
      console.error(`Error calculating capacity impact for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get baseline capacity without maintenance
   * @param {string} startDateISO - Start date (ISO format)
   * @param {string} endDateISO - End date (ISO format)
   * @returns {Promise<Object>} Capacity data without maintenance
   */
  async getBaselineCapacity(startDateISO, endDateISO) {
    try {
      // We'll use the standCapacityToolService to calculate capacity
      const options = {
        date: new Date(startDateISO).toISOString().split('T')[0], // Use just the date portion
        useDefinedTimeSlots: true,
        // Don't filter by standIds to get full capacity
      };
      
      const result = await standCapacityToolService.calculateCapacity(options);
      return result;
    } catch (error) {
      console.error('Error calculating baseline capacity:', error);
      throw error;
    }
  }

  /**
   * Get capacity with maintenance applied
   * @param {string} startDateISO - Start date (ISO format)
   * @param {string} endDateISO - End date (ISO format)
   * @param {number} standId - Stand ID that will be under maintenance
   * @returns {Promise<Object>} Capacity data with maintenance applied
   */
  async getCapacityWithMaintenance(startDateISO, endDateISO, standId) {
    try {
      // We need to exclude the stand under maintenance
      // Get all stand IDs except the one under maintenance
      const allStands = await this.getAllStandsExcept(standId);
      
      // Calculate capacity with only available stands
      const options = {
        date: new Date(startDateISO).toISOString().split('T')[0], // Use just the date portion
        useDefinedTimeSlots: true, 
        standIds: allStands.map(stand => stand.id)
      };
      
      const result = await standCapacityToolService.calculateCapacity(options);
      return result;
    } catch (error) {
      console.error('Error calculating capacity with maintenance:', error);
      throw error;
    }
  }

  /**
   * Get all stand IDs except the one specified
   * @param {number} excludeStandId - Stand ID to exclude
   * @returns {Promise<Array>} Array of stand objects excluding the specified one
   */
  async getAllStandsExcept(excludeStandId) {
    const stands = await standCapacityService.fetchStands();
    return stands.filter(stand => stand.id !== excludeStandId);
  }

  /**
   * Generate impact analysis by comparing baseline and maintenance-impacted capacity
   * @param {Object} baselineCapacity - Capacity data without maintenance
   * @param {Object} impactedCapacity - Capacity data with maintenance
   * @param {string} requestId - Maintenance request ID
   * @param {Object} request - Maintenance request object
   * @returns {Object} Comprehensive impact analysis
   */
  generateImpactAnalysis(baselineCapacity, impactedCapacity, requestId, request) {
    // Extract time slots for analysis
    const timeSlots = baselineCapacity.timeSlots.map(slot => slot.name);
    
    // Calculate differential capacity by time slot
    const differential = {
      byTimeSlot: {}
    };
    
    let totalBaselineCapacity = 0;
    let totalImpactedCapacity = 0;
    let peakImpactTimeSlot = null;
    let peakReductionValue = 0;
    const impactByAircraftType = {};
    
    // Process each time slot to calculate the difference
    timeSlots.forEach(timeSlot => {
      // Initialize the differential structure for this time slot
      differential.byTimeSlot[timeSlot] = {
        total: 0,
        byAircraftType: {}
      };
      
      // Calculate baseline total for this time slot
      let baselineTotal = 0;
      const baselineByType = {};
      
      // Get all aircraft types from the baseline capacity
      const aircraftTypes = Object.keys(baselineCapacity.bestCaseCapacity[timeSlot] || {});
      
      // Calculate totals for each aircraft type
      aircraftTypes.forEach(aircraftType => {
        const baselineValue = baselineCapacity.bestCaseCapacity[timeSlot]?.[aircraftType] || 0;
        const impactedValue = impactedCapacity.bestCaseCapacity[timeSlot]?.[aircraftType] || 0;
        
        baselineByType[aircraftType] = baselineValue;
        baselineTotal += baselineValue;
        
        // Calculate the difference
        const difference = impactedValue - baselineValue;
        differential.byTimeSlot[timeSlot].byAircraftType[aircraftType] = difference;
        differential.byTimeSlot[timeSlot].total += difference;
        
        // Track impact by aircraft type for summary
        if (!impactByAircraftType[aircraftType]) {
          impactByAircraftType[aircraftType] = 0;
        }
        impactByAircraftType[aircraftType] += difference;
      });
      
      // Track totals for summary metrics
      totalBaselineCapacity += baselineTotal;
      
      // Sum impacted capacity for this time slot
      let impactedTotal = 0;
      aircraftTypes.forEach(aircraftType => {
        impactedTotal += impactedCapacity.bestCaseCapacity[timeSlot]?.[aircraftType] || 0;
      });
      totalImpactedCapacity += impactedTotal;
      
      // Check if this is the peak impact time slot
      const reductionValue = baselineTotal - impactedTotal;
      if (reductionValue > peakReductionValue) {
        peakReductionValue = reductionValue;
        peakImpactTimeSlot = timeSlot;
      }
    });
    
    // Calculate overall capacity reduction
    const totalCapacityReduction = totalBaselineCapacity - totalImpactedCapacity;
    const percentageReduction = totalBaselineCapacity > 0 
      ? (totalCapacityReduction / totalBaselineCapacity) * 100 
      : 0;
    
    // Find most affected aircraft type
    let mostAffectedAircraftType = null;
    let highestImpact = 0;
    Object.entries(impactByAircraftType).forEach(([aircraftType, impact]) => {
      if (Math.abs(impact) > Math.abs(highestImpact)) {
        highestImpact = impact;
        mostAffectedAircraftType = aircraftType;
      }
    });
    
    // Determine impact description based on percentage reduction
    let impactDescription = '';
    if (percentageReduction === 0) {
      impactDescription = 'No impact - capacity is unaffected';
    } else if (percentageReduction < 5) {
      impactDescription = 'Minimal impact - very small capacity reduction';
    } else if (percentageReduction < 10) {
      impactDescription = 'Low impact - minor capacity reduction';
    } else if (percentageReduction < 20) {
      impactDescription = 'Medium impact - noticeable capacity reduction';
    } else if (percentageReduction < 30) {
      impactDescription = 'High impact - significant capacity reduction';
    } else {
      impactDescription = 'Critical impact - severe capacity reduction';
    }
    
    // Calculate total affected hours (difference between start and end dates)
    const startDate = new Date(request.start_datetime);
    const endDate = new Date(request.end_datetime);
    const totalAffectedHours = (endDate - startDate) / (1000 * 60 * 60);
    
    // Create the summary object
    const summary = {
      totalCapacityReduction,
      percentageReduction: Math.round(percentageReduction * 10) / 10, // Round to 1 decimal place
      peakImpactTimeSlot,
      peakReductionValue,
      mostAffectedAircraftType,
      totalAffectedHours: Math.round(totalAffectedHours * 10) / 10, // Round to 1 decimal place
      impactDescription,
      standName: request.stand?.name || `Stand ID: ${request.stand_id}`
    };
    
    // Return the complete analysis
    return {
      requestId,
      summary,
      timeSlots,
      baselineCapacity: {
        byTimeSlot: baselineCapacity.bestCaseCapacity
      },
      impactedCapacity: {
        byTimeSlot: impactedCapacity.bestCaseCapacity
      },
      differential
    };
  }
}

module.exports = new MaintenanceCapacityIntegrationService(); 