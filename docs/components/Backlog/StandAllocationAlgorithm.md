# Stand Allocation Algorithm Overview

## Algorithm Flow

The stand allocation algorithm follows a sophisticated two-phase approach, optimizing the assignment of flights to appropriate stands while respecting multiple operational constraints.

```
┌─────────────────────┐
│  Input Data Loading │
└──────────┬──────────┘
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Constraint Programming│ No  │   Greedy Algorithm  │
│     (CP) Solver      ├─────►      Fallback       │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Optimal Allocation  │      │ Sequential Allocation│
│    (If Successful)  │      │    by Priority      │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           └────────────┬──────────────┘
                        ▼
              ┌─────────────────────┐
              │   Results Reporting │
              └─────────────────────┘
```

### Phase 1: Constraint Programming (CP) Solver

The CP solver attempts to find a globally optimal solution using Google OR-Tools CP-SAT solver:

1. **Model Creation**:
   - Creates variables for flight-stand assignments
   - Defines constraints based on stand compatibility, maintenance, turnaround times
   - Handles linked flights (arrival/departure pairs)
   - Establishes non-overlap constraints for shared resources
   
2. **Objective Function**:
   - Maximizes allocated flights weighted by criticality score
   
3. **Solution Search**:
   - Runs with a configurable time limit (defaults to 300 seconds for large datasets)
   - Uses callbacks to track progress and update allocation metrics

If the CP solver is successful, it returns the optimal allocation. If it fails to find a solution within the time limit or due to complexity, the algorithm falls back to Phase 2.

### Phase 2: Greedy Algorithm Fallback

A deterministic greedy approach that processes flights sequentially:

1. **Flight Prioritization**:
   - Sorts flights by criticality score (composed of multiple factors)
   - Gives precedence to more critical flights
   
2. **Sequential Allocation**:
   - For each flight (or linked pair), finds the best available stand
   - Once a stand is allocated, it's marked as occupied for the duration
   
3. **Constraint Checking**:
   - Checks stand compatibility (size, terminal, contact stand requirements)
   - Verifies stand availability during required time periods
   - Respects maintenance schedules and adjacency restrictions

## Key Inputs

### Flight Data
**Mandatory Fields:**
- `FlightID`: Unique identifier for the flight
- `FlightNumber`: Commercial flight number
- `AirlineCode`: Operating airline code (must match exactly with AirlineCode in Airline Data)
- `AircraftType`: Type of aircraft (e.g., "B737", "A320") 
- `Origin`: Origin airport for the flight
- `Destination`: Destination airport for the flight
- `ScheduledTime`: Arrival or departure time (Format: "HH:MM" or "YYYY-MM-DDTHH:MM")
- `Terminal`: Assigned terminal
- `IsArrival`: Boolean flag (true for arrivals, false for departures)

**Optional Fields:**
- `LinkID`: ID linking arrival to corresponding departure (for turnarounds) - Default: None
- `is_critical_connection`: Flag for flights with important passenger connections - Default: False
- `base_priority_score`: Base importance score for this flight - Default: 0

### Stand Data
**Mandatory Fields:**
- `StandName`: Unique identifier for the stand
- `Terminal`: Terminal where stand is located
- `IsContactStand`: Whether it's a contact stand (with passenger boarding bridge)
- `SizeLimit`: Maximum aircraft size category ("Narrow", "Wide", "Super")

**Optional Fields:**
- `AdjacencyRules`: Defines restrictions with neighboring stands - Default: Empty dict

### Airline Data
**Mandatory Fields:**
- `AirlineCode`: Unique code for the airline (must match with AirlineCode in Flight Data)
- `AirlineName`: Full name of the airline
- `BaseTerminal`: Preferred terminal for this airline
- `RequiresContactStand`: Whether airline requires contact stands

**Optional Fields:**
- `priority_tier`: Priority level of the airline - Default: 1

### Maintenance Data
**All Fields Mandatory:**
- `StandName`: Stand being maintained
- `StartTime`: Start of maintenance period (Format: "HH:MM" or "YYYY-MM-DDTHH:MM")
- `EndTime`: End of maintenance period (Format: "HH:MM" or "YYYY-MM-DDTHH:MM")

### Settings
**Mandatory Fields:**
- `GapBetweenFlights`: Minimum time between consecutive flights at a stand
- `TurnaroundTimeSettings`: Required turnaround times by aircraft type

**Optional Fields:**
- `prioritization_weights`: Weights for different factors in criticality calculation - Default: Preset weights
- `solver_parameters`: Configuration for the CP solver - Default: Preset configuration

### Connections Data (Optional)
If provided, each entry requires:
- `arrival_flight_id`: ID of the arrival flight
- `departure_flight_id`: ID of the departure flight
- `min_transfer_minutes`: Minimum required transfer time - Default: 30
- `max_transfer_minutes`: Maximum reasonable transfer time - Default: 180
- `is_critical`: Whether this is a critical connection - Default: False

## Important Notes on Input Requirements
1. **Exact Field Names**: The algorithm requires exact field names as listed above. There is no automatic mapping between differently named fields (e.g., "Airline IATA" vs "AirlineCode").

2. **Data Integrity**: Keys must be consistent across datasets (e.g., AirlineCode in flights must match entries in airline data).

3. **Input Format**: The data loader expects JSON files with fields matching exactly the structure required by the algorithm.

4. **Data Preprocessing**: If your input data uses different column names, you will need to preprocess and transform the data before feeding it to the algorithm.

## Flight Criticality Calculation

A weighted composite score determines flight priority:
```
criticality = (aircraft_type_weight * aircraft_factor +
              airline_tier_weight * airline_tier +
              requires_contact_stand_weight * contact_stand_factor +
              critical_connection_weight * connection_factor +
              base_score_weight * base_priority_score)
```

## Key Outputs

### Allocated Flights Report
For each successfully allocated flight:
- `flight`: Reference to the flight object
- `stand`: Reference to the allocated stand
- `start_time`: Stand occupancy start time
- `end_time`: Stand occupancy end time

### Unallocated Flights Report
For each flight that couldn't be allocated:
- `flight`: Reference to the flight object
- `reason`: Explanation for why allocation failed (e.g., "No suitable stand available")

## Performance Characteristics

### Time Complexity
- CP Solver: Exponential in worst case, but with practical time limits
- Greedy Algorithm: O(n log n) for sorting, O(n * m) for allocation where:
  - n = number of flights
  - m = number of stands

### Space Complexity
- O(n + m) for basic data structures
- O(n * m) for CP model variables and constraints

### Optimality
- CP Solver: Globally optimal when successful
- Greedy Algorithm: Locally optimal decisions, but globally suboptimal

## Key Algorithm Enhancements

1. **Interval Trees for Availability Checking**: Reduces stand availability checking from O(n) to O(log n)

2. **Sophisticated Flight Prioritization**: Multi-factor criticality scoring system

3. **Constraint Programming Solver**: For globally optimal solutions when feasible

4. **Connection Handling**: Support for passenger transfers between flights

5. **Maintenance Period Integration**: Respects stand maintenance schedules

6. **Adjacency Rule Enforcement**: Prevents invalid combinations of stand usage

The algorithm continues to evolve with plans to add further optimizations around:
- Terminal-based allocation batching
- Dynamic criticality adjustment
- Machine learning prediction for stand preferences 