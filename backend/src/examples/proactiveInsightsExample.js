/**
 * Example usage of ProactiveInsightsService
 */

const ProactiveInsightsService = require('../services/agent/knowledge/ProactiveInsightsService');
const StandDataService = require('../services/knowledge/StandDataService');
const MaintenanceDataService = require('../services/knowledge/MaintenanceDataService');
const AirportConfigDataService = require('../services/knowledge/AirportConfigDataService');
const FlightDataService = require('../services/FlightDataService');
const logger = require('../utils/logger');

async function runProactiveInsightsExample() {
  logger.info('Starting ProactiveInsights Service example');
  
  // Initialize data services
  const standDataService = new StandDataService();
  const maintenanceDataService = new MaintenanceDataService();
  const airportConfigService = new AirportConfigDataService();
  const flightDataService = new FlightDataService();
  
  // Initialize insights service
  const insightsService = new ProactiveInsightsService({
    standDataService,
    maintenanceDataService,
    airportConfigService,
    flightDataService
  }, {
    insightGenerationFrequency: 3600000, // 1 hour
    enabledScheduledInsights: false, // Disable automatic scheduling for example
    maxInsightsPerBatch: 3
  });
  
  try {
    // 1. Generate scheduled insights
    logger.info('Generating scheduled insights...');
    const scheduledInsights = await insightsService.generateScheduledInsights();
    
    logger.info(`Generated ${scheduledInsights.length} scheduled insights:`);
    scheduledInsights.forEach((insight, index) => {
      logger.info(`\nInsight ${index + 1}: ${insight.title} (${insight.priority} priority)`);
      logger.info(`Type: ${insight.type}`);
      logger.info(`Description: ${insight.description}`);
      logger.info(`Confidence: ${insight.confidence}`);
      if (insight.recommendations) {
        logger.info(`Recommendations: ${Array.isArray(insight.recommendations) ? 
          insight.recommendations.join(', ') : 
          insight.recommendations}`);
      }
    });
    
    // 2. Generate event-triggered insights
    logger.info('\nGenerating insights for a maintenance event...');
    const eventInsights = await insightsService.generateEventTriggeredInsights(
      'maintenance_created',
      {
        maintenanceId: 'M123',
        standId: 'A1',
        startDate: '2025-06-01',
        endDate: '2025-06-05',
        description: 'Scheduled runway repaving'
      }
    );
    
    logger.info(`Generated ${eventInsights.length} event-triggered insights:`);
    eventInsights.forEach((insight, index) => {
      logger.info(`\nInsight ${index + 1}: ${insight.title} (${insight.priority} priority)`);
      logger.info(`Type: ${insight.type}`);
      logger.info(`Description: ${insight.description}`);
    });
    
    // 3. Generate focused insights
    logger.info('\nGenerating focused insights on capacity...');
    const focusedInsights = await insightsService.generateFocusedInsights(
      'capacity',
      { timeframe: 'next-week' }
    );
    
    logger.info(`Generated ${focusedInsights.length} focused insights:`);
    focusedInsights.forEach((insight, index) => {
      logger.info(`\nInsight ${index + 1}: ${insight.title} (${insight.priority} priority)`);
      logger.info(`Type: ${insight.type}`);
      logger.info(`Description: ${insight.description}`);
    });
    
    // 4. Provide feedback on an insight
    if (scheduledInsights.length > 0) {
      const insightId = scheduledInsights[0].id;
      logger.info(`\nProviding feedback on insight ${insightId}...`);
      
      insightsService.provideFeedback(insightId, 'helpful', { 
        user: 'test-user',
        comment: 'This insight was actionable and helped us optimize stand allocation.'
      });
      
      // Get the updated insight
      const updatedInsight = insightsService.getInsightById(insightId);
      logger.info(`Feedback added: ${updatedInsight.lastFeedbackType}`);
    }
    
    // 5. Filter insights
    logger.info('\nFiltering for high priority insights...');
    const highPriorityInsights = insightsService.getRecentInsights({ priority: 'high' });
    logger.info(`Found ${highPriorityInsights.length} high priority insights`);
    
    // 6. Generate daily summary
    logger.info('\nGenerating daily insights summary...');
    const summary = await insightsService.generateDailySummary();
    logger.info(`Summary: ${summary.text}`);
    
    // 7. Show metrics
    logger.info('\nInsight generation metrics:');
    const metrics = insightsService.getMetrics();
    logger.info(`Total insights generated: ${metrics.totalInsightsGenerated}`);
    logger.info(`Recent insights: ${metrics.recentInsightCount}`);
    logger.info(`Average generation time: ${metrics.averageGenerationTimeMs.toFixed(2)}ms`);
    
    logger.info('\nProactiveInsights example completed successfully');
  } catch (error) {
    logger.error(`Error in ProactiveInsights example: ${error.message}`);
  } finally {
    // Clean up resources
    insightsService.cleanup();
  }
}

// Run the example if called directly
if (require.main === module) {
  runProactiveInsightsExample()
    .then(() => {
      logger.info('ProactiveInsights example completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`ProactiveInsights example failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runProactiveInsightsExample };