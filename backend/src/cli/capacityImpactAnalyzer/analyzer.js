/**
 * Capacity Impact Analyzer
 * Core logic for calculating the impact of maintenance on stand capacity.
 */

// Helper function to check if two time ranges overlap
function doTimeRangesOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && start2 <= end1;
}

// Deep copy utility for objects/arrays
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Helper function to combine a date string and a time string into a Date object
function combineDateAndTime(dateStr, timeStr) {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Helper to determine body type from size category code
function getBodyType(sizeCategoryCode) {
  const code = sizeCategoryCode ? sizeCategoryCode.toUpperCase() : '';
  if (['E', 'F'].includes(code)) {
    return 'wideBody';
  }
  return 'narrowBody';
}

// Helper to check if a maintenance request is active on a specific date
function isMaintenanceActiveOnDate(maintenance, dateStr) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);
  
  const maintenanceStart = new Date(maintenance.start_datetime);
  const maintenanceEnd = new Date(maintenance.end_datetime);
  
  return doTimeRangesOverlap(date, endOfDay, maintenanceStart, maintenanceEnd);
}

// Helper to check if a maintenance request is active during a specific time slot
function isMaintenanceActiveInSlot(maintenance, slotStartDateTime, slotEndDateTime) {
  const maintenanceStart = new Date(maintenance.start_datetime);
  const maintenanceEnd = new Date(maintenance.end_datetime);
  
  return doTimeRangesOverlap(
    slotStartDateTime, 
    slotEndDateTime, 
    maintenanceStart, 
    maintenanceEnd
  );
}

/**
 * Main function to calculate daily impacts from maintenance requests on capacity
 * @param {Object} options - Analysis options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {Object} options.maintenanceStatusIdsToInclude - Status IDs to include
 * @param {number[]} options.maintenanceStatusIdsToInclude.definite - Status IDs for definite impact
 * @param {number[]} options.maintenanceStatusIdsToInclude.potential - Status IDs for potential impact
 * @param {Object} mockData - All the mock data
 * @returns {Array} Array of daily capacity impact results
 */
function calculateDailyImpacts(options, mockData) {
  const {
    dailyGrossCapacityTemplate,
    allMaintenanceRequests,
    stands,
    aircraftTypes,
    opSettings,
    statusTypes
  } = mockData;
  
  const dailyResults = [];
  
  // Prepare reference Maps for faster lookup
  const standsMap = new Map();
  stands.forEach(stand => {
    standsMap.set(stand.code, {
      dbId: stand.dbId,
      compatibleAircraftICAOs: stand.compatibleAircraftICAOs
    });
  });
  
  const aircraftTypesMap = new Map();
  aircraftTypes.forEach(type => {
    aircraftTypesMap.set(type.icao_code, {
      sizeCategory: type.size_category_code,
      averageTurnaroundMinutes: type.averageTurnaroundMinutes,
      bodyType: type.bodyType || getBodyType(type.size_category_code)
    });
  });
  
  const statusTypesMap = new Map();
  statusTypes.forEach(status => {
    statusTypesMap.set(status.id, status.name);
  });
  
  // Generate an array of dates from startDate to endDate
  const dates = [];
  const startDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);
  
  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    dates.push(currentDate.toISOString().split('T')[0]); // YYYY-MM-DD format
  }
  
  // Process each day
  for (const currentDate of dates) {
    // Calculate Original Daily Totals from template
    const originalDailyCapacity = {
      narrowBody: 0,
      wideBody: 0,
      total: 0
    };
    
    // Iterate through template slots and sum up by body type
    Object.entries(dailyGrossCapacityTemplate.bestCaseCapacity).forEach(([slotLabel, aircraftCapacities]) => {
      Object.entries(aircraftCapacities).forEach(([aircraftTypeICAO, count]) => {
        const aircraftType = aircraftTypesMap.get(aircraftTypeICAO);
        if (aircraftType) {
          if (aircraftType.bodyType === 'narrowBody') {
            originalDailyCapacity.narrowBody += count;
          } else if (aircraftType.bodyType === 'wideBody') {
            originalDailyCapacity.wideBody += count;
          }
          originalDailyCapacity.total += count;
        }
      });
    });
    
    // Initialize accumulator objects
    const dailyDefiniteReduction = {
      narrowBody: 0,
      wideBody: 0,
      total: 0
    };
    
    const dailyPotentialReduction = {
      narrowBody: 0,
      wideBody: 0,
      total: 0
    };
    
    const contributingDefiniteRequests = [];
    const contributingPotentialRequests = [];
    
    // Create a deep copy of the daily slot capacities to work with
    const currentDayNetSlotCapacities = deepCopy(dailyGrossCapacityTemplate.bestCaseCapacity);
    
    // Find maintenance requests active on the current date
    const activeMaintenanceOnDate = allMaintenanceRequests.filter(req => 
      isMaintenanceActiveOnDate(req, currentDate)
    );
    
    // Iterate through each time slot in the template
    for (const timeSlot of dailyGrossCapacityTemplate.timeSlots) {
      const slotStartDateTime = combineDateAndTime(currentDate, timeSlot.startTime);
      const slotEndDateTime = combineDateAndTime(currentDate, timeSlot.endTime);
      
      // Find maintenance active during this specific slot
      const activeMaintenanceInSlot = activeMaintenanceOnDate.filter(req => 
        isMaintenanceActiveInSlot(req, slotStartDateTime, slotEndDateTime)
      );
      
      // Process each active maintenance
      for (const maintenance of activeMaintenanceInSlot) {
        const standCode = maintenance.stand_id_or_code;
        const standData = standsMap.get(standCode);
        
        if (!standData) continue; // Skip if stand not found
        
        const { compatibleAircraftICAOs } = standData;
        
        // Apply impact for each compatible aircraft type
        for (const aircraftTypeICAO of compatibleAircraftICAOs) {
          const aircraftTypeData = aircraftTypesMap.get(aircraftTypeICAO);
          if (!aircraftTypeData) continue;
          
          const { averageTurnaroundMinutes, bodyType } = aircraftTypeData;
          
          // Calculate single stand contribution
          const totalOccupationMinutes = averageTurnaroundMinutes + opSettings.default_gap_minutes;
          const slotDurationMinutes = opSettings.slot_duration_minutes;
          const singleStandSlotContribution = Math.max(1, Math.floor(slotDurationMinutes / totalOccupationMinutes));
          
          // Determine impact type (definite or potential)
          const isDefiniteImpact = options.maintenanceStatusIdsToInclude.definite.includes(maintenance.status_id);
          const isPotentialImpact = options.maintenanceStatusIdsToInclude.potential.includes(maintenance.status_id);
          
          if (!isDefiniteImpact && !isPotentialImpact) continue;
          
          // Apply reduction
          const currentCapacity = currentDayNetSlotCapacities[timeSlot.label][aircraftTypeICAO] || 0;
          const actualReduction = Math.min(currentCapacity, singleStandSlotContribution);
          
          if (actualReduction <= 0) continue;
          
          // Decrement the net capacity
          currentDayNetSlotCapacities[timeSlot.label][aircraftTypeICAO] = currentCapacity - actualReduction;
          
          // Accumulate reduction
          if (isDefiniteImpact) {
            dailyDefiniteReduction[bodyType] += actualReduction;
            dailyDefiniteReduction.total += actualReduction;
            
            // Add to contributing requests if not already present
            if (!contributingDefiniteRequests.some(req => req.id === maintenance.id)) {
              contributingDefiniteRequests.push({
                id: maintenance.id,
                title: maintenance.title,
                standCode: maintenance.stand_id_or_code,
                statusName: maintenance.statusName || statusTypesMap.get(maintenance.status_id) || 'Unknown',
                startTime: maintenance.start_datetime,
                endTime: maintenance.end_datetime
              });
            }
          } else if (isPotentialImpact) {
            dailyPotentialReduction[bodyType] += actualReduction;
            dailyPotentialReduction.total += actualReduction;
            
            // Add to contributing requests if not already present
            if (!contributingPotentialRequests.some(req => req.id === maintenance.id)) {
              contributingPotentialRequests.push({
                id: maintenance.id,
                title: maintenance.title,
                standCode: maintenance.stand_id_or_code,
                statusName: maintenance.statusName || statusTypesMap.get(maintenance.status_id) || 'Unknown',
                startTime: maintenance.start_datetime,
                endTime: maintenance.end_datetime
              });
            }
          }
        }
      }
    }
    
    // Calculate final capacity figures after impacts
    const capacityAfterDefiniteImpact = {
      narrowBody: originalDailyCapacity.narrowBody - dailyDefiniteReduction.narrowBody,
      wideBody: originalDailyCapacity.wideBody - dailyDefiniteReduction.wideBody,
      total: originalDailyCapacity.total - dailyDefiniteReduction.total
    };
    
    const finalNetCapacity = {
      narrowBody: capacityAfterDefiniteImpact.narrowBody - dailyPotentialReduction.narrowBody,
      wideBody: capacityAfterDefiniteImpact.wideBody - dailyPotentialReduction.wideBody,
      total: capacityAfterDefiniteImpact.total - dailyPotentialReduction.total
    };
    
    // Create the daily result object
    const dailyResult = {
      date: currentDate,
      originalDailyCapacity,
      capacityAfterDefiniteImpact,
      finalNetCapacity,
      maintenanceImpacts: {
        definite: {
          reduction: dailyDefiniteReduction,
          requests: contributingDefiniteRequests
        },
        potential: {
          reduction: dailyPotentialReduction,
          requests: contributingPotentialRequests
        }
      }
    };
    
    dailyResults.push(dailyResult);
  }
  
  return dailyResults;
}

module.exports = {
  calculateDailyImpacts,
  getBodyType,
  deepCopy
}; 