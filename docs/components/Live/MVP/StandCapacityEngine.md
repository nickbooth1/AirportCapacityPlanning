# CapaCity Component: Stand Capacity Engine

## 1. Overview

This is the core calculation component for the MVP. Its primary responsibility is to determine the theoretical maximum stand capacity of the airport over a defined operational period (e.g., a day). It utilizes the physical airport definition (stands, aircraft compatibility) and the operational configuration (turnaround times, gap times, operating hours) to simulate potential stand usage and aggregate the results.

For the MVP, this engine calculates the *maximum theoretical capacity* assuming optimal allocation, not based on an actual flight schedule.

## 2. Inputs

*   **Airport Definition Data:** Accessed via backend services/database.
    *   List of all `stands` with their attributes (especially `max_aircraft_size_code`).
    *   List of `aircraft_types` (implicitly used via `max_aircraft_size_code` on stands).
    *   (Optional) `stand_aircraft_constraints` if implemented.
*   **Capacity Configuration Data:** Accessed via backend services/database.
    *   `operational_settings` (operating start/end times, default gap minutes).
    *   `turnaround_rules` (minimum turnaround time per `aircraft_type_code`).
*   **Trigger:** An API request (e.g., `GET /api/capacity/calculate` or a `POST` if parameters are needed later) initiated by the user via the UI.

## 3. Outputs

*   **Calculated Capacity Data (via API):** A structured representation of the theoretical stand capacity. This could be formatted in various ways, for example:
    *   Total available stand-hours per aircraft size category for the entire operational period.
    *   Available stand slots (count) per time interval (e.g., hourly) broken down by aircraft size category.
    *   Potentially broken down further by terminal or pier if needed.
    *   *Example Structure:* 
        ```json
        {
          "calculation_timestamp": "2024-08-15T10:30:00Z",
          "operating_day": "2024-08-15", // Or relevant period
          "capacity_summary": {
            "total_available_stand_hours": {
              "A": 150.5,
              "B": 210.0,
              "C": 300.0,
              // ... other codes
            }
          },
          "capacity_by_hour": [
            { "hour": 6, "available_slots": { "A": 8, "B": 12, "C": 15 } },
            { "hour": 7, "available_slots": { "A": 9, "B": 13, "C": 16 } },
            // ... other hours
          ]
        }
        ```

## 4. Logic / Processing Steps

The engine executes the following conceptual steps when triggered:

1.  **Fetch Input Data:** Retrieve the latest airport definition (stands) and capacity configurations (settings, turnaround rules) from the database via backend services.
2.  **Define Time Horizon:** Determine the start and end times for the calculation based on `operational_settings`.
3.  **Determine Time Slots:** Divide the time horizon into discrete intervals (e.g., 15-minute or 60-minute slots).
4.  **Iterate Through Stands:** For each stand defined in the airport:
    *   Get the stand's `max_aircraft_size_code`.
    *   **(Optional)** Get any specific `stand_aircraft_constraints`.
5.  **Iterate Through Time Slots:** For each time slot within the horizon:
    *   **Simulate Hypothetical Placement:** Determine if a *hypothetical* aircraft matching the stand's `max_aircraft_size_code` could occupy the stand during this slot. This involves considering:
        *   The *theoretical* duration an aircraft of that size would occupy the stand (based on `min_turnaround_minutes` from `turnaround_rules`).
        *   The `default_gap_minutes` required before and after the hypothetical placement.
        *   *MVP Simplification:* Since we are calculating maximum capacity, we can think of this as: how many non-overlapping turnaround+gap intervals for the stand's max aircraft size fit within the operating hours?
    *   Mark the stand/slot combination as potentially available based on the simulation/calculation.
6.  **Aggregate Results:** Sum up the available stand slots across all stands for each time interval, categorized by the `max_aircraft_size_code` that stand can handle. Calculate total available stand-hours or other summary metrics.
7.  **Format Output:** Structure the aggregated results into the defined output format (e.g., JSON).

## 5. Modules

*   **`Data Fetching Module`:** Retrieves airport definitions and configurations.
*   **`Time Slot Logic Module`:** Defines the time intervals for analysis.
*   **`Stand Allocation Simulation Module`:** The core logic determining theoretical availability per stand/slot based on rules (turnaround, gap).
*   **`Capacity Aggregation Module`:** Summarizes results across stands and time slots.
*   **`API Endpoint (Capacity Calculation)`:** The route that triggers the engine and returns results.

## 6. Incremental Delivery Plan

1.  **Basic Setup & Data Access:**
    *   Create the basic service structure for the engine in the Node.js backend.
    *   Implement the `Data Fetching Module` to correctly retrieve necessary data from the `AirportDefinition` and `CapacityConfiguration` components/services.
    *   Implement the `API Endpoint` structure (e.g., `/api/capacity/calculate`) that triggers the engine.
2.  **Time Slot Generation:**
    *   Implement the `Time Slot Logic Module` to generate a list/array of time slots based on `operational_settings`.
3.  **Single Stand Simulation (Simplified):**
    *   Implement a basic version of the `Stand Allocation Simulation Module` that works for *one stand*.
    *   Calculate how many turnaround+gap intervals for that stand's `max_aircraft_size_code` fit within the operating day.
    *   Return a simple count for that single stand.
4.  **Multi-Stand Processing:**
    *   Extend the simulation logic to iterate through *all* stands retrieved by the `Data Fetching Module`.
5.  **Aggregation Implementation:**
    *   Implement the `Capacity Aggregation Module` to sum the results from the simulation across all stands.
    *   Group the results by `aircraft_type_code`.
    *   (Optional) Add aggregation by time intervals (e.g., hourly buckets).
6.  **Output Formatting & Refinement:**
    *   Format the aggregated data into the desired JSON output structure.
    *   Add error handling and logging.
    *   Refine calculations for edge cases (e.g., turnarounds crossing midnight if operating hours span midnight, though the current schema assumes single day start/end times).
7.  **Integration & Testing:**
    *   Ensure the engine is correctly triggered by the API endpoint.
    *   Test with various airport definitions and configurations to validate results.
    *   Connect the Frontend UI (built later) to trigger the calculation and display results.

This component relies heavily on the data provided by the first two components being accurate and available. 