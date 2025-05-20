/**
 * OperationProcessor.js
 * 
 * Service for processing CRUD operations based on natural language queries.
 * Integrates intent classification, parameter extraction, and validation.
 */

const OperationIntentClassifier = require('./OperationIntentClassifier');
const OperationEntityExtractor = require('./OperationEntityExtractor');
const OperationParameterValidator = require('./OperationParameterValidator');
const logger = require('../../../utils/logger');

class OperationProcessor {
  constructor(services = {}) {
    this.intentClassifier = services.intentClassifier || OperationIntentClassifier;
    this.entityExtractor = services.entityExtractor || OperationEntityExtractor;
    this.parameterValidator = services.parameterValidator || OperationParameterValidator;
  }

  /**
   * Process a natural language query for CRUD operations
   * @param {string} query - The natural language query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Processing result with parsed operation
   */
  async processQuery(query, context = {}) {
    try {
      logger.info(`Processing operation query: ${query}`);
      
      // Step 1: Classify the operation intent
      const intentResult = await this.intentClassifier.classifyIntent(query);
      
      if (!intentResult.intent || intentResult.confidence < 0.6) {
        return {
          success: false,
          error: 'Unable to determine operation intent with sufficient confidence',
          intentResult
        };
      }
      
      // Step 2: Extract operation parameters
      const entityResult = await this.entityExtractor.extractEntities(query, intentResult.intent);
      
      // Step 3: Validate the parameters
      const validationResult = await this.parameterValidator.validateParameters(
        intentResult.intent,
        entityResult.entities || {}
      );
      
      // Step 4: Return the processed operation
      return {
        success: validationResult.isValid,
        operationType: intentResult.intent,
        operationConfidence: intentResult.confidence,
        parameters: validationResult.parameters || entityResult.entities || {},
        requiresConfirmation: this.requiresConfirmation(intentResult.intent),
        validationErrors: validationResult.errors || [],
        error: validationResult.isValid ? null : 'Parameter validation failed'
      };
    } catch (error) {
      logger.error(`Error processing operation query: ${error.message}`);
      return {
        success: false,
        error: `Processing error: ${error.message}`
      };
    }
  }

  /**
   * Check if an operation requires confirmation
   * @param {string} operationType - The operation type
   * @returns {boolean} - Whether confirmation is required
   */
  requiresConfirmation(operationType) {
    // All modifying operations require confirmation
    return (
      operationType.startsWith('create_') ||
      operationType.startsWith('update_') ||
      operationType.startsWith('delete_')
    );
  }

  /**
   * Generate a confirmation message for an operation
   * @param {Object} operation - The operation details
   * @returns {string} - Confirmation message
   */
  generateConfirmationMessage(operation) {
    const { operationType, parameters } = operation;
    
    // Basic templates for confirmation messages
    const operationTemplates = {
      create_stand: `Create a new stand named "${parameters.name}" in terminal "${parameters.terminal}"?`,
      create_terminal: `Create a new terminal named "${parameters.name}"${parameters.code ? ` with code "${parameters.code}"` : ''}?`,
      create_maintenance: `Create a maintenance request for stand "${parameters.stand}" from ${parameters.startDate} to ${parameters.endDate}?`,
      
      update_stand: `Update stand "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`,
      update_terminal: `Update terminal "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`,
      update_maintenance: `Update maintenance request "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`,
      
      delete_stand: `Delete stand "${parameters.identifier}"${parameters.force ? ' (forced deletion)' : ''}?`,
      delete_terminal: `Delete terminal "${parameters.identifier}"${parameters.force ? ' (forced deletion)' : ''}?`,
      delete_maintenance: `Delete maintenance request "${parameters.identifier}"?`
    };
    
    return operationTemplates[operationType] || 
      `Confirm ${operationType.replace('_', ' ')} operation with parameters: ${JSON.stringify(parameters)}?`;
  }

  /**
   * Format parameter changes for confirmation message
   * @param {Object} parameters - Operation parameters
   * @param {Array} exclude - Parameters to exclude
   * @returns {string} - Formatted changes
   */
  formatChanges(parameters, exclude = []) {
    const changes = Object.entries(parameters)
      .filter(([key]) => !exclude.includes(key))
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
    
    return changes.length > 0 ? changes : 'no changes specified';
  }
}

module.exports = new OperationProcessor();