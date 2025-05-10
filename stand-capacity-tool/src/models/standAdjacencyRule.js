/**
 * Represents an adjacency rule between stands
 */
class StandAdjacencyRule {
  // Define rule types as static constants
  static RESTRICTION_TYPES = {
    NO_USE_AFFECTED_STAND: 'NO_USE_AFFECTED_STAND',
    MAX_AIRCRAFT_SIZE_REDUCED_TO: 'MAX_AIRCRAFT_SIZE_REDUCED_TO',
    AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND: 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND'
  };

  /**
   * Create a stand adjacency rule
   * @param {Object} data - Rule data
   * @param {string} data.primaryStandID - The stand whose use triggers the rule
   * @param {string|string[]} data.aircraftTypeTrigger - Aircraft type(s) on primary stand that trigger the rule
   * @param {string} data.affectedStandID - The stand that is affected by the rule
   * @param {string} data.restrictionType - Type of restriction (from RESTRICTION_TYPES)
   * @param {string} [data.restrictedToAircraftTypeOrSize] - Size or type restriction (required for some restriction types)
   * @param {string} [data.notes] - Optional notes about the rule
   */
  constructor(data) {
    this.primaryStandID = data.primaryStandID;
    this.aircraftTypeTrigger = Array.isArray(data.aircraftTypeTrigger) 
      ? [...data.aircraftTypeTrigger] 
      : [data.aircraftTypeTrigger];
    this.affectedStandID = data.affectedStandID;
    this.restrictionType = data.restrictionType;
    this.restrictedToAircraftTypeOrSize = data.restrictedToAircraftTypeOrSize;
    this.notes = data.notes || '';
    
    this.validate();
  }

  /**
   * Validates the rule data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.primaryStandID || typeof this.primaryStandID !== 'string') {
      throw new Error('primaryStandID must be a non-empty string');
    }

    if (!Array.isArray(this.aircraftTypeTrigger) || this.aircraftTypeTrigger.length === 0) {
      throw new Error('aircraftTypeTrigger must be a non-empty array');
    }

    // Check all aircraft type triggers are strings
    for (const type of this.aircraftTypeTrigger) {
      if (typeof type !== 'string' || !type) {
        throw new Error('Each aircraft type trigger must be a non-empty string');
      }
    }

    if (!this.affectedStandID || typeof this.affectedStandID !== 'string') {
      throw new Error('affectedStandID must be a non-empty string');
    }

    // Check restriction type is valid
    const validRestrictions = Object.values(StandAdjacencyRule.RESTRICTION_TYPES);
    if (!validRestrictions.includes(this.restrictionType)) {
      throw new Error(`restrictionType must be one of: ${validRestrictions.join(', ')}`);
    }

    // For some restriction types, restrictedToAircraftTypeOrSize is required
    if (this.restrictionType === StandAdjacencyRule.RESTRICTION_TYPES.MAX_AIRCRAFT_SIZE_REDUCED_TO &&
       (!this.restrictedToAircraftTypeOrSize || typeof this.restrictedToAircraftTypeOrSize !== 'string')) {
      throw new Error('restrictedToAircraftTypeOrSize is required for MAX_AIRCRAFT_SIZE_REDUCED_TO restriction');
    }
  }

  /**
   * Checks if this rule affects a stand with a specific aircraft type
   * @param {string} standID - The stand to check
   * @param {string} aircraftTypeID - The aircraft type at the primary stand
   * @returns {boolean} True if the rule applies
   */
  appliesTo(standID, aircraftTypeID) {
    return (
      this.affectedStandID === standID &&
      this.aircraftTypeTrigger.includes(aircraftTypeID)
    );
  }

  /**
   * Creates a StandAdjacencyRule instance from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {StandAdjacencyRule} New instance
   */
  static fromJson(jsonData) {
    return new StandAdjacencyRule(jsonData);
  }
}

module.exports = StandAdjacencyRule; 