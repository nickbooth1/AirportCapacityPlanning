/**
 * Represents a stand adjacency rule (adapted for web API)
 */
class StandAdjacencyRule {
  /**
   * Create a stand adjacency rule
   * @param {Object} data - Stand adjacency rule data
   * @param {number} data.id - Rule ID
   * @param {number} data.stand_id - Primary stand ID
   * @param {number} data.adjacent_stand_id - Adjacent stand ID
   * @param {string} data.constraint_type - Type of constraint (e.g., "WINGTIP", "PROXIMITY")
   * @param {boolean} data.is_active - Whether the rule is active
   * @param {string} data.description - Description of the adjacency rule
   */
  constructor(data) {
    this.id = data.id;
    this.stand_id = data.stand_id;
    this.adjacent_stand_id = data.adjacent_stand_id;
    this.constraint_type = data.constraint_type;
    this.is_active = data.is_active;
    this.description = data.description;
  }

  /**
   * Converts database record to StandAdjacencyRule model
   * @param {Object} dbRecord - Database record
   * @returns {StandAdjacencyRule} StandAdjacencyRule instance
   */
  static fromDb(dbRecord) {
    return new StandAdjacencyRule(dbRecord);
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