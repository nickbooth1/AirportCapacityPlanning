# Capacity Impact Analyzer CLI Tool - Live Data Version

A command-line tool to analyze the impact of maintenance requests on airport stand capacity using live data connections.

## Overview

This enhanced version of the Capacity Impact Analyzer connects to live data sources instead of using mock data files. It fetches current data from the database and services to provide real-time analysis of how maintenance requests affect daily stand capacity.

## Prerequisites

* Node.js (v12 or higher)
* Access to the airport database (PostgreSQL)
* Environment configured with database connection parameters
* Active database with populated tables for capacity and maintenance data

## Setup

Ensure your environment has the correct database connection parameters:

```bash
# Example environment variables for database connection
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=airport_capacity_planner
export DB_USER=postgres
export DB_PASSWORD=your_password
```

## Required Database Tables

The tool relies on the following database tables:

1. `stands` - Airport stands information
2. `aircraft_types` - Aircraft specifications
3. `maintenance_requests` - Maintenance requests data
4. `stand_aircraft_constraints` - Stand-aircraft compatibility rules
5. `maintenance_status_types` - Status types for maintenance requests
6. `operational_settings` - System configuration settings
7. `time_slots` - Time slot definitions (optional)

## Usage

```bash
node live_cli.js --startDate YYYY-MM-DD --endDate YYYY-MM-DD [options]
```

### Required Arguments

* `--startDate YYYY-MM-DD`: The start date for the analysis period
* `--endDate YYYY-MM-DD`: The end date for the analysis period

### Optional Arguments

* `--outputFile PATH`: File to save output (default: prints to console)
* `--help`, `-h`: Show usage information

## Examples

```bash
# Run analysis for December 15-16, 2023
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-16

# Save output to a file
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-16 --outputFile ./output.json
```

## Live Data Sources

This tool fetches the following data from live sources:

1. **Stand Capacity Data**: Calculated by `StandCapacityToolService` based on:
   - Available stands
   - Compatible aircraft types
   - Operational parameters (turnaround times, buffer times)
   - Time slot definitions

2. **Maintenance Requests**: Fetched from the database by `MaintenanceRequestService` including:
   - Active requests in the specified date range
   - Request status information (Requested, Approved, In Progress, Completed)
   - Stand assignment

3. **Reference Data**: Fetched from database tables:
   - Aircraft types and specifications
   - Stands and compatibility constraints
   - Operational settings
   - Maintenance status types

## Data Flow

1. The tool connects to the database and verifies connectivity
2. It retrieves all necessary reference data
3. It calculates baseline capacity for each time slot based on active stands and aircraft compatibility
4. It processes maintenance requests that overlap with the specified date range
5. For each maintenance request, it calculates the capacity impact based on affected stands and compatible aircraft
6. It aggregates impacts into daily totals, separating "definite" and "potential" impacts
7. Finally, it outputs the analysis results as JSON data

## Output Format

The tool outputs a JSON array with an object for each day in the specified range, showing the original capacity, capacity after definite impacts, and final net capacity after potential impacts. 

Sample output structure:

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
          {
            "id": "MR001",
            "title": "S101 Pavement Repair",
            "standCode": "S101",
            "statusName": "Approved",
            "startTime": "2023-12-15T08:00:00Z",
            "endTime": "2023-12-15T14:00:00Z"
          }
        ]
      },
      "potential": {
        "reduction": {
          "narrowBody": 4,
          "wideBody": 0,
          "total": 4
        },
        "requests": [
          {
            "id": "MR002",
            "title": "S102 Jetbridge Maintenance",
            "standCode": "S102",
            "statusName": "Requested",
            "startTime": "2023-12-15T10:00:00Z",
            "endTime": "2023-12-15T12:00:00Z"
          }
        ]
      }
    }
  }
]
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify your environment variables are correctly set 
2. Ensure the database server is running and accessible
3. Check that your user has appropriate permissions
4. Verify the required tables exist and have the expected schema

### Missing Data

If the analysis results seem incomplete:

1. Verify that aircraft type and stand compatibility relationships are defined in the database
2. Check that maintenance requests exist for the date range you're analyzing
3. Ensure operational settings are configured correctly
4. Check for appropriate data in all required tables

## Testing

Run the included test script to validate the tool:

```bash
./test_live_cli.sh
```

This script will test various scenarios including date ranges, error handling, and output formats.

## Advanced Usage

For production monitoring or batch processing:

```bash
# Generate reports for multiple time horizons
node live_cli.js --startDate 2023-12-01 --endDate 2023-12-31 --outputFile ./month.json
node live_cli.js --startDate 2023-12-01 --endDate 2023-12-07 --outputFile ./week.json
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15 --outputFile ./day.json
```

This allows comparing capacity impacts across different time horizons. 