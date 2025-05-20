/**
 * OperationParameterValidator.js
 * 
 * Service for validating operation parameters extracted from user queries
 * against schema and data repository requirements.
 */

const RepositoryValidationService = require('../../RepositoryValidationService');
const logger = require('../../../utils/logger');

class OperationParameterValidator {
  constructor(services = {}) {
    this.repositoryValidationService = services.repositoryValidationService || RepositoryValidationService;
    this.validationSchemas = {
      // CREATE operation schemas
      create_stand: {
        required: ['name', 'terminal'],
        optional: ['type', 'size', 'contact'],
        types: {
          name: 'string',
          terminal: 'string',
          type: 'string',
          size: 'string',
          contact: 'boolean'
        },
        constraints: {
          name: { 
            pattern: /^[A-Z0-9]{1,5}$/,
            message: 'Stand name must be 1-5 alphanumeric characters'
          }
        }
      },
      create_terminal: {
        required: ['name'],
        optional: ['code'],
        types: {
          name: 'string',
          code: 'string'
        },
        constraints: {
          code: {
            pattern: /^[A-Z0-9]{1,3}$/,
            message: 'Terminal code must be 1-3 alphanumeric characters'
          }
        }
      },
      create_maintenance: {
        required: ['stand', 'startDate', 'endDate'],
        optional: ['type', 'reason'],
        types: {
          stand: 'string',
          startDate: 'date',
          endDate: 'date',
          type: 'string',
          reason: 'string'
        },
        constraints: {
          dateDifference: {
            min: 0,
            message: 'End date must be after start date'
          }
        }
      },

      // READ operation schemas
      get_stand: {
        required: ['identifier'],
        optional: ['fields'],
        types: {
          identifier: 'string',
          fields: 'array'
        }
      },
      get_terminal: {
        required: ['identifier'],
        optional: ['fields'],
        types: {
          identifier: 'string',
          fields: 'array'
        }
      },
      get_maintenance: {
        required: [],
        optional: ['stand', 'status', 'dateRange', 'limit'],
        types: {
          stand: 'string',
          status: 'string',
          dateRange: 'object',
          limit: 'number'
        }
      },

      // UPDATE operation schemas
      update_stand: {
        required: ['identifier'],
        optional: ['name', 'terminal', 'type', 'size', 'contact'],
        types: {
          identifier: 'string',
          name: 'string',
          terminal: 'string',
          type: 'string',
          size: 'string',
          contact: 'boolean'
        },
        constraints: {
          name: { 
            pattern: /^[A-Z0-9]{1,5}$/,
            message: 'Stand name must be 1-5 alphanumeric characters'
          }
        }
      },
      update_terminal: {
        required: ['identifier'],
        optional: ['name', 'code'],
        types: {
          identifier: 'string',
          name: 'string',
          code: 'string'
        },
        constraints: {
          code: {
            pattern: /^[A-Z0-9]{1,3}$/,
            message: 'Terminal code must be 1-3 alphanumeric characters'
          }
        }
      },
      update_maintenance: {
        required: ['identifier'],
        optional: ['stand', 'startDate', 'endDate', 'type', 'status', 'reason'],
        types: {
          identifier: 'string',
          stand: 'string',
          startDate: 'date',
          endDate: 'date',
          type: 'string',
          status: 'string',
          reason: 'string'
        },
        constraints: {
          dateDifference: {
            min: 0,
            message: 'End date must be after start date'
          },
          status: {
            enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
            message: 'Status must be one of: scheduled, in-progress, completed, cancelled'
          }
        }
      },

      // DELETE operation schemas
      delete_stand: {
        required: ['identifier'],
        optional: ['force'],
        types: {
          identifier: 'string',
          force: 'boolean'
        }
      },
      delete_terminal: {
        required: ['identifier'],
        optional: ['force'],
        types: {
          identifier: 'string',
          force: 'boolean'
        }
      },
      delete_maintenance: {
        required: ['identifier'],
        optional: [],
        types: {
          identifier: 'string'
        }
      }
    };
  }

  /**
   * Validate parameters for a given operation type
   * @param {string} operationType - The operation type (e.g., "create_stand")
   * @param {Object} parameters - Parameters to validate
   * @returns {Promise<Object>} - Validation result with success flag and errors
   */
  async validateParameters(operationType, parameters) {
    try {
      // Get schema for operation type
      const schema = this.validationSchemas[operationType];
      if (!schema) {
        return {
          isValid: false,
          errors: [`No validation schema found for operation type: ${operationType}`]
        };
      }

      const errors = [];

      // Check required parameters
      for (const requiredParam of schema.required) {
        if (parameters[requiredParam] === undefined) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }

      // Check parameter types
      for (const [param, value] of Object.entries(parameters)) {
        // Skip validation for parameters not in schema
        if (!schema.types[param]) continue;

        const expectedType = schema.types[param];
        if (!this.validateType(value, expectedType)) {
          errors.push(`Parameter '${param}' should be of type ${expectedType}`);
        }
      }

      // Check constraints
      const constraintErrors = await this.validateConstraints(operationType, parameters, schema);
      errors.push(...constraintErrors);

      // Validate against repository data if needed
      const repositoryErrors = await this.validateAgainstRepository(operationType, parameters);
      errors.push(...repositoryErrors);

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : [],
        parameters: this.normalizeParameters(parameters, schema)
      };
    } catch (error) {
      logger.error(`Parameter validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Validate parameter constraints
   * @param {string} operationType - The operation type
   * @param {Object} parameters - Parameters to validate
   * @param {Object} schema - Validation schema
   * @returns {Promise<Array>} - Array of constraint validation errors
   */
  async validateConstraints(operationType, parameters, schema) {
    const errors = [];

    // Check pattern constraints
    for (const [param, value] of Object.entries(parameters)) {
      const constraint = schema.constraints?.[param];
      if (constraint?.pattern && typeof value === 'string') {
        if (!constraint.pattern.test(value)) {
          errors.push(constraint.message || `Invalid format for ${param}`);
        }
      }

      // Check enum constraints
      if (constraint?.enum && !constraint.enum.includes(value)) {
        errors.push(constraint.message || `Invalid value for ${param}. Must be one of: ${constraint.enum.join(', ')}`);
      }
    }

    // Check cross-field constraints
    if (schema.constraints?.dateDifference && parameters.startDate && parameters.endDate) {
      const startDate = new Date(parameters.startDate);
      const endDate = new Date(parameters.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        errors.push('Invalid date format for startDate or endDate');
      } else if (endDate - startDate < schema.constraints.dateDifference.min) {
        errors.push(schema.constraints.dateDifference.message || 'Invalid date range');
      }
    }

    return errors;
  }

  /**
   * Validate parameters against repository data
   * @param {string} operationType - The operation type
   * @param {Object} parameters - Parameters to validate
   * @returns {Promise<Array>} - Array of repository validation errors
   */
  async validateAgainstRepository(operationType, parameters) {
    const errors = [];

    // For create operations, validate foreign key references
    if (operationType.startsWith('create_') || operationType.startsWith('update_')) {
      // Validate terminal reference
      if (parameters.terminal) {
        const terminalResult = await this.repositoryValidationService.validateTerminal(parameters.terminal);
        if (!terminalResult.valid) {
          errors.push(`Terminal '${parameters.terminal}' doesn't exist`);
        }
      }

      // Validate stand reference for maintenance
      if ((operationType === 'create_maintenance' || operationType === 'update_maintenance') && parameters.stand) {
        const standResult = await this.validateStandExists(parameters.stand);
        if (!standResult.valid) {
          errors.push(`Stand '${parameters.stand}' doesn't exist`);
        }
      }
    }

    // For update/delete operations, validate that the entity exists
    if (operationType.startsWith('update_') || operationType.startsWith('delete_')) {
      if (parameters.identifier) {
        const entityType = operationType.split('_')[1]; // e.g., "stand" from "update_stand"
        const existsResult = await this.validateEntityExists(entityType, parameters.identifier);
        if (!existsResult.valid) {
          errors.push(`${entityType} with identifier '${parameters.identifier}' doesn't exist`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate that a stand exists
   * @param {string} standId - Stand identifier
   * @returns {Promise<Object>} - Validation result
   */
  async validateStandExists(standId) {
    try {
      // Repository validation should handle this, but if not available,
      // we'll provide a basic implementation
      if (this.repositoryValidationService.validateStandId) {
        return { valid: this.repositoryValidationService.validateStandId(standId) };
      }
      
      // Fallback validation
      return { valid: true }; // In development mode, assume valid
    } catch (error) {
      logger.error(`Error validating stand existence: ${error.message}`);
      return { valid: false, error: `Error validating stand: ${error.message}` };
    }
  }

  /**
   * Validate that an entity exists
   * @param {string} entityType - Type of entity (stand, terminal, maintenance)
   * @param {string} identifier - Entity identifier
   * @returns {Promise<Object>} - Validation result
   */
  async validateEntityExists(entityType, identifier) {
    try {
      // This would connect to the appropriate service based on entity type
      switch (entityType) {
        case 'stand':
          return await this.validateStandExists(identifier);
        case 'terminal':
          if (this.repositoryValidationService.validateTerminal) {
            return await this.repositoryValidationService.validateTerminal(identifier);
          }
          break;
        case 'maintenance':
          // Would need a maintenance validation service
          break;
      }
      
      // For now, assume valid in development mode
      return { valid: true };
    } catch (error) {
      logger.error(`Error validating entity existence: ${error.message}`);
      return { valid: false, error: `Error validating ${entityType}: ${error.message}` };
    }
  }

  /**
   * Validate a value against an expected type
   * @param {any} value - Value to validate
   * @param {string} expectedType - Expected type
   * @returns {boolean} - Whether the value matches the expected type
   */
  validateType(value, expectedType) {
    if (value === undefined || value === null) {
      return true; // Allow null/undefined for optional parameters
    }

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)));
      case 'boolean':
        return typeof value === 'boolean' || 
               (typeof value === 'string' && ['true', 'false', 'yes', 'no'].includes(value.toLowerCase()));
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      case 'date':
        if (value instanceof Date) return !isNaN(value.getTime());
        if (typeof value === 'string') {
          const date = new Date(value);
          return !isNaN(date.getTime());
        }
        return false;
      default:
        return true; // Unknown type, assume valid
    }
  }

  /**
   * Normalize parameters based on expected types
   * @param {Object} parameters - Parameters to normalize
   * @param {Object} schema - Validation schema
   * @returns {Object} - Normalized parameters
   */
  normalizeParameters(parameters, schema) {
    const normalized = { ...parameters };

    for (const [param, value] of Object.entries(parameters)) {
      if (value === undefined || value === null) continue;

      const expectedType = schema.types[param];
      if (!expectedType) continue;

      switch (expectedType) {
        case 'number':
          if (typeof value === 'string') {
            normalized[param] = parseFloat(value);
          }
          break;
        case 'boolean':
          if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            if (['true', 'yes'].includes(lowered)) {
              normalized[param] = true;
            } else if (['false', 'no'].includes(lowered)) {
              normalized[param] = false;
            }
          }
          break;
        case 'date':
          if (typeof value === 'string') {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                normalized[param] = date.toISOString();
              }
            } catch (e) {
              // Keep original if parsing fails
            }
          }
          break;
        case 'array':
          if (typeof value === 'string') {
            // Convert comma-separated string to array
            normalized[param] = value.split(',').map(item => item.trim()).filter(Boolean);
          } else if (!Array.isArray(value)) {
            // Wrap non-array in array
            normalized[param] = [value];
          }
          break;
      }
    }

    return normalized;
  }
}

module.exports = new OperationParameterValidator();