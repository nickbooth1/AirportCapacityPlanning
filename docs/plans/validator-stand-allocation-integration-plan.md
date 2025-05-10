# Validator to Stand Allocation Integration Plan

## Overview
This plan outlines the steps required to enhance the Flight Schedule Validator tool to provide seamless data conversion from CSV to JSON format for the Stand Allocation Algorithm. Currently, the validator tool can process and validate flight schedule data in various formats including CSV, while the Stand Allocation Algorithm only accepts JSON input. This integration will ensure proper data flow between these two components of the Airport Capacity Planner system.

## Requirements

### Functional Requirements
1. Create a conversion module within the validator tool to transform validated data to Stand Allocation compatible JSON format
2. Add export functionality for generating the specific JSON files required by the Stand Allocation Algorithm
3. Ensure data integrity is maintained during conversion
4. Provide mapping capabilities for source CSV fields to the exact JSON structure expected by the Stand Allocation Algorithm
5. Support batch processing for multiple flight schedules

### Technical Requirements
1. Follow the Stand Allocation Algorithm's specific JSON schema requirements
2. Create multiple output files (flights.json, stands.json, airlines.json, settings.json)
3. Handle date/time format conversions
4. Implement LinkID generation/preservation for flight pairs
5. Handle aircraft type mapping to size categories
6. Handle terminal mapping to proper stand assignment

## Implementation Phases

### Phase 1: Analysis and Design (2 days)

#### 1.1 Stand Allocation Input Analysis (Day 1)
- [x] Analyze the Stand Allocation Algorithm input requirements in detail
- [x] Document the exact JSON schema for each required file
- [x] Identify data transformations needed from validator output to allocation input
- [x] Create mapping rules for data fields that need special handling (times, IDs, etc.)

#### 1.2 Integration Architecture Design (Day 2)
- [x] Design integration points between validator and stand allocation
- [x] Create data flow diagrams
- [x] Design file structure and naming conventions
- [x] Define error handling and logging approach

### Phase 2: Core Conversion Module Development (4 days)

#### 2.1 JSON Formatter Module (Days 3-4)
- [x] Create a new module `jsonFormatter.js` with methods:
  - [x] `convertToStandAllocationFormat(validatedData)` - Transform validated data to required format
  - [x] `generateFlightsJson(flights)` - Create flights.json content
  - [x] `generateStandsJson(terminalData)` - Create stands.json content
  - [x] `generateAirlinesJson(airlineData)` - Create airlines.json content
  - [x] `generateSettingsJson(settings)` - Create settings.json content
- [x] Implement data object transforms to match required schema
- [x] Create unit tests for formatter functions
- [x] Implement validation of output against stand allocation schema requirements

#### 2.2 Flight Linker Enhancement (Days 5-6)
- [x] Implement algorithms to handle linked flight pairs:
  - [x] `identifyLinkedFlights(flights)` - Identify arrival/departure pairs
  - [x] `generateLinkIDs(pairs)` - Create LinkIDs for paired flights
  - [x] `applyLinkIDs(flights, linkMap)` - Apply LinkIDs to flight objects
- [x] Implement intelligent pairing based on aircraft type, airline, and scheduling
- [x] Handle time window settings for turnaround times
- [x] Create unit tests for flight linking algorithms

### Phase 3: CLI and Export Features (3 days)

#### 3.1 CLI Command Extensions (Day 7)
- [x] Add new commands to validator CLI:
  - [x] `export-json` - Export validated data in stand allocation format
  - [x] `convert` - Convert data without full validation if needed
  - [x] `validate-export` - Validate and export in one step
- [x] Implement command options for output directory specification
- [x] Create help documentation for new commands
- [x] Update README with new command examples

#### 3.2 Export Configuration Options (Day 8)
- [x] Implement export configuration options in `configManager.js`:
  - [x] Default export paths
  - [x] File naming templates
  - [x] Stand allocation specific settings
  - [x] Default values for missing fields
- [x] Create configuration schema for export settings
- [x] Add configuration commands to manage export settings

#### 3.3 Batch Processing (Day 9)
- [x] Implement batch processing for multiple files
- [x] Add directory scanning capabilities
- [x] Create aggregated validation and export reporting
- [x] Implement parallel processing options

### Phase 4: Integration and Testing (3 days)

#### 4.1 Integration Testing (Day 10)
- [x] Create comprehensive integration test suite
- [x] Test with various CSV input formats
- [x] Test all export options
- [x] Verify compatibility with Stand Allocation Algorithm
- [x] Document test scenarios and results

#### 4.2 Performance Optimization (Day 11)
- [x] Profile conversion performance with large datasets
- [x] Identify and remove bottlenecks
- [x] Implement memory usage optimizations for large files
- [x] Benchmark and document performance characteristics

#### 4.3 Documentation and Examples (Day 12)
- [x] Create detailed documentation for integration process
- [x] Develop example scripts and workflows
- [x] Create sample CSV to JSON conversion examples
- [x] Document common issues and solutions
- [x] Update main README with new capabilities

## JSON Output Schema Examples

### flights.json
```json
[
  {
    "FlightID": "FL001",
    "FlightNumber": "BA123",
    "AirlineCode": "BA",
    "AircraftType": "B737",
    "Origin": "JFK",
    "Destination": "LHR",
    "ScheduledTime": "10:00",
    "Terminal": "T1",
    "IsArrival": true,
    "LinkID": "LINK001"
  },
  {
    "FlightID": "FL002",
    "FlightNumber": "BA456",
    "AirlineCode": "BA",
    "AircraftType": "B737",
    "Origin": "LHR",
    "Destination": "CDG",
    "ScheduledTime": "11:30",
    "Terminal": "T1",
    "IsArrival": false,
    "LinkID": "LINK001"
  }
]
```

### stands.json
```json
[
  {
    "StandName": "S1",
    "Terminal": "T1",
    "IsContactStand": true,
    "SizeLimit": "Narrow",
    "AdjacencyRules": {}
  },
  {
    "StandName": "S2",
    "Terminal": "T1",
    "IsContactStand": true,
    "SizeLimit": "Wide",
    "AdjacencyRules": {}
  }
]
```

### airlines.json
```json
[
  {
    "AirlineCode": "BA",
    "AirlineName": "British Airways",
    "BaseTerminal": "T1",
    "RequiresContactStand": true
  }
]
```

### settings.json
```json
{
  "GapBetweenFlights": 15,
  "TurnaroundTimeSettings": {
    "Default": 45,
    "Narrow": 30,
    "Wide": 45,
    "Super": 60
  },
  "prioritization_weights": {
    "aircraft_type_A380": 10.0,
    "aircraft_type_B747": 8.0,
    "airline_tier": 2.0,
    "requires_contact_stand": 3.0,
    "critical_connection": 5.0,
    "base_score": 1.0
  },
  "solver_parameters": {
    "use_solver": true,
    "solver_time_limit_seconds": 30,
    "optimality_gap": 0.05,
    "max_solutions": 1
  }
}
```

## CLI Usage Examples

```bash
# Validate and export to Stand Allocation format
$ validator-cli validate-export flights.csv --output ./allocation-input

# Convert existing validated data to Stand Allocation format
$ validator-cli export-json validated-data.json --output ./allocation-input

# Validate with a mapping profile and export
$ validator-cli validate-export flights.csv -m airline-format --output ./allocation-input

# Batch process multiple files
$ validator-cli batch-process ./flight-schedules --output ./allocation-inputs
```

## Deliverables
1. Enhanced validator tool with CSV-to-JSON conversion capabilities
2. New CLI commands for export and conversion
3. Integration tests with stand allocation algorithm
4. Documentation and examples
5. Performance benchmarks

## Dependencies
- Flight Schedule Validator completion (Phases 1 and 2)
- Stand Allocation Algorithm JSON input schema definition
- Test data availability in CSV format

## Future Enhancements (Post-Initial Implementation)
- Web API for direct integration in frontend
- Streaming data processing for very large files
- Webhooks for automated processing
- Two-way conversion (JSON to CSV)
- Result merging from allocation back to CSV format
