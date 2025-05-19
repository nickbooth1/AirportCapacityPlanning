/**
 * Airport Configuration Data Service
 * 
 * This service provides data access methods for airport configuration data, including:
 * - Terminals, piers, and their relationships
 * - Operational settings
 * - Turnaround rules
 * - Time slots
 * - Aircraft types and size categories
 * 
 * It serves as a knowledge base integration layer that can be used by the Agent services.
 */

const Terminal = require('../../models/Terminal');
const Pier = require('../../models/Pier');
const OperationalSettings = require('../../models/OperationalSettings');
const TurnaroundRule = require('../../models/TurnaroundRule');
const TimeSlot = require('../../models/TimeSlot');
const AircraftType = require('../../models/AircraftType');

const { transaction } = require('objection');

class AirportConfigDataService {
  /**
   * Get all terminals with optional filtering
   * 
   * @param {Object} options - Optional query options
   * @param {boolean} options.includePiers - Whether to include pier relationships
   * @param {boolean} options.includeStands - Whether to include stand relationships
   * @returns {Promise<Array>} - Terminals matching the criteria
   */
  async getTerminals(options = {}) {
    try {
      let query = Terminal.query();
      
      if (options.includePiers) {
        if (options.includeStands) {
          query = query.withGraphFetched('piers.stands');
        } else {
          query = query.withGraphFetched('piers');
        }
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching terminals:', error);
      throw new Error(`Failed to fetch terminals: ${error.message}`);
    }
  }
  
  /**
   * Get a terminal by ID
   * 
   * @param {string} terminalId - The terminal ID
   * @param {Object} options - Optional query options
   * @param {boolean} options.includePiers - Whether to include pier relationships
   * @param {boolean} options.includeStands - Whether to include stand relationships
   * @returns {Promise<Object>} - The terminal object
   */
  async getTerminalById(terminalId, options = {}) {
    try {
      let query = Terminal.query().findById(terminalId);
      
      if (options.includePiers) {
        if (options.includeStands) {
          query = query.withGraphFetched('piers.stands');
        } else {
          query = query.withGraphFetched('piers');
        }
      }
      
      const terminal = await query;
      
      if (!terminal) {
        throw new Error(`Terminal with ID ${terminalId} not found`);
      }
      
      return terminal;
    } catch (error) {
      console.error(`Error fetching terminal with ID ${terminalId}:`, error);
      throw new Error(`Failed to fetch terminal: ${error.message}`);
    }
  }
  
  /**
   * Get piers with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.terminalId - Filter by terminal ID
   * @param {boolean} filters.includeStands - Whether to include stand relationships
   * @returns {Promise<Array>} - Piers matching the criteria
   */
  async getPiers(filters = {}) {
    try {
      let query = Pier.query().withGraphFetched('terminal');
      
      if (filters.terminalId) {
        query = query.where('terminal_id', filters.terminalId);
      }
      
      if (filters.includeStands) {
        query = query.withGraphFetched('stands');
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching piers:', error);
      throw new Error(`Failed to fetch piers: ${error.message}`);
    }
  }
  
  /**
   * Get a pier by ID
   * 
   * @param {string} pierId - The pier ID
   * @param {boolean} includeStands - Whether to include stand relationships
   * @returns {Promise<Object>} - The pier object
   */
  async getPierById(pierId, includeStands = false) {
    try {
      let query = Pier.query()
        .findById(pierId)
        .withGraphFetched('terminal');
      
      if (includeStands) {
        query = query.withGraphFetched('stands');
      }
      
      const pier = await query;
      
      if (!pier) {
        throw new Error(`Pier with ID ${pierId} not found`);
      }
      
      return pier;
    } catch (error) {
      console.error(`Error fetching pier with ID ${pierId}:`, error);
      throw new Error(`Failed to fetch pier: ${error.message}`);
    }
  }
  
  /**
   * Get operational settings
   * 
   * @returns {Promise<Object>} - The operational settings
   */
  async getOperationalSettings() {
    try {
      const settings = await OperationalSettings.getSettings();
      return settings;
    } catch (error) {
      console.error('Error fetching operational settings:', error);
      throw new Error(`Failed to fetch operational settings: ${error.message}`);
    }
  }
  
  /**
   * Get turnaround rules with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {number} filters.aircraftTypeId - Filter by aircraft type ID
   * @returns {Promise<Array>} - Turnaround rules matching the criteria
   */
  async getTurnaroundRules(filters = {}) {
    try {
      let query = TurnaroundRule.query()
        .withGraphFetched('aircraftType');
      
      if (filters.aircraftTypeId) {
        query = query.where('aircraft_type_id', filters.aircraftTypeId);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching turnaround rules:', error);
      throw new Error(`Failed to fetch turnaround rules: ${error.message}`);
    }
  }
  
  /**
   * Get a turnaround rule by ID
   * 
   * @param {string} ruleId - The turnaround rule ID
   * @returns {Promise<Object>} - The turnaround rule
   */
  async getTurnaroundRuleById(ruleId) {
    try {
      const rule = await TurnaroundRule.query()
        .findById(ruleId)
        .withGraphFetched('aircraftType');
      
      if (!rule) {
        throw new Error(`Turnaround rule with ID ${ruleId} not found`);
      }
      
      return rule;
    } catch (error) {
      console.error(`Error fetching turnaround rule with ID ${ruleId}:`, error);
      throw new Error(`Failed to fetch turnaround rule: ${error.message}`);
    }
  }
  
  /**
   * Get time slots
   * 
   * @returns {Promise<Array>} - Time slots
   */
  async getTimeSlots() {
    try {
      return await TimeSlot.query().orderBy('start_time');
    } catch (error) {
      console.error('Error fetching time slots:', error);
      throw new Error(`Failed to fetch time slots: ${error.message}`);
    }
  }
  
  /**
   * Get a time slot by ID
   * 
   * @param {number} slotId - The time slot ID
   * @returns {Promise<Object>} - The time slot
   */
  async getTimeSlotById(slotId) {
    try {
      const slot = await TimeSlot.query().findById(slotId);
      
      if (!slot) {
        throw new Error(`Time slot with ID ${slotId} not found`);
      }
      
      return slot;
    } catch (error) {
      console.error(`Error fetching time slot with ID ${slotId}:`, error);
      throw new Error(`Failed to fetch time slot: ${error.message}`);
    }
  }
  
  /**
   * Get aircraft types with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.sizeCategory - Filter by size category
   * @param {boolean} filters.isActive - Filter by active status
   * @param {string} filters.searchQuery - Search in code, name, and description
   * @returns {Promise<Array>} - Aircraft types matching the criteria
   */
  async getAircraftTypes(filters = {}) {
    try {
      let query = AircraftType.query();
      
      if (filters.sizeCategory) {
        query = query.where('size_category', filters.sizeCategory);
      }
      
      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }
      
      if (filters.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.where(builder => {
          builder.where('code', 'like', searchTerm)
            .orWhere('name', 'like', searchTerm)
            .orWhere('description', 'like', searchTerm);
        });
      }
      
      return await query.orderBy('name');
    } catch (error) {
      console.error('Error fetching aircraft types:', error);
      throw new Error(`Failed to fetch aircraft types: ${error.message}`);
    }
  }
  
  /**
   * Get an aircraft type by ID
   * 
   * @param {number} aircraftTypeId - The aircraft type ID
   * @returns {Promise<Object>} - The aircraft type
   */
  async getAircraftTypeById(aircraftTypeId) {
    try {
      const aircraftType = await AircraftType.query().findById(aircraftTypeId);
      
      if (!aircraftType) {
        throw new Error(`Aircraft type with ID ${aircraftTypeId} not found`);
      }
      
      return aircraftType;
    } catch (error) {
      console.error(`Error fetching aircraft type with ID ${aircraftTypeId}:`, error);
      throw new Error(`Failed to fetch aircraft type: ${error.message}`);
    }
  }
  
  /**
   * Get an aircraft type by code
   * 
   * @param {string} code - The aircraft type code
   * @returns {Promise<Object>} - The aircraft type
   */
  async getAircraftTypeByCode(code) {
    try {
      const aircraftType = await AircraftType.query()
        .where('code', code)
        .first();
      
      if (!aircraftType) {
        throw new Error(`Aircraft type with code ${code} not found`);
      }
      
      return aircraftType;
    } catch (error) {
      console.error(`Error fetching aircraft type with code ${code}:`, error);
      throw new Error(`Failed to fetch aircraft type: ${error.message}`);
    }
  }
  
  /**
   * Get airport configuration summary
   * 
   * @returns {Promise<Object>} - Summary of airport configuration
   */
  async getAirportConfigSummary() {
    try {
      // Get counts of various entities
      const [
        terminalCount,
        pierCount,
        standCount,
        aircraftTypeCount,
        timeSlotCount,
        turnaroundRuleCount
      ] = await Promise.all([
        Terminal.query().resultSize(),
        Pier.query().resultSize(),
        require('../../models/Stand').query().resultSize(),
        AircraftType.query().resultSize(),
        TimeSlot.query().resultSize(),
        TurnaroundRule.query().resultSize()
      ]);
      
      // Get operational settings
      const operationalSettings = await this.getOperationalSettings();
      
      return {
        terminalCount,
        pierCount,
        standCount,
        aircraftTypeCount,
        timeSlotCount,
        turnaroundRuleCount,
        operationalHours: {
          start: operationalSettings.operating_start_time,
          end: operationalSettings.operating_end_time
        },
        slotDurationMinutes: operationalSettings.slot_duration_minutes,
        defaultGapMinutes: operationalSettings.default_gap_minutes
      };
    } catch (error) {
      console.error('Error fetching airport configuration summary:', error);
      throw new Error(`Failed to fetch airport configuration summary: ${error.message}`);
    }
  }
}

module.exports = new AirportConfigDataService();