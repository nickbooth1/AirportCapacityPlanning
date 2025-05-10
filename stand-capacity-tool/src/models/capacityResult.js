/**
 * Represents the result of a capacity calculation
 */
class CapacityResult {
  /**
   * Create a capacity result
   */
  constructor() {
    // Initialize empty capacity maps
    this.bestCaseCapacity = new Map(); // Map<slotLabel, Map<aircraftTypeID, count>>
    this.worstCaseCapacity = new Map(); // Map<slotLabel, Map<aircraftTypeID, count>>
    this.timeSlots = []; // Array of TimeSlot objects
    this.aircraftTypes = []; // Array of AircraftType objects
  }

  /**
   * Sets the time slots for this result
   * @param {TimeSlot[]} slots - Time slots
   */
  setTimeSlots(slots) {
    this.timeSlots = [...slots];
    
    // Initialize capacity maps for each slot
    slots.forEach(slot => {
      if (!this.bestCaseCapacity.has(slot.label)) {
        this.bestCaseCapacity.set(slot.label, new Map());
      }
      if (!this.worstCaseCapacity.has(slot.label)) {
        this.worstCaseCapacity.set(slot.label, new Map());
      }
    });
  }

  /**
   * Sets the aircraft types for this result
   * @param {AircraftType[]} types - Aircraft types
   */
  setAircraftTypes(types) {
    this.aircraftTypes = [...types];
    
    // Initialize capacity counts for each aircraft type in each slot
    this.timeSlots.forEach(slot => {
      const bestCaseSlotMap = this.bestCaseCapacity.get(slot.label);
      const worstCaseSlotMap = this.worstCaseCapacity.get(slot.label);
      
      types.forEach(type => {
        if (!bestCaseSlotMap.has(type.aircraftTypeID)) {
          bestCaseSlotMap.set(type.aircraftTypeID, 0);
        }
        if (!worstCaseSlotMap.has(type.aircraftTypeID)) {
          worstCaseSlotMap.set(type.aircraftTypeID, 0);
        }
      });
    });
  }

  /**
   * Increments the capacity count for a specific slot and aircraft type
   * @param {string} slotLabel - Time slot label
   * @param {string} aircraftTypeID - Aircraft type ID
   * @param {boolean} isWorstCase - Whether to update the worst case capacity
   */
  incrementCapacity(slotLabel, aircraftTypeID, isWorstCase = false) {
    const capacityMap = isWorstCase ? this.worstCaseCapacity : this.bestCaseCapacity;
    
    if (!capacityMap.has(slotLabel)) {
      throw new Error(`Time slot "${slotLabel}" not found in capacity map`);
    }
    
    const slotMap = capacityMap.get(slotLabel);
    if (!slotMap.has(aircraftTypeID)) {
      slotMap.set(aircraftTypeID, 0);
    }
    
    slotMap.set(aircraftTypeID, slotMap.get(aircraftTypeID) + 1);
  }

  /**
   * Gets the capacity for a specific slot and aircraft type
   * @param {string} slotLabel - Time slot label
   * @param {string} aircraftTypeID - Aircraft type ID
   * @param {boolean} isWorstCase - Whether to get the worst case capacity
   * @returns {number} Capacity count
   */
  getCapacity(slotLabel, aircraftTypeID, isWorstCase = false) {
    const capacityMap = isWorstCase ? this.worstCaseCapacity : this.bestCaseCapacity;
    
    if (!capacityMap.has(slotLabel)) {
      return 0;
    }
    
    const slotMap = capacityMap.get(slotLabel);
    return slotMap.has(aircraftTypeID) ? slotMap.get(aircraftTypeID) : 0;
  }

  /**
   * Gets total capacity across all aircraft types for a time slot
   * @param {string} slotLabel - Time slot label
   * @param {boolean} isWorstCase - Whether to get the worst case capacity
   * @returns {number} Total capacity
   */
  getTotalCapacityForSlot(slotLabel, isWorstCase = false) {
    const capacityMap = isWorstCase ? this.worstCaseCapacity : this.bestCaseCapacity;
    
    if (!capacityMap.has(slotLabel)) {
      return 0;
    }
    
    const slotMap = capacityMap.get(slotLabel);
    let total = 0;
    
    for (const count of slotMap.values()) {
      total += count;
    }
    
    return total;
  }

  /**
   * Converts the capacity result to a table format
   * @returns {Object} Table data with headers and rows
   */
  toTable() {
    // Create headers (time slots)
    const headers = ['Aircraft Type', ...this.timeSlots.map(slot => slot.label)];
    
    // Create rows
    const bestCaseRows = [];
    const worstCaseRows = [];
    
    this.aircraftTypes.forEach(type => {
      const bestCaseRow = [type.aircraftTypeID];
      const worstCaseRow = [type.aircraftTypeID];
      
      this.timeSlots.forEach(slot => {
        bestCaseRow.push(this.getCapacity(slot.label, type.aircraftTypeID, false));
        worstCaseRow.push(this.getCapacity(slot.label, type.aircraftTypeID, true));
      });
      
      bestCaseRows.push(bestCaseRow);
      worstCaseRows.push(worstCaseRow);
    });
    
    // Add total row
    const bestCaseTotalRow = ['TOTAL'];
    const worstCaseTotalRow = ['TOTAL'];
    
    this.timeSlots.forEach(slot => {
      bestCaseTotalRow.push(this.getTotalCapacityForSlot(slot.label, false));
      worstCaseTotalRow.push(this.getTotalCapacityForSlot(slot.label, true));
    });
    
    bestCaseRows.push(bestCaseTotalRow);
    worstCaseRows.push(worstCaseTotalRow);
    
    return {
      headers,
      bestCase: bestCaseRows,
      worstCase: worstCaseRows
    };
  }

  /**
   * Converts the capacity result to JSON format
   * @returns {Object} JSON representation
   */
  toJson() {
    const result = {
      timeSlots: this.timeSlots.map(slot => ({
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime
      })),
      aircraftTypes: this.aircraftTypes.map(type => ({
        aircraftTypeID: type.aircraftTypeID,
        sizeCategory: type.sizeCategory
      })),
      bestCaseCapacity: {},
      worstCaseCapacity: {}
    };
    
    // Convert bestCaseCapacity Map to object
    this.timeSlots.forEach(slot => {
      result.bestCaseCapacity[slot.label] = {};
      result.worstCaseCapacity[slot.label] = {};
      
      this.aircraftTypes.forEach(type => {
        result.bestCaseCapacity[slot.label][type.aircraftTypeID] = 
          this.getCapacity(slot.label, type.aircraftTypeID, false);
        
        result.worstCaseCapacity[slot.label][type.aircraftTypeID] = 
          this.getCapacity(slot.label, type.aircraftTypeID, true);
      });
    });
    
    return result;
  }
}

module.exports = CapacityResult; 