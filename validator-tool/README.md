# Flight Schedule Validator

A command-line tool for validating flight schedule data against Stand Allocation Algorithm requirements.

## Features

- Validates flight schedule data in various formats (CSV, JSON, Excel)
- Maps column names from source data to required fields
- Checks for data integrity and business rule violations
- Saves and reuses mapping profiles
- Generates detailed validation reports
- Exports validated data to Stand Allocation JSON format
- Links arrival and departure flights automatically

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd flight-schedule-validator

# Install dependencies
npm install

# Make the CLI executable
npm link
```

## Usage

### Basic Validation

```bash
# Validate a flight schedule file with interactive column mapping
validator-cli validate flights.csv

# Use a saved mapping profile
validator-cli validate flights.csv -m airline-format

# Export validation results to a file
validator-cli validate flights.csv -o validation-report.json
```

### Column Mapping

```bash
# Create a mapping profile interactively
validator-cli map flights.csv -o my-mapping.json

# List available mapping profiles
validator-cli map --list
```

### Reference Data

```bash
# Validate with reference data
validator-cli validate flights.csv --reference-data ./references

# Create sample reference data
validator-cli reference --create airlines --output ./reference-data
validator-cli reference --create aircraftTypes --output ./reference-data
validator-cli reference --create terminals --output ./reference-data
```

### Stand Allocation JSON Export

```bash
# Validate and export to Stand Allocation format
validator-cli validate-export flights.csv --output ./allocation-input

# Convert existing validated data to Stand Allocation format
validator-cli export-json validated-data.json --output ./allocation-input

# Validate with a mapping profile and export
validator-cli validate-export flights.csv -m airline-format --output ./allocation-input

# Batch process multiple files
validator-cli batch-process ./flight-schedules --output ./allocation-inputs
```

## File Format Requirements

### Flight Data
Required fields:
- `FlightID`: Unique identifier for the flight
- `FlightNumber`: Commercial flight number
- `AirlineCode`: Operating airline code
- `AircraftType`: Type of aircraft
- `Origin`: Origin airport for the flight
- `Destination`: Destination airport for the flight
- `ScheduledTime`: Arrival or departure time
- `Terminal`: Assigned terminal
- `IsArrival`: Boolean flag (true for arrivals, false for departures)

## Validation Rules

The validator checks for:
1. Missing required fields
2. Invalid data types and formats
3. Reference data integrity (airlines, aircraft types, terminals)
4. Business rule violations (turnaround times, connections, etc.)

## Stand Allocation JSON Format

The validator exports data in the following format required by the Stand Allocation Algorithm:

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
  }
}
```

## License

MIT 