const { v4: uuidv4 } = require('uuid');
const { 
  Scenario, 
  ScenarioVersion, 
  ScenarioCalculation, 
  ScenarioComparison, 
  ScenarioTemplate 
} = require('../../models/agent');
const scenarioService = require('../../services/agent/ScenarioService');
const logger = require('../../utils/logger');

/**
 * ScenarioController handles the scenario management API endpoints
 */
class ScenarioController {
  /**
   * Create a new scenario
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createScenario(req, res) {
    try {
      const { description, parameters = {}, baselineId = null, title } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }
      
      // Generate title if not provided (use first 30 chars of description)
      const scenarioTitle = title || description.substring(0, 30) + (description.length > 30 ? '...' : '');
      
      // Create scenario
      let scenario;
      
      // Natural language scenario creation
      if (typeof parameters !== 'object' || Object.keys(parameters).length === 0) {
        // Use NLP service to extract parameters from description
        scenario = await scenarioService.createFromNaturalLanguage(
          userId,
          scenarioTitle,
          description,
          baselineId
        );
      } else {
        // Create with provided parameters
        scenario = await Scenario.query().insert({
          id: uuidv4(),
          userId,
          title: scenarioTitle,
          description,
          baselineId,
          type: baselineId ? 'what-if' : 'manual',
          status: 'created',
          parameters
        });
      }
      
      res.status(201).json({
        scenarioId: scenario.id,
        description: scenario.description,
        status: scenario.status,
        parameters: scenario.parameters,
        baselineId: scenario.baselineId
      });
    } catch (error) {
      logger.error(`Error creating scenario: ${error.message}`);
      res.status(500).json({ error: `Failed to create scenario: ${error.message}` });
    }
  }
  
  /**
   * Get scenario details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScenario(req, res) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user.id;
      
      // Get scenario with latest calculation
      const scenario = await Scenario.query()
        .findById(scenarioId)
        .withGraphFetched('calculations(latest)')
        .modifiers({
          latest(builder) {
            builder.orderBy('completedAt', 'desc').limit(1);
          }
        });
      
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      // Check if user owns scenario or if it's public
      if (scenario.userId !== userId && !scenario.isPublic) {
        return res.status(403).json({ error: 'Unauthorized access to scenario' });
      }
      
      // Format response
      const response = {
        scenarioId: scenario.id,
        description: scenario.description,
        title: scenario.title,
        createdAt: scenario.createdAt,
        modifiedAt: scenario.modifiedAt,
        status: scenario.status,
        parameters: scenario.parameters,
        results: scenario.calculations && scenario.calculations.length > 0 
          ? scenario.calculations[0].results 
          : null,
        lastCalculatedAt: scenario.lastCalculatedAt,
        type: scenario.type,
        baselineId: scenario.baselineId,
        tags: scenario.tags
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error retrieving scenario: ${error.message}`);
      res.status(500).json({ error: `Failed to retrieve scenario: ${error.message}` });
    }
  }
  
  /**
   * Update scenario parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateScenario(req, res) {
    try {
      const { scenarioId } = req.params;
      const { description, parameters, title } = req.body;
      const userId = req.user.id;
      
      // Get scenario
      const scenario = await Scenario.query().findById(scenarioId);
      
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      // Check if user owns scenario
      if (scenario.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to update scenario' });
      }
      
      // Create version to track changes
      await scenario.createVersion(
        parameters || scenario.parameters,
        `Update: ${description || 'Parameter update'}`,
        userId
      );
      
      // Update fields
      const updates = {};
      if (description) updates.description = description;
      if (title) updates.title = title;
      if (parameters) updates.parameters = parameters;
      
      // Apply updates
      const updatedScenario = await scenario.$query().patch(updates);
      
      res.status(200).json({
        scenarioId: updatedScenario.id,
        description: updatedScenario.description,
        title: updatedScenario.title,
        status: updatedScenario.status,
        parameters: updatedScenario.parameters
      });
    } catch (error) {
      logger.error(`Error updating scenario: ${error.message}`);
      res.status(500).json({ error: `Failed to update scenario: ${error.message}` });
    }
  }
  
  /**
   * List saved scenarios
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async listScenarios(req, res) {
    try {
      const { type, status, offset = 0, limit = 10 } = req.query;
      const userId = req.user.id;
      
      // Build query
      let query = Scenario.query()
        .where('userId', userId)
        .orderBy('modifiedAt', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Apply filters
      if (type) query = query.where('type', type);
      if (status) query = query.where('status', status);
      
      // Execute query
      const scenarios = await query;
      
      // Get total count for pagination
      const countQuery = Scenario.query()
        .where('userId', userId)
        .count('id as total');
      
      // Apply filters to count query
      if (type) countQuery.where('type', type);
      if (status) countQuery.where('status', status);
      
      const countResult = await countQuery.first();
      const total = countResult ? parseInt(countResult.total) : 0;
      
      // Format response
      const response = {
        scenarios: scenarios.map(scenario => ({
          scenarioId: scenario.id,
          description: scenario.description,
          title: scenario.title,
          createdAt: scenario.createdAt,
          status: scenario.status,
          type: scenario.type
        })),
        total,
        offset: parseInt(offset),
        limit: parseInt(limit)
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error listing scenarios: ${error.message}`);
      res.status(500).json({ error: `Failed to list scenarios: ${error.message}` });
    }
  }
  
  /**
   * Calculate the results for a scenario
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async calculateScenario(req, res) {
    try {
      const { scenarioId } = req.params;
      const { options = {} } = req.body;
      const userId = req.user.id;
      
      // Get scenario
      const scenario = await Scenario.query().findById(scenarioId);
      
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      // Check if user owns scenario or if it's public
      if (scenario.userId !== userId && !scenario.isPublic) {
        return res.status(403).json({ error: 'Unauthorized access to scenario' });
      }
      
      // Start calculation
      const calculation = await scenario.startCalculation('standard', options);
      
      // Queue the calculation job asynchronously
      scenarioService.queueCalculationJob(scenarioId, calculation.id, options)
        .catch(err => logger.error(`Error in calculation job: ${err.message}`));
      
      res.status(202).json({
        calculationId: calculation.id,
        scenarioId: scenario.id,
        status: 'processing',
        estimatedCompletionTime: new Date(Date.now() + 30000).toISOString() // Estimate 30 seconds
      });
    } catch (error) {
      logger.error(`Error starting calculation: ${error.message}`);
      res.status(500).json({ error: `Failed to start calculation: ${error.message}` });
    }
  }
  
  /**
   * Get the status and results of a scenario calculation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCalculation(req, res) {
    try {
      const { scenarioId, calculationId } = req.params;
      const userId = req.user.id;
      
      // Get scenario and calculation
      const scenario = await Scenario.query().findById(scenarioId);
      
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      // Check if user owns scenario or if it's public
      if (scenario.userId !== userId && !scenario.isPublic) {
        return res.status(403).json({ error: 'Unauthorized access to scenario' });
      }
      
      const calculation = await ScenarioCalculation.query().findById(calculationId);
      
      if (!calculation || calculation.scenarioId !== scenarioId) {
        return res.status(404).json({ error: 'Calculation not found' });
      }
      
      // Format response
      const response = {
        calculationId: calculation.id,
        scenarioId: calculation.scenarioId,
        status: calculation.status,
        startedAt: calculation.startedAt,
        completedAt: calculation.completedAt,
        results: calculation.results,
        errorMessage: calculation.errorMessage
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error retrieving calculation: ${error.message}`);
      res.status(500).json({ error: `Failed to retrieve calculation: ${error.message}` });
    }
  }
  
  /**
   * Compare multiple scenarios
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async compareScenarios(req, res) {
    try {
      const { scenarioIds, metrics = ['capacity', 'utilization'], timeRange = {} } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
        return res.status(400).json({ error: 'At least two scenario IDs are required' });
      }
      
      // Verify scenarios exist and user has access
      for (const id of scenarioIds) {
        const scenario = await Scenario.query().findById(id);
        
        if (!scenario) {
          return res.status(404).json({ error: `Scenario not found: ${id}` });
        }
        
        if (scenario.userId !== userId && !scenario.isPublic) {
          return res.status(403).json({ error: `Unauthorized access to scenario: ${id}` });
        }
      }
      
      // Create comparison record
      const comparison = await ScenarioComparison.query().insert({
        id: uuidv4(),
        scenarioIds,
        userId,
        metrics,
        timeRange,
        status: 'pending'
      });
      
      // Queue comparison job asynchronously
      scenarioService.queueComparisonJob(comparison.id)
        .catch(err => logger.error(`Error in comparison job: ${err.message}`));
      
      res.status(202).json({
        comparisonId: comparison.id,
        scenarioIds: comparison.scenarioIds,
        status: 'pending',
        estimatedCompletionTime: new Date(Date.now() + 45000).toISOString() // Estimate 45 seconds
      });
    } catch (error) {
      logger.error(`Error starting comparison: ${error.message}`);
      res.status(500).json({ error: `Failed to start comparison: ${error.message}` });
    }
  }
  
  /**
   * Get scenario comparison results
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getComparison(req, res) {
    try {
      const { comparisonId } = req.params;
      const userId = req.user.id;
      
      // Get comparison
      const comparison = await ScenarioComparison.query().findById(comparisonId);
      
      if (!comparison) {
        return res.status(404).json({ error: 'Comparison not found' });
      }
      
      // Check if user owns comparison
      if (comparison.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to comparison' });
      }
      
      // Get scenario details
      const scenarioDetails = await comparison.getScenarioDetails();
      
      // Format response
      const response = {
        comparisonId: comparison.id,
        scenarioIds: comparison.scenarioIds,
        scenarios: scenarioDetails,
        status: comparison.status,
        createdAt: comparison.createdAt,
        completedAt: comparison.completedAt,
        metrics: comparison.metrics,
        timeRange: comparison.timeRange,
        results: comparison.results,
        errorMessage: comparison.errorMessage
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error retrieving comparison: ${error.message}`);
      res.status(500).json({ error: `Failed to retrieve comparison: ${error.message}` });
    }
  }
  
  /**
   * List scenario templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async listTemplates(req, res) {
    try {
      const { category } = req.query;
      
      // Build query
      let query = ScenarioTemplate.query()
        .where(builder => {
          builder.where('isSystem', true)
            .orWhere('createdBy', req.user.id);
        })
        .orderBy('name');
      
      // Apply category filter
      if (category) {
        query = query.where('category', category);
      }
      
      // Execute query
      const templates = await query;
      
      // Format response
      const response = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        isSystem: template.isSystem,
        requiredParameters: template.requiredParameters
      }));
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error listing templates: ${error.message}`);
      res.status(500).json({ error: `Failed to list templates: ${error.message}` });
    }
  }
  
  /**
   * Get template details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTemplate(req, res) {
    try {
      const { templateId } = req.params;
      
      // Get template
      const template = await ScenarioTemplate.query().findById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Check access - system templates or user's own templates
      if (!template.isSystem && template.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized access to template' });
      }
      
      // Format response (exclude parameter schema for brevity)
      const response = {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        defaultParameters: template.defaultParameters,
        requiredParameters: template.requiredParameters,
        visualizationOptions: template.visualizationOptions,
        isSystem: template.isSystem,
        createdBy: template.createdBy,
        createdAt: template.createdAt
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error retrieving template: ${error.message}`);
      res.status(500).json({ error: `Failed to retrieve template: ${error.message}` });
    }
  }
  
  /**
   * Create a scenario from template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createFromTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { title, description, parameters = {} } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }
      
      // Get template
      const template = await ScenarioTemplate.query().findById(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Check access - system templates or user's own templates
      if (!template.isSystem && template.createdBy !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to template' });
      }
      
      // Validate parameters against template
      const validation = template.validateParameters(parameters);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid parameters',
          details: validation.errors
        });
      }
      
      // Create scenario from template
      const scenario = await template.createScenario(userId, title, description, parameters);
      
      res.status(201).json({
        scenarioId: scenario.id,
        title: scenario.title,
        description: scenario.description,
        status: scenario.status,
        parameters: scenario.parameters,
        metadata: {
          templateId: template.id,
          templateName: template.name
        }
      });
    } catch (error) {
      logger.error(`Error creating from template: ${error.message}`);
      res.status(500).json({ error: `Failed to create from template: ${error.message}` });
    }
  }
}

module.exports = new ScenarioController();