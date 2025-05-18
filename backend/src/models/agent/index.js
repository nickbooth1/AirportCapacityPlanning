/**
 * Agent models index module
 */

// Phase 1-2 models
const Scenario = require('./Scenario');
const ScenarioVersion = require('./ScenarioVersion');
const ScenarioCalculation = require('./ScenarioCalculation');
const ScenarioComparison = require('./ScenarioComparison');
const ActionProposal = require('./ActionProposal');
const ConversationContext = require('./ConversationContext');

// Phase 3 models - Long-term memory
const UserPreference = require('./UserPreference');
const DecisionHistory = require('./DecisionHistory');
const Pattern = require('./Pattern');

// Phase 3 models - Collaboration
const Workspace = require('./Workspace');
const WorkspaceMember = require('./WorkspaceMember');
const Comment = require('./Comment');
const CommentReaction = require('./CommentReaction');
const Activity = require('./Activity');

// Phase 3 models - Proactive analysis
const ProactiveInsight = require('./ProactiveInsight');
const Feedback = require('./Feedback');
const Experiment = require('./Experiment');

// Phase 3 models - External data integration
const WeatherCache = require('./WeatherCache');
const AirlineSchedulesCache = require('./AirlineSchedulesCache');
const AirportCoordinates = require('./AirportCoordinates');

module.exports = {
  // Phase 1-2 models
  Scenario,
  ScenarioVersion,
  ScenarioCalculation,
  ScenarioComparison,
  ActionProposal,
  ConversationContext,
  
  // Phase 3 models - Long-term memory
  UserPreference,
  DecisionHistory,
  Pattern,
  
  // Phase 3 models - Collaboration
  Workspace,
  WorkspaceMember,
  Comment,
  CommentReaction,
  Activity,
  
  // Phase 3 models - Proactive analysis
  ProactiveInsight,
  Feedback,
  Experiment,
  
  // Phase 3 models - External data integration
  WeatherCache,
  AirlineSchedulesCache,
  AirportCoordinates
};