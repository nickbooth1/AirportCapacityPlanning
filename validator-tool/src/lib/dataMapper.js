/**
 * Data Mapper Module
 * Maps source data columns to required target fields
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// Required fields for each entity type
const REQUIRED_FIELDS = {
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
  ],
  stands: [
    'StandName',
    'Terminal',
    'IsContactStand',
    'SizeLimit'
  ],
  airlines: [
    'AirlineCode',
    'AirlineName',
    'BaseTerminal',
    'RequiresContactStand'
  ],
  maintenance: [
    'StandName',
    'StartTime',
    'EndTime'
  ]
};

// Common field name variations to assist with auto-mapping
const FIELD_VARIATIONS = {
  'FlightID': ['flight_id', 'flightid', 'flight-id', 'id', 'flight_number_id'],
  'FlightNumber': ['flight_number', 'flightnumber', 'flight_no', 'flight-no', 'flight-number', 'flightno', 'flt_num'],
  'AirlineCode': ['airline_code', 'airline', 'carrier', 'carrier_code', 'operator', 'operator_code'],
  'AircraftType': ['aircraft_type', 'aircraft', 'actype', 'equipment', 'plane_type', 'ac_type', 'type'],
  'Origin': ['origin', 'from', 'departure_airport', 'dep', 'orig', 'source', 'dep_airport'],
  'Destination': ['destination', 'to', 'arrival_airport', 'arr', 'dest', 'arr_airport'],
  'ScheduledTime': ['scheduled_time', 'time', 'scheduled', 'sched_time', 'sched', 'std', 'sta', 'datetime'],
  'Terminal': ['terminal', 'term', 'terminal_id', 'term_id'],
  'IsArrival': ['is_arrival', 'arrival', 'is_arr', 'arr_flag', 'is_departure', 'departure', 'arr_dep']
};

/**
 * Get required fields for a specific entity type
 * @param {string} entityType - Type of entity (flights, stands, airlines, maintenance)
 * @returns {Array} - Array of required field names
 */
function getMappingFields(entityType) {
  if (!REQUIRED_FIELDS[entityType]) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  
  return [...REQUIRED_FIELDS[entityType]];
}

/**
 * Generate mapping suggestions based on field names
 * @param {Array} sourceFields - Array of source field names
 * @param {Array} targetFields - Array of target field names
 * @returns {Object} - Suggested mappings
 */
function generateMappingSuggestions(sourceFields, targetFields) {
  const suggestions = {};
  
  targetFields.forEach(targetField => {
    // Try exact match first
    const exactMatch = sourceFields.find(field => 
      field.toLowerCase() === targetField.toLowerCase()
    );
    
    if (exactMatch) {
      suggestions[targetField] = exactMatch;
      return;
    }
    
    // Try variations
    const variations = FIELD_VARIATIONS[targetField] || [];
    for (const variant of variations) {
      const match = sourceFields.find(field => 
        field.toLowerCase() === variant.toLowerCase()
      );
      
      if (match) {
        suggestions[targetField] = match;
        return;
      }
    }
    
    // Try fuzzy matching as last resort
    const fuzzyMatches = sourceFields
      .filter(field => {
        const targetLower = targetField.toLowerCase();
        const fieldLower = field.toLowerCase();
        
        // Check if field contains the target field name or vice versa
        return fieldLower.includes(targetLower) || 
               targetLower.includes(fieldLower);
      })
      .sort((a, b) => {
        // Prioritize shorter matches as they're likely more specific
        return a.length - b.length;
      });
    
    if (fuzzyMatches.length > 0) {
      suggestions[targetField] = fuzzyMatches[0];
    }
  });
  
  return suggestions;
}

/**
 * Apply mapping to transform source data
 * @param {Array} rawData - Array of source data records
 * @param {Object} mappingProfile - Mapping profile object
 * @returns {Array} - Transformed data
 */
function applyMapping(rawData, mappingProfile) {
  if (!Array.isArray(rawData)) {
    throw new Error('Raw data must be an array');
  }
  
  if (!mappingProfile || !mappingProfile.mappings) {
    throw new Error('Invalid mapping profile');
  }
  
  const { mappings, transformations = {} } = mappingProfile;
  
  return rawData.map(record => {
    const transformedRecord = {};
    
    // Apply column mappings
    Object.entries(mappings).forEach(([targetField, sourceField]) => {
      if (sourceField && record[sourceField] !== undefined) {
        transformedRecord[targetField] = record[sourceField];
      }
    });
    
    // Apply transformations
    Object.entries(transformations).forEach(([field, transformation]) => {
      if (transformedRecord[field] !== undefined) {
        transformedRecord[field] = applyTransformation(
          transformedRecord[field], 
          transformation
        );
      }
    });
    
    return transformedRecord;
  });
}

/**
 * Apply a transformation to a field value
 * @param {any} value - Field value
 * @param {string} transformation - Transformation type
 * @returns {any} - Transformed value
 */
function applyTransformation(value, transformation) {
  switch (transformation) {
    case 'stringToBoolean':
      if (typeof value === 'string') {
        const lowered = value.toLowerCase().trim();
        return lowered === 'true' || lowered === 'yes' || lowered === '1' || lowered === 'y';
      }
      return Boolean(value);
      
    case 'convertDateTime':
      // Handle common date/time formats
      if (typeof value === 'string') {
        // If it's just a time (HH:MM), assume current date
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
          const [hours, minutes] = value.split(':');
          const date = new Date();
          date.setHours(parseInt(hours, 10));
          date.setMinutes(parseInt(minutes, 10));
          date.setSeconds(0);
          return date.toISOString();
        }
        
        // Try parsing as ISO date
        try {
          return new Date(value).toISOString();
        } catch (e) {
          return value;
        }
      }
      return value;
      
    default:
      return value;
  }
}

/**
 * Generate a mapping profile
 * @param {Array} sourceFields - Source field names
 * @param {Array} targetFields - Target field names
 * @param {Object} mappings - Field mappings
 * @returns {Object} - Mapping profile
 */
function generateMappingProfile(sourceFields, targetFields, mappings) {
  return {
    profileName: 'custom-mapping',
    entityType: 'flights', // Default to flights
    lastUsed: new Date().toISOString(),
    mappings,
    transformations: {
      ScheduledTime: 'convertDateTime',
      IsArrival: 'stringToBoolean'
    }
  };
}

/**
 * Get default mapping profiles directory
 * @returns {string} - Path to mappings directory
 */
function getMappingDirectory() {
  // Create mappings directory in user's home directory
  const homeDir = os.homedir();
  const mappingDir = path.join(homeDir, '.validator-tool', 'mappings');
  
  if (!fs.existsSync(mappingDir)) {
    fs.mkdirSync(mappingDir, { recursive: true });
  }
  
  return mappingDir;
}

/**
 * Save mapping profile for reuse
 * @param {string} profileName - Name of the profile
 * @param {Object} mappingProfile - Mapping profile object
 * @returns {string} - Path to saved profile
 */
function saveMappingProfile(profileName, mappingProfile) {
  if (!profileName) {
    throw new Error('Profile name is required');
  }
  
  const mappingDir = getMappingDirectory();
  const filePath = path.join(mappingDir, `${profileName}.json`);
  
  // Update metadata
  const profile = {
    ...mappingProfile,
    profileName,
    lastUsed: new Date().toISOString()
  };
  
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  return filePath;
}

/**
 * Load a saved mapping profile
 * @param {string} profileName - Name of the profile
 * @returns {Object} - Mapping profile object
 */
function loadMappingProfile(profileName) {
  const mappingDir = getMappingDirectory();
  const filePath = path.join(mappingDir, `${profileName}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Mapping profile not found: ${profileName}`);
  }
  
  try {
    const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return profile;
  } catch (error) {
    throw new Error(`Failed to load mapping profile: ${error.message}`);
  }
}

/**
 * List available mapping profiles
 * @returns {Array} - List of profile names and metadata
 */
function listMappingProfiles() {
  const mappingDir = getMappingDirectory();
  
  if (!fs.existsSync(mappingDir)) {
    return [];
  }
  
  const files = fs.readdirSync(mappingDir);
  const profiles = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(mappingDir, file);
        const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        profiles.push({
          name: profile.profileName,
          entityType: profile.entityType,
          lastUsed: profile.lastUsed,
          path: filePath
        });
      } catch (error) {
        console.warn(`Failed to load profile ${file}: ${error.message}`);
      }
    }
  }
  
  return profiles;
}

module.exports = {
  getMappingFields,
  generateMappingSuggestions,
  applyMapping,
  generateMappingProfile,
  saveMappingProfile,
  loadMappingProfile,
  listMappingProfiles
}; 