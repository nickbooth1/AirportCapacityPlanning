/**
 * ProactiveInsightsService.js
 * 
 * Service for generating proactive insights from data analysis
 */

const OpenAIService = require('./OpenAIService');
const standCapacityService = require('../standCapacityService');
const maintenanceRequestService = require('../maintenanceRequestService');
const AirportService = require('../AirportService');
const FlightDataService = require('../FlightDataService');
const ProactiveInsight = require('../../models/agent/ProactiveInsight');
const logger = require('../../utils/logger');

class ProactiveInsightsService {
  constructor() {
    // Insight types
    this.insightTypes = {
      CAPACITY: 'capacity',
      MAINTENANCE: 'maintenance',
      FLIGHT_PATTERN: 'flight_pattern',
      UTILIZATION: 'utilization',
      BOTTLENECK: 'bottleneck',
      OPPORTUNITY: 'opportunity',
      RISK: 'risk'
    };
    
    // Insight priorities
    this.priorities = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
  }
  
  /**
   * Generate insights based on capacity data
   * @param {string} airportId - The airport ID
   * @returns {Promise<Array>} - Generated insights
   */
  async generateCapacityInsights(airportId) {
    try {
      logger.info(`Generating capacity insights for airport ${airportId}`);
      
      // Get current capacity data
      const capacityData = await standCapacityService.getAirportCapacitySummary(airportId);
      
      // Get utilization data
      const utilizationData = await standCapacityService.getStandUtilizationMetrics(airportId);
      
      // Get recent maintenance requests
      const maintenanceRequests = await maintenanceRequestService.getActiveMaintenanceRequests(airportId);
      
      // Format data for analysis
      const analysisData = {
        capacity: capacityData,
        utilization: utilizationData,
        maintenance: {
          activeRequests: maintenanceRequests.length,
          impactedStands: maintenanceRequests.map(req => req.standId)
        }
      };
      
      // Create a prompt for insight generation
      const prompt = `
      Analyze this airport capacity data and identify 3-5 key insights or potential issues:
      
      Capacity Data:
      ${JSON.stringify(analysisData, null, 2)}
      
      For each insight, provide:
      1. A brief title (5-7 words)
      2. A clear explanation of the insight (2-3 sentences)
      3. The insight type (one of: capacity, maintenance, flight_pattern, utilization, bottleneck, opportunity, risk)
      4. Priority level (high, medium, or low)
      5. Potential impact on operations
      6. Recommended action (if applicable)
      
      Focus on actionable insights that would be valuable for airport capacity planning.
      Prioritize insights that reveal underutilized resources, potential bottlenecks, or opportunities for optimization.
      
      Return a JSON array of insight objects.
      `;
      
      // Generate insights using OpenAI
      const response = await OpenAIService.processQuery(prompt);
      
      // Parse insights from the response
      let insights = [];
      try {
        // Try to extract JSON array
        const jsonMatch = response.text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        } else if (response.text.trim().startsWith('[') && response.text.trim().endsWith(']')) {
          insights = JSON.parse(response.text);
        }
      } catch (parseError) {
        logger.error(`Failed to parse insights: ${parseError.message}`);
        // Try a fallback extraction approach
        insights = this.extractInsightsFromText(response.text);
      }
      
      // Save the insights to database
      const savedInsights = await this.saveInsights(airportId, insights);
      
      return savedInsights;
    } catch (error) {
      logger.error(`Error generating capacity insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Generate insights based on flight patterns
   * @param {string} airportId - The airport ID
   * @returns {Promise<Array>} - Generated insights
   */
  async generateFlightPatternInsights(airportId) {
    try {
      logger.info(`Generating flight pattern insights for airport ${airportId}`);
      
      // Get recent flight data
      const flightData = await FlightDataService.getRecentFlightMetrics(airportId);
      
      // Create a prompt for insight generation
      const prompt = `
      Analyze this flight data and identify 2-4 key insights about flight patterns:
      
      Flight Data:
      ${JSON.stringify(flightData, null, 2)}
      
      For each insight, provide:
      1. A brief title (5-7 words)
      2. A clear explanation of the insight (2-3 sentences)
      3. Priority level (high, medium, or low)
      4. Potential impact on capacity planning
      5. Recommended action (if applicable)
      
      Focus on patterns that might be useful for capacity planning, such as:
      - Peak hour patterns
      - Aircraft type distribution trends
      - Airline schedule patterns
      - Day-of-week variations
      - Seasonal trends
      
      Return a JSON array of insight objects.
      `;
      
      // Generate insights using OpenAI
      const response = await OpenAIService.processQuery(prompt);
      
      // Parse insights from the response
      let insights = [];
      try {
        // Try to extract JSON array
        const jsonMatch = response.text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        } else if (response.text.trim().startsWith('[') && response.text.trim().endsWith(']')) {
          insights = JSON.parse(response.text);
        }
      } catch (parseError) {
        logger.error(`Failed to parse flight pattern insights: ${parseError.message}`);
        insights = this.extractInsightsFromText(response.text);
      }
      
      // Set type for all insights
      insights = insights.map(insight => ({
        ...insight,
        type: this.insightTypes.FLIGHT_PATTERN
      }));
      
      // Save the insights to database
      const savedInsights = await this.saveInsights(airportId, insights);
      
      return savedInsights;
    } catch (error) {
      logger.error(`Error generating flight pattern insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Generate insights about maintenance impact
   * @param {string} airportId - The airport ID
   * @returns {Promise<Array>} - Generated insights
   */
  async generateMaintenanceInsights(airportId) {
    try {
      logger.info(`Generating maintenance impact insights for airport ${airportId}`);
      
      // Get maintenance requests
      const maintenanceRequests = await maintenanceRequestService.getAllRequests({
        airportId,
        includeStand: true,
        includeImpact: true
      });
      
      // Get capacity data
      const capacityData = await standCapacityService.getAirportCapacitySummary(airportId);
      
      // Create a prompt for insight generation
      const prompt = `
      Analyze these maintenance requests and their capacity impact:
      
      Maintenance Requests:
      ${JSON.stringify(maintenanceRequests, null, 2)}
      
      Current Capacity:
      ${JSON.stringify(capacityData, null, 2)}
      
      For each insight, provide:
      1. A brief title (5-7 words)
      2. A clear explanation of the insight (2-3 sentences)
      3. Priority level (high, medium, or low)
      4. Potential impact on capacity
      5. Recommended action (if applicable)
      
      Focus on:
      - High-impact maintenance that significantly reduces capacity
      - Overlapping maintenance that creates bottlenecks
      - Opportunities to reschedule maintenance to minimize impact
      - Stands with frequent maintenance issues
      
      Return a JSON array of 2-4 insight objects.
      `;
      
      // Generate insights using OpenAI
      const response = await OpenAIService.processQuery(prompt);
      
      // Parse insights from the response
      let insights = [];
      try {
        // Try to extract JSON array
        const jsonMatch = response.text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        } else if (response.text.trim().startsWith('[') && response.text.trim().endsWith(']')) {
          insights = JSON.parse(response.text);
        }
      } catch (parseError) {
        logger.error(`Failed to parse maintenance insights: ${parseError.message}`);
        insights = this.extractInsightsFromText(response.text);
      }
      
      // Set type for all insights
      insights = insights.map(insight => ({
        ...insight,
        type: this.insightTypes.MAINTENANCE
      }));
      
      // Save the insights to database
      const savedInsights = await this.saveInsights(airportId, insights);
      
      return savedInsights;
    } catch (error) {
      logger.error(`Error generating maintenance insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Generate all types of insights for an airport
   * @param {string} airportId - The airport ID
   * @returns {Promise<Array>} - Generated insights
   */
  async generateAllInsights(airportId) {
    try {
      // Run insight generation in parallel
      const [capacityInsights, flightPatternInsights, maintenanceInsights] = await Promise.all([
        this.generateCapacityInsights(airportId),
        this.generateFlightPatternInsights(airportId),
        this.generateMaintenanceInsights(airportId)
      ]);
      
      // Combine all insights
      return [
        ...capacityInsights,
        ...flightPatternInsights,
        ...maintenanceInsights
      ];
    } catch (error) {
      logger.error(`Error generating all insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get active insights for an airport
   * @param {string} airportId - The airport ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Active insights
   */
  async getActiveInsights(airportId, options = {}) {
    try {
      // Default options
      const {
        limit = 10,
        offset = 0,
        types = null,
        minPriority = null,
        includeExpired = false
      } = options;
      
      // Build query
      let query = ProactiveInsight.query()
        .where('airportId', airportId)
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'desc');
      
      // Filter by types if specified
      if (types && Array.isArray(types) && types.length > 0) {
        query = query.whereIn('type', types);
      }
      
      // Filter by minimum priority if specified
      if (minPriority) {
        const priorityValues = {
          [this.priorities.HIGH]: 3,
          [this.priorities.MEDIUM]: 2,
          [this.priorities.LOW]: 1
        };
        
        const minPriorityValue = priorityValues[minPriority] || 1;
        
        query = query.whereRaw('CASE ' +
          `WHEN priority = '${this.priorities.HIGH}' THEN 3 ` +
          `WHEN priority = '${this.priorities.MEDIUM}' THEN 2 ` +
          `WHEN priority = '${this.priorities.LOW}' THEN 1 ` +
          'ELSE 0 END >= ?', [minPriorityValue]);
      }
      
      // Filter out expired insights if not included
      if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.where(function() {
          this.where('expiresAt', '>', now).orWhereNull('expiresAt');
        });
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      // Execute query
      const insights = await query;
      
      return insights;
    } catch (error) {
      logger.error(`Error retrieving active insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get a specific insight by ID
   * @param {string} insightId - The insight ID
   * @returns {Promise<Object|null>} - The insight or null if not found
   */
  async getInsightById(insightId) {
    try {
      const insight = await ProactiveInsight.query().findById(insightId);
      return insight || null;
    } catch (error) {
      logger.error(`Error getting insight by ID: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Mark an insight as acknowledged
   * @param {string} insightId - The insight ID
   * @param {string} userId - The user ID
   * @param {Object} feedback - Feedback information
   * @returns {Promise<Object>} - The updated insight
   */
  async acknowledgeInsight(insightId, userId, feedback = {}) {
    try {
      const insight = await ProactiveInsight.query().findById(insightId);
      
      if (!insight) {
        throw new Error(`Insight not found: ${insightId}`);
      }
      
      // Update the insight
      const updatedInsight = await insight.$query().patchAndFetch({
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: userId,
        feedback: feedback || {}
      });
      
      return updatedInsight;
    } catch (error) {
      logger.error(`Error acknowledging insight: ${error.message}`);
      throw new Error(`Failed to acknowledge insight: ${error.message}`);
    }
  }
  
  /**
   * Update an insight
   * @param {string} insightId - The insight ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - The updated insight or null if not found
   */
  async updateInsight(insightId, updateData) {
    try {
      const insight = await ProactiveInsight.query().findById(insightId);
      
      if (!insight) {
        return null;
      }
      
      // Update the insight
      const updatedInsight = await insight.$query().patchAndFetch({
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      
      return updatedInsight;
    } catch (error) {
      logger.error(`Error updating insight: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Delete an insight
   * @param {string} insightId - The insight ID
   * @returns {Promise<boolean>} - True if deleted, false otherwise
   */
  async deleteInsight(insightId) {
    try {
      const numDeleted = await ProactiveInsight.query().deleteById(insightId);
      return numDeleted > 0;
    } catch (error) {
      logger.error(`Error deleting insight: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Save insights to the database
   * @param {string} airportId - The airport ID
   * @param {Array} insights - The insights to save
   * @returns {Promise<Array>} - The saved insights
   */
  async saveInsights(airportId, insights) {
    try {
      if (!insights || !Array.isArray(insights) || insights.length === 0) {
        return [];
      }
      
      // Process and save each insight
      const savedInsights = [];
      for (const insight of insights) {
        try {
          // Create expiration date (7 days from now by default)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          // Save the insight
          const savedInsight = await ProactiveInsight.query().insert({
            airportId,
            title: insight.title,
            description: insight.description || insight.explanation,
            type: insight.type,
            priority: insight.priority,
            impact: insight.impact,
            recommendation: insight.recommendation || insight.recommendedAction,
            data: insight.data || {},
            expiresAt: insight.expiresAt || expiresAt.toISOString()
          });
          
          savedInsights.push(savedInsight);
        } catch (error) {
          logger.error(`Error saving insight: ${error.message}`);
          // Continue with other insights
        }
      }
      
      return savedInsights;
    } catch (error) {
      logger.error(`Error saving insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Extract insights from unstructured text
   * @param {string} text - The text to extract from
   * @returns {Array} - Extracted insights
   */
  extractInsightsFromText(text) {
    const insights = [];
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      // Skip short paragraphs
      if (paragraph.trim().length < 30) continue;
      
      // Try to extract title and description
      const lines = paragraph.split(/\n+/);
      
      if (lines.length >= 2) {
        // First line is title, rest is description
        const title = lines[0].replace(/^\d+\.\s*|\*\*|\*/g, '').trim();
        const description = lines.slice(1).join(' ').trim();
        
        // Extract priority (default to medium)
        let priority = this.priorities.MEDIUM;
        if (/\b(high|critical|urgent|important)\b/i.test(paragraph)) {
          priority = this.priorities.HIGH;
        } else if (/\b(low|minor)\b/i.test(paragraph)) {
          priority = this.priorities.LOW;
        }
        
        // Extract type
        let type = this.insightTypes.OPPORTUNITY;
        if (/\b(capacity|stand capacit|terminal capacit)/i.test(paragraph)) {
          type = this.insightTypes.CAPACITY;
        } else if (/\b(maintenance|repair|closure)/i.test(paragraph)) {
          type = this.insightTypes.MAINTENANCE;
        } else if (/\b(utilization|usage|usage rate|efficiency)/i.test(paragraph)) {
          type = this.insightTypes.UTILIZATION;
        } else if (/\b(bottleneck|constraint|limitation|restricting)/i.test(paragraph)) {
          type = this.insightTypes.BOTTLENECK;
        } else if (/\b(risk|warning|potential issue|concern)/i.test(paragraph)) {
          type = this.insightTypes.RISK;
        } else if (/\b(pattern|trend|distribution|peak|schedule)/i.test(paragraph)) {
          type = this.insightTypes.FLIGHT_PATTERN;
        }
        
        // Extract impact
        let impact = '';
        const impactMatch = paragraph.match(/impact:?\s*([^\.]+)/i);
        if (impactMatch) {
          impact = impactMatch[1].trim();
        }
        
        // Extract recommendation
        let recommendation = '';
        const recommendationMatch = paragraph.match(/recommend(?:ed|ation):?\s*([^\.]+)/i);
        if (recommendationMatch) {
          recommendation = recommendationMatch[1].trim();
        }
        
        insights.push({
          title,
          description,
          type,
          priority,
          impact,
          recommendation
        });
      }
    }
    
    return insights;
  }
  
  /**
   * Schedule periodic insight generation
   * @param {string} airportId - The airport ID
   * @param {number} intervalHours - Interval in hours (default: 24)
   */
  scheduleInsightGeneration(airportId, intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Clear any existing interval
    if (this.insightInterval) {
      clearInterval(this.insightInterval);
    }
    
    // Schedule regular insight generation
    this.insightInterval = setInterval(async () => {
      try {
        logger.info(`Running scheduled insight generation for airport ${airportId}`);
        await this.generateAllInsights(airportId);
      } catch (error) {
        logger.error(`Error in scheduled insight generation: ${error.message}`);
      }
    }, intervalMs);
    
    // Run initial generation
    setTimeout(async () => {
      try {
        logger.info(`Running initial insight generation for airport ${airportId}`);
        await this.generateAllInsights(airportId);
      } catch (error) {
        logger.error(`Error in initial insight generation: ${error.message}`);
      }
    }, 5000); // Start after 5 seconds
    
    logger.info(`Scheduled insight generation for airport ${airportId} every ${intervalHours} hours`);
  }
}

module.exports = new ProactiveInsightsService();