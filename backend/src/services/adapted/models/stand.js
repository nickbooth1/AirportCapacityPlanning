/**
 * Represents a stand with its properties (adapted for web API)
 */
class Stand {
  /**
   * Create a stand
   * @param {Object} data - Stand data
   * @param {number} data.id - Stand ID
   * @param {string} data.code - Unique identifier for the stand
   * @param {string} data.name - Stand name
   * @param {string} data.pier - Pier code/name
   * @param {string} data.terminal - Terminal code/name
   * @param {string} data.type - Stand type (e.g., "CONTACT", "REMOTE")
   * @param {boolean} data.is_active - Whether the stand is active
   * @param {boolean} data.has_jetbridge - Whether the stand has a jetbridge
   * @param {number} data.max_wingspan_meters - Maximum wingspan in meters
   * @param {number} data.max_length_meters - Maximum aircraft length in meters
   * @param {string} data.max_aircraft_size_code - Maximum aircraft size code allowed
   * @param {string[]} data.baseCompatibleAircraftTypeIDs - Array of compatible aircraft type IDs
   */
  constructor(data) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.pier = data.pier;
    this.terminal = data.terminal;
    this.type = data.type;
    this.is_active = data.is_active;
    this.has_jetbridge = data.has_jetbridge;
    this.max_wingspan_meters = data.max_wingspan_meters;
    this.max_length_meters = data.max_length_meters;
    this.max_aircraft_size_code = data.max_aircraft_size_code;
    this.baseCompatibleAircraftTypeIDs = Array.isArray(data.baseCompatibleAircraftTypeIDs) 
      ? [...data.baseCompatibleAircraftTypeIDs] 
      : [];
    
    // Set standID for compatibility with the calculator
    this.standID = data.code || `stand_${data.id}`;
  }

  /**
   * Converts database record to Stand model
   * @param {Object} dbRecord - Database record
   * @returns {Stand} Stand instance
   */
  static fromDb(dbRecord) {
    return new Stand(dbRecord);
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