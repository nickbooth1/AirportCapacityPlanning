# Airport Capacity Planner - Agent Services

This directory contains the core services that power the Airport Capacity Planner's AI agent, providing natural language understanding and domain-specific query processing capabilities.

## System Architecture

The agent system consists of several interconnected components:

### 1. Knowledge Base Integration (Section 1.2)

Located in `/services/knowledge/`:

- **StandDataService** - Access to stand information and availability
- **MaintenanceDataService** - Access to maintenance requests and schedules
- **AirportConfigDataService** - Access to terminal, pier, and operational settings
- **ReferenceDataService** - Access to industry reference data (airports, airlines, GHAs, aircraft)
- **CacheService** - Time-to-live (TTL) based caching for different data types
- **DataTransformerService** - Data format conversion and presentation

### 2. Query Handling Framework (Section 1.3)

Located in `/services/agent/queries/`:

- **QueryHandlerBase** - Base class for all query handlers
- **QueryRegistry** - Registry for managing and dispatching queries
- **QueryServiceProvider** - Service dependency injection
- **Handlers**:
  - **Asset Information Handlers** - Process queries about physical assets (stands, terminals)
  - **Reference Data Handlers** - Process queries about industry reference data

### 3. Natural Language Processing (Section 1.4)

Located in `/services/agent/nlp/`:

- **NLPProcessorBase** - Base class for all NLP components
- **IntentClassifier** - Identifies the intent of user queries
- **EntityExtractor** - Extracts entities from user queries
- **QueryParser** - Combines intent and entity extraction
- **AirportDomainProcessor** - Applies airport-specific knowledge and context

### 4. Integration Layer

- **AgentQueryProcessor** - Integrates NLP and Query Handlers
- **NLPServiceIntegration** - Enhances existing NLPService with new capabilities

## Usage

The agent can be used to process natural language queries about airport operations:

```javascript
const AgentQueryProcessor = require('./services/agent/AgentQueryProcessor');

// Initialize with services
const processor = new AgentQueryProcessor(services);

// Process a natural language query
const result = await processor.processQuery(
  'Is stand A1 available tomorrow?',
  { conversationId: 'user-session-123' }
);

// Use the response
if (result.success) {
  console.log(`Response: ${JSON.stringify(result.response)}`);
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## Integration with Existing NLP Service

To integrate the new components with the existing NLP service:

```javascript
const { enhanceNLPService } = require('./services/agent/NLPServiceIntegration');
const existingNLPService = require('./services/agent/NLPService');

// Enhance the existing service
const enhancedService = enhanceNLPService(existingNLPService, services);

// Use the enhanced method
const result = await enhancedService.processStructuredQuery(
  'Which stands can accommodate a 777?'
);
```

## Testing

Each component includes comprehensive unit tests:

- `tests/services/agent/queries/` - Tests for query handlers
- `tests/services/agent/nlp/` - Tests for NLP components
- `tests/services/agent/AgentQueryProcessor.test.js` - Integration tests

## Performance Monitoring

All components include performance monitoring capabilities:

```javascript
// Get combined metrics
const metrics = processor.getMetrics();

console.log(`Processed: ${metrics.processor.processed}`);
console.log(`Success rate: ${metrics.processor.successRate * 100}%`);
console.log(`Avg processing time: ${metrics.processor.averageProcessingTimeMs.toFixed(2)}ms`);
```

## Extending the System

### Adding New Query Handlers

1. Create a new handler class that extends `QueryHandlerBase`
2. Implement the required methods
3. Register the handler in the appropriate category index file
4. The handler will be automatically included when the registry initializes

### Adding New Entity Types

1. Add the entity type definition to the `EntityExtractor`
2. Include regex patterns for rule-based extraction
3. Add validation and parsing logic if needed

### Adding New Intent Categories

1. Add the intent definitions to the `IntentClassifier`
2. Update the intent categories in relevant components
3. Create corresponding query handlers for the new intents

## Future Enhancements

Planned enhancements include:

1. Maintenance query handlers (for maintenance requests and schedules)
2. Operational query handlers (for capacity statistics and forecasts)
3. Multi-turn conversation capabilities with context management
4. Proactive insights generation based on query patterns