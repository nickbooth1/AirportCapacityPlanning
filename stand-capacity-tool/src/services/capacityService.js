/**
 * Service for stand capacity calculations
 */
const fs = require('fs-extra');
const path = require('path');
const CapacityCalculator = require('../calculator/capacityCalculator');
const { OperationalSettings, AircraftType, Stand, StandAdjacencyRule } = require('../models');

class CapacityService {
  /**
   * Calculate capacity based on JSON file paths
   * @param {Object} options - Options
   * @param {string} options.standsFilePath - Path to stands JSON file
   * @param {string} options.aircraftTypesFilePath - Path to aircraft types JSON file
   * @param {string} [options.settingsFilePath] - Path to settings JSON file (optional)
   * @param {string} [options.adjacencyRulesFilePath] - Path to adjacency rules JSON file (optional)
   * @returns {Promise<Object>} - Capacity calculation result
   */
  async calculateFromFiles(options) {
    try {
      // Load stands data
      const standsData = await this._loadJsonFile(options.standsFilePath);
      const stands = standsData.map(data => Stand.fromJson(data));
      
      // Load aircraft types data
      const aircraftTypesData = await this._loadJsonFile(options.aircraftTypesFilePath);
      const aircraftTypes = aircraftTypesData.map(data => AircraftType.fromJson(data));
      
      // Load settings data (or use defaults)
      let settings;
      if (options.settingsFilePath) {
        const settingsData = await this._loadJsonFile(options.settingsFilePath);
        settings = OperationalSettings.fromJson(settingsData);
      } else {
        settings = OperationalSettings.getDefaults();
      }
      
      // Load adjacency rules data (if available)
      let adjacencyRules = [];
      if (options.adjacencyRulesFilePath) {
        const adjacencyRulesData = await this._loadJsonFile(options.adjacencyRulesFilePath);
        adjacencyRules = adjacencyRulesData.map(data => StandAdjacencyRule.fromJson(data));
      }
      
      // Calculate capacity
      const calculator = new CapacityCalculator({
        settings,
        aircraftTypes,
        stands,
        adjacencyRules
      });
      
      const result = calculator.calculate();
      return result;
    } catch (error) {
      throw new Error(`Capacity calculation failed: ${error.message}`);
    }
  }
  
  /**
   * Loads and parses a JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Object>} - Parsed JSON data
   * @private
   */
  async _loadJsonFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      const data = await fs.readJson(resolvedPath);
      return data;
    } catch (error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
  }
  
  /**
   * Generates sample data files
   * @param {string} outputDir - Directory to write sample files
   * @returns {Promise<void>}
   */
  async generateSampleData(outputDir) {
    try {
      await fs.ensureDir(outputDir);
      
      // Create operational settings sample
      const settings = {
        gapBetweenFlightsMinutes: 15,
        slotDurationMinutes: 60,
        operatingDayStartTime: "06:00:00",
        operatingDayEndTime: "22:00:00"
      };
      
      // Create aircraft types sample
      const aircraftTypes = [
        {
          aircraftTypeID: "A320",
          sizeCategory: "Code C",
          averageTurnaroundMinutes: 45
        },
        {
          aircraftTypeID: "B777",
          sizeCategory: "Code E",
          averageTurnaroundMinutes: 90
        },
        {
          aircraftTypeID: "A380",
          sizeCategory: "Code F",
          averageTurnaroundMinutes: 120
        }
      ];
      
      // Create stands sample
      const stands = [
        {
          standID: "Stand1",
          baseCompatibleAircraftTypeIDs: ["A320", "B777", "A380"]
        },
        {
          standID: "Stand2",
          baseCompatibleAircraftTypeIDs: ["A320", "B777"]
        },
        {
          standID: "Stand3",
          baseCompatibleAircraftTypeIDs: ["A320"]
        }
      ];
      
      // Create adjacency rules sample
      const adjacencyRules = [
        {
          primaryStandID: "Stand1",
          aircraftTypeTrigger: "A380",
          affectedStandID: "Stand2",
          restrictionType: "MAX_AIRCRAFT_SIZE_REDUCED_TO",
          restrictedToAircraftTypeOrSize: "Code C",
          notes: "When Stand1 has an A380, Stand2 can only handle Code C aircraft"
        }
      ];
      
      // Write sample files
      await fs.writeJson(path.join(outputDir, 'operational_settings.json'), settings, { spaces: 2 });
      await fs.writeJson(path.join(outputDir, 'aircraft_types.json'), aircraftTypes, { spaces: 2 });
      await fs.writeJson(path.join(outputDir, 'stands.json'), stands, { spaces: 2 });
      await fs.writeJson(path.join(outputDir, 'adjacency_rules.json'), adjacencyRules, { spaces: 2 });
      
      return {
        operationalSettingsPath: path.join(outputDir, 'operational_settings.json'),
        aircraftTypesPath: path.join(outputDir, 'aircraft_types.json'),
        standsPath: path.join(outputDir, 'stands.json'),
        adjacencyRulesPath: path.join(outputDir, 'adjacency_rules.json')
      };
    } catch (error) {
      throw new Error(`Failed to generate sample data: ${error.message}`);
    }
  }
}

module.exports = new CapacityService(); 