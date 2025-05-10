/**
 * Core calculator for stand capacity
 */
const { CapacityResult, TimeSlot } = require('../models');

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
    console.log('- Settings:', this.settings);
    console.log('- Aircraft Types:', this.aircraftTypes.map(t => t.aircraftTypeID));
    console.log('- Stands:', this.stands.map(s => s.standID));
    console.log('- Adjacency Rules:', this.adjacencyRules.length);
  }

  /**
   * Calculates the capacity for all time slots
   * @returns {CapacityResult} Calculated capacity
   */
  calculate() {
    // Generate time slots
    const timeSlots = TimeSlot.generateForDay(this.settings);
    console.log('Generated time slots:', timeSlots.length);
    
    // Create result object
    const result = new CapacityResult();
    result.setTimeSlots(timeSlots);
    result.setAircraftTypes(this.aircraftTypes);
    
    // Calculate capacity for each time slot
    timeSlots.forEach(slot => {
      console.log('Calculating capacity for slot:', slot.label);
      this._calculateCapacityForSlot(slot, result);
    });
    
    return result;
  }

  /**
   * Calculates capacity for a specific time slot
   * @param {TimeSlot} slot - Time slot
   * @param {CapacityResult} result - Capacity result to update
   * @private
   */
  _calculateCapacityForSlot(slot, result) {
    // Calculate capacity per aircraft type for each stand
    this.stands.forEach(stand => {
      console.log('Processing stand:', stand.standID, 'compatible with:', stand.baseCompatibleAircraftTypeIDs);
      
      // For best case (no adjacency rules)
      const bestCaseCompatibleTypes = stand.baseCompatibleAircraftTypeIDs;
      this._processStandCapacity(stand, bestCaseCompatibleTypes, slot, result, false);
      
      // For worst case (with adjacency rules)
      const worstCaseCompatibleTypes = this._getWorstCaseCompatibleTypes(stand);
      console.log('Worst case compatible types for', stand.standID, ':', worstCaseCompatibleTypes);
      this._processStandCapacity(stand, worstCaseCompatibleTypes, slot, result, true);
    });
  }

  /**
   * Gets the compatible aircraft types for a stand in the worst case scenario
   * @param {Stand} stand - The stand
   * @returns {string[]} Array of compatible aircraft type IDs
   * @private
   */
  _getWorstCaseCompatibleTypes(stand) {
    // Start with base compatible types
    let compatibleTypes = [...stand.baseCompatibleAircraftTypeIDs];
    
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
            // This is a simplified implementation - in a real system, you'd need a mapping
            // between size categories and aircraft types
            // For now, we'll just keep aircraft types with the specified size in their ID
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
   * Processes capacity for a stand and updates the result
   * @param {Stand} stand - The stand
   * @param {string[]} compatibleTypes - Compatible aircraft type IDs
   * @param {TimeSlot} slot - Time slot
   * @param {CapacityResult} result - Capacity result to update
   * @param {boolean} isWorstCase - Whether this is for worst case calculation
   * @private
   */
  _processStandCapacity(stand, compatibleTypes, slot, result, isWorstCase) {
    // Calculate how many aircraft can be processed in this time slot for each compatible type
    compatibleTypes.forEach(aircraftTypeID => {
      const aircraftType = this.aircraftTypeMap.get(aircraftTypeID);
      if (!aircraftType) {
        console.log('WARNING: Aircraft type not found:', aircraftTypeID);
        return; // Skip if aircraft type not found
      }
      
      const totalOccupationMinutes = aircraftType.averageTurnaroundMinutes + this.settings.gapBetweenFlightsMinutes;
      const slotDurationMinutes = slot.getDurationMinutes();
      
      // Calculate how many aircraft of this type can be processed in this time slot on this stand
      // For most cases with short slots, this will be 0 or 1
      const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
      
      console.log(`Stand ${stand.standID}, Aircraft ${aircraftTypeID}: turnaround=${aircraftType.averageTurnaroundMinutes}, gap=${this.settings.gapBetweenFlightsMinutes}, slot=${slotDurationMinutes}, capacity=${capacity}`);
      
      // Note: We always want to count at least 1 aircraft if it can fit in the slot
      // This ensures capacities aren't zero for valid aircraft
      const effectiveCapacity = Math.max(1, capacity);
      
      // Increment the capacity counter in the result
      result.incrementCapacity(slot.label, aircraftTypeID, isWorstCase);
      console.log(`Incremented capacity for ${aircraftTypeID} in slot ${slot.label} (isWorstCase: ${isWorstCase})`);
    });
  }
}

module.exports = CapacityCalculator; 