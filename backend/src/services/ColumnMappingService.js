const db = require('../db');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const levenshtein = require('fast-levenshtein');

/**
 * Required mapping fields with their descriptions
 */
const REQUIRED_FIELDS = [
  {
    field: "AirlineIATA",
    description: "2-character IATA code for the airline",
    required: true,
    example: "BA"
  },
  {
    field: "FlightNumber",
    description: "Flight number without airline code",
    required: true,
    example: "123"
  },
  {
    field: "ScheduledTime",
    description: "Scheduled arrival or departure time",
    required: true,
    example: "2023-06-01T08:30:00Z"
  },
  {
    field: "EstimatedTime",
    description: "Estimated arrival or departure time",
    required: false,
    example: "2023-06-01T08:45:00Z"
  },
  {
    field: "FlightNature",
    description: "A for arrival, D for departure",
    required: true,
    example: "A"
  },
  {
    field: "DestinationIATA",
    description: "3-character IATA code for origin/destination airport",
    required: true,
    example: "JFK"
  },
  {
    field: "AircraftTypeIATA",
    description: "IATA code for aircraft type",
    required: true,
    example: "B738"
  },
  {
    field: "Terminal",
    description: "Terminal number or letter",
    required: false,
    example: "T5"
  },
  {
    field: "SeatCapacity",
    description: "Number of passenger seats",
    required: false,
    example: "180"
  }
];

/**
 * Available transformation functions
 */
const TRANSFORMATIONS = {
  // Convert boolean to A/D format
  booleanToArrDep: (value) => {
    if (value === true || value === 'true' || value === 1 || value === '1' || value === 'yes') {
      return 'A';
    } else if (value === false || value === 'false' || value === 0 || value === '0' || value === 'no') {
      return 'D';
    }
    return value;
  },
  
  // Convert A/D to boolean
  arrDepToBoolean: (value) => {
    if (typeof value === 'string') {
      if (value.toUpperCase() === 'A' || value.toUpperCase() === 'ARR' || value.toUpperCase() === 'ARRIVAL') {
        return true;
      } else if (value.toUpperCase() === 'D' || value.toUpperCase() === 'DEP' || value.toUpperCase() === 'DEPARTURE') {
        return false;
      }
    }
    return value;
  },
  
  // Format date/time as ISO 8601
  isoDatetime: (value) => {
    if (!value) return value;
    
    try {
      // Handle DD/MM/YYYY HH:MM format (like 12/05/2025 08:30)
      if (typeof value === 'string' && value.includes('/')) {
        const [datePart, timePart] = value.split(' ');
        if (datePart && timePart) {
          const [day, month, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          
          // Create a proper ISO date string
          const dateObj = new Date(
            parseInt(year), 
            parseInt(month) - 1, // JS months are 0-indexed
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
          );
          
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString();
          }
          console.log(`Parsed date from ${value} to ${dateObj.toISOString()}`);
        }
      }
      
      // Try to parse as date if it's not already ISO format
      if (typeof value === 'string' && !value.includes('T')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      console.warn('Failed to parse date:', value);
      return value;
    } catch (error) {
      console.error('Error formatting date:', error, 'for value:', value);
      return value;
    }
  },
  
  // Format as DD/MM/YYYY HH:MM
  ddmmyyyyHHMM: (value) => {
    if (!value) return value;
    
    try {
      const date = new Date(value);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return value;
    }
  },
  
  // Convert to uppercase
  uppercase: (value) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  },
  
  // Convert to lowercase
  lowercase: (value) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  },
  
  // Format numeric values
  numberFormat: (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    return parseInt(value, 10);
  },
  
  // Provide default value for null/empty fields
  nullDefault: (value, defaultValue = '') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value;
  }
};

/**
 * Service for column mapping operations
 */
class ColumnMappingService {
  /**
   * Detect column names from a CSV file
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<string[]>} - Array of column names
   */
  async detectColumns(filePath) {
    try {
      // Read the first few lines of the file to detect headers
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        skip_records_with_error: true,
        to: 1 // Parse only the header row and first data row
      });
      
      if (records.length === 0) {
        throw new Error('File is empty or has no valid header row');
      }
      
      // Extract column names from the first record
      return Object.keys(records[0]);
    } catch (error) {
      console.error('Error detecting columns:', error);
      throw new Error(`Failed to detect columns: ${error.message}`);
    }
  }
  
  /**
   * Detect column names from uploaded file data
   * @param {Buffer|string} fileData - File content as buffer or string
   * @returns {Promise<string[]>} - Array of column names
   */
  async detectColumnsFromData(fileData) {
    try {
      // Parse the CSV data
      const records = parse(fileData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        skip_records_with_error: true,
        to: 1 // Parse only the header row and first data row
      });
      
      if (records.length === 0) {
        throw new Error('File is empty or has no valid header row');
      }
      
      // Extract column names from the first record
      return Object.keys(records[0]);
    } catch (error) {
      console.error('Error detecting columns from data:', error);
      throw new Error(`Failed to detect columns: ${error.message}`);
    }
  }
  
  /**
   * Get mapping fields with their descriptions
   * @returns {Object[]} - Array of field objects with descriptions
   */
  getMappingFields() {
    return REQUIRED_FIELDS;
  }
  
  /**
   * Generate mapping suggestions based on source columns
   * @param {string[]} sourceColumns - Source column names
   * @returns {Object} - Suggestions mapping source to target fields
   */
  suggestMappings(sourceColumns) {
    const suggestions = {};
    const targetFields = this.getMappingFields().map(field => field.field);
    
    // For each target field, find the best match from source columns
    targetFields.forEach(targetField => {
      let bestMatch = null;
      let lowestDistance = Infinity;
      
      sourceColumns.forEach(sourceColumn => {
        // Skip already mapped columns
        if (Object.values(suggestions).includes(sourceColumn)) {
          return;
        }
        
        // Calculate similarity score (lower is better)
        // Try both direct comparison and normalized comparison (lowercase)
        const directDistance = levenshtein.get(targetField, sourceColumn);
        const normalizedDistance = levenshtein.get(
          targetField.toLowerCase(),
          sourceColumn.toLowerCase()
        );
        
        // Use the better of the two distances
        const distance = Math.min(directDistance, normalizedDistance);
        
        // Check for exact matches or close matches
        if (
          targetField.toLowerCase() === sourceColumn.toLowerCase() ||
          targetField.toLowerCase().includes(sourceColumn.toLowerCase()) ||
          sourceColumn.toLowerCase().includes(targetField.toLowerCase())
        ) {
          suggestions[targetField] = sourceColumn;
          return; // Exit the source column loop for this target field
        }
        
        // Track the best match based on edit distance
        if (distance < lowestDistance) {
          lowestDistance = distance;
          bestMatch = sourceColumn;
        }
      });
      
      // If the best match is reasonably close, suggest it
      if (bestMatch && lowestDistance <= 5) {
        suggestions[targetField] = bestMatch;
      } else {
        suggestions[targetField] = null;
      }
    });
    
    return suggestions;
  }
  
  /**
   * Validate a mapping profile for completeness
   * @param {Object} mappingProfile - Mapping profile
   * @returns {Object} - Validation result with errors
   */
  validateMapping(mappingProfile) {
    const result = {
      isValid: true,
      errors: []
    };
    
    // Get required fields
    const requiredFields = this.getMappingFields()
      .filter(field => field.required)
      .map(field => field.field);
    
    // Check if all required fields are mapped
    requiredFields.forEach(field => {
      if (
        !mappingProfile.mappings[field] ||
        mappingProfile.mappings[field] === null ||
        mappingProfile.mappings[field] === ''
      ) {
        result.isValid = false;
        result.errors.push({
          field,
          message: `Required field "${field}" is not mapped`
        });
      }
    });
    
    // Validate transformation functions if present
    if (mappingProfile.transformations) {
      Object.entries(mappingProfile.transformations).forEach(([field, transformation]) => {
        if (!TRANSFORMATIONS[transformation]) {
          result.errors.push({
            field,
            message: `Unknown transformation function "${transformation}"`
          });
        }
      });
    }
    
    return result;
  }
  
  /**
   * Apply a transformation function to a field value
   * @param {any} value - Field value
   * @param {string} transformType - Transformation function name
   * @returns {any} - Transformed value
   */
  transformField(value, transformType) {
    if (!transformType || !TRANSFORMATIONS[transformType]) {
      return value;
    }
    
    return TRANSFORMATIONS[transformType](value);
  }
  
  /**
   * Apply mapping to transform data
   * @param {Object[]} data - Source data
   * @param {Object} mappingProfile - Mapping profile
   * @returns {Object[]} - Transformed data
   */
  applyMapping(data, mappingProfile) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    if (!mappingProfile || !mappingProfile.mappings) {
      throw new Error('Invalid mapping profile');
    }
    
    // Transform each record
    return data.map(record => {
      const transformedRecord = {};
      
      // Apply mappings
      Object.entries(mappingProfile.mappings).forEach(([targetField, sourceField]) => {
        if (sourceField && sourceField in record) {
          let value = record[sourceField];
          
          // Apply transformation if specified
          if (
            mappingProfile.transformations && 
            mappingProfile.transformations[targetField]
          ) {
            value = this.transformField(
              value, 
              mappingProfile.transformations[targetField]
            );
          }
          
          transformedRecord[targetField] = value;
        } else {
          transformedRecord[targetField] = null;
        }
      });
      
      return transformedRecord;
    });
  }
  
  /**
   * Create a new mapping profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<number>} - ID of the created profile
   */
  async createMappingProfile(profileData) {
    try {
      const [id] = await db('column_mapping_profiles').insert({
        name: profileData.name,
        description: profileData.description || null,
        user_id: profileData.userId || null,
        mappings: JSON.stringify(profileData.mappings),
        transformations: profileData.transformations ? JSON.stringify(profileData.transformations) : null,
        is_default: profileData.isDefault || false,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return id;
    } catch (error) {
      console.error('Error creating mapping profile:', error);
      throw new Error(`Failed to create mapping profile: ${error.message}`);
    }
  }
  
  /**
   * Get a mapping profile by ID
   * @param {number} id - Profile ID
   * @returns {Promise<Object|null>} - Mapping profile
   */
  async getMappingProfile(id) {
    try {
      const profile = await db('column_mapping_profiles')
        .where({ id })
        .first();
      
      if (!profile) {
        return null;
      }
      
      return {
        ...profile,
        mappings: JSON.parse(profile.mappings),
        transformations: profile.transformations ? JSON.parse(profile.transformations) : null
      };
    } catch (error) {
      console.error('Error getting mapping profile:', error);
      throw new Error(`Failed to get mapping profile: ${error.message}`);
    }
  }
  
  /**
   * Update a mapping profile
   * @param {number} id - Profile ID
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<boolean>} - Success indicator
   */
  async updateMappingProfile(id, profileData) {
    try {
      const result = await db('column_mapping_profiles')
        .where({ id })
        .update({
          name: profileData.name,
          description: profileData.description || null,
          mappings: JSON.stringify(profileData.mappings),
          transformations: profileData.transformations ? JSON.stringify(profileData.transformations) : null,
          is_default: profileData.isDefault || false,
          updated_at: new Date()
        });
      
      return result > 0;
    } catch (error) {
      console.error('Error updating mapping profile:', error);
      throw new Error(`Failed to update mapping profile: ${error.message}`);
    }
  }
  
  /**
   * Delete a mapping profile
   * @param {number} id - Profile ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteMappingProfile(id) {
    try {
      const result = await db('column_mapping_profiles')
        .where({ id })
        .delete();
      
      return result > 0;
    } catch (error) {
      console.error('Error deleting mapping profile:', error);
      throw new Error(`Failed to delete mapping profile: ${error.message}`);
    }
  }
  
  /**
   * List all mapping profiles
   * @param {number|null} userId - Optional user ID filter
   * @returns {Promise<Object[]>} - List of mapping profiles
   */
  async listMappingProfiles(userId = null) {
    try {
      let query = db('column_mapping_profiles');
      
      if (userId) {
        query = query.where('user_id', userId).orWhere('is_default', true);
      }
      
      const profiles = await query.orderBy('is_default', 'desc').orderBy('updated_at', 'desc');
      
      return profiles.map(profile => {
        try {
          // Ensure mappings and transformations are properly parsed
          let mappings = profile.mappings;
          let transformations = profile.transformations;
          
          // Parse JSON strings
          if (typeof mappings === 'string') {
            mappings = JSON.parse(mappings);
          }
          
          if (transformations && typeof transformations === 'string') {
            transformations = JSON.parse(transformations);
          }
          
          return {
            ...profile,
            mappings,
            transformations
          };
        } catch (error) {
          console.error(`Error parsing profile ${profile.id}: ${error.message}`);
          // Return with original values if parsing fails
          return {
            ...profile,
            mappings: {},
            transformations: {}
          };
        }
      });
    } catch (error) {
      console.error('Error listing mapping profiles:', error);
      throw new Error(`Failed to list mapping profiles: ${error.message}`);
    }
  }
  
  /**
   * Update the last used timestamp for a profile
   * @param {number} id - Profile ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async updateLastUsed(id) {
    try {
      const result = await db('column_mapping_profiles')
        .where({ id })
        .update({
          last_used: new Date(),
          updated_at: new Date()
        });
      
      return result > 0;
    } catch (error) {
      console.error('Error updating last used timestamp:', error);
      throw new Error(`Failed to update last used timestamp: ${error.message}`);
    }
  }
}

module.exports = ColumnMappingService; 