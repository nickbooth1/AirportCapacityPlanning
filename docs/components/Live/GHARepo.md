# GHARepo Component

## Overview
The GHARepo is a core data repository that manages ground handling agent information in the Airport Capacity Planner application. It provides a centralized and validated database of ground handling companies that operate at airports worldwide, ensuring accurate identification and selection of handling agents throughout the system.

## Core Functionality
- **GHA data storage**: Maintains comprehensive information about ground handling agents
- **Airport association**: Maps GHAs to the airports where they operate
- **Service type categorization**: Classifies GHAs by the services they provide
- **Search capabilities**: Enables finding GHAs by name, airport, country, or service type
- **Validation service**: Verifies GHA references in capacity planning
- **CRUD operations**: Supports creating, reading, updating, and deleting GHA records

## Navigation Access
The GHARepo is accessible to users via a dedicated navigation menu item labeled "GHAs" in the main application interface. This provides direct access to:
- Browse the complete GHA database
- Search for specific ground handling agents
- View detailed information about each GHA
- Filter GHAs by airport, service type, or region
- See which GHAs operate at specific airports

This navigation entry ensures users can quickly reference GHA information when needed during capacity planning and resource allocation tasks.

## Data Schema
The ground handling agent repository maintains the following critical information:

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Unique internal identifier |
| `name` | string | Official company name |
| `code` | string(10) | Internal reference code (if applicable) |
| `abbreviation` | string(10) | Common abbreviation used in the industry |
| `headquarters` | string | Location of headquarters |
| `country` | string(2) | Country of registration (ISO 2-letter code) |
| `country_name` | string | Full country name |
| `founded` | integer | Year the company was established |
| `website` | string | Official website URL |
| `parent_company` | string | Parent organization (if applicable) |
| `subsidiaries` | array | Related/subsidiary companies |
| `service_types` | array | Types of services provided (see below) |
| `operates_at` | array | Airport codes where the GHA operates |
| `status` | string | Operational status (active, inactive) |
| `data_source` | string | Origin of the data record |
| `last_updated` | datetime | Record last update timestamp |

### Service Types
Ground handling agents typically provide one or more of the following service categories:

1. **Passenger Services**
   - Check-in
   - Boarding
   - Arrival assistance
   - Special assistance (PRM)
   - VIP services
   
2. **Ramp Services**
   - Aircraft marshalling
   - Towing
   - Pushback
   - Ground power supply
   
3. **Baggage Handling**
   - Sorting
   - Loading/unloading
   - Transfer handling
   
4. **Cargo Handling**
   - Freight processing
   - Documentation
   - ULD management
   
5. **Aircraft Services**
   - Cleaning
   - De-icing
   - Lavatory service
   - Water service
   
6. **Fuel Services**
   - Fueling operations
   - Quality control
   
7. **Catering**
   - Food loading
   - Galley services
   
8. **Security**
   - Aircraft security checks
   - Hold baggage screening
   
9. **Maintenance**
   - Line maintenance
   - Technical support

## API Endpoints
The GHA Repository exposes the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ghas` | GET | Get all GHAs (with pagination and filtering) |
| `/api/ghas/:id` | GET | Get details for a specific GHA by ID |
| `/api/ghas/search` | GET | Search for GHAs by name, code, etc. |
| `/api/ghas/airport/:code` | GET | Get GHAs operating at a specific airport |
| `/api/ghas` | POST | Create a new GHA |
| `/api/ghas/:id` | PUT | Update an existing GHA |
| `/api/ghas/:id` | DELETE | Delete a GHA |
| `/api/ghas/import` | POST | Import bulk GHA data |

## Integration Points
The GHARepo will integrate with:
- **Airport capacity models**: To accurately map handling capabilities at each airport
- **Schedule planning**: To assign appropriate handling agents to flights
- **Resource planning**: To model resource allocation at each airport
- **Reporting modules**: To analyze handling performance by provider
- **Admin interfaces**: For data management and updates

## Data Sources
Unlike airports and airlines which have standardized datasets, ground handling agents information needs to be compiled from multiple sources:

1. **Industry Directories**
   - IATA Ground Handling Council (IGHC) member directory
   - Airport Services Association (ASA) member list
   
2. **Airport Websites**
   - Official airport websites typically list authorized ground handlers
   
3. **Aviation Industry Databases**
   - CAPA - Centre for Aviation
   - FlightGlobal
   
4. **Commercial Providers**
   - Cirium
   - OAG (Official Airline Guide)
   
5. **Web Scraping**
   - Wikipedia lists of ground handling companies
   - Company websites
   - Aviation news sites
   
6. **Manual Data Collection**
   - Direct outreach to airports for their authorized handlers

## Implementation Details

### Model Definition
The `GroundHandlingAgent` model extends the Objection.js `Model` class and defines the data schema, validations, and relationships.

```javascript
class GroundHandlingAgent extends Model {
  static get tableName() {
    return 'ground_handling_agents';
  }
  
  static get jsonSchema() {
    // Schema definition
  }
  
  static get relationMappings() {
    // Define relationships with airports
  }
}
```

### Data Import Process
A multi-source import process combines data from various origins:

1. **Data Collection**: Scrape/extract data from multiple sources
2. **Normalization**: Standardize field formats and values
3. **Deduplication**: Remove duplicate entries
4. **Validation**: Verify data integrity and required fields
5. **Import**: Load validated data into the database

### Service Layer
The `GroundHandlingAgentService` provides business logic and abstracts database operations:

```javascript
class GroundHandlingAgentService {
  async getGHAById(id) { /* ... */ }
  async findGHAsByName(name) { /* ... */ }
  async findGHAsByAirport(airportCode) { /* ... */ }
  async getAllGHAs(filter) { /* ... */ }
  async bulkImport(ghas) { /* ... */ }
}
```

## Maintenance Considerations
- **Regular updates**: Periodic refreshes to capture industry changes
- **Airport-specific validations**: Ensure GHAs are correctly mapped to airports
- **Service capability verification**: Validate service offerings
- **Mergers and acquisitions**: Track industry consolidation
- **Relationship mapping**: Maintain parent-subsidiary relationships

## Example Usage
```javascript
// Find all ground handlers at London Heathrow
const lhrHandlers = await ghaService.findGHAsByAirport('LHR');

// Find handlers that provide cargo services
const cargoHandlers = await ghaService.getAllGHAs({ 
  serviceType: 'cargo_handling' 
});

// Get details for a specific handler
const swissport = await ghaService.getGHAById(123);
```

## Major Global Ground Handlers
The repository will initially include major global players:

1. **Swissport International** - Global leader in airport ground services
2. **Menzies Aviation** - Provides services at 200+ airports worldwide
3. **dnata** - Major handler with operations across 6 continents
4. **Worldwide Flight Services (WFS)** - Specialist in cargo handling
5. **Aviapartner** - Major European ground handler
6. **Celebi Ground Handling** - Operations in Europe, Asia and Africa
7. **AeroGround** - Munich Airport's handling subsidiary
8. **Fraport Ground Services** - Frankfurt Airport's handling company
9. **Havas Ground Handling** - Turkish ground handling provider
10. **Qatar Aviation Services** - Middle Eastern ground handler

This list will be expanded during implementation to include regional and local handlers, ultimately aiming for comprehensive global coverage.
