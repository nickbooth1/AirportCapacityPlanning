/**
 * ParameterValidationService.js
 * 
 * Service for validating and normalizing parameters in scenarios for the airport capacity planner
 */

const logger = require('../../utils/logger');

class ParameterValidationService {
  constructor() {
    // Initialize validation schemas
    this.schemas = {
      // Default schema for capacity scenarios
      capacityScenario: {
        type: 'object',
        required: ['terminal'],
        properties: {
          terminal: { type: 'string' },
          standCount: { type: 'integer', minimum: 1 },
          standType: { type: 'string', enum: ['narrow-body', 'wide-body', 'any'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          peakHourStart: { type: 'string', format: 'time' },
          peakHourEnd: { type: 'string', format: 'time' },
          utilization: { type: 'number', minimum: 0, maximum: 1 }
        },
        dependencies: {
          endDate: ['startDate'],
          peakHourEnd: ['peakHourStart']
        }
      },
      
      // Schema for maintenance scenarios
      maintenanceScenario: {
        type: 'object',
        required: ['standIds', 'startDate', 'endDate'],
        properties: {
          standIds: { 
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          maintenanceType: { type: 'string' },
          impact: { type: 'string', enum: ['full', 'partial'] },
          description: { type: 'string' }
        }
      },
      
      // Schema for flight schedule scenarios
      flightScheduleScenario: {
        type: 'object',
        required: ['scheduleType'],
        properties: {
          scheduleType: { 
            type: 'string', 
            enum: ['current', 'projected', 'modified'] 
          },
          airlineFilter: { 
            type: 'array',
            items: { type: 'string' } 
          },
          growthFactor: { 
            type: 'number',
            minimum: 0
          },
          timeFrame: { 
            type: 'string',
            enum: ['day', 'week', 'month', 'year']
          },
          specificDate: { type: 'string', format: 'date' }
        },
        dependencies: {
          growthFactor: ['scheduleType'],
          specificDate: ['timeFrame']
        }
      },

      // Schema for stand allocation scenarios
      standAllocationScenario: {
        type: 'object',
        required: ['flightIds'],
        properties: {
          flightIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          optimizationCriteria: {
            type: 'string',
            enum: ['minimize-walking-distance', 'maximize-utilization', 'airline-preference', 'balanced']
          },
          considerConnections: { type: 'boolean' },
          respectAirlinePreferences: { type: 'boolean' },
          avoidAdjacentConflicts: { type: 'boolean' },
          allocationType: {
            type: 'string',
            enum: ['strict', 'flexible', 'optimal']
          }
        }
      },

      // Schema for capacity forecasting scenarios
      capacityForecastScenario: {
        type: 'object',
        required: ['forecastPeriod'],
        properties: {
          forecastPeriod: {
            type: 'string',
            enum: ['short-term', 'medium-term', 'long-term']
          },
          growthAssumptions: {
            type: 'object',
            properties: {
              passengerGrowth: { type: 'number', minimum: 0 },
              aircraftSizeGrowth: { type: 'number' },
              fleetMixChange: { type: 'boolean' }
            }
          },
          includeInfrastructureChanges: { type: 'boolean' },
          standImprovements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                standId: { type: 'string' },
                upgradeType: { type: 'string' },
                completionDate: { type: 'string', format: 'date' }
              },
              required: ['standId', 'upgradeType']
            }
          }
        }
      },

      // Schema for adjacency impact analysis scenarios
      adjacencyImpactScenario: {
        type: 'object',
        required: ['analysisType'],
        properties: {
          analysisType: {
            type: 'string',
            enum: ['current-rules', 'modified-rules', 'rule-removal', 'rule-addition']
          },
          standPairs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                standId1: { type: 'string' },
                standId2: { type: 'string' }
              },
              required: ['standId1', 'standId2']
            }
          },
          ruleModifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ruleId: { type: 'string' },
                action: { type: 'string', enum: ['add', 'modify', 'remove'] },
                newConfiguration: { type: 'object' }
              },
              required: ['ruleId', 'action']
            }
          },
          timeFrame: {
            type: 'string',
            enum: ['day', 'week', 'month']
          }
        }
      }
    };
  }
  
  /**
   * Register a new validation schema
   * @param {string} schemaName - Name of the schema
   * @param {Object} schema - JSON Schema definition
   * @returns {boolean} - Success status
   */
  registerSchema(schemaName, schema) {
    if (this.schemas[schemaName]) {
      logger.warn(`Schema ${schemaName} already exists and will be overwritten`);
    }
    
    this.schemas[schemaName] = schema;
    return true;
  }
  
  /**
   * Validate parameters against a known schema
   * @param {Object} parameters - Parameters to validate
   * @param {string} schemaName - Name of the schema to use
   * @returns {Object} - Validation result {isValid, errors, parameters}
   */
  async validateParameters(parameters, schemaName) {
    try {
      // Get the schema
      const schema = this.schemas[schemaName];
      if (!schema) {
        return {
          isValid: false,
          errors: [`Schema ${schemaName} not found`],
          parameters
        };
      }
      
      // Validate against schema
      const validationResult = await this.validateAgainstSchema(parameters, schema);
      
      // If valid, normalize values
      if (validationResult.isValid) {
        const normalizedParams = await this.normalizeParameters(parameters, schema);
        return {
          isValid: true,
          parameters: normalizedParams
        };
      }
      
      return validationResult;
    } catch (error) {
      logger.error(`Parameter validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        parameters
      };
    }
  }
  
  /**
   * Validate data against a JSON schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - JSON Schema
   * @returns {Object} - Validation result {isValid, errors}
   */
  async validateAgainstSchema(data, schema) {
    try {
      const errors = [];
      
      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (data[requiredProp] === undefined) {
            errors.push(`Missing required property: ${requiredProp}`);
          }
        }
      }
      
      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (data[propName] !== undefined) {
            const propErrors = this.validateProperty(data[propName], propSchema, propName);
            errors.push(...propErrors);
          }
        }
      }
      
      // Check dependencies
      if (schema.dependencies) {
        for (const [prop, deps] of Object.entries(schema.dependencies)) {
          if (data[prop] !== undefined) {
            for (const dep of deps) {
              if (data[dep] === undefined) {
                errors.push(`Property ${prop} depends on ${dep}, which is missing`);
              }
            }
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        parameters: data
      };
    } catch (error) {
      logger.error(`Schema validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Schema validation error: ${error.message}`],
        parameters: data
      };
    }
  }
  
  /**
   * Validate a single property against its schema
   * @param {any} value - Property value
   * @param {Object} propSchema - Property schema
   * @param {string} propName - Property name
   * @returns {Array} - Validation errors
   */
  validateProperty(value, propSchema, propName) {
    const errors = [];
    
    // Type validation
    if (propSchema.type) {
      const typeValid = this.validateType(value, propSchema.type);
      if (!typeValid) {
        errors.push(`Property ${propName} must be of type ${propSchema.type}`);
        return errors; // Return early as other validations may not apply
      }
    }
    
    // Number/integer validations
    if (propSchema.type === 'number' || propSchema.type === 'integer') {
      if (propSchema.minimum !== undefined && value < propSchema.minimum) {
        errors.push(`Property ${propName} must be >= ${propSchema.minimum}`);
      }
      if (propSchema.maximum !== undefined && value > propSchema.maximum) {
        errors.push(`Property ${propName} must be <= ${propSchema.maximum}`);
      }
    }
    
    // String validations
    if (propSchema.type === 'string') {
      if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
        errors.push(`Property ${propName} must have length >= ${propSchema.minLength}`);
      }
      if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
        errors.push(`Property ${propName} must have length <= ${propSchema.maxLength}`);
      }
      if (propSchema.format) {
        const formatValid = this.validateFormat(value, propSchema.format);
        if (!formatValid) {
          errors.push(`Property ${propName} must be in format ${propSchema.format}`);
        }
      }
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push(`Property ${propName} must be one of: ${propSchema.enum.join(', ')}`);
      }
    }
    
    // Array validations
    if (propSchema.type === 'array') {
      if (propSchema.minItems !== undefined && value.length < propSchema.minItems) {
        errors.push(`Property ${propName} must have >= ${propSchema.minItems} items`);
      }
      if (propSchema.maxItems !== undefined && value.length > propSchema.maxItems) {
        errors.push(`Property ${propName} must have <= ${propSchema.maxItems} items`);
      }
      if (propSchema.items && value.length > 0) {
        for (let i = 0; i < value.length; i++) {
          const itemErrors = this.validateProperty(value[i], propSchema.items, `${propName}[${i}]`);
          errors.push(...itemErrors);
        }
      }
    }
    
    // Object validations
    if (propSchema.type === 'object' && propSchema.properties) {
      for (const [subPropName, subPropSchema] of Object.entries(propSchema.properties)) {
        if (value[subPropName] !== undefined) {
          const subErrors = this.validateProperty(
            value[subPropName], 
            subPropSchema, 
            `${propName}.${subPropName}`
          );
          errors.push(...subErrors);
        } else if (propSchema.required && propSchema.required.includes(subPropName)) {
          errors.push(`Property ${propName}.${subPropName} is required`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Validate a value against a type
   * @param {any} value - Value to validate
   * @param {string} type - Expected type
   * @returns {boolean} - Is the type valid
   */
  validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return false;
    }
  }
  
  /**
   * Validate a string against a format
   * @param {string} value - String to validate
   * @param {string} format - Format to check
   * @returns {boolean} - Is the format valid
   */
  validateFormat(value, format) {
    switch (format) {
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
      case 'date-time':
        return !isNaN(Date.parse(value));
      case 'time':
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
      case 'email':
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch (e) {
          return false;
        }
      case 'iso-date':
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
      case 'iso-date-time':
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.test(value) && !isNaN(Date.parse(value));
      case 'airport-code':
        return /^[A-Z]{3}$/.test(value);
      case 'iata-code':
        return /^[A-Z0-9]{2}$/.test(value);
      default:
        return true; // Unknown format, consider valid
    }
  }
  
  /**
   * Normalize parameters based on schema
   * @param {Object} parameters - Parameters to normalize
   * @param {Object} schema - Schema to use for normalization
   * @returns {Object} - Normalized parameters
   */
  async normalizeParameters(parameters, schema) {
    const normalized = { ...parameters };
    
    if (!schema.properties) return normalized;
    
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (normalized[propName] !== undefined) {
        // Normalize based on type
        if (propSchema.type === 'integer' && typeof normalized[propName] === 'string') {
          const parsed = parseInt(normalized[propName], 10);
          if (!isNaN(parsed)) {
            normalized[propName] = parsed;
          }
        } else if (propSchema.type === 'number' && typeof normalized[propName] === 'string') {
          const parsed = parseFloat(normalized[propName]);
          if (!isNaN(parsed)) {
            normalized[propName] = parsed;
          }
        } else if (propSchema.type === 'boolean' && typeof normalized[propName] === 'string') {
          const value = normalized[propName].toLowerCase();
          if (value === 'true' || value === 'yes' || value === '1') {
            normalized[propName] = true;
          } else if (value === 'false' || value === 'no' || value === '0') {
            normalized[propName] = false;
          }
        } else if (propSchema.type === 'string' && propSchema.format === 'date') {
          // Normalize date strings to ISO format
          if (typeof normalized[propName] === 'string') {
            try {
              const date = new Date(normalized[propName]);
              if (!isNaN(date)) {
                normalized[propName] = date.toISOString().split('T')[0];
              }
            } catch (e) {
              // Keep original if parsing fails
            }
          }
        } else if (propSchema.type === 'string' && propSchema.format === 'date-time') {
          // Normalize date-time strings to ISO format
          if (typeof normalized[propName] === 'string') {
            try {
              const date = new Date(normalized[propName]);
              if (!isNaN(date)) {
                normalized[propName] = date.toISOString();
              }
            } catch (e) {
              // Keep original if parsing fails
            }
          }
        }
        
        // Normalize arrays
        if (propSchema.type === 'array' && !Array.isArray(normalized[propName])) {
          if (typeof normalized[propName] === 'string') {
            // Convert comma-separated string to array
            normalized[propName] = normalized[propName].split(',').map(item => item.trim()).filter(Boolean);
          } else {
            // Wrap non-array in array
            normalized[propName] = [normalized[propName]];
          }
        }
        
        // Apply coercion for enum values
        if (propSchema.enum && typeof normalized[propName] === 'string') {
          const lowerValue = normalized[propName].toLowerCase();
          const match = propSchema.enum.find(
            enumValue => enumValue.toLowerCase() === lowerValue
          );
          if (match) {
            normalized[propName] = match; // Use canonical case from enum
          }
        }
      }
    }
    
    return normalized;
  }
  
  /**
   * Complete missing parameters with default values or inferred values
   * @param {Object} parameters - Partial parameters
   * @param {string} schemaName - Schema to use
   * @param {Object} context - Context for inference
   * @returns {Object} - Completed parameters
   */
  async completeParameters(parameters, schemaName, context = {}) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      logger.warn(`Schema ${schemaName} not found for parameter completion`);
      return parameters;
    }
    
    const completed = { ...parameters };
    
    if (!schema.properties) return completed;
    
    // Fill in default values for missing properties
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (completed[propName] === undefined) {
        // Use default value from schema if available
        if (propSchema.default !== undefined) {
          completed[propName] = propSchema.default;
        } 
        // Infer from context if possible
        else if (context[propName] !== undefined) {
          completed[propName] = context[propName];
        }
        // Apply special inference rules
        else {
          completed[propName] = this.inferParameter(propName, propSchema, completed, context, schemaName);
        }
      }
    }
    
    return completed;
  }
  
  /**
   * Infer a parameter value based on rules
   * @param {string} propName - Property name
   * @param {Object} propSchema - Property schema
   * @param {Object} currentParams - Current parameter values
   * @param {Object} context - Additional context
   * @param {string} schemaName - The schema being used
   * @returns {any} - Inferred value or undefined
   */
  inferParameter(propName, propSchema, currentParams, context, schemaName) {
    // Common parameters across schemas
    if (propName === 'startDate') {
      return new Date().toISOString().split('T')[0]; // Today
    }
    
    if (propName === 'endDate' && currentParams.startDate) {
      // Default end date based on scenario type
      const start = new Date(currentParams.startDate);
      const end = new Date(start);
      
      // Different time periods for different scenario types
      if (schemaName === 'maintenanceScenario') {
        end.setDate(end.getDate() + 1); // 1 day for maintenance
      } else if (schemaName === 'capacityForecastScenario') {
        end.setFullYear(end.getFullYear() + 1); // 1 year for forecasts
      } else {
        end.setDate(end.getDate() + 7); // 7 days default
      }
      
      // Return appropriate format based on schema
      if (propSchema.format === 'date-time') {
        return end.toISOString();
      }
      return end.toISOString().split('T')[0];
    }

    // Schema-specific inferences
    switch (schemaName) {
      case 'capacityScenario':
        switch (propName) {
          case 'standType':
            return 'any'; // Default to any stand type
          case 'peakHourStart':
            return '06:00'; // Default peak hour start
          case 'peakHourEnd':
            return '10:00'; // Default peak hour end
          case 'utilization':
            return 0.85; // Default utilization factor
        }
        break;

      case 'maintenanceScenario':
        switch (propName) {
          case 'impact':
            return 'full'; // Default to full impact
          case 'maintenanceType':
            return 'scheduled'; // Default to scheduled maintenance
        }
        break;
        
      case 'flightScheduleScenario':
        switch (propName) {
          case 'scheduleType':
            return 'current'; // Default to current schedule
          case 'timeFrame':
            return 'week'; // Default to weekly timeframe
          case 'growthFactor':
            if (currentParams.scheduleType === 'projected') {
              return 1.05; // Default 5% growth
            }
            return undefined;
        }
        break;

      case 'standAllocationScenario':
        switch (propName) {
          case 'optimizationCriteria':
            return 'balanced'; // Default to balanced optimization
          case 'considerConnections':
            return true; // Default to considering connections
          case 'respectAirlinePreferences':
            return true; // Default to respecting airline preferences
          case 'avoidAdjacentConflicts':
            return true; // Default to avoiding adjacent conflicts
          case 'allocationType':
            return 'optimal'; // Default to optimal allocation
        }
        break;

      case 'capacityForecastScenario':
        switch (propName) {
          case 'forecastPeriod':
            return 'medium-term'; // Default to medium-term
          case 'includeInfrastructureChanges':
            return true; // Default to including planned changes
          case 'growthAssumptions':
            return {
              passengerGrowth: 0.03, // 3% annual growth
              aircraftSizeGrowth: 0.01, // 1% increase in aircraft size
              fleetMixChange: true // Consider fleet mix changes
            };
        }
        break;

      case 'adjacencyImpactScenario':
        switch (propName) {
          case 'analysisType':
            return 'current-rules'; // Default to analyzing current rules
          case 'timeFrame':
            return 'week'; // Default to weekly analysis
        }
        break;
    }
    
    // Default case
    return undefined;
  }
}

module.exports = ParameterValidationService;