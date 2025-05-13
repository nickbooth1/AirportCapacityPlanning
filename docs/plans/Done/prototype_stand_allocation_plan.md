# Prototype: Stand Allocation Tool Implementation Plan

This plan outlines the tasks required to set up a terminal-runnable prototype for the Stand Allocation Tool, including the development of core components and initial mock data scenarios for testing.

## Phase 1: Core Component Setup

- [x] **Task 1.1: `main.py` (or `run_scenario.py`) Script Setup**
    - [x] Create the main script to orchestrate the prototype.
    - [x] Implement argument parsing to accept a scenario name/path.
    - [x] Implement basic structure for calling DataLoader, Engine, and printing results.
- [x] **Task 1.2: `data_loader.py` Module**
    - [x] Create `data_loader.py`.
    - [x] Implement `load_flights(file_path)` function.
    - [x] Implement `load_stands(file_path)` function.
    - [x] Implement `load_airlines(file_path)` function.
    - [x] Implement `load_settings(file_path)` function.
    - [x] Implement `load_maintenance_schedules(file_path)` function.
    - [x] Ensure functions return data as Python objects/dictionaries.
- [x] **Task 1.3: `maintenance_tracker.py` (Mock) Module**
    - [x] Create `maintenance_tracker.py`.
    - [x] Implement `MockMaintenanceTracker` class.
        - [x] `__init__(self, maintenance_schedules)`
        - [x] `is_stand_under_maintenance(self, stand_name, query_start_time, query_end_time)`
- [x] **Task 1.4: `ai_support.py` (Mock) Module**
    - [x] Create `ai_support.py`.
    - [x] Implement `MockAISupport` class.
        - [x] `log_unallocated_flight(self, flight_details, reason)` (prints to console)
- [x] **Task 1.5: `stand_allocation_engine.py` Module**
    - [x] Create `stand_allocation_engine.py`.
    - [x] Implement `StandAllocationEngine` class structure.
        - [x] `__init__(self, flights, stands, airlines, settings, maintenance_tracker, ai_support)`
        - [x] `run_allocation(self)` (initial stub)
        - [x] Define placeholders for internal helper methods.

## Phase 2: Basic Data Structures Definition

- [x] **Task 2.1: Define Python Data Classes/Objects**
    - [x] Create a `Flight` class/dataclass (mirroring `Flight Schedule` from problem statement).
    - [x] Create a `Stand` class/dataclass (mirroring `Stands` from problem statement).
    - [x] Create an `Airline` class/dataclass (mirroring `Airlines` from problem statement).
    - [x] Create a `Settings` object/structure (mirroring `Settings` from problem statement).
    - [x] Create a `MaintenanceEntry` class/dataclass for maintenance schedule items.
    - [x] Define a `FlightOperationUnit` class/dataclass to handle single flights or linked pairs consistently.

## Phase 3: Mock Data Scenario Development

- [x] **Task 3.1: Setup `test_scenarios/` Directory Structure**
    - [x] Create base `test_scenarios/` directory.
- [x] **Task 3.2: Scenario 01: Simple Linked Pair Allocation**
    - [x] Create `test_scenarios/scenario_01_simple_linked_pair/` directory.
    - [x] Create `flights.json` (one arrival linked to one departure, ample time).
    - [x] Create `stands.json` (at least one compatible stand).
    - [x] Create `airlines.json` (for the airline in flights).
    - [x] Create `settings.json` (basic turnaround and gap).
    - [x] Create `maintenance_schedule.json` (empty or no relevant entries).
    - [x] Create `expected_output.txt` detailing expected allocation.
- [x] **Task 3.3: Scenario 02: Conflicting Demands (No Available Stand)**
    - [x] Create `test_scenarios/scenario_02_conflicting_demands/` directory.
    - [x] Create `flights.json` (two flights needing the same stand at overlapping times).
    - [x] Create `stands.json` (only one suitable stand).
    - [x] Create `airlines.json`.
    - [x] Create `settings.json`.
    - [x] Create `maintenance_schedule.json`.
    - [x] Create `expected_output.txt` (one allocated, one unallocated with reason).
- [x] **Task 3.4: Scenario 03: Maintenance Conflict**
    - [x] Create `test_scenarios/scenario_03_maintenance_conflict/` directory.
    - [x] Create `flights.json` (one flight).
    - [x] Create `stands.json` (one suitable stand).
    - [x] Create `airlines.json`.
    - [x] Create `settings.json`.
    - [x] Create `maintenance_schedule.json` (making the suitable stand unavailable during the flight time).
    - [x] Create `expected_output.txt` (flight unallocated due to maintenance).
- [x] **Task 3.5: Scenario 04: No Compatible Stand (Size/Terminal/Contact)**
    - [x] Create `test_scenarios/scenario_04_no_compatible_stand/` directory.
    - [x] Create `flights.json` (one flight).
    - [x] Create `stands.json` (stands are too small, wrong terminal, or wrong type e.g., remote when contact needed).
    - [x] Create `airlines.json` (airline requires contact, or based in a different terminal).
    - [x] Create `settings.json`.
    - [x] Create `maintenance_schedule.json`.
    - [x] Create `expected_output.txt` (flight unallocated with appropriate reason).
- [x] **Task 3.6: Scenario 05: Missing LinkID Partner (Default to Turnaround Time)**
    - [x] Create `test_scenarios/scenario_05_missing_linkid_partner/` directory.
    - [x] Create `flights.json` (one arrival with a LinkID, but no matching departure).
    - [x] Create `stands.json`.
    - [x] Create `airlines.json`.
    - [x] Create `settings.json`.
    - [x] Create `maintenance_schedule.json`.
    - [x] Create `expected_output.txt` (flight allocated based on default turnaround time).

## Phase 4: Engine Logic Implementation (Iterative - consult `StandAllocationProbStmt.md` algorithm)

- [x] **Task 4.1: Implement `_prepare_flight_processing_order`**
    - [x] Handle `LinkID` to group arrival/departure pairs into `FlightOperationUnit`s.
    - [x] Sort units: 1. Chronological, 2. Airline contact stand requirement.
- [x] **Task 4.2: Implement `_calculate_stand_occupancy_duration`**
    - [x] Logic for linked pairs (validate against turnaround, use scheduled times).
    - [x] Logic for single flights (arrival/departure) using `TurnaroundTimeSettings`.
    - [x] Handle missing LinkID partner case (default to turnaround time).
- [x] **Task 4.3: Implement `_is_aircraft_compatible` helper**
    - [x] Logic to map `AircraftType` string to size category.
    - [x] Compare aircraft size category with `Stand.SizeLimit`.
- [x] **Task 4.4: Implement `_identify_candidate_stands`**
    - [x] Filter by airline's `BaseTerminal`.
    - [x] Filter by aircraft compatibility (using `_is_aircraft_compatible`).
    - [x] Filter by `Airline.RequiresContactStand` vs `Stand.IsContactStand`.
    - [x] Placeholder for `_passes_adjacency_rules` (initially return True).
- [x] **Task 4.5: Implement `_check_stand_availability`**
    - [x] Integrate with `MockMaintenanceTracker`.
    - [x] Implement logic to check `stand_occupancy_log` for overlaps (considering `GapBetweenFlights`).
- [x] **Task 4.6: Implement `_allocate_stand_to_flight`**
    - [x] Add entry to `stand_occupancy_log`.
- [x] **Task 4.7: Complete `run_allocation` main loop**
    - [x] Integrate all helper methods.
    - [x] Populate `allocated_flights_report` and `unallocated_flights_report`.
    - [x] Call `MockAISupport.log_unallocated_flight` appropriately.
- [x] **Task 4.8 (Future - Low Priority for Prototype): Implement `_passes_adjacency_rules` (Basic)**
    - [x] If time permits, implement very simple adjacency rules based on `Stands.AdjacencyRules` (e.g., if stand X is in use, stand Y cannot be).

## Phase 5: Testing and Refinement

- [x] **Task 5.1: Run Scenario 01 & Debug**
- [x] **Task 5.2: Run Scenario 02 & Debug**
- [x] **Task 5.3: Run Scenario 03 & Debug**
- [x] **Task 5.4: Run Scenario 04 & Debug**
- [x] **Task 5.5: Run Scenario 05 & Debug**
- [x] **Task 5.6: Implement Output Comparison (Optional)**
    - [x] `main.py`/`run_scenario.py` reads `expected_output.txt` and compares with actual.
- [x] **Task 5.7: Refine output formatting for clarity.**

---
**Notes:**
- This plan is iterative. Some tasks in Phase 4 might be revisited as new scenarios highlight issues.
- For the prototype, focus on getting the core logic working correctly for the defined scenarios.
- Adjacency rules and full AI integration are complex and can be simplified or deferred for the initial prototype. 