# Stand Allocation Tool

An algorithm for allocating flights to airport stands, optimizing for various constraints and preferences.

## Overview

The Stand Allocation Tool allocates arriving and departing flights to airport stands based on a set of constraints and preferences. The tool takes into account aircraft size, airline preferences, terminal compatibility, maintenance schedules, and passenger connections.

## Algorithmic Enhancements

The allocation engine has been enhanced with the following features:

### 1. Efficient Stand Availability Checking
- Implemented an interval tree data structure to efficiently check for stand availability
- Improved performance for large datasets by reducing time complexity from O(n) to O(log n)
- Integrated maintenance schedules directly into the interval tree for unified time-interval checking

### 2. Sophisticated Flight Prioritization
- Added a criticality scoring system to prioritize flights
- Factors that increase priority:
  - Aircraft type (e.g., A380, B747)
  - Airline priority tier
  - Contact stand requirements
  - Critical connections
  - Base priority score

### 3. Constraint Programming (CP) Solver Integration
- Added option to use Google OR-Tools CP-SAT solver for global optimization
- The CP solver attempts to find a globally optimal allocation
- Falls back to greedy algorithm if the CP solver fails or is disabled
- Configurate via settings JSON file

### 4. Enhanced Flight Pairing Algorithm
- Added support for connecting flights and passenger transfers
- Considers terminal proximity when allocating connecting flights
- Tracks terminal allocations to optimize for minimum connection time
- Configurable connection parameters (min/max transfer times, critical status)

## Usage

To run a scenario:

```bash
python main.py <path_to_scenario_directory>
```

Example:
```bash
python main.py test_scenarios/scenario_01_simple_linked_pair
```

## Test Scenarios

The tool includes several test scenarios:

1. **Simple Linked Pair**: Basic scenario with one arrival linked to one departure
2. **Conflicting Demands**: Two flights needing the same stand at overlapping times
3. **Maintenance Conflict**: Flight that conflicts with scheduled maintenance
4. **No Compatible Stand**: Flight with no suitable stand available
5. **Missing LinkID Partner**: Arrival with a LinkID but no matching departure
6. **Connecting Flights**: Flights with passenger connections between them

## Data Structure

The tool uses the following data files for each scenario:

- `flights.json`: Flight information (arrivals and departures)
- `stands.json`: Airport stand information
- `airlines.json`: Airline information and preferences
- `settings.json`: Configuration parameters
- `maintenance_schedule.json`: Stand maintenance periods
- `connections.json`: Connecting flight information (optional)
- `expected_output.txt`: Expected allocation results

## Configuration

### Settings

The `settings.json` file allows configuration of:

- Gap between flights
- Turnaround time settings
- Prioritization weights
- Solver parameters

Example:
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
    "use_solver": false,
    "solver_time_limit_seconds": 30,
    "optimality_gap": 0.05,
    "max_solutions": 1
  }
}
```

### Connections

The `connections.json` file defines passenger connections between flights:

```json
[
  {
    "arrival_flight_id": "BA100A",
    "departure_flight_id": "AF200D",
    "min_transfer_minutes": 45,
    "max_transfer_minutes": 180,
    "is_critical": true
  }
]
``` 