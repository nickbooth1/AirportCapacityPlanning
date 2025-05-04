# Airline Repository Implementation

This module implements a comprehensive airline database for the Airport Capacity Planner application. It provides a centralized repository of airline information with industry standard code references (IATA and ICAO) to ensure data consistency and accurate airline identification throughout the system.

## Key Files

### Database
- `migrations/20240923000000_create_airlines_table.js` - Database migration to create the airlines table
- `models/Airline.js` - Objection.js model for airline entities

### API
- `controllers/AirlineController.js` - REST API controller for airline operations
- `routes/airlineRoutes.js` - API route definitions for airline endpoints
- `services/AirlineService.js` - Business logic for airline operations

### Data Import
- `scripts/importAirlineData.js` - Script to import airline data from various online sources

### Tests
- `tests/models/Airline.test.js` - Unit tests for the Airline model

## Database Schema

The airlines table stores the following information:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the airline |
| name | VARCHAR | Official airline name |
| iata_code | VARCHAR(2) | IATA two-letter airline designator code |
| icao_code | VARCHAR(3) | ICAO three-letter airline designator code |
| callsign | VARCHAR | Radio telephony callsign |
| country | VARCHAR | Country of registration |
| active | BOOLEAN | Whether the airline is currently operational |
| headquarters | VARCHAR | Location of headquarters |
| founded | INTEGER | Year the airline was established |
| fleet_size | INTEGER | Number of aircraft |
| destinations | INTEGER | Number of destinations served |
| alliance | VARCHAR | Airline alliance membership |
| subsidiaries | JSON | Related/subsidiary airlines |
| parent | VARCHAR | Parent company |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/airlines | Get all airlines with optional filtering |
| GET | /api/airlines/:id | Get airline by ID |
| GET | /api/airlines/iata/:code | Get airline by IATA code |
| GET | /api/airlines/icao/:code | Get airline by ICAO code |
| GET | /api/airlines/validate | Validate an airline code |
| POST | /api/airlines | Create a new airline |
| POST | /api/airlines/import | Bulk import airlines |
| PUT | /api/airlines/:id | Update an existing airline |
| PUT | /api/airlines/:id/deactivate | Deactivate an airline |

## Data Import Process

The `importAirlineData.js` script collects airline data from multiple sources:

1. **OpenFlights Database** - A comprehensive open-source dataset with ~6,000 airlines and their IATA/ICAO codes
2. **Wikipedia Airline Lists** - Scraped from Wikipedia's airline lists to supplement the OpenFlights data

The script performs the following steps:
1. Fetch data from each source
2. Process and clean the data
3. Merge and deduplicate airlines from different sources
4. Save the processed data to a CSV file for reference
5. Import the data into the database

## Usage Examples

### Validating an Airline Code

```javascript
// Example: Validating a flight's airline code
const AirlineService = require('../services/AirlineService');

async function validateFlightData(flightData) {
  // Extract airline code from flight data
  const { airlineCode } = flightData;
  
  // Validate the airline exists in our repository
  const isValid = await AirlineService.validateAirlineReference(airlineCode, 'IATA');
  
  if (!isValid) {
    return {
      valid: false,
      error: `Unknown airline code: ${airlineCode}`
    };
  }
  
  return { valid: true };
}
```

### Looking Up Airline Details

```javascript
// Example: Looking up full airline details from a code reference
const AirlineService = require('../services/AirlineService');

async function getAirlineDetails(iataCode) {
  try {
    const airline = await AirlineService.getAirlineByIATA(iataCode);
    return airline;
  } catch (error) {
    console.error(`Failed to find airline with IATA code ${iataCode}`);
    return null;
  }
}
```

## Data Maintenance

For ongoing data maintenance:

1. Run the import script periodically to update airline data from authoritative sources:
   ```
   node src/scripts/importAirlineData.js
   ```

2. Use the API to manually update airlines as needed:
   ```
   PUT /api/airlines/:id
   ```

## Testing

Run the airline repository tests with:

```
npx jest tests/models/Airline.test.js
``` 