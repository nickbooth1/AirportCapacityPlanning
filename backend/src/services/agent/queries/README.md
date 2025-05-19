# Airport Capacity Planner - Query Handling System

This directory contains the query handling framework for the Airport Capacity Planner's AI agent. The system is designed to process natural language queries about airport resources, maintenance, and operations, leveraging the knowledge base to provide accurate and helpful responses.

## Framework Overview

The query handling system follows a modular design:

- `QueryHandlerBase.js` - Base class for all query handlers, providing common functionality
- `QueryRegistry.js` - Registry for managing and dispatching queries to appropriate handlers
- `QueryServiceProvider.js` - Service provider to inject dependencies into query handlers
- Testing utilities in `testing/QueryTestUtilities.js` - Helper functions for testing query handlers

## Handler Categories

The system organizes query handlers into distinct categories:

### 1. Asset Information Handlers

Located in `handlers/asset/`, these handlers process queries about physical airport assets:

- `StandDetailQueryHandler` - Information about specific stands
- `StandLocationQueryHandler` - Location-based stand queries
- `StandCapabilityQueryHandler` - Aircraft compatibility with stands

### 2. Reference Data Handlers

Located in `handlers/reference/`, these handlers provide access to industry reference data:

- `AirportInfoQueryHandler` - Airport details and searches
- `AirlineInfoQueryHandler` - Airline information and route queries 
- `GHAInfoQueryHandler` - Ground handling agent information
- `AircraftTypeInfoQueryHandler` - Aircraft specifications and size categories

## Usage

The query handling system is designed to be used by the agent's natural language processing pipeline:

```javascript
const { createQueryRegistry } = require('./services/agent/queries');

async function processQuery(parsedQuery, context) {
  // Create and initialize the registry
  const registry = await createQueryRegistry();
  
  // Process the query
  const result = await registry.processQuery(parsedQuery, context);
  
  return result;
}
```

## Testing

Each category of handlers has corresponding test files in `tests/services/agent/queries/`:

- `StandQueryHandlers.test.js` - Tests for asset information handlers
- `ReferenceDataQueryHandlers.test.js` - Tests for reference data handlers

The testing utilities provide mock data generators and validation helpers to make unit testing more efficient.

## Adding New Handlers

To add a new query handler:

1. Create a new handler class that extends `QueryHandlerBase`
2. Implement the required methods: `getQueryTypes()`, `canHandle()`, and `handleQuery()`
3. Add the handler to the appropriate category index file
4. Register the handler in the main `index.js` file's `createQueryRegistry()` function
5. Create unit tests for the new handler

## Future Extensions

Planned extensions to this framework include:

- Maintenance query handlers (for maintenance requests and schedules)
- Operational query handlers (for capacity statistics and forecasts)
- Enhanced caching strategies for frequently requested information
- Integration with the agent's working memory system