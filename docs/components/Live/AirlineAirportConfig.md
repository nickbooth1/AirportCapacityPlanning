# AirlineAirportConfig Component

## Overview
The AirlineAirportConfig component provides a centralized configuration interface for managing airport-specific operational settings. It allows users to define their base airport, map airlines to terminals, and associate ground handling agents (GHAs) with airlines. This configuration supports stand allocation and capacity planning by establishing the relationships between these key entities.

## Core Functionality
- **Base airport selection**: Define the primary airport that serves as the operational base
- **Terminal allocation**: Map airlines to specific terminals within the base airport
- **GHA association**: Optionally assign ground handling agents to airline-terminal combinations
- **Configuration persistence**: Store and retrieve configuration data via dedicated API
- **Data sharing**: Make configuration data accessible to other components

## UI and Workflow
The component is organized into three main sections:

1. **Base Airport Selection**
   - Autocomplete dropdown for selecting the primary airport
   - Displays airport code, name, and country

2. **Airline Terminal Allocation Table**
   - Tabular view of airline-terminal-GHA relationships
   - Each row represents one airline's operation at a specific terminal
   - Optional GHA assignment for each airline-terminal pair
   - Edit and delete actions for each allocation

3. **Allocation Dialog**
   - Modal interface for adding/editing allocations
   - Required fields: Airline and Terminal
   - Optional field: Ground Handling Agent
   - Validation to ensure required fields are completed

## Navigation Access
AirlineAirportConfig is accessible via the Configuration menu, under "Airport Configuration". This integration with the Configuration section consolidates all configuration-related components (Airports, Airlines, GHAs, Aircraft Types, Size Categories) under a single navigation path, simplifying the user experience.

## Data Schema
The component manages the following key data structures:

### Base Airport
| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Unique identifier for the airport |
| `code` | STRING | IATA/ICAO airport code |
| `name` | STRING | Full airport name |
| `country` | STRING | Country code (ISO 2-letter) |

### Airline Terminal Allocations
| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Unique identifier for the allocation |
| `airlineId` | INTEGER | Reference to airline |
| `terminalId` | INTEGER | Reference to terminal |
| `ghaId` | INTEGER | Optional reference to GHA |

## API Endpoints
The component relies on these dedicated API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/airport-config` | GET | Retrieve current airport configuration |
| `/api/airport-config` | PUT | Update airport configuration |
| `/api/airports` | GET | Get list of airports for selection |
| `/api/airlines` | GET | Get list of airlines for allocation |
| `/api/terminals` | GET | Get terminals for the base airport |
| `/api/ghas` | GET | Get available GHAs |

## Context Provider
The AirportConfigContext provides application-wide access to the configuration:

```javascript
// Sample usage in other components
import { useAirportConfig } from '../contexts/AirportConfigContext';

function SomeComponent() {
  const { airportConfig } = useAirportConfig();
  
  return (
    <div>
      Base airport: {airportConfig.baseAirport?.name || 'Not configured'}
    </div>
  );
}
```

## Integration with Other Components
The airport configuration data is consumed by:

1. **Stand Allocator Tool**
   - Uses airline-terminal mappings to inform stand allocation decisions
   - Considers terminal proximity for more efficient operations

2. **Capacity Analysis**
   - Incorporates airline distribution across terminals for demand analysis
   - Identifies potential terminal capacity constraints

3. **GHA Workforce Planning**
   - Uses airline-GHA associations to determine staffing requirements
   - Helps optimize GHA resource allocation

## Implementation Requirements
For implementation, the following dependencies are required:

1. **Frontend**
   - React with hooks support
   - Material UI components
   - Context API for state management
   - Axios for API communication

2. **Backend**
   - Express.js API endpoints
   - Database tables for configuration storage
   - Service layer for business logic

## Future Enhancements
Planned enhancements for future versions:

1. **Terminal-specific stand mapping**
   - Link terminals to specific stands for more granular allocation
   
2. **Time-based configurations**
   - Support seasonal changes in airline-terminal allocations
   
3. **Multiple-airport support**
   - Extend to support multiple base airports for larger operations
