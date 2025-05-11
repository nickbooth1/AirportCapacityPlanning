/**
 * Represents an aircraft type with its properties (adapted for capacity calculation)
 */
class AircraftType {
  /**
   * Create an aircraft type
   * @param {Object} data - Aircraft type data
   * @param {string} data.aircraftTypeID - Unique identifier for the aircraft type
   * @param {string} data.sizeCategory - Size category code (A through F)
   * @param {number} data.averageTurnaroundMinutes - Average turnaround time in minutes
   */
  constructor(data) {
    this.aircraftTypeID = data.aircraftTypeID || 'unknown';
    this.sizeCategory = data.sizeCategory || 'C';
    this.averageTurnaroundMinutes = data.averageTurnaroundMinutes || 45;
    
    // For compatibility with the database model
    this.id = data.id;
    this.code = data.code || this.aircraftTypeID;
    this.iata_code = data.iata_code;
    this.icao_code = data.icao_code;
    this.name = data.name;
    
    this.validate();
  }
  
  /**
   * Validates the aircraft type data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.aircraftTypeID || typeof this.aircraftTypeID !== 'string') {
      throw new Error('aircraftTypeID is required and must be a string');
    }
    
    if (typeof this.averageTurnaroundMinutes !== 'number' || this.averageTurnaroundMinutes <= 0) {
      throw new Error('averageTurnaroundMinutes must be a positive number');
    }
    
    const validSizeCategories = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (!validSizeCategories.includes(this.sizeCategory)) {
      throw new Error(`Invalid size category: ${this.sizeCategory}. Must be one of: ${validSizeCategories.join(', ')}`);
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