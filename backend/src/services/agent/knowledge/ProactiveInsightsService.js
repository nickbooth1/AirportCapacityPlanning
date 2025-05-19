/**
 * ProactiveInsightsService.js
 * 
 * This service generates proactive insights and recommendations based on airport data
 * without requiring explicit user queries. It analyzes data patterns, identifies trends,
 * anomalies, and opportunities, then surfaces relevant insights to users.
 * 
 * Key features:
 * - Data pattern monitoring and anomaly detection
 * - Trend analysis and forecasting
 * - Scheduled and event-triggered insight generation
 * - Prioritization of insights based on impact and relevance
 * - Context-aware recommendations
 * - User feedback incorporation for improved insight quality
 */

const logger = require('../../../utils/logger');
const OpenAIService = require('../OpenAIService');
const KnowledgeRetrievalService = require('./KnowledgeRetrievalService');
const { performance } = require('perf_hooks');

class ProactiveInsightsService {
  /**
   * Initialize the proactive insights service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.knowledgeRetrievalService = services.knowledgeRetrievalService || new KnowledgeRetrievalService(services);
    this.workingMemoryService = services.workingMemoryService;
    this.standDataService = services.standDataService;
    this.maintenanceDataService = services.maintenanceDataService;
    this.airportConfigService = services.airportConfigService;
    this.flightDataService = services.flightDataService;
    
    // Configure options
    this.options = {
      insightGenerationFrequency: options.insightGenerationFrequency || 3600000, // 1 hour by default
      maxInsightsPerBatch: options.maxInsightsPerBatch || 5,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.7,
      priorityThresholds: options.priorityThresholds || {
        high: 0.9,   // Confidence threshold for high priority
        medium: 0.8, // Confidence threshold for medium priority
        low: 0.7     // Confidence threshold for low priority
      },
      insightTypes: options.insightTypes || [
        'capacity_bottleneck',
        'maintenance_impact',
        'utilization_anomaly',
        'schedule_conflict',
        'allocation_optimization',
        'operational_efficiency',
        'upcoming_peak_demand',
        'resource_availability'
      ],
      enabledScheduledInsights: options.enabledScheduledInsights !== false,
      enabledEventTriggeredInsights: options.enabledEventTriggeredInsights !== false,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Initialize insight storage
    this.recentInsights = [];
    this.insightHistory = [];
    this.maxRecentInsights = options.maxRecentInsights || 100;
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    // Initialize scheduler if enabled
    if (this.options.enabledScheduledInsights) {
      this.scheduleInsightGeneration();
    }
    
    // Performance metrics
    this.metrics = {
      totalInsightsGenerated: 0,
      scheduledInsightsGenerated: 0,
      eventTriggeredInsightsGenerated: 0,
      insightsByType: {},
      insightsByPriority: {
        high: 0,
        medium: 0,
        low: 0
      },
      averageGenerationTimeMs: 0,
      totalGenerationTimeMs: 0
    };
    
    this.logger.info('ProactiveInsightsService initialized');
  }
  
  /**
   * Schedule regular insight generation
   * 
   * @private
   */
  scheduleInsightGeneration() {
    // Clear any existing interval
    if (this.insightGenerationInterval) {
      clearInterval(this.insightGenerationInterval);
    }
    
    // Set up new interval
    this.insightGenerationInterval = setInterval(async () => {
      try {
        this.logger.info('Running scheduled insight generation');
        await this.generateScheduledInsights();
      } catch (error) {
        this.logger.error(`Error in scheduled insight generation: ${error.message}`, error);
      }
    }, this.options.insightGenerationFrequency);
    
    this.logger.info(`Scheduled insight generation every ${this.options.insightGenerationFrequency / 60000} minutes`);
  }
  
  /**
   * Stop scheduled insight generation
   */
  stopScheduledInsightGeneration() {
    if (this.insightGenerationInterval) {
      clearInterval(this.insightGenerationInterval);
      this.insightGenerationInterval = null;
      this.logger.info('Stopped scheduled insight generation');
    }
  }
  
  /**
   * Generate insights on a scheduled basis
   * 
   * @returns {Promise<Array>} - Generated insights
   */
  async generateScheduledInsights() {
    const startTime = performance.now();
    
    try {
      // Collect data for analysis
      const data = await this._collectDataForAnalysis();
      
      // Generate insights based on collected data
      const insights = await this._analyzeDataForInsights(data, { isScheduled: true });
      
      // Filter insights by confidence threshold
      const filteredInsights = insights.filter(insight => 
        insight.confidence >= this.options.minConfidenceThreshold
      );
      
      // Assign priorities based on confidence
      const prioritizedInsights = this._assignPrioritiesToInsights(filteredInsights);
      
      // Limit to max insights per batch
      const limitedInsights = prioritizedInsights.slice(0, this.options.maxInsightsPerBatch);
      
      // Store and track generated insights
      this._storeInsights(limitedInsights, 'scheduled');
      
      // Update metrics
      this.metrics.scheduledInsightsGenerated += limitedInsights.length;
      this.metrics.totalInsightsGenerated += limitedInsights.length;
      this.metrics.totalGenerationTimeMs += (performance.now() - startTime);
      this.metrics.averageGenerationTimeMs = this.metrics.totalGenerationTimeMs / this.metrics.totalInsightsGenerated;
      
      return limitedInsights;
    } catch (error) {
      this.logger.error(`Error generating scheduled insights: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Generate insights in response to specific events
   * 
   * @param {string} eventType - Type of event that triggered insight generation
   * @param {Object} eventData - Data related to the event
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} - Generated insights
   */
  async generateEventTriggeredInsights(eventType, eventData, options = {}) {
    if (!this.options.enabledEventTriggeredInsights) {
      this.logger.info('Event-triggered insights are disabled');
      return [];
    }
    
    const startTime = performance.now();
    
    try {
      // Determine relevant data sources based on event type
      const relevantDataSources = this._determineRelevantDataSources(eventType);
      
      // Collect data for analysis
      const data = await this._collectDataForAnalysis(relevantDataSources);
      
      // Add event-specific data
      const analysisData = {
        ...data,
        eventType,
        eventData
      };
      
      // Generate insights based on collected data and event
      const insights = await this._analyzeDataForInsights(
        analysisData, 
        { isScheduled: false, eventTriggered: true, eventType }
      );
      
      // Filter insights by confidence threshold
      const confidenceThreshold = options.minConfidenceThreshold || this.options.minConfidenceThreshold;
      const filteredInsights = insights.filter(insight => 
        insight.confidence >= confidenceThreshold
      );
      
      // Assign priorities based on confidence
      const prioritizedInsights = this._assignPrioritiesToInsights(filteredInsights);
      
      // Limit to max insights
      const maxInsights = options.maxInsights || this.options.maxInsightsPerBatch;
      const limitedInsights = prioritizedInsights.slice(0, maxInsights);
      
      // Store and track generated insights
      this._storeInsights(limitedInsights, 'event-triggered');
      
      // Update metrics
      this.metrics.eventTriggeredInsightsGenerated += limitedInsights.length;
      this.metrics.totalInsightsGenerated += limitedInsights.length;
      this.metrics.totalGenerationTimeMs += (performance.now() - startTime);
      this.metrics.averageGenerationTimeMs = this.metrics.totalGenerationTimeMs / this.metrics.totalInsightsGenerated;
      
      return limitedInsights;
    } catch (error) {
      this.logger.error(`Error generating event-triggered insights for ${eventType}: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Generate insights based on a specific focus area
   * 
   * @param {string} focusArea - The area to focus insight generation on
   * @param {Object} context - Additional context information
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} - Generated insights
   */
  async generateFocusedInsights(focusArea, context = {}, options = {}) {
    const startTime = performance.now();
    
    try {
      // Determine relevant data sources based on focus area
      const relevantDataSources = this._determineRelevantDataSources(focusArea);
      
      // Collect data for analysis
      const data = await this._collectDataForAnalysis(relevantDataSources);
      
      // Add focus-specific context
      const analysisData = {
        ...data,
        focusArea,
        context
      };
      
      // Generate insights focused on the specific area
      const insights = await this._analyzeDataForInsights(
        analysisData, 
        { isScheduled: false, focusArea }
      );
      
      // Filter insights by confidence threshold
      const confidenceThreshold = options.minConfidenceThreshold || this.options.minConfidenceThreshold;
      const filteredInsights = insights.filter(insight => 
        insight.confidence >= confidenceThreshold
      );
      
      // Assign priorities based on confidence
      const prioritizedInsights = this._assignPrioritiesToInsights(filteredInsights);
      
      // Limit to max insights
      const maxInsights = options.maxInsights || this.options.maxInsightsPerBatch;
      const limitedInsights = prioritizedInsights.slice(0, maxInsights);
      
      // Store and track generated insights
      this._storeInsights(limitedInsights, 'focused');
      
      // Update metrics
      this.metrics.totalInsightsGenerated += limitedInsights.length;
      this.metrics.totalGenerationTimeMs += (performance.now() - startTime);
      this.metrics.averageGenerationTimeMs = this.metrics.totalGenerationTimeMs / this.metrics.totalInsightsGenerated;
      
      // Track insights by focus area
      const metricKey = `focused_${focusArea}`;
      this.metrics[metricKey] = (this.metrics[metricKey] || 0) + limitedInsights.length;
      
      return limitedInsights;
    } catch (error) {
      this.logger.error(`Error generating focused insights for ${focusArea}: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Collect data from various sources for insight analysis
   * 
   * @private
   * @param {Array} dataSources - Optional array of specific data sources to collect
   * @returns {Promise<Object>} - Collected data
   */
  async _collectDataForAnalysis(dataSources = null) {
    const allDataSources = [
      'stands',
      'maintenance',
      'capacity',
      'flights',
      'utilization',
      'configuration'
    ];
    
    const sourcesToCollect = dataSources || allDataSources;
    const data = {};
    
    try {
      // Collect data from each source in parallel
      const collectPromises = [];
      
      if (sourcesToCollect.includes('stands') && this.standDataService) {
        collectPromises.push(
          this.standDataService.getStands()
            .then(stands => data.stands = stands)
            .catch(error => {
              this.logger.warn(`Error collecting stand data: ${error.message}`);
              data.stands = [];
            })
        );
      }
      
      if (sourcesToCollect.includes('maintenance') && this.maintenanceDataService) {
        collectPromises.push(
          this.maintenanceDataService.getUpcomingMaintenanceEvents()
            .then(maintenance => data.maintenance = maintenance)
            .catch(error => {
              this.logger.warn(`Error collecting maintenance data: ${error.message}`);
              data.maintenance = [];
            })
        );
      }
      
      if (sourcesToCollect.includes('capacity') && this.airportConfigService) {
        collectPromises.push(
          this.airportConfigService.getOperationalSettings()
            .then(settings => data.capacity = settings)
            .catch(error => {
              this.logger.warn(`Error collecting capacity data: ${error.message}`);
              data.capacity = {};
            })
        );
      }
      
      if (sourcesToCollect.includes('flights') && this.flightDataService) {
        collectPromises.push(
          this.flightDataService.getFlights({ limit: 1000 })
            .then(flights => data.flights = flights)
            .catch(error => {
              this.logger.warn(`Error collecting flight data: ${error.message}`);
              data.flights = [];
            })
        );
      }
      
      if (sourcesToCollect.includes('utilization') && this.standDataService) {
        collectPromises.push(
          this.standDataService.getStandUtilization()
            .then(utilization => data.utilization = utilization)
            .catch(error => {
              this.logger.warn(`Error collecting utilization data: ${error.message}`);
              data.utilization = [];
            })
        );
      }
      
      if (sourcesToCollect.includes('configuration') && this.airportConfigService) {
        collectPromises.push(
          Promise.all([
            this.airportConfigService.getTerminals(),
            this.airportConfigService.getPiers()
          ])
            .then(([terminals, piers]) => {
              data.configuration = { terminals, piers };
            })
            .catch(error => {
              this.logger.warn(`Error collecting configuration data: ${error.message}`);
              data.configuration = { terminals: [], piers: [] };
            })
        );
      }
      
      // Wait for all data collection to complete
      await Promise.all(collectPromises);
      
      // Add timestamp
      data.timestamp = new Date().toISOString();
      
      return data;
    } catch (error) {
      this.logger.error(`Error collecting data for analysis: ${error.message}`, error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Analyze data to generate insights
   * 
   * @private
   * @param {Object} data - Collected data for analysis
   * @param {Object} options - Analysis options
   * @returns {Promise<Array>} - Generated insights
   */
  async _analyzeDataForInsights(data, options = {}) {
    try {
      // Create system prompt based on analysis type
      const systemPrompt = this._createInsightAnalysisPrompt(data, options);
      
      // Format data for analysis
      const dataJson = JSON.stringify(data, (key, value) => {
        // Handle circular references and limit large arrays
        if (Array.isArray(value) && value.length > 100) {
          return value.slice(0, 100).concat([`... ${value.length - 100} more items`]);
        }
        return value;
      }, 2);
      
      // Create user prompt with data
      const userPrompt = `Generate proactive insights based on the following airport data:
      
${dataJson}

Based on this data, identify noteworthy patterns, anomalies, opportunities, or potential issues.
Focus on findings that would be valuable for airport capacity planning and operations.`;

      // Generate insights using OpenAI
      const completion = await this.openAIService.processQuery(
        userPrompt,
        [],
        systemPrompt
      );
      
      // Parse the JSON response
      try {
        // Extract JSON from response
        const jsonMatch = completion.text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
        
        const insights = JSON.parse(jsonStr);
        
        // Add generation metadata
        const enhancedInsights = insights.map(insight => ({
          ...insight,
          generatedAt: new Date().toISOString(),
          source: options.isScheduled ? 'scheduled' : (options.eventTriggered ? `event-${options.eventType}` : 'focused'),
          id: `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }));
        
        return enhancedInsights;
      } catch (parseError) {
        this.logger.warn(`Failed to parse insights: ${parseError.message}`);
        // Fallback to returning a simplified insight about the parse error
        return [{
          title: 'System encountered an issue analyzing data',
          description: 'The system was unable to generate insights from the current data.',
          type: 'system_issue',
          confidence: 0.5,
          generatedAt: new Date().toISOString(),
          source: options.isScheduled ? 'scheduled' : (options.eventTriggered ? `event-${options.eventType}` : 'focused'),
          id: `insight-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          error: parseError.message
        }];
      }
    } catch (error) {
      this.logger.error(`Error analyzing data for insights: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Create system prompt for insight analysis
   * 
   * @private
   * @param {Object} data - Data for analysis
   * @param {Object} options - Analysis options
   * @returns {string} - System prompt
   */
  _createInsightAnalysisPrompt(data, options) {
    const basePrompt = `You are an AI assistant specialized in airport capacity planning insights.
Your task is to analyze airport data and generate proactive insights that would be valuable for planning and operations.
${options.isScheduled ? 'This is a scheduled analysis to identify emerging patterns and opportunities.' : ''}
${options.eventTriggered ? `This analysis was triggered by a ${options.eventType} event.` : ''}
${options.focusArea ? `Focus specifically on insights related to ${options.focusArea}.` : ''}

For each insight, provide:
1. A concise title summarizing the insight
2. A detailed description explaining what was found and why it matters
3. The insight type (${this.options.insightTypes.join(', ')})
4. A confidence score (0.0 to 1.0) indicating your confidence in the insight
5. Supporting data points or evidence from the provided data
6. Recommended actions or next steps based on this insight
7. Potential impact if the insight is addressed or ignored

Focus on insights that are:
- Actionable: Suggest specific actions that can be taken
- Timely: Relevant to current or upcoming operations
- Impactful: Have significant potential impact on capacity or efficiency
- Novel: Not obvious or already known to operators
- Data-driven: Supported by the data provided

Return your insights as a JSON array, with each insight as an object with these properties:
- title: A short, descriptive title
- description: A detailed explanation of the insight
- type: The category of insight (from the list above)
- confidence: Confidence score (0.0 to 1.0)
- evidence: Key data points that support this insight
- recommendations: Suggested actions or next steps
- impact: Potential impact if addressed or ignored
- timeRelevance: When this insight is relevant (immediate, short-term, long-term)`;

    // Add specific guidance based on options
    let additionalGuidance = '';
    
    if (options.isScheduled) {
      additionalGuidance += `\n\nFor scheduled insights, prioritize identifying:
- Emerging trends that might not be immediately obvious
- Opportunities for optimization that don't require immediate action
- Potential future bottlenecks that could be addressed proactively
- Patterns across multiple data points that reveal systemic issues`;
    }
    
    if (options.eventTriggered) {
      additionalGuidance += `\n\nFor event-triggered insights, focus on:
- Direct impacts of the ${options.eventType} event
- Required adjustments to operations or capacity
- Cascading effects that might not be immediately apparent
- Time-sensitive actions needed to mitigate impacts`;
    }
    
    if (options.focusArea) {
      additionalGuidance += `\n\nFor ${options.focusArea} insights, emphasize:
- Specific details relevant to this focus area
- Targeted recommendations that specialist teams can implement
- Comparative analysis with historical patterns in this area
- Key metrics and KPIs specific to this domain`;
    }
    
    // Limit the number of insights based on options
    const insightCountGuidance = `\n\nGenerate between ${options.minInsights || 1} and ${options.maxInsights || this.options.maxInsightsPerBatch} high-quality insights.
Prioritize quality and specificity over quantity.`;
    
    return basePrompt + additionalGuidance + insightCountGuidance;
  }
  
  /**
   * Assign priorities to insights based on confidence and criteria
   * 
   * @private
   * @param {Array} insights - Insights to prioritize
   * @returns {Array} - Prioritized insights
   */
  _assignPrioritiesToInsights(insights) {
    return insights.map(insight => {
      let priority = 'low';
      
      // Base priority on confidence
      if (insight.confidence >= this.options.priorityThresholds.high) {
        priority = 'high';
      } else if (insight.confidence >= this.options.priorityThresholds.medium) {
        priority = 'medium';
      }
      
      // Adjust priority based on time relevance
      if (insight.timeRelevance === 'immediate') {
        // Bump priority up one level if it's immediate
        if (priority === 'low') priority = 'medium';
        else if (priority === 'medium') priority = 'high';
      } else if (insight.timeRelevance === 'long-term' && priority === 'high') {
        // Lower priority for long-term insights
        priority = 'medium';
      }
      
      // Update metrics
      this.metrics.insightsByPriority[priority]++;
      
      // Track by type
      const type = insight.type || 'unknown';
      this.metrics.insightsByType[type] = (this.metrics.insightsByType[type] || 0) + 1;
      
      return {
        ...insight,
        priority
      };
    }).sort((a, b) => {
      // Sort by priority (high to low) then by confidence
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }
  
  /**
   * Store insights in memory
   * 
   * @private
   * @param {Array} insights - Insights to store
   * @param {string} source - Source of insights
   */
  _storeInsights(insights, source) {
    // Add to recent insights
    this.recentInsights.unshift(...insights);
    
    // Trim to max size
    if (this.recentInsights.length > this.maxRecentInsights) {
      const excessInsights = this.recentInsights.splice(this.maxRecentInsights);
      
      // Move excess to history
      this.insightHistory.unshift(...excessInsights);
      
      // Trim history to max size
      if (this.insightHistory.length > this.maxHistorySize) {
        this.insightHistory.length = this.maxHistorySize;
      }
    }
    
    // Log insight generation
    this.logger.info(`Generated ${insights.length} ${source} insights`);
  }
  
  /**
   * Determine relevant data sources for a specific focus area or event
   * 
   * @private
   * @param {string} focusOrEventType - Focus area or event type
   * @returns {Array} - Relevant data sources
   */
  _determineRelevantDataSources(focusOrEventType) {
    // Define mappings of focus areas/events to relevant data sources
    const sourceMappings = {
      // Focus areas
      'capacity': ['stands', 'capacity', 'utilization', 'configuration'],
      'maintenance': ['stands', 'maintenance', 'capacity'],
      'allocation': ['stands', 'flights', 'utilization'],
      'terminal': ['stands', 'configuration', 'utilization'],
      'scheduling': ['flights', 'maintenance', 'capacity'],
      'utilization': ['stands', 'utilization', 'flights'],
      'bottlenecks': ['stands', 'utilization', 'capacity', 'configuration'],
      'efficiency': ['stands', 'flights', 'utilization'],
      
      // Event types
      'maintenance_created': ['stands', 'maintenance', 'capacity'],
      'maintenance_updated': ['stands', 'maintenance', 'capacity'],
      'flight_schedule_updated': ['flights', 'stands', 'utilization'],
      'stand_status_changed': ['stands', 'maintenance'],
      'capacity_changed': ['capacity', 'stands', 'utilization'],
      'allocation_conflict': ['stands', 'flights', 'utilization'],
      'high_utilization_detected': ['stands', 'utilization', 'flights'],
      'terminal_configuration_change': ['configuration', 'stands', 'capacity']
    };
    
    return sourceMappings[focusOrEventType] || null;
  }
  
  /**
   * Provide feedback on an insight (user action)
   * 
   * @param {string} insightId - ID of the insight
   * @param {string} feedbackType - Type of feedback (helpful, not_helpful, implemented, etc.)
   * @param {Object} details - Additional feedback details
   * @returns {boolean} - Success indicator
   */
  provideFeedback(insightId, feedbackType, details = {}) {
    try {
      // Find the insight in recent or history
      let insight = this.recentInsights.find(item => item.id === insightId);
      
      if (!insight) {
        insight = this.insightHistory.find(item => item.id === insightId);
      }
      
      if (!insight) {
        this.logger.warn(`Insight with ID ${insightId} not found for feedback`);
        return false;
      }
      
      // Add feedback to the insight
      insight.feedback = insight.feedback || [];
      insight.feedback.push({
        type: feedbackType,
        timestamp: new Date().toISOString(),
        details
      });
      
      // Update last feedback type for easy access
      insight.lastFeedbackType = feedbackType;
      
      // Log feedback
      this.logger.info(`Received ${feedbackType} feedback for insight ${insightId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error processing insight feedback: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Get recent insights based on filters
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.type - Filter by insight type
   * @param {string} filters.priority - Filter by priority
   * @param {string} filters.source - Filter by source
   * @param {number} filters.limit - Maximum number of insights to return
   * @returns {Array} - Filtered insights
   */
  getRecentInsights(filters = {}) {
    try {
      let filteredInsights = [...this.recentInsights];
      
      // Apply type filter
      if (filters.type) {
        filteredInsights = filteredInsights.filter(insight => insight.type === filters.type);
      }
      
      // Apply priority filter
      if (filters.priority) {
        filteredInsights = filteredInsights.filter(insight => insight.priority === filters.priority);
      }
      
      // Apply source filter
      if (filters.source) {
        filteredInsights = filteredInsights.filter(insight => insight.source === filters.source);
      }
      
      // Apply time relevance filter
      if (filters.timeRelevance) {
        filteredInsights = filteredInsights.filter(insight => insight.timeRelevance === filters.timeRelevance);
      }
      
      // Apply limit
      const limit = filters.limit || this.recentInsights.length;
      return filteredInsights.slice(0, limit);
    } catch (error) {
      this.logger.error(`Error retrieving recent insights: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Get a specific insight by ID
   * 
   * @param {string} insightId - ID of the insight to retrieve
   * @returns {Object|null} - The insight or null if not found
   */
  getInsightById(insightId) {
    try {
      // Look in recent insights first
      let insight = this.recentInsights.find(item => item.id === insightId);
      
      // If not found, check history
      if (!insight) {
        insight = this.insightHistory.find(item => item.id === insightId);
      }
      
      return insight || null;
    } catch (error) {
      this.logger.error(`Error retrieving insight by ID: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Generate a daily summary of insights
   * 
   * @returns {Promise<Object>} - Summary of insights
   */
  async generateDailySummary() {
    try {
      // Collect insights from the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentInsights = this.recentInsights.filter(insight => {
        const insightDate = new Date(insight.generatedAt);
        return insightDate >= oneDayAgo;
      });
      
      // Get insights by priority
      const highPriorityInsights = recentInsights.filter(i => i.priority === 'high');
      const mediumPriorityInsights = recentInsights.filter(i => i.priority === 'medium');
      
      // Create summary content
      const summaryData = {
        totalInsights: recentInsights.length,
        highPriorityCount: highPriorityInsights.length,
        mediumPriorityCount: mediumPriorityInsights.length,
        byType: Object.entries(
          recentInsights.reduce((acc, insight) => {
            acc[insight.type] = (acc[insight.type] || 0) + 1;
            return acc;
          }, {})
        ),
        topInsights: highPriorityInsights.slice(0, 3),
        implementedCount: recentInsights.filter(i => 
          i.feedback && i.feedback.some(f => f.type === 'implemented')
        ).length
      };
      
      // Generate summary text
      const summaryPrompt = `Generate a concise daily summary of airport capacity insights:

Summary Data:
${JSON.stringify(summaryData, null, 2)}

Please create a brief summary with:
1. A high-level overview of insights generated
2. Key statistics on priorities and types
3. Brief description of the top 3 high-priority insights
4. Any notable patterns or trends across insights

Keep the summary professional, factual, and concise.`;

      const completion = await this.openAIService.processQuery(summaryPrompt);
      
      return {
        text: completion.text,
        data: summaryData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error generating daily summary: ${error.message}`, error);
      return {
        text: `Error generating insight summary: ${error.message}`,
        data: { error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      recentInsightCount: this.recentInsights.length,
      historyInsightCount: this.insightHistory.length
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalInsightsGenerated: 0,
      scheduledInsightsGenerated: 0,
      eventTriggeredInsightsGenerated: 0,
      insightsByType: {},
      insightsByPriority: {
        high: 0,
        medium: 0,
        low: 0
      },
      averageGenerationTimeMs: 0,
      totalGenerationTimeMs: 0
    };
  }
  
  /**
   * Clean up resources on service shutdown
   */
  cleanup() {
    this.stopScheduledInsightGeneration();
  }
}

module.exports = ProactiveInsightsService;