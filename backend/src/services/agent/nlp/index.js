/**
 * Natural Language Processing Components
 * 
 * This module exports the NLP components used by the agent to process
 * and understand user queries.
 */

const NLPProcessorBase = require('./NLPProcessorBase');
const IntentClassifier = require('./IntentClassifier');
const EntityExtractor = require('./EntityExtractor');
const QueryParser = require('./QueryParser');
const AirportDomainProcessor = require('./AirportDomainProcessor');

// Export components
module.exports = {
  NLPProcessorBase,
  IntentClassifier,
  EntityExtractor,
  QueryParser,
  AirportDomainProcessor,
  
  // Factory function to create an NLP pipeline
  createNLPPipeline: (services = {}, options = {}) => {
    const intentClassifier = new IntentClassifier(services, options);
    const entityExtractor = new EntityExtractor(services, options);
    const queryParser = new QueryParser(services, {
      ...options,
      intentClassifier,
      entityExtractor
    });
    const domainProcessor = new AirportDomainProcessor(services, options);
    
    return {
      intentClassifier,
      entityExtractor,
      queryParser,
      domainProcessor,
      
      /**
       * Process a query through the full NLP pipeline
       * 
       * @param {string} text - The query text
       * @param {Object} context - Conversation context
       * @returns {Promise<Object>} - Processed query result
       */
      async processQuery(text, context = {}) {
        // Step 1: Parse the query (intent + entities)
        const parseResult = await queryParser.process(text, context);
        
        if (!parseResult.success) {
          return parseResult;
        }
        
        // Step 2: Apply domain-specific processing
        const domainResult = await domainProcessor.process(parseResult.data, context);
        
        return domainResult;
      },
      
      /**
       * Get combined metrics from all components
       * 
       * @returns {Object} - Combined metrics
       */
      getMetrics() {
        return {
          intentClassifier: intentClassifier.getMetrics(),
          entityExtractor: entityExtractor.getMetrics(),
          queryParser: queryParser.getMetrics(),
          domainProcessor: domainProcessor.getMetrics()
        };
      },
      
      /**
       * Reset metrics across all components
       */
      resetMetrics() {
        intentClassifier.resetMetrics();
        entityExtractor.resetMetrics();
        queryParser.resetMetrics();
        domainProcessor.resetMetrics();
      }
    };
  }
};