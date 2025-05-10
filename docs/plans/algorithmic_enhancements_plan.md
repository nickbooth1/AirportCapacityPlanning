# Algorithmic Enhancements Implementation Plan

This document outlines the tasks required to implement the proposed algorithmic enhancements for the Stand Allocation Tool, focusing on scalability and performance.

## Phase 1: Refactor Stand Availability Checking

- [ ] **Task 1.1: Research and Select/Design Interval Tree Solution**
    - [ ] Evaluate existing Python Interval Tree libraries (e.g., `intervaltree`) for suitability.
    - [ ] If no suitable library, design a custom Interval Tree or sorted interval list implementation.
- [ ] **Task 1.2: Modify `StandAllocationEngine.__init__`**
    - [ ] Change `stand_occupancy_log` data structure from `Dict[str, List[Tuple]]` to `Dict[str, IntervalTreeObject]` (or custom equivalent).
    - [ ] Integrate maintenance schedules: At initialization, convert all `MaintenanceEntry` objects into intervals and add them to the corresponding stand's Interval Tree.
- [ ] **Task 1.3: Update `StandAllocationEngine._allocate_stand_to_flight`**
    - [ ] When a flight is allocated, add a new interval representing the flight's occupancy (including `GapBetweenFlights` on both sides) to the allocated stand's Interval Tree.
- [ ] **Task 1.4: Update `StandAllocationEngine._check_stand_availability`**
    - [ ] Modify to query the stand's Interval Tree for any overlaps with the `[query_start_time, query_end_time]` period.
    - [ ] Ensure `GapBetweenFlights` is correctly considered (either by being part of the inserted interval or by adjusting the query window if not already handled in 1.3).
- [ ] **Task 1.5: Testing & Validation**
    - [ ] Create new unit tests specifically for the Interval Tree implementation and `_check_stand_availability` with various overlapping, adjacent, and non-overlapping scenarios.
    - [ ] Run existing test scenarios (`scenario_01` to `scenario_05`) to ensure no regressions in allocation logic due to these changes.
    - [ ] Verify correct handling of maintenance periods within the new structure.

## Phase 2: Implement Sophisticated Flight Prioritization

- [ ] **Task 2.1: Enhance Data Structures (`data_structures.py`)**
    - [ ] Add `priority_tier: int` (or similar) to the `Airline` dataclass.
    - [ ] Add `criticality_score: float` (or fields to derive it, e.g., `base_priority_score: int`, `is_critical_connection: bool`) to the `Flight` dataclass.
- [ ] **Task 2.2: Update Data Loaders (`data_loader.py`)**
    - [ ] Modify `load_airlines` and `load_flights` to handle the new prioritization-related fields if they are to be sourced from the JSON input files.
    - [ ] If not in JSON, ensure default values are appropriately set in `__post_init__` or during engine initialization.
- [ ] **Task 2.3: Update `Settings` Dataclass**
    - [ ] Add `prioritization_weights: Dict[str, float]` to `Settings` (e.g., `{"aircraft_type_A380": 10.0, "airline_tier_1_bonus": 5.0, "requires_contact_stand": 3.0}`).
    - [ ] (Placeholder for Phase 3) Add `solver_parameters: Dict[str, Any]` to `Settings`.
- [ ] **Task 2.4: Modify `StandAllocationEngine._prepare_flight_processing_order`**
    - [ ] Implement logic to calculate a comprehensive `criticality_score` for each `FlightOperationUnit`. This score should be a weighted sum based on factors such as:
        - Scheduled time (chronological aspect).
        - Aircraft type/size constraints (e.g., higher score for A380s if Super stands are scarce).
        - Airline `priority_tier`.
        - `RequiresContactStand` if contact stands are limited.
        - Other factors as defined by `prioritization_weights` in `Settings`.
    - [ ] Update the `sort_key` function to use this new `criticality_score` as the primary sorting criterion.
- [ ] **Task 2.5: Testing & Validation**
    - [ ] Create new test scenarios with diverse flights and airlines having different priority characteristics.
    - [ ] Define and verify the expected processing order for these new scenarios.
    - [ ] Test that changing `prioritization_weights` in `settings.json` correctly influences the allocation order and outcomes.

## Phase 3: Integrate Constraint Programming (CP) Solver

- [ ] **Task 3.1: CP Solver Setup**
    - [ ] Research and confirm Google OR-Tools (CP-SAT solver) as the chosen library.
    - [ ] Add OR-Tools to project dependencies/requirements.
- [ ] **Task 3.2: Design and Prototype CP Model**
    *   **Variables**:
        *   `flight_stand_assignment[flight_id]`: Integer variable representing the assigned stand ID (or a null/unallocated marker).
        *   `flight_start_time[flight_id]`, `flight_end_time[flight_id]`: Integer variables representing allocation start/end times (potentially fixed based on schedule or with some flexibility if allowed).
    *   **Domains**:
        *   `flight_stand_assignment`: Set of compatible stand IDs for each flight + unallocated option.
    *   **Constraints**:
        *   [ ] No Overlap: For any two flights assigned to the same stand, their time intervals (including gaps) must not overlap. This might directly use the Interval Tree query within a custom constraint if supported, or be modeled with arithmetic constraints.
        *   [ ] Stand Compatibility: Ensure assigned stand meets flight's terminal, size, contact type requirements.
        *   [ ] Maintenance: Flights cannot be assigned to stands during their maintenance intervals (from Interval Tree).
        *   [ ] Linked Flights: Arrival and its linked departure assigned to the same stand; timings consistent.
        *   [ ] (Optional Basic) Adjacency Rules.
    *   **Objective Function**:
        *   [ ] Primary: Maximize the number of allocated flights.
        *   [ ] Secondary: Minimize penalties (e.g., for using non-preferred stands, unallocated high-priority flights).
- [ ] **Task 3.3: Refactor `StandAllocationEngine.run_allocation` for CP**
    - [ ] Add a new method or class responsible for building the CP model from input data.
    - [ ] Implement logic to invoke the CP-SAT solver.
    - [ ] Implement logic to parse the solver's solution (or lack thereof) and populate `allocated_flights_report` and `unallocated_flights_report`.
    - [ ] Keep the existing greedy allocation logic as a separate path/method.
- [ ] **Task 3.4: Implement Solver Control & Fallback**
    - [ ] Add `use_solver: bool` and `solver_time_limit_seconds: int` to `Settings`.
    - [ ] In `run_allocation`, if `use_solver` is true, attempt allocation with the CP solver.
    - [ ] If the solver exceeds `solver_time_limit_seconds` or fails to find a solution, log this and fall back to the enhanced greedy algorithm (developed in Phase 1 & 2).
- [ ] **Task 3.5: Testing & Validation**
    - [ ] Test CP solver integration with small, well-defined scenarios to verify correctness of model and solution parsing.
    - [ ] Test with existing scenarios (`scenario_01` to `scenario_05`) and compare results with the greedy approach.
    - [ ] Evaluate solver performance (time, solution quality) on slightly larger scenarios.
    - [ ] Test the fallback mechanism: ensure it triggers correctly when time limits are set low.

## Phase 4: Implement Performance Monitoring & Optimization Tools

- [ ] **Task 4.1: Integrate Profiling**
    - [ ] Add a `--profile` command-line argument to `main.py`.
    - [ ] When `--profile` is used, wrap the `engine.run_allocation()` call with `cProfile`.
    - [ ] Save or print `pstats` (profiling statistics) to a file or console.
- [ ] **Task 4.2: Develop/Finalize Benchmarking Suite**
    - [ ] Create or finalize a large-scale test scenario (e.g., `scenario_06_scaled_morning_peak` with 50+ flights, ensuring its data files are correct and loadable).
    - [ ] Develop a separate Python script (`benchmark_runner.py` or similar) that can:
        - [ ] Run specified scenarios multiple times.
        - [ ] Record key performance indicators (KPIs): total execution time, average time per flight, memory usage (e.g., using `memory-profiler`), percentage of flights allocated.
        - [ ] Output KPIs in a structured format (e.g., CSV, JSON) for comparison over time.
- [ ] **Task 4.3: Enhance Logging for Performance Insights**
    - [ ] Integrate Python's `logging` module throughout `StandAllocationEngine`.
    - [ ] Add `DEBUG` level logs for:
        - Duration of `_prepare_flight_processing_order`.
        - (If CP used) Duration of CP model building and solver execution.
        - (If greedy used) Number of candidate stands evaluated per flight and time taken for `_identify_candidate_stands` and `_check_stand_availability` per flight.
    - [ ] Ensure log messages are clear and provide context.
- [ ] **Task 4.4: Iterative Optimization (Ongoing)**
    - [ ] Regularly run profiler and benchmarks after major changes.
    - [ ] Analyze profiling data and logs to identify bottlenecks.
    - [ ] Create specific sub-tasks to refactor and optimize identified bottlenecks.
- [ ] **Task 4.5: Testing & Validation**
    - [ ] Verify that the `--profile` option generates meaningful output.
    - [ ] Test the `benchmark_runner.py` script to ensure it runs scenarios and collects/outputs KPIs correctly.
    - [ ] Review enhanced logs to confirm they provide useful diagnostic information for performance analysis. 