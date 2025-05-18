/**
 * Initialize the FeedbackLearningService with proper dependencies
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

const FeedbackLearningService = require('./FeedbackLearningService');
const ContinuousLearningService = require('./ContinuousLearningService');
const LongTermMemoryService = require('./LongTermMemoryService');
const VectorSearchService = require('./VectorSearchService');
const OpenAIService = require('./OpenAIService');
const logger = require('../../utils/logger');

// Create the feedback learning service instance with dependencies
const feedbackLearningService = new FeedbackLearningService({
  continuousLearningService: new ContinuousLearningService(),
  longTermMemoryService: new LongTermMemoryService(),
  vectorSearchService: VectorSearchService,
  openAIService: OpenAIService
});

logger.info('FeedbackLearningService initialized with dependencies');

module.exports = feedbackLearningService;