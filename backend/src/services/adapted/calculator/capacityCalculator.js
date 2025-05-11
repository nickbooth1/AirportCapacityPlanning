/**
 * Core calculator for stand capacity
 * Adapted from the CLI-based Stand Capacity Tool
 */
const { CapacityResult } = require('../models');

class CapacityCalculator {
  /**
   * Create a capacity calculator
   * @param {Object} options - Calculator options
   * @param {OperationalSettings} options.settings - Operational settings
   * @param {AircraftType[]} options.aircraftTypes - Aircraft types
   * @param {Stand[]} options.stands - Stands
   * @param {StandAdjacencyRule[]} options.adjacencyRules - Adjacency rules
   */
  constructor(options) {
    this.settings = options.settings;
    this.aircraftTypes = options.aircraftTypes || [];
    this.stands = options.stands || [];
    this.adjacencyRules = options.adjacencyRules || [];
    this.timeSlots = [];
    
    // Build lookup maps for faster access
    this.aircraftTypeMap = new Map();
    this.aircraftTypes.forEach(type => {
      this.aircraftTypeMap.set(type.aircraftTypeID, type);
    });
    
    this.standMap = new Map();
    this.stands.forEach(stand => {
      this.standMap.set(stand.standID, stand);
    });
    
    // Index adjacency rules by affected stand for faster lookup
    this.adjacencyRulesByAffectedStand = new Map();
    this.adjacencyRules.forEach(rule => {
      if (!this.adjacencyRulesByAffectedStand.has(rule.affectedStandID)) {
        this.adjacencyRulesByAffectedStand.set(rule.affectedStandID, []);
      }
      this.adjacencyRulesByAffectedStand.get(rule.affectedStandID).push(rule);
    });
    
    console.log('Initialized CapacityCalculator with:');
    console.log('- Aircraft Types:', this.aircraftTypes.length);
    console.log('- Stands:', this.stands.length);
    console.log('- Adjacency Rules:', this.adjacencyRules.length);
  }
  
  /**
   * Set the time slots for this calculator
   * @param {TimeSlot[]} timeSlots - Time slots
   */
  setTimeSlots(timeSlots) {
    this.timeSlots = [...timeSlots];
    console.log('Set time slots:', this.timeSlots.length);
  }

  /**
   * Calculate stand capacity
   * @returns {CapacityResult} - Capacity calculation result
   */
  calculate() {
    // Create result object
    const result = new CapacityResult();
    result.setTimeSlots(this.timeSlots);
    result.setAircraftTypes(this.aircraftTypes);
    
    // For each time slot
    this.timeSlots.forEach(slot => {
      console.log('Calculating capacity for slot:', slot.label);
      
      // For each stand, calculate capacity
      this.stands.forEach(stand => {
        // Process best case (no adjacency restrictions)
        this._processStandCapacity(stand, stand.baseCompatibleAircraftTypeIDs, slot, result, 'best');
        
        // Process worst case (with adjacency restrictions)
        const worstCaseCompatibleTypes = this._getWorstCaseCompatibleTypes(stand);
        this._processStandCapacity(stand, worstCaseCompatibleTypes, slot, result, 'worst');
      });
    });
    
    return result;
  }
  
  /**
   * Get worst case compatible aircraft types for a stand
   * @param {Stand} stand - The stand
   * @returns {string[]} - Aircraft type IDs
   * @private
   */
  _getWorstCaseCompatibleTypes(stand) {
    // Ensure baseCompatibleAircraftTypeIDs is an array
    const baseTypes = Array.isArray(stand.baseCompatibleAircraftTypeIDs) 
      ? stand.baseCompatibleAircraftTypeIDs 
      : [];
    
    // Start with base compatible types
    let compatibleTypes = [...baseTypes];
    
    // Check if this stand is affected by any adjacency rules
    if (!this.adjacencyRulesByAffectedStand.has(stand.standID)) {
      return compatibleTypes; // No rules affecting this stand
    }
    
    // Get all rules affecting this stand
    const rules = this.adjacencyRulesByAffectedStand.get(stand.standID);
    
    // Apply each rule to restrict compatible types
    rules.forEach(rule => {
      switch (rule.restrictionType) {
        case 'NO_USE_AFFECTED_STAND':
          // Stand can't be used at all
          compatibleTypes = [];
          break;
          
        case 'MAX_AIRCRAFT_SIZE_REDUCED_TO':
          // Filter compatible types based on size category
          if (rule.restrictedToAircraftTypeOrSize) {
            compatibleTypes = compatibleTypes.filter(typeID => {
              const type = this.aircraftTypeMap.get(typeID);
              return type && type.sizeCategory === rule.restrictedToAircraftTypeOrSize;
            });
          }
          break;
          
        case 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND':
          // Remove specific aircraft types
          if (rule.restrictedToAircraftTypeOrSize) {
            compatibleTypes = compatibleTypes.filter(
              typeID => typeID !== rule.restrictedToAircraftTypeOrSize
            );
          }
          break;
      }
    });
    
    return compatibleTypes;
  }
  
  /**
   * Process capacity for a stand and update the result
   * @param {Stand} stand - The stand
   * @param {string[]} compatibleTypes - Compatible aircraft type IDs
   * @param {TimeSlot} slot - Time slot
   * @param {CapacityResult} result - Capacity result to update
   * @param {string} caseType - Case type ('best', 'standard', or 'worst')
   * @private
   */
  _processStandCapacity(stand, compatibleTypes, slot, result, caseType) {
    // Ensure compatibleTypes is always an array
    const typesToProcess = Array.isArray(compatibleTypes) ? compatibleTypes : [];
    
    console.log(`Processing stand ${stand.standID} with ${typesToProcess.length} compatible types: ${typesToProcess.join(', ')} in time slot ${slot.label}`);
    
    // If there are no compatible types, log that
    if (typesToProcess.length === 0) {
      console.warn(`Stand ${stand.standID} has NO compatible aircraft types!`);
      return;
    }

    // Group aircraft types by size category
    const typesBySize = {
      'A': [],
      'B': [],
      'C': [],
      'D': [],
      'E': [],
      'F': []
    };
    
    // Map from size to ordinal (for finding largest)
    const sizeOrdinal = {
      'F': 6,
      'E': 5,
      'D': 4,
      'C': 3,
      'B': 2,
      'A': 1
    };
    
    // Populate typesBySize
    typesToProcess.forEach(aircraftTypeID => {
      const aircraftType = this.aircraftTypeMap.get(aircraftTypeID);
      if (aircraftType && aircraftType.sizeCategory) {
        if (!typesBySize[aircraftType.sizeCategory]) {
          typesBySize[aircraftType.sizeCategory] = [];
        }
        typesBySize[aircraftType.sizeCategory].push(aircraftTypeID);
      }
    });
    
    // Find the largest size category that has aircraft
    let largestSize = null;
    let largestOrdinal = 0;
    
    for (const [size, types] of Object.entries(typesBySize)) {
      if (types.length > 0 && sizeOrdinal[size] > largestOrdinal) {
        largestSize = size;
        largestOrdinal = sizeOrdinal[size];
      }
    }
    
    // If we found a largest size, focus on that aircraft type
    if (largestSize && typesBySize[largestSize].length > 0) {
      // Just use the first aircraft of the largest category
      const focusTypeID = typesBySize[largestSize][0];
      const aircraftType = this.aircraftTypeMap.get(focusTypeID);
      
      // Calculate capacity for this aircraft type
      if (aircraftType) {
        // Calculate total occupation time (turnaround + gap)
        const totalOccupationMinutes = 
          aircraftType.averageTurnaroundMinutes + this.settings.gapBetweenFlightsMinutes;
        
        // Calculate how many aircraft can fit in this time slot
        const slotDurationMinutes = slot.getDurationMinutes();
        const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
        
        console.log(`Stand ${stand.standID}, aircraft type ${focusTypeID} (size ${largestSize}), slot ${slot.label}: 
          - Turnaround time: ${aircraftType.averageTurnaroundMinutes} minutes
          - Gap time: ${this.settings.gapBetweenFlightsMinutes} minutes
          - Total occupation: ${totalOccupationMinutes} minutes
          - Slot duration: ${slotDurationMinutes} minutes
          - Capacity: ${capacity} aircraft`);
        
        // Increment the capacity counter in the result
        // If capacity is > 0, we can fit at least one aircraft
        if (capacity > 0) {
          // Update capacity for each increment
          for (let i = 0; i < capacity; i++) {
            result.incrementCapacity(slot.label, focusTypeID, caseType);
          }
          console.log(`Added capacity: ${slot.label}, ${focusTypeID}, ${caseType} = ${result.getCapacity(slot.label, focusTypeID, caseType)}`);
        } else {
          console.log(`Zero capacity for ${stand.standID}, aircraft type ${focusTypeID} in slot ${slot.label} - not incrementing`);
        }
      }
    } else {
      // Fall back to original behavior if no size categorization is available
      // Calculate capacity for each compatible aircraft type
      typesToProcess.forEach(aircraftTypeID => {
        const aircraftType = this.aircraftTypeMap.get(aircraftTypeID);
        if (!aircraftType) {
          console.warn(`Aircraft type not found: ${aircraftTypeID}`);
          return;
        }
        
        // Calculate total occupation time (turnaround + gap)
        const totalOccupationMinutes = 
          aircraftType.averageTurnaroundMinutes + this.settings.gapBetweenFlightsMinutes;
        
        // Calculate how many aircraft can fit in this time slot
        const slotDurationMinutes = slot.getDurationMinutes();
        const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
        
        console.log(`Stand ${stand.standID}, aircraft type ${aircraftTypeID}, slot ${slot.label}: 
          - Turnaround time: ${aircraftType.averageTurnaroundMinutes} minutes
          - Gap time: ${this.settings.gapBetweenFlightsMinutes} minutes
          - Total occupation: ${totalOccupationMinutes} minutes
          - Slot duration: ${slotDurationMinutes} minutes
          - Capacity: ${capacity} aircraft`);
        
        // Increment the capacity counter in the result
        // If capacity is > 0, we can fit at least one aircraft
        if (capacity > 0) {
          result.incrementCapacity(slot.label, aircraftTypeID, caseType);
          console.log(`Added capacity: ${slot.label}, ${aircraftTypeID}, ${caseType} = ${result.getCapacity(slot.label, aircraftTypeID, caseType)}`);
        } else {
          console.log(`Zero capacity for ${stand.standID}, aircraft type ${aircraftTypeID} in slot ${slot.label} - not incrementing`);
        }
      });
    }
  }
}

module.exports = CapacityCalculator; 