# Memory Services for Knowledge Retrieval

This directory contains services that provide memory and knowledge retrieval capabilities for the Airport Capacity Planner AI agent.

## WorkingMemoryService

The `WorkingMemoryService` provides short-term memory for the agent during multi-turn interactions and complex reasoning processes. It maintains session state, query plans, intermediate results, and conversation context.

### Key Features
- Time-based expiration of stored entries with configurable TTL
- Automatic cleanup of expired entries
- Entity mention tracking from the conversation
- Knowledge retrieval result storage
- Retrieval history tracking
- Comprehensive context building for knowledge retrieval

### Basic Usage
```javascript
const WorkingMemoryService = require('./WorkingMemoryService');

// Initialize with custom options
const workingMemory = new WorkingMemoryService({
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxEntityHistorySize: 50,
  maxKnowledgeItemsPerQuery: 20,
  maxRetrievalResultsHistory: 10
});

// Store session context
workingMemory.storeSessionContext('session-123', {
  user: 'John',
  preferences: { theme: 'dark' }
});

// Store entity mentions
workingMemory.storeEntityMentions('session-123', 'query-456', [
  { type: 'stand', value: 'A1', confidence: 0.95 },
  { type: 'terminal', value: 'T1', confidence: 0.9 }
]);

// Store retrieved knowledge
workingMemory.storeRetrievedKnowledge(
  'session-123',
  'query-456',
  [{ id: 'item1', content: 'Stand A1 is located in Terminal T1' }],
  { strategy: 'structured', sources: ['stand-data'] }
);

// Get comprehensive context for knowledge retrieval
const context = workingMemory.getKnowledgeRetrievalContext('session-123', 'query-789');
```

### Entity Tracking
The service tracks entities mentioned in the conversation, making it easier to maintain context and resolve references:

```javascript
// Get all entity mentions
const entities = workingMemory.getEntityMentions('session-123');

// Get entities of a specific type
const stands = workingMemory.getEntityMentions('session-123', {
  entityType: 'stand',
  limit: 5,
  recency: 5 * 60 * 1000 // last 5 minutes
});

// Get the most recent entity of a specific type
const latestStand = workingMemory.getLatestEntityOfType('session-123', 'stand', {
  minConfidence: 0.8,
  recency: 10 * 60 * 1000 // last 10 minutes
});
```

### Knowledge Retrieval
The service stores knowledge retrieval results and maintains retrieval history:

```javascript
// Store retrieval results
workingMemory.storeRetrievedKnowledge(
  'session-123',
  'query-456',
  knowledgeItems,
  { strategy: 'vector', sources: ['knowledge-base'] }
);

// Get retrieval results
const knowledge = workingMemory.getRetrievedKnowledge('session-123', 'query-456');

// Get retrieval history
const history = workingMemory.getRetrievalHistory('session-123', 3); // last 3 retrievals
```

## KnowledgeRetrievalService

The `KnowledgeRetrievalService` provides unified access to knowledge from various sources. It integrates with the `WorkingMemoryService` to maintain context and improve retrieval quality.

### Key Features
- Multiple retrieval strategies (structured, vector-based, combined)
- Integration with working memory for context-aware retrieval
- Entity tracking and utilization
- Retrieval history and caching
- Performance metrics

### Integration with WorkingMemoryService
The `KnowledgeRetrievalService` uses `WorkingMemoryService` to:

1. Store entities extracted from queries
2. Retrieve context for knowledge retrieval
3. Store retrieval contexts and metadata
4. Store retrieved knowledge items
5. Track retrieval history

This integration enables more context-aware and efficient knowledge retrieval over multi-turn interactions.

### Basic Usage
```javascript
const KnowledgeRetrievalService = require('./knowledge/KnowledgeRetrievalService');
const WorkingMemoryService = require('./WorkingMemoryService');

// Initialize services
const workingMemory = new WorkingMemoryService();
const knowledgeRetrieval = new KnowledgeRetrievalService({
  workingMemoryService: workingMemory,
  vectorSearchService: vectorSearch,
  // other services...
});

// Retrieve knowledge
const knowledge = await knowledgeRetrieval.retrieveKnowledge(
  {
    text: "Tell me about stand A1",
    parsedQuery: { intent: "stand.details", entities: { stand: "A1" } },
    queryId: "query-123"
  },
  {
    sessionId: "session-456",
    userId: "user-789"
  }
);
```

## Architecture

The memory services form a key part of the agent's knowledge architecture:

1. `WorkingMemoryService` maintains short-term memory during conversations
2. `KnowledgeRetrievalService` provides unified access to knowledge sources
3. Both services work together to provide context-aware, personalized responses

This architecture enables the agent to:
- Maintain conversation context across turns
- Remember entities mentioned in previous turns
- Build on previous knowledge retrievals
- Provide more relevant and contextual responses