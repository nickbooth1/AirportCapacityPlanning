/**
 * Aggregated Capacity Impact Service
 * 
 * This service calculates the impact of various operational factors on airport capacity,
 * aggregating data from multiple sources and providing comprehensive impact analysis.
 */

const logger = require('../../utils/logger');
const standCapacityService = require('../standCapacityService');
const maintenanceRequestService = require('../maintenanceRequestService');
const flightDataService = require('../FlightDataService');
const db = require('../../utils/db');

/**
 * Service for analyzing and calculating capacity impacts across the airport
 */
class AggregatedCapacityImpactService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Calculate the capacity impact for a scenario
   * 
   * @param {Object} scenario - The scenario to analyze
   * @param {string} scenario.type - Type of scenario (maintenance, flight_schedule, etc.)
   * @param {Object} scenario.parameters - Scenario-specific parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Calculated impact data
   */
  async calculateImpact(scenario, options = {}) {
    try {
      // Validate scenario format
      if (!scenario || !scenario.type) {
        throw new Error('Invalid scenario format - type is required');
      }

      // Generate cache key for this scenario
      const cacheKey = this._generateCacheKey(scenario);
      
      // Check cache if caching not disabled
      if (!options.noCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          logger.debug(`Using cached impact calculation for ${scenario.type}`);
          return cached.data;
        }
        // Cache expired, remove it
        this.cache.delete(cacheKey);
      }

      // Calculate impact based on scenario type
      let impactData;
      switch (scenario.type) {
        case 'maintenance':
          impactData = await this._calculateMaintenanceImpact(scenario.parameters, options);
          break;
        case 'flight_schedule':
          impactData = await this._calculateFlightScheduleImpact(scenario.parameters, options);
          break;
        case 'infrastructure_change':
          impactData = await this._calculateInfrastructureImpact(scenario.parameters, options);
          break;
        case 'operational_settings':
          impactData = await this._calculateOperationalSettingsImpact(scenario.parameters, options);
          break;
        default:
          throw new Error(`Unsupported scenario type: ${scenario.type}`);
      }

      // Add cross-cutting metrics
      impactData = await this._enrichWithCrossCuttingMetrics(impactData, scenario);

      // Calculate alternative solutions if requested
      if (options.includeAlternatives) {
        impactData.alternativeSolutions = await this._generateAlternativeSolutions(scenario, impactData);
      }

      // Cache result if caching not disabled
      if (!options.noCache) {
        this.cache.set(cacheKey, {
          timestamp: Date.now(),
          data: impactData
        });
      }

      return impactData;
    } catch (error) {
      logger.error(`Error calculating impact for scenario: ${error.message}`, {
        scenarioType: scenario?.type,
        error: error.stack
      });
      throw new Error(`Failed to calculate capacity impact: ${error.message}`);
    }
  }

  /**
   * Get historical capacity impact data
   * 
   * @param {string} startDate - Start date for historical data (ISO format)
   * @param {string} endDate - End date for historical data (ISO format)
   * @param {Object} filters - Optional filters for data
   * @returns {Promise<Object>} - Historical impact data
   */
  async getHistoricalImpact(startDate, endDate, filters = {}) {
    try {
      // Validate date format
      if (!this._isValidISODate(startDate) || !this._isValidISODate(endDate)) {
        throw new Error('Invalid date format. Use ISO date strings (YYYY-MM-DD)');
      }

      // Apply filters to query
      const query = db('capacity_results')
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      // Apply any additional filters
      if (filters.terminal) {
        query.where('terminal_id', filters.terminal);
      }
      if (filters.stand) {
        query.where('stand_id', filters.stand);
      }
      if (filters.impactType) {
        query.where('impact_type', filters.impactType);
      }

      // Execute query
      const results = await query.select(
        'date',
        'impact_score',
        'terminal_id',
        'impact_type',
        'peak_hour_start',
        'peak_hour_end'
      );

      // Process and aggregate results
      const dailyImpact = [];
      let totalImpact = 0;
      let peakImpact = 0;

      for (const result of results) {
        const impactScore = parseFloat(result.impact_score);
        
        dailyImpact.push({
          date: result.date,
          impactScore,
          terminal: result.terminal_id,
          impactType: result.impact_type,
          peakHours: [result.peak_hour_start, result.peak_hour_end].filter(Boolean).join('-')
        });

        totalImpact += impactScore;
        peakImpact = Math.max(peakImpact, impactScore);
      }

      return {
        dailyImpact,
        averageImpact: results.length ? totalImpact / results.length : 0,
        peakImpact,
        totalResults: results.length,
        filters: {
          startDate,
          endDate,
          ...filters
        }
      };
    } catch (error) {
      logger.error(`Error retrieving historical impact data: ${error.message}`, {
        startDate,
        endDate,
        filters,
        error: error.stack
      });
      throw new Error(`Failed to retrieve historical impact data: ${error.message}`);
    }
  }

  /**
   * Get impact trends over time
   * 
   * @param {string} metricType - Type of metric to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Trend analysis data
   */
  async getImpactTrends(metricType, options = {}) {
    try {
      const validMetrics = ['terminal_capacity', 'stand_availability', 'aircraft_compatibility'];
      
      if (!validMetrics.includes(metricType)) {
        throw new Error(`Invalid metric type. Must be one of: ${validMetrics.join(', ')}`);
      }

      // Default time period is last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (options.days || 30));

      // Query for trend data
      const trendData = await db('capacity_results')
        .whereBetween('date', [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])
        .where('metric_type', metricType)
        .select(
          'date',
          'value',
          'change_from_previous'
        )
        .orderBy('date', 'asc');

      // Calculate trend metrics
      const values = trendData.map(d => parseFloat(d.value));
      const changes = trendData.map(d => parseFloat(d.change_from_previous));

      return {
        metric: metricType,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days: options.days || 30
        },
        dataPoints: trendData.length,
        trends: {
          values: trendData,
          averageValue: values.reduce((sum, val) => sum + val, 0) / (values.length || 1),
          averageChange: changes.reduce((sum, val) => sum + val, 0) / (changes.length || 1),
          direction: this._calculateTrendDirection(changes),
          volatility: this._calculateVolatility(changes)
        }
      };
    } catch (error) {
      logger.error(`Error calculating impact trends: ${error.message}`, {
        metricType,
        options,
        error: error.stack
      });
      throw new Error(`Failed to calculate impact trends: ${error.message}`);
    }
  }

  /**
   * Compare multiple scenarios to identify optimal solutions
   * 
   * @param {Array<Object>} scenarios - Array of scenarios to compare
   * @returns {Promise<Object>} - Comparison results
   */
  async compareScenarios(scenarios) {
    try {
      if (!Array.isArray(scenarios) || scenarios.length < 2) {
        throw new Error('At least two scenarios are required for comparison');
      }

      // Calculate impact for each scenario
      const impacts = await Promise.all(
        scenarios.map(scenario => this.calculateImpact(scenario, { noCache: true }))
      );

      // Find optimal scenario based on impact score
      let optimalIndex = 0;
      let bestScore = impacts[0].impactScore;

      for (let i = 1; i < impacts.length; i++) {
        if (impacts[i].impactScore < bestScore) {
          bestScore = impacts[i].impactScore;
          optimalIndex = i;
        }
      }

      // Generate comparison metrics
      return {
        scenarioCount: scenarios.length,
        scenarioImpacts: impacts.map((impact, index) => ({
          scenarioName: scenarios[index].name || `Scenario ${index + 1}`,
          impactScore: impact.impactScore,
          relativeRanking: index + 1,
          isOptimal: index === optimalIndex
        })),
        optimalScenario: {
          index: optimalIndex,
          name: scenarios[optimalIndex].name || `Scenario ${optimalIndex + 1}`,
          impactScore: impacts[optimalIndex].impactScore,
          details: impacts[optimalIndex]
        },
        comparisonMetrics: this._generateComparisonMetrics(impacts)
      };
    } catch (error) {
      logger.error(`Error comparing scenarios: ${error.message}`, { error: error.stack });
      throw new Error(`Failed to compare scenarios: ${error.message}`);
    }
  }

  /**
   * Generate a cache key for a scenario
   * 
   * @private
   * @param {Object} scenario - The scenario
   * @returns {string} - Cache key
   */
  _generateCacheKey(scenario) {
    return `${scenario.type}_${JSON.stringify(scenario.parameters)}`;
  }

  /**
   * Check if a string is a valid ISO date
   * 
   * @private
   * @param {string} dateStr - Date string to check
   * @returns {boolean} - True if valid ISO date
   */
  _isValidISODate(dateStr) {
    if (typeof dateStr !== 'string') return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Calculate impact for maintenance scenario
   * 
   * @private
   * @param {Object} parameters - Scenario parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Impact data
   */
  async _calculateMaintenanceImpact(parameters, options) {
    // Get affected stands
    const affectedStands = parameters.standIds || [];
    if (parameters.maintenanceId) {
      const maintenanceRequest = await maintenanceRequestService.getMaintenanceRequestById(parameters.maintenanceId);
      if (maintenanceRequest && maintenanceRequest.standIds) {
        affectedStands.push(...maintenanceRequest.standIds);
      }
    }

    // Get time window
    const timeWindow = {
      start: parameters.startTime || (parameters.timeWindow?.start),
      end: parameters.endTime || (parameters.timeWindow?.end)
    };

    // Calculate stand capacity impact
    const standImpact = await standCapacityService.calculateCapacityImpact({
      unavailableStands: [...new Set(affectedStands)],
      timeWindow
    });

    // Calculate flight impact
    const affectedFlights = await flightDataService.getFlightsForStands(
      [...new Set(affectedStands)],
      timeWindow.start,
      timeWindow.end
    );

    // Categorize affected flights by aircraft type
    const aircraftImpact = {
      narrowBody: 0,
      wideBody: 0,
      regional: 0
    };

    affectedFlights.forEach(flight => {
      if (flight.aircraftSize === 'narrow_body') aircraftImpact.narrowBody++;
      else if (flight.aircraftSize === 'wide_body') aircraftImpact.wideBody++;
      else if (flight.aircraftSize === 'regional') aircraftImpact.regional++;
    });

    // Calculate terminal impact based on stand locations
    const terminalImpact = {};
    for (const standId of affectedStands) {
      const stand = await db('stands').where('id', standId).first();
      if (stand && stand.terminal_id) {
        terminalImpact[stand.terminal_id] = (terminalImpact[stand.terminal_id] || 0) + 
          standImpact.standCapacityScore / affectedStands.length;
      }
    }

    // Determine peak hour impact
    const peakHourImpact = await this._calculatePeakHourImpact(timeWindow, affectedStands);

    // Calculate overall impact score
    const overallImpactScore = Math.min(1.0, (
      (standImpact.standCapacityScore * 0.4) +
      (peakHourImpact.reductionPercentage / 100 * 0.4) +
      (affectedFlights.length / 10 * 0.2)
    ));

    return {
      impactScore: overallImpactScore,
      maintenanceImpact: {
        affectedStandCount: affectedStands.length,
        standCapacityReduction: standImpact.standCapacityScore,
        flightsAffected: affectedFlights.length
      },
      aircraftCapacityImpact: aircraftImpact,
      terminalImpact,
      peakHourImpact,
      timeWindow
    };
  }

  /**
   * Calculate impact for flight schedule scenario
   * 
   * @private
   * @param {Object} parameters - Scenario parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Impact data
   */
  async _calculateFlightScheduleImpact(parameters, options) {
    // Implementation for flight schedule impact calculation
    // This would analyze how changes to flight schedules impact capacity
    
    // For production, this would be a complex calculation based on:
    // - Flight densities during time periods
    // - Stand utilization changes
    // - Aircraft size distributions
    // - Turn-around time impacts
    // - etc.
    
    // Sample implementation
    const flights = await flightDataService.getFlightsInTimeRange(
      parameters.startTime,
      parameters.endTime,
      { scheduleId: parameters.scheduleId }
    );
    
    // Group flights by hour to find peak periods
    const hourlyDistribution = this._calculateHourlyDistribution(flights);
    
    // Identify capacity constraints
    const capacityConstraints = await this._identifyCapacityConstraints(flights, hourlyDistribution);
    
    // Calculate overall impact score based on constraints severity
    const impactScore = this._calculateConstraintsImpactScore(capacityConstraints);
    
    return {
      impactScore,
      flightScheduleImpact: {
        totalFlights: flights.length,
        peakHourFlights: hourlyDistribution.peak.count,
        capacityConstraints
      },
      hourlyDistribution,
      timeWindow: {
        start: parameters.startTime,
        end: parameters.endTime
      }
    };
  }

  /**
   * Calculate impact for infrastructure change scenario
   * 
   * @private
   * @param {Object} parameters - Scenario parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Impact data
   */
  async _calculateInfrastructureImpact(parameters, options) {
    // Implementation for infrastructure impact
    // This would analyze how infrastructure changes impact capacity
    
    // Sample implementation
    const stands = parameters.addedStands || [];
    const removedStands = parameters.removedStands || [];
    
    // Calculate capacity change
    const capacityChange = await standCapacityService.calculateCapacityChange({
      addedStands: stands,
      removedStands
    });
    
    // Calculate impact on terminals
    const terminalImpact = await this._calculateTerminalImpact(stands, removedStands);
    
    return {
      impactScore: 1 - Math.min(1, Math.max(0, capacityChange.capacityChange + 0.5)),
      infrastructureImpact: {
        capacityChange: capacityChange.capacityChange,
        addedStandCount: stands.length,
        removedStandCount: removedStands.length
      },
      terminalImpact,
      timeWindow: {
        start: parameters.startTime,
        end: parameters.endTime
      }
    };
  }

  /**
   * Calculate impact for operational settings changes
   * 
   * @private
   * @param {Object} parameters - Scenario parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Impact data
   */
  async _calculateOperationalSettingsImpact(parameters, options) {
    // Implementation for operational settings impact
    // This would analyze how operational parameter changes impact capacity
    
    // Sample implementation - would be more sophisticated in production
    const settingsImpact = {
      bufferTimeChange: 0,
      turnaroundTimeChange: 0,
      maxOccupancyChange: 0
    };
    
    if (parameters.bufferTime) {
      settingsImpact.bufferTimeChange = parameters.bufferTime.new - parameters.bufferTime.current;
    }
    
    if (parameters.turnaroundTime) {
      settingsImpact.turnaroundTimeChange = parameters.turnaroundTime.new - parameters.turnaroundTime.current;
    }
    
    if (parameters.maxOccupancy) {
      settingsImpact.maxOccupancyChange = parameters.maxOccupancy.new - parameters.maxOccupancy.current;
    }
    
    // Calculate impact score - negative changes to times and positive to occupancy are improvements
    const impactScore = 0.5 - (
      (settingsImpact.bufferTimeChange / 60) * 0.3 + 
      (settingsImpact.turnaroundTimeChange / 60) * 0.3 + 
      (settingsImpact.maxOccupancyChange / 10) * -0.4
    );
    
    return {
      impactScore: Math.min(1, Math.max(0, impactScore)),
      operationalSettingsImpact: settingsImpact,
      timeWindow: {
        start: parameters.startTime,
        end: parameters.endTime
      }
    };
  }

  /**
   * Calculate peak hour impact
   * 
   * @private
   * @param {Object} timeWindow - Time window for analysis
   * @param {Array<string>} standIds - Affected stand IDs
   * @returns {Promise<Object>} - Peak hour impact data
   */
  async _calculatePeakHourImpact(timeWindow, standIds) {
    try {
      // Get flight schedule for the time period
      const flights = await flightDataService.getFlightsInTimeRange(
        timeWindow.start,
        timeWindow.end
      );
      
      // Group flights by hour
      const hourlyDistribution = {};
      
      for (const flight of flights) {
        const hour = new Date(flight.scheduledTime).getHours();
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      }
      
      // Find peak hour
      let peakHour = 0;
      let peakCount = 0;
      
      for (const [hour, count] of Object.entries(hourlyDistribution)) {
        if (count > peakCount) {
          peakCount = count;
          peakHour = parseInt(hour);
        }
      }
      
      // Calculate affected flights in peak hour
      const peakHourStart = new Date(timeWindow.start);
      peakHourStart.setHours(peakHour, 0, 0, 0);
      
      const peakHourEnd = new Date(peakHourStart);
      peakHourEnd.setHours(peakHour + 1, 0, 0, 0);
      
      const peakHourFlights = await flightDataService.getFlightsForStands(
        standIds,
        peakHourStart.toISOString(),
        peakHourEnd.toISOString()
      );
      
      // Calculate reduction percentage
      const reductionPercentage = peakCount > 0 
        ? (peakHourFlights.length / peakCount) * 100 
        : 0;
      
      return {
        startTime: `${peakHour}:00`,
        endTime: `${peakHour + 1}:00`,
        totalFlights: peakCount,
        affectedFlights: peakHourFlights.length,
        reductionPercentage
      };
    } catch (error) {
      logger.error(`Error calculating peak hour impact: ${error.message}`, { error: error.stack });
      return {
        startTime: "N/A",
        endTime: "N/A",
        totalFlights: 0,
        affectedFlights: 0,
        reductionPercentage: 0
      };
    }
  }

  /**
   * Calculate hourly flight distribution
   * 
   * @private
   * @param {Array<Object>} flights - Flight data
   * @returns {Object} - Hourly distribution
   */
  _calculateHourlyDistribution(flights) {
    const hourly = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    let peakHour = 0;
    let peakCount = 0;
    
    for (const flight of flights) {
      const hour = new Date(flight.scheduledTime).getHours();
      hourly[hour].count++;
      
      if (hourly[hour].count > peakCount) {
        peakCount = hourly[hour].count;
        peakHour = hour;
      }
    }
    
    return {
      hourly,
      peak: {
        hour: peakHour,
        count: peakCount,
        startTime: `${peakHour}:00`,
        endTime: `${peakHour + 1}:00`
      }
    };
  }

  /**
   * Identify capacity constraints for a set of flights
   * 
   * @private
   * @param {Array<Object>} flights - Flight data
   * @param {Object} hourlyDistribution - Hourly distribution data
   * @returns {Promise<Array<Object>>} - Capacity constraints
   */
  async _identifyCapacityConstraints(flights, hourlyDistribution) {
    const constraints = [];
    const peakHour = hourlyDistribution.peak.hour;
    
    // Check stand capacity constraints
    const standCapacity = await standCapacityService.getStandCapacity();
    
    if (hourlyDistribution.peak.count > standCapacity.maxFlights) {
      constraints.push({
        type: 'stand_capacity',
        severity: 'high',
        description: `Peak hour flights (${hourlyDistribution.peak.count}) exceed maximum stand capacity (${standCapacity.maxFlights})`,
        impactScore: Math.min(1, (hourlyDistribution.peak.count - standCapacity.maxFlights) / standCapacity.maxFlights)
      });
    }
    
    // Check aircraft size constraints
    const widebodyFlights = flights.filter(f => f.aircraftSize === 'wide_body');
    const widebodyCapacity = standCapacity.widebody;
    
    if (widebodyFlights.length > widebodyCapacity) {
      constraints.push({
        type: 'widebody_capacity',
        severity: 'medium',
        description: `Widebody flights (${widebodyFlights.length}) exceed widebody stand capacity (${widebodyCapacity})`,
        impactScore: Math.min(1, (widebodyFlights.length - widebodyCapacity) / widebodyCapacity)
      });
    }
    
    // Check terminal balance
    const terminalFlights = {};
    for (const flight of flights) {
      if (flight.terminalId) {
        terminalFlights[flight.terminalId] = (terminalFlights[flight.terminalId] || 0) + 1;
      }
    }
    
    const terminals = Object.keys(terminalFlights);
    if (terminals.length > 1) {
      const maxTerminal = terminals.reduce((a, b) => terminalFlights[a] > terminalFlights[b] ? a : b);
      const minTerminal = terminals.reduce((a, b) => terminalFlights[a] < terminalFlights[b] ? a : b);
      const imbalance = terminalFlights[maxTerminal] / terminalFlights[minTerminal];
      
      if (imbalance > 2) {
        constraints.push({
          type: 'terminal_imbalance',
          severity: 'low',
          description: `Terminal utilization is imbalanced (${maxTerminal}: ${terminalFlights[maxTerminal]}, ${minTerminal}: ${terminalFlights[minTerminal]})`,
          impactScore: Math.min(1, (imbalance - 2) / 3)
        });
      }
    }
    
    return constraints;
  }

  /**
   * Calculate impact score based on constraints
   * 
   * @private
   * @param {Array<Object>} constraints - Capacity constraints
   * @returns {number} - Impact score
   */
  _calculateConstraintsImpactScore(constraints) {
    if (constraints.length === 0) return 0;
    
    const severityWeights = {
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const constraint of constraints) {
      const weight = severityWeights[constraint.severity] || 0.3;
      totalScore += constraint.impactScore * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate terminal impact
   * 
   * @private
   * @param {Array<Object>} addedStands - Added stands
   * @param {Array<Object>} removedStands - Removed stands
   * @returns {Promise<Object>} - Terminal impact data
   */
  async _calculateTerminalImpact(addedStands, removedStands) {
    const terminalImpact = {};
    
    // Process added stands
    for (const stand of addedStands) {
      if (stand.terminalId) {
        terminalImpact[stand.terminalId] = (terminalImpact[stand.terminalId] || 0) + 0.1;
      }
    }
    
    // Process removed stands
    for (const standId of removedStands) {
      const stand = await db('stands').where('id', standId).first();
      if (stand && stand.terminal_id) {
        terminalImpact[stand.terminal_id] = (terminalImpact[stand.terminal_id] || 0) - 0.15;
      }
    }
    
    return terminalImpact;
  }

  /**
   * Enrich impact data with cross-cutting metrics
   * 
   * @private
   * @param {Object} impactData - Impact data
   * @param {Object} scenario - Scenario
   * @returns {Promise<Object>} - Enriched impact data
   */
  async _enrichWithCrossCuttingMetrics(impactData, scenario) {
    // Add resilience score
    impactData.resilienceImpact = 1 - impactData.impactScore;
    
    // Add affected entities
    impactData.affectedEntities = await this._calculateAffectedEntities(impactData, scenario);
    
    // Add recommendation rating
    impactData.recommendationRating = impactData.impactScore < 0.3 ? 'recommended' :
      impactData.impactScore < 0.6 ? 'acceptable' : 'not_recommended';
    
    return impactData;
  }

  /**
   * Calculate affected entities
   * 
   * @private
   * @param {Object} impactData - Impact data
   * @param {Object} scenario - Scenario
   * @returns {Promise<Object>} - Affected entities data
   */
  async _calculateAffectedEntities(impactData, scenario) {
    // This would be more complex in production
    return {
      airlines: await this._getAffectedAirlines(scenario),
      handlers: await this._getAffectedHandlers(scenario),
      passengerCount: this._estimateAffectedPassengers(impactData)
    };
  }

  /**
   * Get affected airlines
   * 
   * @private
   * @param {Object} scenario - Scenario
   * @returns {Promise<Array<string>>} - Affected airline IDs
   */
  async _getAffectedAirlines(scenario) {
    // Implementation would connect to airline repository
    // Simplified version for now
    return ['AAL', 'BAW', 'DLH'].slice(0, Math.floor(Math.random() * 3) + 1);
  }

  /**
   * Get affected ground handlers
   * 
   * @private
   * @param {Object} scenario - Scenario
   * @returns {Promise<Array<string>>} - Affected handler IDs
   */
  async _getAffectedHandlers(scenario) {
    // Implementation would connect to GHA repository
    // Simplified version for now
    return ['Swissport', 'Menzies'].slice(0, Math.floor(Math.random() * 2) + 1);
  }

  /**
   * Estimate affected passengers
   * 
   * @private
   * @param {Object} impactData - Impact data
   * @returns {number} - Estimated passenger count
   */
  _estimateAffectedPassengers(impactData) {
    // Simple estimation based on flight counts
    // In production, this would use actual passenger data
    const flightsAffected = impactData.maintenanceImpact?.flightsAffected || 
      impactData.flightScheduleImpact?.totalFlights || 0;
    
    // Assume average 150 passengers per flight
    return flightsAffected * 150;
  }

  /**
   * Generate alternative solutions
   * 
   * @private
   * @param {Object} scenario - Scenario
   * @param {Object} impactData - Impact data
   * @returns {Promise<Array<Object>>} - Alternative solutions
   */
  async _generateAlternativeSolutions(scenario, impactData) {
    const alternatives = [];
    
    switch (scenario.type) {
      case 'maintenance':
        // Suggest time adjustments
        alternatives.push({
          description: 'Reschedule maintenance to off-peak hours',
          capacityGain: 0.12,
          implementationComplexity: 'medium',
          details: {
            suggestedTimeWindow: await this._suggestOffPeakTimeWindow(scenario.parameters.timeWindow)
          }
        });
        
        // Suggest partial closures
        alternatives.push({
          description: 'Implement phased maintenance approach',
          capacityGain: 0.08,
          implementationComplexity: 'high',
          details: {
            phases: [
              { stands: scenario.parameters.standIds.slice(0, Math.ceil(scenario.parameters.standIds.length / 2)) },
              { stands: scenario.parameters.standIds.slice(Math.ceil(scenario.parameters.standIds.length / 2)) }
            ]
          }
        });
        break;
        
      case 'flight_schedule':
        // Suggest flight redistributions
        alternatives.push({
          description: 'Redistribute peak hour flights',
          capacityGain: 0.15,
          implementationComplexity: 'medium',
          details: {
            peakHour: impactData.hourlyDistribution.peak,
            suggestedRedistribution: await this._suggestFlightRedistribution(impactData.hourlyDistribution)
          }
        });
        break;
        
      // Add more cases for other scenario types
    }
    
    return alternatives;
  }

  /**
   * Suggest off-peak time window
   * 
   * @private
   * @param {Object} currentTimeWindow - Current time window
   * @returns {Promise<Object>} - Suggested time window
   */
  async _suggestOffPeakTimeWindow(currentTimeWindow) {
    // Implementation would analyze flight data to find optimal windows
    // Simplified version for now
    return {
      start: '22:00:00',
      end: '05:00:00',
      capacityImpact: 0.3
    };
  }

  /**
   * Suggest flight redistribution
   * 
   * @private
   * @param {Object} hourlyDistribution - Hourly distribution data
   * @returns {Promise<Object>} - Suggested redistribution
   */
  async _suggestFlightRedistribution(hourlyDistribution) {
    // Find low-utilization hours
    const lowUtilizationHours = hourlyDistribution.hourly
      .filter(h => h.count < hourlyDistribution.peak.count / 2)
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(h => h.hour);
    
    return {
      fromHour: hourlyDistribution.peak.hour,
      toHours: lowUtilizationHours,
      flightsToMove: Math.ceil(hourlyDistribution.peak.count * 0.2),
      capacityImpact: 0.15
    };
  }

  /**
   * Generate comparison metrics for scenarios
   * 
   * @private
   * @param {Array<Object>} impacts - Impact data for scenarios
   * @returns {Object} - Comparison metrics
   */
  _generateComparisonMetrics(impacts) {
    // Calculate average values
    const avgImpactScore = impacts.reduce((sum, impact) => sum + impact.impactScore, 0) / impacts.length;
    
    // Calculate spread and variance
    const impactScores = impacts.map(impact => impact.impactScore);
    const minScore = Math.min(...impactScores);
    const maxScore = Math.max(...impactScores);
    const scoreRange = maxScore - minScore;
    
    // Calculate variance
    const variance = impactScores.reduce((sum, score) => sum + Math.pow(score - avgImpactScore, 2), 0) / impacts.length;
    
    return {
      averageImpactScore: avgImpactScore,
      minImpactScore: minScore,
      maxImpactScore: maxScore,
      impactScoreRange: scoreRange,
      impactScoreVariance: variance,
      significantDifference: scoreRange > 0.2
    };
  }

  /**
   * Calculate trend direction
   * 
   * @private
   * @param {Array<number>} changes - Change values
   * @returns {string} - Trend direction
   */
  _calculateTrendDirection(changes) {
    if (changes.length < 2) return 'neutral';
    
    const positiveChanges = changes.filter(c => c > 0).length;
    const negativeChanges = changes.filter(c => c < 0).length;
    
    if (positiveChanges > negativeChanges * 2) return 'strongly_positive';
    if (positiveChanges > negativeChanges) return 'positive';
    if (negativeChanges > positiveChanges * 2) return 'strongly_negative';
    if (negativeChanges > positiveChanges) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate volatility
   * 
   * @private
   * @param {Array<number>} changes - Change values
   * @returns {string} - Volatility level
   */
  _calculateVolatility(changes) {
    if (changes.length < 2) return 'low';
    
    const avgChange = changes.reduce((sum, val) => sum + Math.abs(val), 0) / changes.length;
    
    if (avgChange > 0.2) return 'high';
    if (avgChange > 0.1) return 'medium';
    return 'low';
  }
  
  /**
   * Clear the calculation cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Capacity impact calculation cache cleared');
  }
  
  /**
   * Set the cache TTL
   * 
   * @param {number} milliseconds - TTL in milliseconds
   */
  setCacheTTL(milliseconds) {
    if (typeof milliseconds !== 'number' || milliseconds < 0) {
      throw new Error('Cache TTL must be a positive number');
    }
    this.cacheTTL = milliseconds;
    logger.debug(`Capacity impact calculation cache TTL set to ${milliseconds}ms`);
  }
}

// Export a singleton instance
module.exports = new AggregatedCapacityImpactService();