/**
 * Script to test the StubNLPService functionality
 */

const nlpService = require('./src/services/agent/StubNLPService');
const logger = require('./src/utils/logger');

async function testNLPService() {
  try {
    logger.info('Testing StubNLPService...');
    
    // Test 1: Process a capacity query
    const capacityQuery = "What's the capacity of Terminal 1 for A380 aircraft?";
    logger.info(`Test 1: Processing capacity query: "${capacityQuery}"`);
    const capacityResult = await nlpService.processQuery(capacityQuery);
    logger.info('Result:', capacityResult);
    
    // Test 2: Process a maintenance query
    const maintenanceQuery = "Is there any maintenance scheduled for Stand A12 tomorrow?";
    logger.info(`Test 2: Processing maintenance query: "${maintenanceQuery}"`);
    const maintenanceResult = await nlpService.processQuery(maintenanceQuery);
    logger.info('Result:', maintenanceResult);
    
    // Test 3: Process an infrastructure query
    const infrastructureQuery = "Show me the layout of Terminal 2";
    logger.info(`Test 3: Processing infrastructure query: "${infrastructureQuery}"`);
    const infrastructureResult = await nlpService.processQuery(infrastructureQuery);
    logger.info('Result:', infrastructureResult);
    
    // Test 4: Process a stand status query
    const standQuery = "Is Stand B15 available for the next 2 hours?";
    logger.info(`Test 4: Processing stand status query: "${standQuery}"`);
    const standResult = await nlpService.processQuery(standQuery);
    logger.info('Result:', standResult);
    
    // Test 5: Process a help request
    const helpQuery = "What can you help me with?";
    logger.info(`Test 5: Processing help request: "${helpQuery}"`);
    const helpResult = await nlpService.processQuery(helpQuery);
    logger.info('Result:', helpResult);
    
    // Test 6: Test intent-to-action mapping
    logger.info('Test 6: Testing intent-to-action mapping for different intents');
    const intents = Object.values(nlpService.intents);
    
    for (const intent of intents) {
      const action = nlpService.mapIntentToAction(intent);
      logger.info(`Intent: ${intent} -> Service: ${action.service}, Method: ${action.method}`);
    }
    
    // Test 7: Test time expression processing
    logger.info('Test 7: Testing time expression processing');
    const timeExpressions = ['today', 'tomorrow', 'next week', 'this month', 'morning', 'afternoon', 'evening', 'peak hour'];
    
    for (const expression of timeExpressions) {
      const timeInfo = nlpService.processTimeExpression(expression);
      logger.info(`Expression: ${expression} -> Type: ${timeInfo.type}, Start: ${timeInfo.iso.start}, End: ${timeInfo.iso.end}`);
    }
    
    // Display metrics
    const metrics = nlpService.getMetrics();
    logger.info('NLP Service Metrics:', metrics);
    
    logger.info('All tests completed successfully!');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    throw error;
  }
}

// Run the tests
testNLPService()
  .then(() => {
    console.log('NLP Service tests completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });