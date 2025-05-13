# Capacity Impact Analyzer CLI Tool

A command-line tool to analyze the impact of maintenance requests on airport stand capacity.

## Overview

This tool calculates how maintenance requests affect the daily stand capacity at an airport. It processes a daily capacity template and maintenance request data to produce detailed impact analysis for a specified date range.

The analysis shows:
* Original daily capacity (by narrow/wide body and total)
* Capacity after definite impact (from approved, in progress, and completed maintenance)
* Final net capacity (after both definite and potential impact from requested maintenance)
* Detailed information about which maintenance requests are causing capacity reductions

## Prerequisites

* Node.js (v12 or higher)

## Usage

```bash
node cli.js --startDate YYYY-MM-DD --endDate YYYY-MM-DD [options]
```

### Required Arguments

* `--startDate YYYY-MM-DD`: The start date for the analysis period
* `--endDate YYYY-MM-DD`: The end date for the analysis period

### Optional Arguments

* `--mockDataDir PATH`: Directory containing mock data files (default: ./mockData)
* `--outputFile PATH`: File to save output (default: prints to console)
* `--help`, `-h`: Show usage information

## Example

```bash
# Run analysis for December 15-16, 2023
node cli.js --startDate 2023-12-15 --endDate 2023-12-16

# Save output to a file
node cli.js --startDate 2023-12-15 --endDate 2023-12-16 --outputFile ./output.json
```

## Mock Data Structure

The tool uses the following mock data files in the `mockData` directory:

* `dailyGrossCapacityTemplate.json`: Template of daily capacity by time slot and aircraft type
* `maintenanceRequests.json`: List of maintenance requests
* `stands.json`: List of stands and their compatible aircraft types
* `aircraftTypes.json`: List of aircraft types and their specifications
* `operationalSettings.json`: Operational parameters
* `maintenanceStatusTypes.json`: Maintenance status types and their IDs

## Output Format

The tool outputs a JSON array with an object for each day in the specified range:

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
          },
          // ... other requests
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
  },
  // ... more days
]
```

## Testing

You can test different scenarios by modifying the mock data files in the `mockData` directory.

Use the following time periods to test different scenarios:
* December 15, 2023: Combination of approved, in progress, and requested maintenance
* December 16, 2023: Different maintenance pattern
* December 17, 2023: Only approved maintenance
* December 18, 2023: No maintenance scheduled

## Maintenance Status Categories

* **Definite Impact (Red):** Status IDs 2 (Approved), 4 (In Progress), and 5 (Completed)
* **Potential Impact (Grey):** Status ID 1 (Requested)
* **Excluded from Analysis:** Status IDs 3 (Rejected) and 6 (Cancelled) 