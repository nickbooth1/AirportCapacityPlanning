/**
 * Represents an airport stand with its properties
 */
class Stand {
  /**
   * Create a stand
   * @param {Object} data - Stand data
   * @param {string} data.standID - Unique identifier for the stand
   * @param {string[]} data.baseCompatibleAircraftTypeIDs - Aircraft types this stand can accommodate
   */
  constructor(data) {
    this.standID = data.standID;
    this.baseCompatibleAircraftTypeIDs = Array.isArray(data.baseCompatibleAircraftTypeIDs) 
      ? [...data.baseCompatibleAircraftTypeIDs] 
      : [];
    
    this.validate();
  }

  /**
   * Validates the stand data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.standID || typeof this.standID !== 'string') {
      throw new Error('standID must be a non-empty string');
    }

    if (!Array.isArray(this.baseCompatibleAircraftTypeIDs)) {
      throw new Error('baseCompatibleAircraftTypeIDs must be an array');
    }

    // Check that all elements in the array are strings
    for (const aircraftTypeID of this.baseCompatibleAircraftTypeIDs) {
      if (typeof aircraftTypeID !== 'string' || !aircraftTypeID) {
        throw new Error('Each baseCompatibleAircraftTypeID must be a non-empty string');
      }
    }
  }

  /**
   * Checks if the stand can accommodate a specific aircraft type
   * @param {string} aircraftTypeID - Aircraft type ID to check
   * @returns {boolean} True if compatible
   */
  isCompatibleWith(aircraftTypeID) {
    return this.baseCompatibleAircraftTypeIDs.includes(aircraftTypeID);
  }

  /**
   * Creates a Stand instance from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {Stand} New instance
   */
  static fromJson(jsonData) {
    return new Stand(jsonData);
  }
}

module.exports = Stand; 