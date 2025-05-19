/**
 * Example usage of RetrievalAugmentedGenerationService
 */

const RetrievalAugmentedGenerationService = require('../services/agent/knowledge/RetrievalAugmentedGenerationService');
const KnowledgeRetrievalService = require('../services/agent/knowledge/KnowledgeRetrievalService');
const WorkingMemoryService = require('../services/agent/WorkingMemoryService');
const logger = require('../utils/logger');

async function runRAGExample() {
  logger.info('Starting RAG Service example');
  
  // Initialize the services
  const workingMemory = new WorkingMemoryService();
  const knowledgeRetrieval = new KnowledgeRetrievalService({ workingMemoryService: workingMemory });
  const ragService = new RetrievalAugmentedGenerationService({
    knowledgeRetrievalService: knowledgeRetrieval,
    workingMemoryService: workingMemory
  });
  
  // Example session and query info
  const sessionId = `session-${Date.now()}`;
  const queryId = `query-${Date.now()}`;
  
  // Store some entity mentions for context
  workingMemory.storeEntityMentions(sessionId, 'previous-query', [
    { type: 'terminal', value: 'T1', confidence: 0.95 },
    { type: 'stand', value: 'A1', confidence: 0.98 }
  ]);
  
  // Example query
  const query = {
    text: "What is the status of stand A1 in Terminal T1?",
    parsedQuery: {
      intent: "stand.status",
      confidence: 0.92,
      entities: {
        stand: "A1",
        terminal: "T1"
      }
    },
    queryId
  };
  
  // Generate a response
  try {
    logger.info(`Generating response for query: "${query.text}"`);
    
    const startTime = Date.now();
    const response = await ragService.generateResponse(
      query,
      { sessionId },
      { includeSuggestions: true }
    );
    const elapsedTime = Date.now() - startTime;
    
    logger.info(`Generated response in ${elapsedTime}ms`);
    logger.info(`Response text: ${response.text}`);
    logger.info(`Sources used: ${JSON.stringify(response.sources)}`);
    
    // Display metrics
    const metrics = ragService.getMetrics();
    logger.info(`Performance metrics: ${JSON.stringify(metrics, null, 2)}`);
    
  } catch (error) {
    logger.error(`Error in RAG example: ${error.message}`);
  }
}

// Run the example if called directly
if (require.main === module) {
  runRAGExample()
    .then(() => {
      logger.info('RAG example completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`RAG example failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runRAGExample };