/**
 * Represents an aircraft type with its properties
 */
class AircraftType {
  /**
   * Create an aircraft type
   * @param {Object} data - Aircraft type data
   * @param {string} data.aircraftTypeID - Unique identifier for the aircraft type
   * @param {string} data.sizeCategory - Size category (e.g., "Code C", "Code E")
   * @param {number} data.averageTurnaroundMinutes - Average turnaround time in minutes
   */
  constructor(data) {
    this.aircraftTypeID = data.aircraftTypeID;
    this.sizeCategory = data.sizeCategory;
    this.averageTurnaroundMinutes = data.averageTurnaroundMinutes;
    
    this.validate();
  }

  /**
   * Validates the aircraft type data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.aircraftTypeID || typeof this.aircraftTypeID !== 'string') {
      throw new Error('aircraftTypeID must be a non-empty string');
    }

    if (!this.sizeCategory || typeof this.sizeCategory !== 'string') {
      throw new Error('sizeCategory must be a non-empty string');
    }

    if (!Number.isInteger(this.averageTurnaroundMinutes) || this.averageTurnaroundMinutes <= 0) {
      throw new Error('averageTurnaroundMinutes must be a positive integer');
    }
  }

  /**
   * Creates an AircraftType instance from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {AircraftType} New instance
   */
  static fromJson(jsonData) {
    return new AircraftType(jsonData);
  }
}

module.exports = AircraftType; 