# Knowledge Base Integration Services

This directory contains services that provide a data access layer for the Airport Capacity Planner AI agent. These services integrate with the database models and provide structured access to the knowledge base.

## Services Overview

### StandDataService
Provides data access methods for stand information, including:
- Fetching stands with various filtering options
- Finding stands by ID, code, or other attributes
- Getting stands with their maintenance status
- Aggregating stand statistics

### MaintenanceDataService
Provides data access methods for maintenance information, including:
- Fetching maintenance requests with various filtering options
- Finding maintenance by ID, status, or other attributes
- Managing recurring maintenance schedules
- Aggregating maintenance statistics

### AirportConfigDataService
Provides data access methods for airport configuration data, including:
- Terminals, piers, and their relationships
- Operational settings
- Turnaround rules
- Time slots
- Aircraft types and size categories

### ReferenceDataService
Provides data access methods for industry reference data, including:
- Airports information and searching
- Airlines data and code validation
- Ground handling agents (GHAs) data and airport validation
- Aircraft types reference data
- Cross-reference searching across all domains

### CacheService
Provides caching functionality for knowledge base data with:
- In-memory LRU cache with TTL (Time To Live)
- Cache invalidation strategies
- Cache hit/miss statistics

### DataTransformerService
Provides transformation functions to convert database results into presentable formats suitable for the agent and frontend.

## Usage Examples

### Fetching Stand Information
```javascript
const { StandDataService } = require('./knowledge');

// Get all active stands
const activeStands = await StandDataService.getStands({ isActive: true });

// Get a specific stand with its maintenance status
const stand = await StandDataService.getStandById(standId);
```

### Fetching Maintenance Information
```javascript
const { MaintenanceDataService } = require('./knowledge');

// Get all high priority maintenance requests
const highPriorityRequests = await MaintenanceDataService.getMaintenanceRequests({ 
  priority: 'High' 
});

// Get upcoming maintenance events for the next 14 days
const upcomingMaintenance = await MaintenanceDataService.getUpcomingMaintenanceEvents({
  startDate: new Date(),
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
});
```

### Fetching Airport Configuration
```javascript
const { AirportConfigDataService } = require('./knowledge');

// Get operational settings
const settings = await AirportConfigDataService.getOperationalSettings();

// Get all terminals with their piers and stands
const terminals = await AirportConfigDataService.getTerminals({
  includePiers: true,
  includeStands: true
});
```

### Using the Cache
```javascript
const { CacheService, StandDataService } = require('./knowledge');

// Try to get cached data first
const cacheKey = 'stands:active';
let stands = CacheService.getOperationalItem(cacheKey);

if (!stands) {
  // Fetch from database if not in cache
  stands = await StandDataService.getStands({ isActive: true });
  
  // Cache the results for 5 minutes
  CacheService.setOperationalItem(cacheKey, stands, 300);
}

// Get cache statistics
const cacheStats = CacheService.getStatistics();
console.log(`Cache hit rate: ${cacheStats.operational.hitRate}%`);
```

### Transforming Data for Presentation
```javascript
const { DataTransformerService, MaintenanceDataService } = require('./knowledge');

// Fetch maintenance data
const maintenanceRequest = await MaintenanceDataService.getMaintenanceRequestById(requestId);

// Transform to different formats for different UI components
const simpleData = DataTransformerService.transformMaintenanceData(maintenanceRequest, 'simple');
const detailedData = DataTransformerService.transformMaintenanceData(maintenanceRequest, 'detailed');
const calendarData = DataTransformerService.transformMaintenanceData(maintenanceRequest, 'calendar');
```

### Using Reference Data Service
```javascript
const { ReferenceDataService } = require('./knowledge');

// Search for an airport by IATA code
const airport = await ReferenceDataService.getAirportByIATA('LHR');

// Validate an airline code
const isValidAirline = await ReferenceDataService.validateAirlineCode('BA', 'IATA');

// Find ground handling agents at a specific airport
const ghasAtAirport = await ReferenceDataService.findGHAsAtAirport('MUC');

// Search across all reference data
const searchResults = await ReferenceDataService.searchReferenceData('lufthansa');
console.log(searchResults.airlines); // Airlines matching search term
console.log(searchResults.all); // All results across all categories
```

## Integration with Agent Services

These knowledge base services can be directly used by the agent services to access structured data about the airport, stands, maintenance, and reference data. The provided data transformers allow the agent to format the data appropriately for different contexts and presentation needs.

The agent can leverage these services to provide comprehensive answers about:
- Airport capacity and operations
- Stand availability and maintenance status
- Industry reference data (airlines, airports, GHAs, aircraft types)
- Airport configuration and settings

By having access to this complete knowledge base, the Airport Capacity Planner AI agent can provide accurate and contextual responses to user queries about all aspects of airport operations.