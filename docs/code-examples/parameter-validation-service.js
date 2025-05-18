/**
 * ParameterValidationService.js
 * 
 * Service for validating and normalizing parameters in scenarios
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
        errors
      };
    } catch (error) {
      logger.error(`Schema validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Schema validation error: ${error.message}`]
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
        }
        
        // Normalize arrays
        if (propSchema.type === 'array' && !Array.isArray(normalized[propName])) {
          if (typeof normalized[propName] === 'string') {
            // Convert comma-separated string to array
            normalized[propName] = normalized[propName].split(',').map(item => item.trim());
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
          completed[propName] = this.inferParameter(propName, propSchema, completed, context);
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
   * @returns {any} - Inferred value or undefined
   */
  inferParameter(propName, propSchema, currentParams, context) {
    // Property-specific inference rules
    switch (propName) {
      case 'standType':
        return 'any'; // Default to any stand type
        
      case 'startDate':
        return new Date().toISOString().split('T')[0]; // Today
        
      case 'endDate':
        if (currentParams.startDate) {
          // Default end date is start date + 7 days
          const start = new Date(currentParams.startDate);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return end.toISOString().split('T')[0];
        }
        return undefined;
        
      case 'peakHourStart':
        return '06:00'; // Default peak hour start
        
      case 'peakHourEnd':
        return '10:00'; // Default peak hour end
        
      case 'utilization':
        return 0.85; // Default utilization factor
        
      case 'impact':
        return 'full'; // Default to full impact for maintenance
        
      case 'scheduleType':
        return 'current'; // Default to current schedule
        
      case 'timeFrame':
        return 'week'; // Default to weekly timeframe
        
      default:
        return undefined;
    }
  }
}

module.exports = ParameterValidationService;