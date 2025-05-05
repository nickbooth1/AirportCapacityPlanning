# AirlineRepo Component

## Overview
The AirlineRepo is a core data repository that manages airline information in the Airport Capacity Planner application. It provides a centralized and validated database of airlines with their industry standard code references to ensure data consistency and accurate airline identification throughout the system.

## Core Functionality
- **Airline data storage**: Maintains comprehensive airline information
- **Code reference mapping**: Maps industry standard codes to specific airlines
- **Validation service**: Validates airline references in imported data
- **Search capabilities**: Enables finding airlines by name, code, or other attributes
- **CRUD operations**: Supports creating, reading, updating, and deleting airline records

## Data Schema
The airline repository maintains the following critical information:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique internal identifier |
| `name` | string | Official airline name |
| `iataCode` | string(2) | IATA two-letter airline designator code |
| `icaoCode` | string(3) | ICAO three-letter airline designator code |
| `callsign` | string | Radio telephony callsign |
| `country` | string | Country of registration |
| `active` | boolean | Whether the airline is currently operational |
| `headquarters` | string | Location of headquarters |
| `founded` | integer | Year the airline was established |
| `fleetSize` | integer | Number of aircraft (optional) |
| `destinations` | integer | Number of destinations served (optional) |
| `alliance` | string | Airline alliance membership (if any) |
| `subsidiaries` | array | Related/subsidiary airlines |
| `parent` | string | Parent company (if applicable) |
| `createdAt` | datetime | Record creation timestamp |
| `updatedAt` | datetime | Record last update timestamp |

## Industry Standard Codes
The repository focuses on two primary industry code standards:

### IATA Codes
- Two-letter designator codes (e.g., AA, BA, UA)
- Used primarily for reservations, ticketing, and baggage handling
- Consumer-facing and widely used in commercial contexts

### ICAO Codes
- Three-letter designator codes (e.g., AAL, BAW, UAL)
- Used primarily for air traffic control and flight operations
- Technical standard for international flight operations

## API and Operations

### Core Methods
- `getAirlineByIATA(code)`: Retrieve airline by IATA code
- `getAirlineByICAO(code)`: Retrieve airline by ICAO code 
- `findAirlines(query)`: Search airlines by name or other attributes
- `validateAirlineReference(code, type)`: Validate if a code corresponds to a known airline
- `createAirline(data)`: Add a new airline record
- `updateAirline(id, data)`: Update an existing airline record
- `deactivateAirline(id)`: Mark an airline as inactive

## Implementation Options

### Database
- Recommended storage in a relational database (PostgreSQL/MySQL)
- Indexed lookups on IATA and ICAO codes
- Full-text search capabilities for airline names

### Data Population
- Initial seeding from industry reference data
- Admin interface for manual updates
- Optional API integration with aviation data providers for automatic updates

## Usage Examples

### Data Validation Example
```javascript
// Validating an airline code from imported flight data
const validateFlightData = async (flightData) => {
  // Extract airline code from flight data
  const { airlineCode } = flightData;
  
  // Validate the airline exists in our repository
  const isValid = await AirlineRepo.validateAirlineReference(airlineCode, 'IATA');
  
  if (!isValid) {
    return {
      valid: false,
      error: `Unknown airline code: ${airlineCode}`
    };
  }
  
  return { valid: true };
};
```

### Airline Lookup Example
```javascript
// Looking up full airline details from a code reference
const getAirlineDetails = async (iataCode) => {
  try {
    const airline = await AirlineRepo.getAirlineByIATA(iataCode);
    return airline;
  } catch (error) {
    console.error(`Failed to find airline with IATA code ${iataCode}`);
    return null;
  }
};
```

## Integration Points
The AirlineRepo will integrate with:
- Data import processes to validate airline references
- Flight schedule components to provide airline details
- Reporting modules to aggregate data by airline
- Admin interfaces for data management

## Maintenance Considerations
- Regular updates for new airlines and code changes
- Historical tracking of code reassignments
- Handling of airline mergers and acquisitions
- Support for regional/subsidiary relationships

## Data Sources
Initial and update data can be sourced from:
- IATA and ICAO official publications
- Commercial aviation databases
- Open source datasets like OpenFlights
- National aviation authorities
