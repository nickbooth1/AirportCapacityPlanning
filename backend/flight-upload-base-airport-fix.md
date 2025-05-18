# Base Airport Fix Implementation

## Issue Summary
The flight upload process was using "UNKN" as a placeholder for the missing origin or destination in flights, which was incorrect. For flights with a single airport field in the CSV, the system should use the base airport of the system for the missing field:

- For arrivals: The destination should be the base airport (not UNKN)
- For departures: The origin should be the base airport (not UNKN)

## Analysis and Solution
We identified that the issue was in how the system prepared flight data for allocation:

1. In `FlightProcessorService.js`, the `prepareAllocationData` method was hard-coding "UNKN" for the missing origin/destination
2. In `StandAllocationAdapter.js`, the `convertToAllocationFormat` method was using "XXX" for the missing origin/destination

The solution involved:
1. Getting the base airport configuration from the `airportConfigService`
2. Using the base airport's IATA code for the appropriate origin/destination field

## Implementation Details

### 1. FlightProcessorService.js Changes
Updated the `prepareAllocationData` method to:
- Fetch the base airport configuration
- Use the base airport IATA code for origin (departures) or destination (arrivals)
- Fall back to "BASE" if no base airport is configured

```javascript
// Get the base airport configuration
const airportConfigService = require('./airportConfigService');
const config = await airportConfigService.getConfig();
const baseAirport = config.baseAirport;

// Use a default IATA code if no base airport is configured
const baseAirportCode = baseAirport?.iata_code || 'BASE';

// Use in flight normalization
Origin: isArrival ? flight.origin_destination_iata : baseAirportCode,
Destination: isDeparture ? flight.origin_destination_iata : baseAirportCode,
```

### 2. StandAllocationAdapter.js Changes
Updated the `convertToAllocationFormat` method similarly to:
- Fetch the base airport configuration
- Use the base airport code instead of "XXX" placeholder

```javascript
// Get the base airport configuration
const airportConfigService = require('../airportConfigService');
const config = await airportConfigService.getConfig();
const baseAirport = config.baseAirport;

// Use a default IATA code if no base airport is configured
const baseAirportCode = baseAirport?.iata_code || 'BASE';

// In flight formatting
Origin: flight.flight_nature === 'A' ? (flight.origin_destination_iata || '') : baseAirportCode,
Destination: flight.flight_nature === 'D' ? (flight.origin_destination_iata || '') : baseAirportCode,
```

## Testing
The fix was tested using the `test-direct-flight-flow.js` script, which confirmed:
- The base airport configuration (MAN - Manchester) is correctly retrieved
- It's properly used as the origin for departures and destination for arrivals
- The flight normalization process works with both the processor and adapter

## Documentation Updates
We updated:
1. `flight-upload-process-report.md` - Added details about the base airport fix
2. `flight-upload-troubleshooting.md` - Added a section on base airport configuration issues

## Additional Recommendations
1. Add validation to ensure a base airport is configured before flight processing
2. Standardize placeholder values throughout the codebase (use "UNKN" consistently)
3. Add more detailed logging about base airport usage in flight processing 