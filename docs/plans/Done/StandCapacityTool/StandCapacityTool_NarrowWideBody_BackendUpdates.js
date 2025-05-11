/**
 * Sample backend code updates for aggregating capacity by body type
 * 
 * This file outlines the key changes needed in the StandCapacityService.js
 * to support aggregation by narrow body vs wide body aircraft.
 */

/**
 * Calculate capacity for a time slot, now with body type aggregation
 * @param {Object} timeSlot - Time slot information
 * @param {Array} stands - Array of stand objects
 * @param {Array} aircraftTypes - Array of aircraft type objects
 * @param {Object} turnaroundRules - Map of aircraft type code to turnaround rule
 * @param {Array} adjacencyRules - Array of stand adjacency rules
 * @param {number} gapBetweenFlights - Gap between flights in minutes
 * @returns {Object} Capacity results for the time slot
 */
calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
  console.log(`Calculating capacity for time slot: ${timeSlot.name}`);
  
  // Calculate slot duration in minutes
  const slotDurationMinutes = this._calculateSlotDurationMinutes(timeSlot);
  console.log(`Time slot duration: ${slotDurationMinutes} minutes`);
  
  // Initialize capacity objects
  const bestCaseCapacity = {};
  const worstCaseCapacity = {};
  
  // Initialize body type aggregation containers
  const bestCaseByBodyType = { narrow: 0, wide: 0 };
  const worstCaseByBodyType = { narrow: 0, wide: 0 };
  
  // Process each stand
  stands.forEach(stand => {
    console.log(`Processing stand: ${stand.name}`);
    
    // Get compatible aircraft types for this stand
    const baseCompatibleTypes = this._getCompatibleAircraftTypes(stand, aircraftTypes);
    console.log(`Base compatible aircraft types: ${baseCompatibleTypes.map(type => type.icao_code).join(', ')}`);
    
    // Apply adjacency rules to get worst-case compatible types
    const worstCaseCompatibleTypes = this._getCompatibleTypesWithAdjacency(
      stand,
      baseCompatibleTypes,
      adjacencyRules
    );
    console.log(`Worst case compatible aircraft types: ${worstCaseCompatibleTypes.map(type => type.icao_code).join(', ')}`);
    
    // Calculate capacity for each aircraft type
    baseCompatibleTypes.forEach(aircraftType => {
      // Get turnaround time for this aircraft type
      const turnaroundMinutes = this._getTurnaroundTime(aircraftType.icao_code, turnaroundRules);
      
      // Calculate total occupation time including gap
      const totalOccupation = turnaroundMinutes + gapBetweenFlights;
      
      // Calculate capacity: how many aircraft of this type can be handled in this time slot
      const capacity = totalOccupation <= slotDurationMinutes
        ? Math.floor(slotDurationMinutes / totalOccupation)
        : 0;
      
      console.log(`Capacity for ${aircraftType.icao_code}: ${capacity} (turnaround: ${turnaroundMinutes}m, gap: ${gapBetweenFlights}m)`);
      
      // Add to the best-case capacity
      bestCaseCapacity[aircraftType.icao_code] = (bestCaseCapacity[aircraftType.icao_code] || 0) + capacity;
      
      // Add to body type aggregation
      if (capacity > 0) {
        const bodyType = aircraftType.body_type?.toLowerCase() === 'wide' ? 'wide' : 'narrow';
        bestCaseByBodyType[bodyType] += capacity;
      }
    });
    
    // Calculate worst-case capacity similarly
    worstCaseCompatibleTypes.forEach(aircraftType => {
      const turnaroundMinutes = this._getTurnaroundTime(aircraftType.icao_code, turnaroundRules);
      const totalOccupation = turnaroundMinutes + gapBetweenFlights;
      const capacity = totalOccupation <= slotDurationMinutes
        ? Math.floor(slotDurationMinutes / totalOccupation)
        : 0;
      
      // Add to the worst-case capacity
      worstCaseCapacity[aircraftType.icao_code] = (worstCaseCapacity[aircraftType.icao_code] || 0) + capacity;
      
      // Add to body type aggregation
      if (capacity > 0) {
        const bodyType = aircraftType.body_type?.toLowerCase() === 'wide' ? 'wide' : 'narrow';
        worstCaseByBodyType[bodyType] += capacity;
      }
    });
  });
  
  return {
    timeSlot,
    bestCaseCapacity,
    worstCaseCapacity,
    // Add the new body type aggregation to the result
    bestCaseByBodyType,
    worstCaseByBodyType
  };
}

/**
 * Filter stands by fuel availability
 * @param {Array} stands - Array of stand objects
 * @param {boolean} fuelEnabled - Filter for fuel-enabled stands
 * @returns {Array} Filtered stands
 */
_filterStandsByFuelAvailability(stands, fuelEnabled) {
  if (fuelEnabled === undefined) {
    return stands;
  }
  
  return stands.filter(stand => stand.fuel_enabled === fuelEnabled);
}

/**
 * Filter stands by location (pier or terminal)
 * @param {Array} stands - Array of stand objects
 * @param {Array} pierIds - Array of pier IDs
 * @param {Array} terminalIds - Array of terminal IDs
 * @returns {Array} Filtered stands
 */
_filterStandsByLocation(stands, pierIds, terminalIds) {
  // If no filters provided, return all stands
  if ((!pierIds || pierIds.length === 0) && (!terminalIds || terminalIds.length === 0)) {
    return stands;
  }
  
  return stands.filter(stand => {
    const matchesPier = !pierIds || pierIds.length === 0 || (stand.pier_id && pierIds.includes(stand.pier_id));
    const matchesTerminal = !terminalIds || terminalIds.length === 0;
    
    // For terminal filtering, we need to check the pier's terminal_id
    if (terminalIds && terminalIds.length > 0 && stand.pier && stand.pier.terminal_id) {
      return matchesPier && terminalIds.includes(stand.pier.terminal_id);
    }
    
    return matchesPier && matchesTerminal;
  });
}

/**
 * Calculate stand capacity with additional filter options
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} Calculation results
 */
async calculateStandCapacity(options = {}) {
  try {
    // Get operational settings
    const operationalSettings = await this.getOperationalSettings();
    const gapBetweenFlights = operationalSettings.gap_between_flights_minutes || 15;
    console.log(`Gap between flights: ${gapBetweenFlights} minutes`);
    
    // Get stand data
    const stands = await this.getStandData(options.standIds);
    console.log(`Found ${stands.length} stands`);
    
    // Apply additional filters
    let filteredStands = stands;
    
    // Filter by location (pier/terminal)
    filteredStands = this._filterStandsByLocation(
      filteredStands,
      options.pierIds,
      options.terminalIds
    );
    
    // Filter by fuel availability
    if (options.fuelEnabled !== undefined) {
      filteredStands = this._filterStandsByFuelAvailability(
        filteredStands,
        options.fuelEnabled
      );
    }
    
    // Get aircraft type data
    const aircraftTypes = await this.getAircraftTypeData();
    
    // Continue with rest of the calculation...
    // ...
    
    // Aggregate body type data for the visualization
    const bodyTypeVisualData = timeSlots.map(slot => {
      const slotResult = timeSlotResults.find(r => r.timeSlot.id === slot.id);
      
      return {
        timeSlot: slot.name,
        bestCase: {
          narrow: slotResult.bestCaseByBodyType.narrow || 0,
          wide: slotResult.bestCaseByBodyType.wide || 0,
          total: (slotResult.bestCaseByBodyType.narrow || 0) + (slotResult.bestCaseByBodyType.wide || 0)
        },
        worstCase: {
          narrow: slotResult.worstCaseByBodyType.narrow || 0,
          wide: slotResult.worstCaseByBodyType.wide || 0,
          total: (slotResult.worstCaseByBodyType.narrow || 0) + (slotResult.worstCaseByBodyType.wide || 0)
        }
      };
    });
    
    // Update the result object to include the body type visualization data
    const result = {
      // Existing result structure
      metadata: {
        calculatedAt: new Date().toISOString(),
        stands: {
          total: stands.length,
          filtered: filteredStands.length
        },
        aircraftTypes: {
          total: aircraftTypes.length
        },
        timeSlots: {
          total: timeSlots.length
        }
      },
      timeSlots: timeSlots,
      bestCaseCapacity: {},
      worstCaseCapacity: {},
      
      // Add new body type visualization data
      bodyTypeVisualization: bodyTypeVisualData
    };
    
    // Process results for each time slot and populate the result object
    // ...
    
    return result;
  } catch (error) {
    console.error('Error calculating stand capacity:', error);
    throw error;
  }
} 