const OperationalSettings = require('../models/OperationalSettings');
const TurnaroundRule = require('../models/TurnaroundRule');
const AircraftType = require('../models/AircraftType');
const TimeSlot = require('../models/TimeSlot');
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
   * @param {number} aircraftTypeId - Aircraft type ID
   * @returns {Promise<Object>} The turnaround rule
   */
  async getTurnaroundRuleByAircraftTypeId(aircraftTypeId) {
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
   * @returns {Promise<void>}
   */
  async deleteTurnaroundRule(aircraftTypeId) {
    const rule = await TurnaroundRule.query()
      .where('aircraft_type_id', aircraftTypeId)
      .first();
      
    if (!rule) {
      throw new Error('Turnaround rule not found for this aircraft type');
    }
    
    await TurnaroundRule.query()
      .delete()
      .where('aircraft_type_id', aircraftTypeId);
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

  /**
   * Get all time slots
   * @returns {Promise<Array>} List of time slots
   */
  async getTimeSlots() {
    return TimeSlot.query().orderBy('start_time');
  }

  /**
   * Get all active time slots
   * @returns {Promise<Array>} List of active time slots
   */
  async getActiveTimeSlots() {
    return TimeSlot.getActiveSlots();
  }

  /**
   * Get a time slot by ID
   * @param {number} id - Time slot ID
   * @returns {Promise<Object>} The time slot
   */
  async getTimeSlotById(id) {
    const slot = await TimeSlot.query().findById(id);
    if (!slot) {
      throw new Error('Time slot not found');
    }
    return slot;
  }

  /**
   * Create a new time slot
   * @param {Object} slotData - The time slot data
   * @returns {Promise<Object>} The created time slot
   */
  async createTimeSlot(slotData) {
    // Check if a slot already exists with this name
    const existingSlot = await TimeSlot.query()
      .where('name', slotData.name)
      .first();
      
    if (existingSlot) {
      throw new Error('A time slot with this name already exists');
    }
    
    return TimeSlot.query().insert(slotData).returning('*');
  }

  /**
   * Update a time slot
   * @param {number} id - Time slot ID
   * @param {Object} slotData - The time slot data
   * @returns {Promise<Object>} The updated time slot
   */
  async updateTimeSlot(id, slotData) {
    const slot = await TimeSlot.query().findById(id);
    if (!slot) {
      throw new Error('Time slot not found');
    }
    
    // If name is being changed, check if it conflicts with another slot
    if (slotData.name && slotData.name !== slot.name) {
      const existingSlot = await TimeSlot.query()
        .where('name', slotData.name)
        .whereNot('id', id)
        .first();
        
      if (existingSlot) {
        throw new Error('A time slot with this name already exists');
      }
    }
    
    return TimeSlot.query()
      .patchAndFetchById(id, slotData);
  }

  /**
   * Delete a time slot
   * @param {number} id - Time slot ID
   * @returns {Promise<void>}
   */
  async deleteTimeSlot(id) {
    const slot = await TimeSlot.query().findById(id);
    if (!slot) {
      throw new Error('Time slot not found');
    }
    
    await TimeSlot.query().deleteById(id);
  }
}

module.exports = new ConfigService(); 