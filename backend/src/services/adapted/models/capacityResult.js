/**
 * Represents the result of a capacity calculation
 * Adapted from the CLI-based Stand Capacity Tool
 */
class CapacityResult {
  /**
   * Create a capacity result
   */
  constructor() {
    // Initialize empty capacity maps
    this.bestCaseCapacity = {}; // {slotLabel: {aircraftTypeID: count}}
    this.worstCaseCapacity = {}; // {slotLabel: {aircraftTypeID: count}}
    this.timeSlots = []; // Array of TimeSlot objects
    this.aircraftTypes = []; // Array of AircraftType objects
    this.visualizationData = []; // For charting
  }

  /**
   * Sets the time slots for this result
   * @param {TimeSlot[]} slots - Time slots
   */
  setTimeSlots(slots) {
    this.timeSlots = [...slots];
    
    // Initialize capacity maps for each slot
    slots.forEach(slot => {
      const slotLabel = slot.label;
      if (!this.bestCaseCapacity[slotLabel]) {
        this.bestCaseCapacity[slotLabel] = {};
      }
      if (!this.worstCaseCapacity[slotLabel]) {
        this.worstCaseCapacity[slotLabel] = {};
      }
    });
    
    console.log(`Initialized capacity result with: { timeSlots: ${slots.length}, aircraftTypes: ${this.aircraftTypes.length} }`);
  }

  /**
   * Sets the aircraft types for this result
   * @param {AircraftType[]} types - Aircraft types
   */
  setAircraftTypes(types) {
    this.aircraftTypes = [...types];
    
    // Initialize capacity counts for each aircraft type in each slot
    this.timeSlots.forEach(slot => {
      const slotLabel = slot.label;
      
      // Make sure slot exists in capacity maps
      if (!this.bestCaseCapacity[slotLabel]) {
        this.bestCaseCapacity[slotLabel] = {};
      }
      if (!this.worstCaseCapacity[slotLabel]) {
        this.worstCaseCapacity[slotLabel] = {};
      }
      
      // Initialize counts for each aircraft type
      types.forEach(type => {
        const aircraftTypeID = type.aircraftTypeID || 'unknown';
        
        if (!this.bestCaseCapacity[slotLabel][aircraftTypeID]) {
          this.bestCaseCapacity[slotLabel][aircraftTypeID] = 0;
        }
        if (!this.worstCaseCapacity[slotLabel][aircraftTypeID]) {
          this.worstCaseCapacity[slotLabel][aircraftTypeID] = 0;
        }
      });
    });
    
    // For debugging
    console.log('Initialized capacity result with:', {
      timeSlots: this.timeSlots.length,
      aircraftTypes: this.aircraftTypes.length
    });
  }

  /**
   * Increments the capacity count for a specific slot and aircraft type
   * @param {string} slotLabel - Time slot label
   * @param {string} aircraftTypeID - Aircraft type ID
   * @param {string} caseType - Case type ('best' or 'worst')
   */
  incrementCapacity(slotLabel, aircraftTypeID, caseType = 'best') {
    // Validate the case type
    if (caseType !== 'best' && caseType !== 'worst') {
      console.warn(`Invalid case type: ${caseType}. Using 'best' instead.`);
      caseType = 'best';
    }
    
    // Use a valid aircraft type ID
    const typeID = aircraftTypeID || 'unknown';
    
    // Choose the correct capacity map
    let capacityMap = caseType === 'worst' ? this.worstCaseCapacity : this.bestCaseCapacity;
    
    // Create the slot entry if it doesn't exist
    if (!capacityMap[slotLabel]) {
      capacityMap[slotLabel] = {};
    }
    
    // Create the aircraft type entry if it doesn't exist
    if (!capacityMap[slotLabel][typeID]) {
      capacityMap[slotLabel][typeID] = 0;
    }
    
    // Increment the count
    capacityMap[slotLabel][typeID]++;
    
    // For debugging
    console.log(`Incremented capacity: ${slotLabel}, ${typeID}, ${caseType} = ${capacityMap[slotLabel][typeID]}`);
  }

  /**
   * Gets the capacity for a specific slot and aircraft type
   * @param {string} slotLabel - Time slot label
   * @param {string} aircraftTypeID - Aircraft type ID
   * @param {string} caseType - Case type ('best' or 'worst')
   * @returns {number} Capacity count
   */
  getCapacity(slotLabel, aircraftTypeID, caseType = 'best') {
    // Validate the case type
    if (caseType !== 'best' && caseType !== 'worst') {
      console.warn(`Invalid case type: ${caseType}. Using 'best' instead.`);
      caseType = 'best';
    }
    
    // Use a valid aircraft type ID
    const typeID = aircraftTypeID || 'unknown';
    
    // Choose the correct capacity map
    let capacityMap = caseType === 'worst' ? this.worstCaseCapacity : this.bestCaseCapacity;
    
    // Return 0 if the slot or aircraft type doesn't exist
    if (!capacityMap[slotLabel] || !capacityMap[slotLabel][typeID]) {
      return 0;
    }
    
    return capacityMap[slotLabel][typeID];
  }

  /**
   * Generates visualization data for charting
   * This transforms the capacity data into a format suitable for charts
   * @returns {Array} Array of visualization data objects
   */
  generateVisualizationData() {
    // Initialize visualization data
    const visualizationData = [];
    
    // Process each time slot
    this.timeSlots.forEach(slot => {
      const slotLabel = slot.label;
      
      // Calculate total capacity for this time slot
      let bestCaseTotal = 0;
      let worstCaseTotal = 0;
      
      Object.values(this.bestCaseCapacity[slotLabel] || {}).forEach(capacity => {
        bestCaseTotal += capacity;
      });
      
      Object.values(this.worstCaseCapacity[slotLabel] || {}).forEach(capacity => {
        worstCaseTotal += capacity;
      });
      
      // Add the data for this time slot
      visualizationData.push({
        timeSlot: slotLabel,
        bestCase: bestCaseTotal,
        worstCase: worstCaseTotal,
        details: {
          bestCase: { ...this.bestCaseCapacity[slotLabel] },
          worstCase: { ...this.worstCaseCapacity[slotLabel] }
        }
      });
    });
    
    this.visualizationData = visualizationData;
    return visualizationData;
  }

  /**
   * Calculates total capacity and summary statistics
   * @returns {Object} Capacity summary
   */
  generateCapacitySummary() {
    let totalBestCase = 0;
    let totalWorstCase = 0;
    
    // Calculate totals across all time slots
    this.timeSlots.forEach(slot => {
      const slotLabel = slot.label;
      
      // Sum up capacities for this time slot
      Object.values(this.bestCaseCapacity[slotLabel] || {}).forEach(capacity => {
        totalBestCase += capacity;
      });
      
      Object.values(this.worstCaseCapacity[slotLabel] || {}).forEach(capacity => {
        totalWorstCase += capacity;
      });
    });
    
    // Generate visualization data if it hasn't been generated yet
    if (this.visualizationData.length === 0) {
      this.generateVisualizationData();
    }
    
    console.log(`Capacity calculation result summary:`);
    console.log(`Total best case capacity: ${totalBestCase}`);
    console.log(`Total worst case capacity: ${totalWorstCase}`);
    console.log(`Visualization data (by hour):`, this.visualizationData);
    
    return {
      totalBestCase,
      totalWorstCase,
      visualizationData: this.visualizationData
    };
  }

  /**
   * Converts the capacity result to JSON format
   * @returns {Object} JSON representation
   */
  toJson() {
    // Generate visualization data and capacity summary
    this.generateVisualizationData();
    const summary = this.generateCapacitySummary();
    
    return {
      timeSlots: this.timeSlots.map(slot => ({
        id: slot.id || `slot_${slot.label}`,
        name: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime
      })),
      aircraftTypes: this.aircraftTypes.map(type => ({
        aircraftTypeID: type.aircraftTypeID,
        sizeCategory: type.sizeCategory
      })),
      bestCaseCapacity: this.bestCaseCapacity,
      worstCaseCapacity: this.worstCaseCapacity,
      visualizationData: this.visualizationData,
      summary: {
        totalBestCase: summary.totalBestCase,
        totalWorstCase: summary.totalWorstCase,
        bestCaseByType: this.getBestCaseByAircraftType(),
        worstCaseByType: this.getWorstCaseByAircraftType(),
        adjacencyImpact: summary.totalBestCase > 0 ? 
          ((summary.totalBestCase - summary.totalWorstCase) / summary.totalBestCase * 100).toFixed(1) : 0
      }
    };
  }

  /**
   * Gets the best case capacity by aircraft type
   * @returns {Object} Map of aircraft type to total capacity
   */
  getBestCaseByAircraftType() {
    const capacityByType = {};
    
    // Calculate capacity by aircraft type
    this.timeSlots.forEach(slot => {
      const slotLabel = slot.label;
      
      Object.entries(this.bestCaseCapacity[slotLabel] || {}).forEach(([typeId, capacity]) => {
        if (!capacityByType[typeId]) {
          capacityByType[typeId] = 0;
        }
        capacityByType[typeId] += capacity;
      });
    });
    
    return capacityByType;
  }

  /**
   * Gets the worst case capacity by aircraft type
   * @returns {Object} Map of aircraft type to total capacity
   */
  getWorstCaseByAircraftType() {
    const capacityByType = {};
    
    // Calculate capacity by aircraft type
    this.timeSlots.forEach(slot => {
      const slotLabel = slot.label;
      
      Object.entries(this.worstCaseCapacity[slotLabel] || {}).forEach(([typeId, capacity]) => {
        if (!capacityByType[typeId]) {
          capacityByType[typeId] = 0;
        }
        capacityByType[typeId] += capacity;
      });
    });
    
    return capacityByType;
  }
}

module.exports = CapacityResult; 