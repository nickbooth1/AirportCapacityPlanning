/**
 * Configuration Manager Module
 * Manages user configuration settings and preferences
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// Default configuration
const DEFAULT_CONFIG = {
  // File handling settings
  fileHandling: {
    defaultFormat: 'csv',
    maxPreviewRecords: 5
  },
  
  // Validation settings
  validation: {
    minTurnaroundMinutes: 45,
    minTransferMinutes: 30,
    maxTransferMinutes: 180,
    requiredFields: {
      flights: [
        'FlightID',
        'FlightNumber',
        'AirlineCode',
        'AircraftType',
        'Origin',
        'Destination',
        'ScheduledTime',
        'Terminal',
        'IsArrival'
      ]
    }
  },
  
  // Reporting settings
  reporting: {
    maxErrorsInReport: 100,
    includeWarnings: true,
    defaultReportFormat: 'json',
    colorizeOutput: true
  },
  
  // Reference data paths
  referencePaths: {
    airlines: '',
    aircraftTypes: '',
    terminals: ''
  },
  
  // UI settings
  ui: {
    interactive: true,
    verbosity: 'normal'
  }
};

/**
 * Get the configuration directory path
 * @returns {string} - Path to configuration directory
 */
function getConfigDir() {
  const configDir = path.join(os.homedir(), '.validator-tool');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  return configDir;
}

/**
 * Get the configuration file path
 * @returns {string} - Path to configuration file
 */
function getConfigFilePath() {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Load user configuration
 * @returns {Object} - Configuration object
 */
function loadConfig() {
  const configPath = getConfigFilePath();
  
  if (!fs.existsSync(configPath)) {
    // Create a default config file if it doesn't exist
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_CONFIG,
      ...config,
      // Deep merge for nested objects
      fileHandling: { ...DEFAULT_CONFIG.fileHandling, ...config.fileHandling },
      validation: { ...DEFAULT_CONFIG.validation, ...config.validation },
      reporting: { ...DEFAULT_CONFIG.reporting, ...config.reporting },
      referencePaths: { ...DEFAULT_CONFIG.referencePaths, ...config.referencePaths },
      ui: { ...DEFAULT_CONFIG.ui, ...config.ui }
    };
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save user configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} - True if successful
 */
function saveConfig(config) {
  const configPath = getConfigFilePath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving config: ${error.message}`);
    return false;
  }
}

/**
 * Update specific configuration values
 * @param {Object} updates - Configuration updates
 * @returns {Object} - Updated configuration
 */
function updateConfig(updates) {
  const config = loadConfig();
  
  // Helper function for deep update
  const updateDeep = (target, source) => {
    Object.keys(source).forEach(key => {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // If property doesn't exist on target, create it
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        updateDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  };
  
  // Update config
  const updatedConfig = updateDeep({ ...config }, updates);
  
  // Save the updated config
  saveConfig(updatedConfig);
  
  return updatedConfig;
}

/**
 * Reset configuration to defaults
 * @returns {Object} - Default configuration
 */
function resetConfig() {
  saveConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

/**
 * Get a specific configuration section
 * @param {string} section - Configuration section name
 * @returns {Object} - Configuration section
 */
function getConfigSection(section) {
  const config = loadConfig();
  return config[section] || {};
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  getConfigSection,
  getConfigDir
}; 