/**
 * Example usage of FactVerifierService
 */

const FactVerifierService = require('../services/agent/knowledge/FactVerifierService');
const KnowledgeRetrievalService = require('../services/agent/knowledge/KnowledgeRetrievalService');
const RetrievalAugmentedGenerationService = require('../services/agent/knowledge/RetrievalAugmentedGenerationService');
const logger = require('../utils/logger');

async function runFactVerifierExample() {
  logger.info('Starting FactVerifier Service example');
  
  // Initialize the services
  const factVerifier = new FactVerifierService();
  const knowledgeRetrieval = new KnowledgeRetrievalService();
  const ragService = new RetrievalAugmentedGenerationService({
    knowledgeRetrievalService: knowledgeRetrieval
  });
  
  // Example knowledge items about airport
  const knowledgeItems = [
    {
      type: 'stand',
      data: { 
        id: 'A1', 
        terminal: 'T1', 
        status: 'active',
        lastMaintenance: '2025-01-15',
        aircraftTypes: ['B737', 'A320', 'E190']
      },
      source: 'stand-data-service'
    },
    {
      type: 'terminal',
      data: { 
        id: 'T1', 
        name: 'Terminal 1', 
        stands: ['A1', 'A2', 'A3', 'A4', 'A5'],
        gates: 8
      },
      source: 'terminal-data-service'
    },
    {
      type: 'maintenance',
      data: {
        id: 'M123',
        standId: 'A2',
        type: 'scheduled',
        startDate: '2025-05-20',
        endDate: '2025-05-25',
        status: 'approved'
      },
      source: 'maintenance-data-service'
    }
  ];
  
  // Example query
  const query = {
    text: "Tell me about Terminal 1 and stand A1.",
    parsedQuery: {
      intent: "infrastructure.query",
      confidence: 0.92,
      entities: {
        terminal: "T1",
        stand: "A1"
      }
    }
  };
  
  try {
    // 1. Generate a response using RAG
    logger.info('Generating response with RAG...');
    const ragResponse = await ragService.generateResponse(
      query,
      {},
      { preRetrievedKnowledge: { facts: knowledgeItems, contextual: [] } }
    );
    
    logger.info(`Generated response: "${ragResponse.text}"`);
    
    // 2. Create a response with some factual errors for verification
    const responseWithErrors = `Terminal 1 has 10 gates and 6 stands. Stand A1 is currently under maintenance and can only accommodate Boeing 737 aircraft. The last maintenance for Stand A1 was in February 2025.`;
    
    logger.info(`Verifying response with errors: "${responseWithErrors}"`);
    
    // 3. Verify the response with errors
    const verification = await factVerifier.verifyResponse(
      responseWithErrors,
      knowledgeItems
    );
    
    logger.info(`Verification results:`);
    logger.info(`  Verified: ${verification.verified}`);
    logger.info(`  Confidence: ${verification.confidence}`);
    logger.info(`  Statements checked: ${verification.statements.length}`);
    
    // 4. Log details about verified statements
    verification.statements.forEach((statement, i) => {
      logger.info(`Statement ${i+1}: "${statement.text}"`);
      logger.info(`  Accurate: ${statement.accurate}`);
      logger.info(`  Status: ${statement.status}`);
      logger.info(`  Explanation: ${statement.explanation}`);
      if (statement.suggestedCorrection) {
        logger.info(`  Correction: ${statement.suggestedCorrection}`);
      }
    });
    
    // 5. Show corrected response
    logger.info('Corrected response:');
    logger.info(verification.correctedResponse);
    
    // 6. Verify a specific claim
    const claim = "Stand A1 can accommodate Airbus A320 aircraft";
    logger.info(`\nVerifying specific claim: "${claim}"`);
    
    const claimVerification = await factVerifier.verifyClaim(
      claim,
      knowledgeItems
    );
    
    logger.info(`Claim verification result:`);
    logger.info(`  Accurate: ${claimVerification.accurate}`);
    logger.info(`  Status: ${claimVerification.status}`);
    logger.info(`  Confidence: ${claimVerification.confidence}`);
    logger.info(`  Explanation: ${claimVerification.explanation}`);
    
    // 7. Compare two responses
    logger.info('\nComparing responses:');
    
    const comparisonResult = await factVerifier.compareResponses(
      ragResponse.text,
      responseWithErrors,
      knowledgeItems
    );
    
    logger.info(`Consistency score: ${comparisonResult.consistencyScore}`);
    logger.info(`Comparison summary: ${comparisonResult.summary}`);
    
    if (comparisonResult.comparisonPoints) {
      logger.info('Comparison points:');
      comparisonResult.comparisonPoints.forEach((point, i) => {
        logger.info(`  Point ${i+1}: ${point.point}`);
        logger.info(`    Agreement: ${point.agreement}`);
        logger.info(`    More accurate: ${point.moreAccurate || 'N/A'}`);
      });
    }
    
    // 8. Show performance metrics
    const metrics = factVerifier.getMetrics();
    logger.info('\nPerformance metrics:');
    logger.info(JSON.stringify(metrics, null, 2));
    
  } catch (error) {
    logger.error(`Error in FactVerifier example: ${error.message}`);
  }
}

// Run the example if called directly
if (require.main === module) {
  runFactVerifierExample()
    .then(() => {
      logger.info('FactVerifier example completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`FactVerifier example failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runFactVerifierExample };