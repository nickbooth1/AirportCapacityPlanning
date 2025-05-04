const OperationalSettings = require('../models/OperationalSettings');
const TurnaroundRule = require('../models/TurnaroundRule');
const AircraftType = require('../models/AircraftType');
const { transaction } = require('objection');

class ConfigService {
  /**
   * Get the operational settings
   * @returns {Promise<Object>} The settings object
   */
  async getOperationalSettings() {
    return OperationalSettings.getSettings();
  }

  /**
   * Update operational settings
   * @param {Object} settingsData - The settings data to update
   * @returns {Promise<Object>} The updated settings
   */
  async updateOperationalSettings(settingsData) {
    // Always update ID 1 (the only row)
    const existingSettings = await OperationalSettings.query().findById(1);
    
    if (!existingSettings) {
      return OperationalSettings.query().insert({
        id: 1,
        ...settingsData
      });
    }
    
    return OperationalSettings.query()
      .findById(1)
      .patch(settingsData)
      .returning('*')
      .then(updatedRows => updatedRows[0]);
  }

  /**
   * Get all turnaround rules with aircraft type information
   * @returns {Promise<Array>} List of turnaround rules
   */
  async getTurnaroundRules() {
    return TurnaroundRule.query()
      .withGraphFetched('aircraftType')
      .orderBy('min_turnaround_minutes');
  }

  /**
   * Get a turnaround rule by aircraft type ID
   * @param {number} aircraftTypeId - The aircraft type ID
   * @returns {Promise<Object>} The turnaround rule
   */
  async getTurnaroundRuleByAircraftType(aircraftTypeId) {
    return TurnaroundRule.query()
      .where('aircraft_type_id', aircraftTypeId)
      .withGraphFetched('aircraftType')
      .first();
  }

  /**
   * Create a new turnaround rule
   * @param {Object} ruleData - The rule data
   * @returns {Promise<Object>} The created rule
   */
  async createTurnaroundRule(ruleData) {
    // Check if a rule already exists for this aircraft type
    const existingRule = await TurnaroundRule.query()
      .where('aircraft_type_id', ruleData.aircraft_type_id)
      .first();
      
    if (existingRule) {
      throw new Error('A turnaround rule already exists for this aircraft type');
    }
    
    // Verify aircraft type exists
    const aircraftType = await AircraftType.query().findById(ruleData.aircraft_type_id);
    if (!aircraftType) {
      throw new Error('Aircraft type not found');
    }
    
    return TurnaroundRule.query().insert(ruleData).returning('*');
  }

  /**
   * Update a turnaround rule
   * @param {number} aircraftTypeId - The aircraft type ID for the rule to update
   * @param {Object} ruleData - The rule data
   * @returns {Promise<Object>} The updated rule
   */
  async updateTurnaroundRule(aircraftTypeId, ruleData) {
    const rule = await TurnaroundRule.query()
      .where('aircraft_type_id', aircraftTypeId)
      .first();
      
    if (!rule) {
      throw new Error('Turnaround rule not found for this aircraft type');
    }
    
    return TurnaroundRule.query()
      .where('aircraft_type_id', aircraftTypeId)
      .patch(ruleData)
      .returning('*')
      .then(updatedRows => updatedRows[0]);
  }

  /**
   * Delete a turnaround rule
   * @param {number} aircraftTypeId - The aircraft type ID for the rule to delete
   * @returns {Promise<number>} The number of deleted rows
   */
  async deleteTurnaroundRule(aircraftTypeId) {
    return TurnaroundRule.query()
      .where('aircraft_type_id', aircraftTypeId)
      .delete();
  }

  /**
   * Get all configuration data needed for capacity calculations
   * @returns {Promise<Object>} The combined configuration data
   */
  async getCapacityConfigData() {
    const trx = await transaction.start(OperationalSettings.knex());
    
    try {
      const operationalSettings = await OperationalSettings.getSettings();
      const turnaroundRules = await TurnaroundRule.query()
        .withGraphFetched('aircraftType')
        .orderBy('min_turnaround_minutes');
        
      await trx.commit();
      
      return {
        operationalSettings,
        turnaroundRules
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

module.exports = new ConfigService(); 