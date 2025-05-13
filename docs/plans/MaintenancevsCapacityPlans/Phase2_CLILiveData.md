# Phase 2: CLI Tool with Live Data - Detailed Plan

## 1. Goal

Transition the CLI tool developed in Phase 1 to use live data sources (actual service calls and database queries) instead of mock files. This phase validates the data integration aspects and ensures the analyzer works with real-world data structures and potential inconsistencies.

## 2. Prerequisites

- [ ] Completion of Phase 1: CLI tool functions correctly with mock data.
- [ ] Backend services (`StandCapacityToolService`, `MaintenanceRequestService`) are accessible and operational.
- [ ] Database models (`Stand`, `AircraftType`, `OperationalSettings`, `MaintenanceStatusType`, `MaintenanceRequest`) are defined and the database is populated with test data.
- [ ] Clarity on how the CLI tool will authenticate or access backend services and the database (e.g., running within the backend context, API calls, direct DB connection setup for scripts).

## 3. Task Breakdown

### 3.1. Setup for Live Data Access

- [ ] **Database Connection:**
    - [ ] Ensure the CLI script environment can connect to the development/test database (e.g., using Knex instance from `backend/src/utils/db.js` or a similar setup).
    - [ ] Handle database connection configuration securely (e.g., via environment variables if the script is run in a standalone manner).
- [ ] **Service Access:**
    - [ ] Determine if `StandCapacityToolService` and `MaintenanceRequestService` can be directly imported and used within the `cli.js` script (if running as part of the backend Node.js application).
    - [ ] Alternatively, if services are only accessible via API endpoints, prepare helper functions in `cli.js` to make these HTTP requests (e.g., using `axios` or `node-fetch`).

### 3.2. Modify Data Fetching in `cli.js` (or a new `live_cli.js`)

- [ ] **Replace Mock `dailyGrossCapacityTemplate.json` Loading:**
    - [ ] Implement a function to call `standCapacityToolService.calculateCapacity({ useDefinedTimeSlots: false, standIds: [/*all active stand DB IDs*/] })`.
    - [ ] Ensure the output from this service call is transformed into the `dailyGrossCapacityTemplate` structure expected by `analyzer.js` (specifically the `bestCaseCapacity` and `timeSlots` parts).
- [ ] **Replace Mock `maintenanceRequests.json` Loading:**
    - [ ] Implement a function to call `maintenanceRequestService.getAllRequests({ startDate: options.startDate, endDate: options.endDate, status: options.maintenanceStatusIdsToInclude.definite.concat(options.maintenanceStatusIdsToInclude.potential) })`.
    - [ ] Map `stand_id` from database to `standCode` if necessary for consistency with `analyzer.js` expectations.
    - [ ] Fetch `statusName` by joining with `MaintenanceStatusType` or doing a lookup.
- [ ] **Replace Mock `stands.json` Loading:**
    - [ ] Implement a function to query the `stands` table (e.g., `Stand.query().where('is_active', true)`).
    - [ ] For each stand, determine its `compatibleAircraftICAOs` by replicating the logic from `standCapacityToolService.convertStandsData()` (query `stand_aircraft_constraints`, then fallback to `max_aircraft_size_code`). This might involve creating a shared utility or adapting parts of the service logic.
    - [ ] Structure the data into the `Map<standCode, { dbId, compatibleAircraftICAOs }>` format.
- [ ] **Replace Mock `aircraftTypes.json` Loading:**
    - [ ] Implement a function to query the `aircraft_types` table (e.g., `AircraftType.query().where('is_active', true)`).
    - [ ] Include `icao_code`, `size_category_code`, and `averageTurnaroundMinutes` (this might require a join or separate query for turnaround rules, similar to `standCapacityToolService.getAircraftTypes`).
    - [ ] Apply the `getBodyType(sizeCategoryCode)` utility.
    - [ ] Structure data into `Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }>`.
- [ ] **Replace Mock `operationalSettings.json` Loading:**
    - [ ] Implement a function to query the `operational_settings` table (e.g., `OperationalSettings.query().first()`).
    - [ ] Extract `default_gap_minutes` and `slot_duration_minutes`.
- [ ] **Replace Mock `maintenanceStatusTypes.json` Loading (if not hardcoded):**
    - [ ] Implement a function to query `maintenance_status_types` table if a dynamic lookup is preferred over hardcoding in `analyzer.js`.

### 3.3. Adapt `analyzer.js` (if necessary)

- [ ] The core `analyzer.js` logic should ideally require minimal changes if the data structures prepared by `cli.js` (now from live sources) match those from the mock data phase.
- [ ] Review and adjust any assumptions made about data fields that might differ slightly when coming from live sources (e.g., date formats, exact field names after joins).

### 3.4. Update `cli.js` Command-Line Arguments

- [ ] Remove `--mockDataDir` argument as it's no longer needed.
- [ ] Add any new arguments required for live data fetching if parameters like specific stand IDs for analysis are to be fetched live rather than using "all active".
- [ ] Ensure `--startDate` and `--endDate` are still primary inputs.

### 3.5. Testing with Live Data

- [ ] **Environment Setup:** Ensure the CLI tool is run in an environment where it has access to the database and necessary services/APIs.
- [ ] **Test Scenarios:**
    - [ ] Run with a small, controlled set of live data to verify connections and basic output.
    - [ ] Test with various date ranges against the live data.
    - [ ] Monitor logs from `standCapacityToolService` and `maintenanceRequestService` if calls are made to them, to ensure they are receiving correct parameters.
    - [ ] Compare output against known maintenance schedules and expected capacity impacts in the test/dev environment.
- [ ] **Data Consistency Checks:**
    - [ ] Verify that `standCode` from maintenance requests correctly maps to stands used in capacity calculations.
    - [ ] Ensure `aircraftTypeICAO` codes are consistent across all data sources.
- [ ] **Error Handling:**
    - [ ] Test how the CLI tool handles failures in fetching data from any live source (e.g., database down, service error).
    - [ ] Implement more robust error reporting (e.g., specific error messages for data fetching failures).

### 3.6. Refine and Document

- [ ] Update `README.md` in `capacityImpactAnalyzer/` with new instructions for running the CLI tool with live data, including any environment setup or configuration needed.
- [ ] Document any discrepancies found between mock data assumptions and live data behavior, and how they were resolved.

## 4. Definition of Done for Phase 2

- [ ] The CLI tool can successfully fetch all required data from live backend services and/or the database.
- [ ] The data fetched is correctly transformed and fed into the `analyzer.js` core logic.
- [ ] The CLI tool produces the same structured JSON output as in Phase 1, but based on live data.
- [ ] Test scenarios with live data confirm the tool's ability to connect to sources and produce plausible results.
- [ ] Error handling for live data fetching is implemented.
- [ ] The `README.md` is updated for live data mode. 