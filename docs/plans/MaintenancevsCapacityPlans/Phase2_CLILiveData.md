# Phase 2: CLI Tool with Live Data - Implementation Details

## Overview

Phase 2 builds upon the initial Phase 1 implementation by replacing mock data sources with live database and service connections. This allows the tool to analyze the impact of maintenance requests on stand capacity using real-time data from the airport's production systems.

## Architecture

The architecture follows the same core pattern as Phase 1, but with the following key differences:

1. **Live Data Sources**: Instead of reading from static JSON files, the tool connects to the database and uses service classes to fetch and process data.
2. **Async Processing**: The CLI is now asynchronous to handle database queries and service calls.
3. **Error Handling**: More robust error handling and connection management for production use.

### Core Components

1. **Live CLI Interface** (`live_cli.js`): The main entry point with command-line argument handling and orchestration.
2. **Database Connector** (`db.js`): Utility for database connection management.
3. **Services**:
   - `StandCapacityToolService`: Calculates stand capacity based on infrastructure and operational settings.
   - `MaintenanceRequestService`: Fetches and manages maintenance request data.
4. **Analyzer Module** (`analyzer.js`): The same core algorithm from Phase 1, used to process capacity impact.

## Implementation

### Database Connection

The database connector (`db.js`) provides a consistent interface for connecting to the PostgreSQL database and uses the application's Knex configuration. It includes:

- Connection initialization
- Connection pooling
- Graceful connection termination
- Error handling

### Services

#### StandCapacityToolService

This service is responsible for calculating the baseline stand capacity:

- Fetches time slots from the database or generates defaults
- For each time slot, calculates the capacity for each aircraft type
- Takes into account stand-aircraft compatibility constraints
- Applies operational parameters (turnaround times, buffer times)

#### MaintenanceRequestService

This service handles maintenance request data:

- Fetches maintenance requests for a specified date range
- Filters by status types (Requested, Approved, In Progress, etc.)
- Joins with related data (stand codes, status names, etc.)
- Formats the data for compatibility with the analyzer

### Live CLI

The `live_cli.js` script provides the command-line interface:

- Parses command-line arguments (start date, end date, output file)
- Initializes database connection
- Loads live data through services
- Calls the analyzer with the loaded data
- Outputs results to console or file
- Handles proper cleanup (database connection closing)

## Usage

```bash
# Run analysis with live data for a specific date range
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-17

# Save results to a file
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-17 --outputFile ./output.json
```

## Expected Output

The output format remains consistent with Phase 1, providing a detailed breakdown of capacity impacts:

```json
[
  {
    "date": "2023-12-15",
    "originalDailyCapacity": {
      "narrowBody": 216,
      "wideBody": 82,
      "total": 298
    },
    "capacityAfterDefiniteImpact": {
      "narrowBody": 208,
      "wideBody": 73,
      "total": 281
    },
    "finalNetCapacity": {
      "narrowBody": 204,
      "wideBody": 73,
      "total": 277
    },
    "maintenanceImpacts": {
      "definite": {
        "reduction": {
          "narrowBody": 8,
          "wideBody": 9,
          "total": 17
        },
        "requests": [
          // Maintenance requests causing definite impact
        ]
      },
      "potential": {
        "reduction": {
          "narrowBody": 4,
          "wideBody": 0,
          "total": 4
        },
        "requests": [
          // Maintenance requests causing potential impact
        ]
      }
    }
  },
  // Additional days...
]
```

## Testing

To test the live implementation:

1. **Database Connection**:
   ```bash
   # Verify database connection
   node -e "require('./src/utils/db').initialize().then(() => console.log('Connected')).catch(e => console.error(e)).finally(() => process.exit())"
   ```

2. **Date Range Tests**:
   ```bash
   # Test with a single day
   node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15
   
   # Test with multiple days
   node live_cli.js --startDate 2023-12-15 --endDate 2023-12-17
   
   # Test with a month-long range
   node live_cli.js --startDate 2023-12-01 --endDate 2023-12-31
   ```

3. **Error Handling**:
   ```bash
   # Test invalid date format
   node live_cli.js --startDate 15-12-2023 --endDate 2023-12-17
   
   # Test start date after end date
   node live_cli.js --startDate 2023-12-18 --endDate 2023-12-17
   ```

## Implementation Status

- [x] Database connector
- [x] StandCapacityToolService implementation
- [x] MaintenanceRequestService implementation 
- [x] Live CLI implementation with error handling
- [x] Documentation
- [ ] Integration tests
- [ ] Performance optimization for large date ranges

## Next Steps

1. Complete comprehensive testing with live database connections
2. Optimize performance for large date ranges (potentially using batch processing)
3. Move to Phase 3: Backend Service Implementation with API endpoints for the frontend 