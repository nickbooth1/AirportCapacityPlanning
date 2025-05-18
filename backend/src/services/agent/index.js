/**
 * Agent services module exports
 */

// Import Phase 1-2 services
const NLPService = require('./NLPService');
const OpenAIService = require('./OpenAIService');
const ScenarioService = require('./ScenarioService');
const ParameterValidationService = require('./ParameterValidationService');
const MultiStepReasoningService = require('./MultiStepReasoningService');
const WorkingMemoryService = require('./WorkingMemoryService');
const VisualizationService = require('./VisualizationService');
const ToolOrchestratorService = require('./ToolOrchestratorService');
const AgentService = require('./AgentService');
const ContextService = require('./ContextService');

// Import Phase 3 services
const ProactiveAnalysisService = require('./ProactiveAnalysisService');
const LongTermMemoryService = require('./LongTermMemoryService');
const ContinuousLearningService = require('./ContinuousLearningService');

// Import Phase 4 services
const ReasoningExplainer = require('./ReasoningExplainer');
const VectorSearchService = require('./VectorSearchService');
const feedbackLearningService = require('./initFeedbackLearning');
const ProactiveInsightsService = require('./ProactiveInsightsService');
const UserPreferenceService = require('./UserPreferenceService');

// Export all services
module.exports = {
  // Phase 1-2 services
  NLPService,
  OpenAIService,
  ScenarioService,
  ParameterValidationService,
  MultiStepReasoningService,
  WorkingMemoryService,
  VisualizationService,
  ToolOrchestratorService,
  AgentService,
  ContextService,
  
  // Phase 3 services
  ProactiveAnalysisService,
  LongTermMemoryService,
  ContinuousLearningService,
  
  // Phase 4 services
  ReasoningExplainer,
  VectorSearchService,
  feedbackLearningService,
  ProactiveInsightsService,
  UserPreferenceService
};