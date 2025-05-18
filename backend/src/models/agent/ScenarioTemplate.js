const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');
const knex = require('../../db');

Model.knex(knex);

class ScenarioTemplate extends Model {
  static get tableName() {
    return 'scenario_templates';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'description', 'category', 'createdBy'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string' },
        category: { type: 'string' },
        defaultParameters: { type: 'object' },
        parameterSchema: { type: 'object' },
        requiredParameters: { type: 'array', items: { type: 'string' } },
        visualizationOptions: { type: 'array', items: { type: 'string' } },
        isSystem: { type: 'boolean' },
        createdBy: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        modifiedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Create a new scenario from this template
   * @param {string} userId - User creating the scenario
   * @param {string} title - Title for the new scenario
   * @param {string} description - Description for the new scenario
   * @param {object} parameters - Optional parameter overrides
   * @returns {Promise<object>} The newly created scenario
   */
  async createScenario(userId, title, description, parameters = {}) {
    const Scenario = require('./Scenario');
    
    // Merge default parameters with provided overrides
    const mergedParameters = {
      ...this.defaultParameters,
      ...parameters
    };
    
    // Validate required parameters
    const missingParams = this.requiredParameters.filter(param => 
      !mergedParameters.hasOwnProperty(param) || 
      mergedParameters[param] === null || 
      mergedParameters[param] === undefined
    );
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Create new scenario based on template
    return Scenario.query().insert({
      id: uuidv4(),
      userId,
      title,
      description,
      baselineId: null,
      type: this.category,
      status: 'created',
      parameters: mergedParameters,
      metadata: {
        templateId: this.id,
        templateName: this.name,
        templateCategory: this.category
      },
      tags: [this.category],
      isTemplate: false,
      isPublic: false
    });
  }
  
  /**
   * Update this template
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated template
   */
  async update(updates) {
    const allowedUpdates = [
      'name', 
      'description', 
      'category', 
      'defaultParameters', 
      'parameterSchema', 
      'requiredParameters', 
      'visualizationOptions'
    ];
    
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates.hasOwnProperty(key)) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    // Always update modified timestamp
    filteredUpdates.modifiedAt = new Date().toISOString();
    
    return this.$query().patch(filteredUpdates);
  }
  
  /**
   * Validate parameters against this template's schema
   * @param {object} parameters - Parameters to validate
   * @returns {object} Validation result with isValid and errors
   */
  validateParameters(parameters) {
    const Ajv = require('ajv');
    const ajv = new Ajv();
    
    // If no schema defined, only check required parameters
    if (!this.parameterSchema || Object.keys(this.parameterSchema).length === 0) {
      const missingParams = this.requiredParameters.filter(param => 
        !parameters.hasOwnProperty(param) || 
        parameters[param] === null || 
        parameters[param] === undefined
      );
      
      return {
        isValid: missingParams.length === 0,
        errors: missingParams.length > 0 
          ? [`Missing required parameters: ${missingParams.join(', ')}`] 
          : []
      };
    }
    
    // Validate against schema
    const validate = ajv.compile(this.parameterSchema);
    const isValid = validate(parameters);
    
    return {
      isValid,
      errors: validate.errors || []
    };
  }
  
  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.modifiedAt = new Date().toISOString();
    this.defaultParameters = this.defaultParameters || {};
    this.parameterSchema = this.parameterSchema || {};
    this.requiredParameters = this.requiredParameters || [];
    this.visualizationOptions = this.visualizationOptions || [];
    this.isSystem = this.isSystem || false;
  }
}

module.exports = ScenarioTemplate;