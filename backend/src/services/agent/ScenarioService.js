const { v4: uuidv4 } = require('uuid');
const { 
  Scenario, 
  ScenarioCalculation, 
  ScenarioComparison 
} = require('../../models/agent');
const nlpService = require('./NLPService');
const standCapacityService = require('../standCapacityService');
const logger = require('../../utils/logger');

/**
 * Service for scenario management and processing
 */
class ScenarioService {
  /**
   * Create a scenario from natural language description
   * @param {string} userId - User ID
   * @param {string} title - Scenario title
   * @param {string} description - Natural language scenario description
   * @param {string} baselineId - Optional baseline scenario ID
   * @returns {Promise<object>} Created scenario
   */
  async createFromNaturalLanguage(userId, title, description, baselineId = null) {
    try {
      logger.info(`Creating scenario from natural language for user ${userId}: ${description}`);
      
      // Extract parameters using NLP
      const parameters = await this.extractParametersFromDescription(description);
      
      logger.debug(`Extracted parameters: ${JSON.stringify(parameters)}`);
      
      // Determine scenario type
      const type = this.determineScenarioType(description, parameters, baselineId);
      
      // Create the scenario
      const scenario = await Scenario.query().insert({
        id: uuidv4(),
        userId,
        title,
        description,
        baselineId,
        type,
        status: 'created',
        parameters
      });
      
      return scenario;
    } catch (error) {
      logger.error(`Error creating scenario from natural language: ${error.message}`);
      throw new Error(`Failed to create scenario: ${error.message}`);
    }
  }
  
  /**
   * Extract parameters from natural language description
   * @param {string} description - Scenario description
   * @returns {Promise<object>} Extracted parameters
   */
  async extractParametersFromDescription(description) {
    try {
      // Enhanced NLP parameter extraction
      const parameterExtractionPrompt = `
        Extract structured parameters from the following airport capacity scenario description.
        Include all specific values mentioned (counts, times, dates, sizes, locations).
        
        Description: "${description}"
        
        Extract parameters as a valid JSON object with camelCase keys.
        Focus on extracting:
        - Terminal names or IDs
        - Stand counts and types
        - Aircraft types or categories
        - Time periods or specific times
        - Capacity values
        - Location identifiers
        - Constraints or conditions
      `;
      
      const result = await nlpService.processParameterExtraction(parameterExtractionPrompt);
      
      // Validate and normalize the extracted parameters
      return this.validateAndNormalizeParameters(result.parameters);
    } catch (error) {
      logger.error(`Parameter extraction error: ${error.message}`);
      // Return empty parameters rather than failing
      return {}; 
    }
  }
  
  /**
   * Validate and normalize extracted parameters
   * @param {object} parameters - Raw extracted parameters
   * @returns {object} Normalized parameters
   */
  validateAndNormalizeParameters(parameters) {
    const normalized = {};
    
    // Process each parameter
    for (const [key, value] of Object.entries(parameters)) {
      // Convert to appropriate types
      if (typeof value === 'string' && !isNaN(value)) {
        // Convert numeric strings to numbers
        normalized[key] = Number(value);
      } else if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
        // Convert boolean strings to booleans
        normalized[key] = value.toLowerCase() === 'true';
      } else {
        // Keep other values as is
        normalized[key] = value;
      }
    }
    
    return normalized;
  }
  
  /**
   * Determine the scenario type from description and parameters
   * @param {string} description - Scenario description
   * @param {object} parameters - Extracted parameters
   * @param {string} baselineId - Baseline scenario ID
   * @returns {string} Scenario type
   */
  determineScenarioType(description, parameters, baselineId) {
    // If there's a baseline, it's a what-if scenario
    if (baselineId) {
      return 'what-if';
    }
    
    // Check for forecast-related keywords
    const forecastKeywords = ['forecast', 'future', 'predict', 'projection', 'year 20'];
    if (forecastKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
      return 'forecast';
    }
    
    // Check for optimization-related keywords
    const optimizationKeywords = ['optimize', 'efficiency', 'improve', 'maximiz', 'minimiz', 'best'];
    if (optimizationKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
      return 'optimization';
    }
    
    // Default to what-if for scenarios with parameters
    if (Object.keys(parameters).length > 0) {
      return 'what-if';
    }
    
    // Fall back to manual
    return 'manual';
  }
  
  /**
   * Queue a calculation job for a scenario
   * @param {string} scenarioId - Scenario ID
   * @param {string} calculationId - Calculation ID
   * @param {object} options - Calculation options
   * @returns {Promise<void>}
   */
  async queueCalculationJob(scenarioId, calculationId, options = {}) {
    try {
      logger.info(`Queueing calculation job for scenario ${scenarioId}, calculation ${calculationId}`);
      
      // Get scenario and calculation
      const scenario = await Scenario.query().findById(scenarioId);
      if (!scenario) {
        throw new Error(`Scenario not found: ${scenarioId}`);
      }
      
      const calculation = await ScenarioCalculation.query().findById(calculationId);
      if (!calculation) {
        throw new Error(`Calculation not found: ${calculationId}`);
      }
      
      // Mark calculation as processing
      await calculation.startProcessing();
      
      // Perform calculation
      try {
        const results = await this.performCalculation(scenario, options);
        
        // Complete calculation
        await calculation.complete(results);
        
        logger.info(`Calculation completed for scenario ${scenarioId}`);
      } catch (error) {
        // Mark calculation as failed
        await calculation.fail(error.message);
        
        logger.error(`Calculation failed for scenario ${scenarioId}: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`Error in calculation job: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Perform calculation for a scenario
   * @param {object} scenario - Scenario object
   * @param {object} options - Calculation options
   * @returns {Promise<object>} Calculation results
   */
  async performCalculation(scenario, options = {}) {
    // Extract relevant parameters for calculation
    const parameters = scenario.parameters;
    
    // Get baseline data if this is a what-if scenario
    let baselineData = null;
    if (scenario.baselineId) {
      const baseline = await Scenario.query()
        .findById(scenario.baselineId)
        .withGraphFetched('calculations(latest)')
        .modifiers({
          latest(builder) {
            builder.orderBy('completedAt', 'desc').limit(1);
          }
        });
      
      if (baseline && baseline.calculations && baseline.calculations.length > 0) {
        baselineData = baseline.calculations[0].results;
      }
    }
    
    // Process according to scenario type
    switch (scenario.type) {
      case 'what-if':
        return this.calculateWhatIfScenario(parameters, baselineData, options);
      
      case 'optimization':
        return this.calculateOptimizationScenario(parameters, options);
      
      case 'forecast':
        return this.calculateForecastScenario(parameters, options);
      
      default:
        return this.calculateStandardScenario(parameters, options);
    }
  }
  
  /**
   * Calculate what-if scenario
   * @param {object} parameters - Scenario parameters
   * @param {object} baselineData - Baseline calculation results
   * @param {object} options - Calculation options
   * @returns {Promise<object>} Calculation results
   */
  async calculateWhatIfScenario(parameters, baselineData, options) {
    try {
      logger.info(`Calculating what-if scenario with parameters: ${JSON.stringify(parameters)}`);
      
      // Default baseline if none provided
      const baseline = baselineData || await this.getDefaultBaseline();
      
      // Apply parameter changes to baseline
      const modifiedSettings = this.applyParametersToBaseline(baseline, parameters);
      
      // Calculate capacity with modified settings
      const capacityResults = await standCapacityService.calculateCapacity(
        modifiedSettings.terminals,
        modifiedSettings.stands,
        modifiedSettings.aircraftTypes,
        modifiedSettings.operationalSettings,
        options.timeHorizon || 'day'
      );
      
      // Calculate differences from baseline
      const capacityDelta = this.calculateCapacityDelta(baseline.capacity, capacityResults);
      
      // Construct full results
      return {
        capacity: capacityResults,
        baseline: {
          capacity: baseline.capacity
        },
        comparison: {
          capacityDelta,
          utilizationDelta: (capacityResults.utilizationMetrics?.overallUtilization || 0) - 
                           (baseline.capacity.utilizationMetrics?.overallUtilization || 0)
        },
        capacityByHour: capacityResults.hourlyCapacity || [],
        utilizationMetrics: capacityResults.utilizationMetrics || {},
        impactSummary: this.generateImpactSummary(capacityDelta, parameters)
      };
    } catch (error) {
      logger.error(`Error calculating what-if scenario: ${error.message}`);
      throw new Error(`Failed to calculate what-if scenario: ${error.message}`);
    }
  }
  
  /**
   * Calculate optimization scenario
   * @param {object} parameters - Scenario parameters
   * @param {object} options - Calculation options
   * @returns {Promise<object>} Calculation results
   */
  async calculateOptimizationScenario(parameters, options) {
    // This would involve more complex optimization logic
    // For now, return a basic capacity calculation with optimization recommendations
    try {
      const baseline = await this.getDefaultBaseline();
      
      // Calculate standard capacity
      const capacityResults = await standCapacityService.calculateCapacity(
        baseline.terminals,
        baseline.stands,
        baseline.aircraftTypes,
        baseline.operationalSettings,
        options.timeHorizon || 'day'
      );
      
      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(
        capacityResults,
        parameters
      );
      
      return {
        capacity: capacityResults,
        recommendations,
        capacityByHour: capacityResults.hourlyCapacity || [],
        utilizationMetrics: capacityResults.utilizationMetrics || {},
        optimizationSummary: "Optimization analysis complete with recommendations"
      };
    } catch (error) {
      logger.error(`Error calculating optimization scenario: ${error.message}`);
      throw new Error(`Failed to calculate optimization scenario: ${error.message}`);
    }
  }
  
  /**
   * Calculate forecast scenario
   * @param {object} parameters - Scenario parameters
   * @param {object} options - Calculation options
   * @returns {Promise<object>} Calculation results
   */
  async calculateForecastScenario(parameters, options) {
    // This would project capacity into the future based on growth rates
    try {
      const baseline = await this.getDefaultBaseline();
      
      // Calculate forecast periods
      const forecastPeriods = parameters.forecastYears || [1, 5, 10];
      const forecasts = [];
      
      // Calculate growth rates
      const growthRate = parameters.annualGrowthRate || 0.03; // Default 3%
      
      for (const year of forecastPeriods) {
        // Apply growth to baseline settings
        const growthFactor = Math.pow(1 + growthRate, year);
        const forecastSettings = this.applyGrowthToBaseline(baseline, growthFactor, parameters);
        
        // Calculate capacity for this forecast period
        const capacityResults = await standCapacityService.calculateCapacity(
          forecastSettings.terminals,
          forecastSettings.stands,
          forecastSettings.aircraftTypes,
          forecastSettings.operationalSettings,
          options.timeHorizon || 'day'
        );
        
        forecasts.push({
          year,
          capacity: capacityResults,
          growthFactor,
          utilizationMetrics: capacityResults.utilizationMetrics || {}
        });
      }
      
      return {
        baseline: baseline.capacity,
        forecasts,
        growthParameters: {
          annualGrowthRate: growthRate,
          forecastYears: forecastPeriods,
          ...parameters
        },
        forecastSummary: "Forecast analysis complete for specified periods"
      };
    } catch (error) {
      logger.error(`Error calculating forecast scenario: ${error.message}`);
      throw new Error(`Failed to calculate forecast scenario: ${error.message}`);
    }
  }
  
  /**
   * Calculate standard scenario
   * @param {object} parameters - Scenario parameters
   * @param {object} options - Calculation options
   * @returns {Promise<object>} Calculation results
   */
  async calculateStandardScenario(parameters, options) {
    try {
      // Get current airport configuration
      const terminals = await standCapacityService.getTerminals();
      const stands = await standCapacityService.getStands();
      const aircraftTypes = await standCapacityService.getAircraftTypes();
      const operationalSettings = await standCapacityService.getOperationalSettings();
      
      // Calculate capacity
      const capacityResults = await standCapacityService.calculateCapacity(
        terminals,
        stands,
        aircraftTypes,
        operationalSettings,
        options.timeHorizon || 'day'
      );
      
      return {
        capacity: capacityResults,
        capacityByHour: capacityResults.hourlyCapacity || [],
        utilizationMetrics: capacityResults.utilizationMetrics || {},
        summary: "Standard capacity calculation complete"
      };
    } catch (error) {
      logger.error(`Error calculating standard scenario: ${error.message}`);
      throw new Error(`Failed to calculate standard scenario: ${error.message}`);
    }
  }
  
  /**
   * Queue a comparison job
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<void>}
   */
  async queueComparisonJob(comparisonId) {
    try {
      logger.info(`Queueing comparison job for comparison ${comparisonId}`);
      
      // Get comparison
      const comparison = await ScenarioComparison.query().findById(comparisonId);
      if (!comparison) {
        throw new Error(`Comparison not found: ${comparisonId}`);
      }
      
      // Mark as processing
      await comparison.startProcessing();
      
      // Perform comparison
      try {
        const results = await this.performComparison(comparison);
        
        // Complete comparison
        await comparison.complete(results);
        
        logger.info(`Comparison completed for comparison ${comparisonId}`);
      } catch (error) {
        // Mark comparison as failed
        await comparison.fail(error.message);
        
        logger.error(`Comparison failed for comparison ${comparisonId}: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`Error in comparison job: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Perform comparison between scenarios
   * @param {object} comparison - Comparison object
   * @returns {Promise<object>} Comparison results
   */
  async performComparison(comparison) {
    try {
      const { scenarioIds, metrics, timeRange } = comparison;
      
      // Get scenarios with their latest calculations
      const scenarioResults = {};
      
      for (const scenarioId of scenarioIds) {
        const scenario = await Scenario.query()
          .findById(scenarioId)
          .withGraphFetched('calculations(latest)')
          .modifiers({
            latest(builder) {
              builder.orderBy('completedAt', 'desc').limit(1);
            }
          });
        
        if (!scenario) {
          throw new Error(`Scenario not found: ${scenarioId}`);
        }
        
        // No calculation results, need to calculate
        if (!scenario.calculations || scenario.calculations.length === 0) {
          // Create a calculation
          const calculation = await scenario.startCalculation('standard', { timeRange });
          
          // Perform calculation
          const calcResult = await this.performCalculation(scenario, { timeRange });
          
          // Save result
          await calculation.complete(calcResult);
          
          scenarioResults[scenarioId] = calcResult;
        } else {
          // Use existing calculation
          scenarioResults[scenarioId] = scenario.calculations[0].results;
        }
      }
      
      // Compare the scenarios
      const comparisonResults = this.compareScenarioResults(scenarioResults, metrics);
      
      // Generate visualizations
      const visualizations = this.generateComparisonVisualizations(comparisonResults, metrics);
      
      return {
        metrics: comparison.metrics,
        timeRange: comparison.timeRange,
        results: comparisonResults,
        visualizations,
        scenarioDetails: await comparison.getScenarioDetails(),
        visualizationOptions: [
          'capacityBarChart',
          'utilizationTimeline',
          'conflictHeatmap'
        ]
      };
    } catch (error) {
      logger.error(`Error performing comparison: ${error.message}`);
      throw new Error(`Failed to perform comparison: ${error.message}`);
    }
  }
  
  /**
   * Compare scenario calculation results
   * @param {object} scenarioResults - Map of scenario IDs to calculation results
   * @param {Array<string>} metrics - Metrics to compare
   * @returns {object} Comparison results
   */
  compareScenarioResults(scenarioResults, metrics) {
    const comparison = {};
    
    // Process each metric
    if (metrics.includes('capacity')) {
      comparison.capacity = {};
      
      for (const [scenarioId, results] of Object.entries(scenarioResults)) {
        if (results.capacity) {
          comparison.capacity[scenarioId] = {
            narrowBody: results.capacity.narrowBodyCapacity || 0,
            wideBody: results.capacity.wideBodyCapacity || 0,
            total: results.capacity.totalCapacity || 0
          };
        }
      }
    }
    
    if (metrics.includes('utilization')) {
      comparison.utilization = {};
      
      for (const [scenarioId, results] of Object.entries(scenarioResults)) {
        if (results.utilizationMetrics) {
          comparison.utilization[scenarioId] = results.utilizationMetrics.overallUtilization || 0;
        }
      }
    }
    
    if (metrics.includes('conflicts')) {
      comparison.conflicts = {};
      
      for (const [scenarioId, results] of Object.entries(scenarioResults)) {
        if (results.capacity) {
          comparison.conflicts[scenarioId] = results.capacity.conflictCount || 0;
        }
      }
    }
    
    return comparison;
  }
  
  /**
   * Generate visualizations for scenario comparison
   * @param {object} comparisonResults - Comparison results
   * @param {Array<string>} metrics - Metrics to visualize
   * @returns {Array<object>} Visualization objects
   */
  generateComparisonVisualizations(comparisonResults, metrics) {
    const visualizations = [];
    
    // Capacity bar chart
    if (metrics.includes('capacity') && comparisonResults.capacity) {
      visualizations.push({
        type: 'barChart',
        title: 'Capacity Comparison',
        id: uuidv4(),
        data: {
          labels: Object.keys(comparisonResults.capacity),
          datasets: [
            {
              label: 'Narrow Body',
              data: Object.values(comparisonResults.capacity).map(c => c.narrowBody),
              backgroundColor: '#36A2EB'
            },
            {
              label: 'Wide Body',
              data: Object.values(comparisonResults.capacity).map(c => c.wideBody),
              backgroundColor: '#FF6384'
            },
            {
              label: 'Total',
              data: Object.values(comparisonResults.capacity).map(c => c.total),
              backgroundColor: '#4BC0C0'
            }
          ],
          xAxisLabel: 'Scenario',
          yAxisLabel: 'Capacity'
        }
      });
    }
    
    // Utilization bar chart
    if (metrics.includes('utilization') && comparisonResults.utilization) {
      visualizations.push({
        type: 'barChart',
        title: 'Utilization Comparison',
        id: uuidv4(),
        data: {
          labels: Object.keys(comparisonResults.utilization),
          datasets: [
            {
              label: 'Overall Utilization',
              data: Object.values(comparisonResults.utilization),
              backgroundColor: '#FFCE56'
            }
          ],
          xAxisLabel: 'Scenario',
          yAxisLabel: 'Utilization Rate'
        }
      });
    }
    
    // Conflicts bar chart
    if (metrics.includes('conflicts') && comparisonResults.conflicts) {
      visualizations.push({
        type: 'barChart',
        title: 'Conflicts Comparison',
        id: uuidv4(),
        data: {
          labels: Object.keys(comparisonResults.conflicts),
          datasets: [
            {
              label: 'Conflicts',
              data: Object.values(comparisonResults.conflicts),
              backgroundColor: '#FF9F40'
            }
          ],
          xAxisLabel: 'Scenario',
          yAxisLabel: 'Number of Conflicts'
        }
      });
    }
    
    return visualizations;
  }
  
  /**
   * Get default baseline data for comparisons
   * @returns {Promise<object>} Baseline data
   */
  async getDefaultBaseline() {
    try {
      // Get current airport configuration
      const terminals = await standCapacityService.getTerminals();
      const stands = await standCapacityService.getStands();
      const aircraftTypes = await standCapacityService.getAircraftTypes();
      const operationalSettings = await standCapacityService.getOperationalSettings();
      
      // Calculate baseline capacity
      const capacityResults = await standCapacityService.calculateCapacity(
        terminals,
        stands,
        aircraftTypes,
        operationalSettings
      );
      
      return {
        terminals,
        stands,
        aircraftTypes,
        operationalSettings,
        capacity: capacityResults
      };
    } catch (error) {
      logger.error(`Error getting default baseline: ${error.message}`);
      throw new Error(`Failed to get default baseline: ${error.message}`);
    }
  }
  
  /**
   * Apply parameters to baseline data
   * @param {object} baseline - Baseline data
   * @param {object} parameters - Parameters to apply
   * @returns {object} Modified data
   */
  applyParametersToBaseline(baseline, parameters) {
    // Create a deep copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(baseline));
    
    // Apply terminal changes
    if (parameters.terminal) {
      // Example: Add new stands to a terminal
      if (parameters.standType && parameters.count) {
        const terminal = result.terminals.find(t => 
          t.name.toLowerCase() === parameters.terminal.toLowerCase()
        );
        
        if (terminal) {
          // Find the highest stand ID to create new unique IDs
          const highestId = Math.max(...result.stands.map(s => parseInt(s.id.replace(/\D/g, '')) || 0));
          
          // Add new stands
          for (let i = 1; i <= parameters.count; i++) {
            const newStandId = `${parameters.terminal}-${highestId + i}`;
            
            result.stands.push({
              id: newStandId,
              terminalId: terminal.id,
              type: parameters.standType.toLowerCase() === 'wide-body' ? 'wide_body' : 'narrow_body',
              active: true
            });
          }
        }
      }
    }
    
    // Apply operational setting changes
    if (parameters.bufferTime !== undefined) {
      result.operationalSettings.bufferTime = parameters.bufferTime;
    }
    
    if (parameters.turnaroundTime !== undefined) {
      result.operationalSettings.defaultTurnaroundTime = parameters.turnaroundTime;
    }
    
    // Add more parameter applications as needed...
    
    return result;
  }
  
  /**
   * Apply growth to baseline data for forecasting
   * @param {object} baseline - Baseline data
   * @param {number} growthFactor - Growth factor
   * @param {object} parameters - Additional parameters
   * @returns {object} Modified data for forecast
   */
  applyGrowthToBaseline(baseline, growthFactor, parameters) {
    // Create a deep copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(baseline));
    
    // Growth scenarios might involve adding stands
    if (parameters.addStands) {
      // Calculate how many stands to add based on growth
      const standsToAdd = Math.floor(result.stands.length * (growthFactor - 1) * 0.7);
      
      if (standsToAdd > 0) {
        // Find the highest stand ID
        const highestId = Math.max(...result.stands.map(s => parseInt(s.id.replace(/\D/g, '')) || 0));
        
        // Distribute stands across terminals proportionally
        const terminalCounts = {};
        for (const stand of result.stands) {
          terminalCounts[stand.terminalId] = (terminalCounts[stand.terminalId] || 0) + 1;
        }
        
        // Calculate how many stands to add to each terminal
        for (const [terminalId, count] of Object.entries(terminalCounts)) {
          const terminal = result.terminals.find(t => t.id === terminalId);
          if (!terminal) continue;
          
          const terminalPortion = count / result.stands.length;
          const newStandsForTerminal = Math.round(standsToAdd * terminalPortion);
          
          // Add stands to this terminal
          for (let i = 1; i <= newStandsForTerminal; i++) {
            const newStandId = `${terminal.name}-${highestId + i}`;
            
            result.stands.push({
              id: newStandId,
              terminalId: terminal.id,
              type: Math.random() > 0.3 ? 'narrow_body' : 'wide_body', // 70% narrow body, 30% wide body
              active: true
            });
          }
        }
      }
    }
    
    // Apply demand growth to operational settings
    result.operationalSettings.peakDemandFactor = 
      (result.operationalSettings.peakDemandFactor || 1) * growthFactor;
    
    return result;
  }
  
  /**
   * Calculate capacity delta between two capacity results
   * @param {object} baseline - Baseline capacity results
   * @param {object} scenario - Scenario capacity results
   * @returns {object} Capacity delta
   */
  calculateCapacityDelta(baseline, scenario) {
    return {
      narrowBody: (scenario.narrowBodyCapacity || 0) - (baseline.narrowBodyCapacity || 0),
      wideBody: (scenario.wideBodyCapacity || 0) - (baseline.wideBodyCapacity || 0),
      total: (scenario.totalCapacity || 0) - (baseline.totalCapacity || 0)
    };
  }
  
  /**
   * Generate impact summary text based on capacity delta
   * @param {object} capacityDelta - Capacity delta values
   * @param {object} parameters - Scenario parameters
   * @returns {string} Impact summary text
   */
  generateImpactSummary(capacityDelta, parameters) {
    const impacts = [];
    
    if (capacityDelta.total > 0) {
      impacts.push(`Increases total capacity by ${capacityDelta.total} aircraft per day.`);
    } else if (capacityDelta.total < 0) {
      impacts.push(`Decreases total capacity by ${Math.abs(capacityDelta.total)} aircraft per day.`);
    } else {
      impacts.push(`No change in total capacity.`);
    }
    
    if (capacityDelta.narrowBody !== 0) {
      const direction = capacityDelta.narrowBody > 0 ? 'Increases' : 'Decreases';
      impacts.push(`${direction} narrow-body capacity by ${Math.abs(capacityDelta.narrowBody)} aircraft per day.`);
    }
    
    if (capacityDelta.wideBody !== 0) {
      const direction = capacityDelta.wideBody > 0 ? 'Increases' : 'Decreases';
      impacts.push(`${direction} wide-body capacity by ${Math.abs(capacityDelta.wideBody)} aircraft per day.`);
    }
    
    return impacts.join(' ');
  }
  
  /**
   * Generate optimization recommendations
   * @param {object} capacityResults - Capacity calculation results
   * @param {object} parameters - Scenario parameters
   * @returns {Array<object>} Optimization recommendations
   */
  generateOptimizationRecommendations(capacityResults, parameters) {
    const recommendations = [];
    
    // Check utilization metrics
    if (capacityResults.utilizationMetrics) {
      const utilization = capacityResults.utilizationMetrics.overallUtilization || 0;
      
      // Low utilization recommendations
      if (utilization < 0.6) {
        recommendations.push({
          id: uuidv4(),
          title: 'Low Overall Utilization',
          description: 'Consider consolidating operations to fewer stands to improve efficiency.',
          impact: 'Could reduce operational costs and improve resource allocation',
          type: 'efficiency'
        });
      }
      
      // High utilization recommendations
      if (utilization > 0.85) {
        recommendations.push({
          id: uuidv4(),
          title: 'High Overall Utilization',
          description: 'Consider adding more stands or optimizing turnaround times to reduce congestion.',
          impact: 'Could reduce delays and improve operational reliability',
          type: 'capacity'
        });
      }
    }
    
    // Check hourly capacity and identify bottlenecks
    if (capacityResults.hourlyCapacity) {
      // Find peak hour
      const peakHour = capacityResults.hourlyCapacity.reduce(
        (peak, hour) => hour.utilization > peak.utilization ? hour : peak,
        { utilization: 0 }
      );
      
      if (peakHour.utilization > 0.9) {
        recommendations.push({
          id: uuidv4(),
          title: 'Peak Hour Congestion',
          description: `High congestion during ${peakHour.hour}:00. Consider time slot reallocation.`,
          impact: 'Could reduce delays during peak hours and improve overall flow',
          type: 'scheduling'
        });
      }
    }
    
    // Add general recommendations
    recommendations.push({
      id: uuidv4(),
      title: 'Stand Type Optimization',
      description: 'Review the mix of narrow-body and wide-body stands based on flight schedule demands.',
      impact: 'Better matching stand types to actual demand could improve capacity',
      type: 'planning'
    });
    
    return recommendations;
  }
}

module.exports = new ScenarioService();