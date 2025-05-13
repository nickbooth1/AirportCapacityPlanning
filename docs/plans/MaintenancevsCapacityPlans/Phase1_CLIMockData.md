# Phase 1: CLI Tool with Mock Data - Detailed Plan

## 1. Goal

Validate the core calculation logic of the capacity impact analyzer and its output structure using mock data. This phase focuses on the correctness of the algorithm without the complexities of live data integration.

## 2. Directory Structure

Create the following directory structure within `backend/src/cli/`:

```
capacityImpactAnalyzer/
├── analyzer.js               # Core calculation logic
├── cli.js                    # Command-line interface script
├── mockData/
│   ├── dailyGrossCapacityTemplate.json
│   ├── maintenanceRequests.json
│   ├── stands.json
│   ├── aircraftTypes.json
│   ├── operationalSettings.json
│   └── maintenanceStatusTypes.json # (Optional or hardcode mapping)
└── README.md                 # Instructions for running CLI tool
```

## 3. Task Breakdown

### 3.1. Setup CLI Environment & Structure

- [x] Create the base directory: `backend/src/cli/capacityImpactAnalyzer/`
- [x] Create `mockData/` subdirectory.
- [x] Initialize `package.json` if needed for CLI dependencies (e.g., `yargs`, `fs-extra`). (Potentially use existing backend `package.json` if CLI is run via `node src/...`)
- [x] Create empty files: `analyzer.js`, `cli.js`, `README.md`.

### 3.2. Define and Create Mock Data Files

- [x] **`mockData/dailyGrossCapacityTemplate.json`**
    - [x] Define structure based on `CapacityResult.toJson()` from `stand-capacity-tool` (best case scenario).
    - [x] Include diverse time slots (e.g., 5-10 slots).
    - [x] Include various aircraft types (e.g., 3-5 types - A320, B738, B77W, A350).
    - [x] Populate with sample capacity counts for each slot/aircraft type.
- [x] **`mockData/maintenanceRequests.json`**
    - [x] Define array of maintenance request objects.
    - [x] Include requests with different statuses (Requested, Approved, In Progress, Completed).
    - [x] Ensure `start_datetime` and `end_datetime` allow for various overlap scenarios with capacity time slots (within a day, across multiple days if the tool is to support multi-day views directly from one template, though current design is daily processing).
    - [x] Use `stand_id_or_code` that matches codes in `stands.json`.
    - [x] Include fields: `id`, `stand_id_or_code`, `title`, `status_id`, `statusName`, `start_datetime`, `end_datetime`.
- [x] **`mockData/stands.json`**
    - [x] Define array of stand objects.
    - [x] Include `code` (matching `stand_id_or_code` in maintenance requests and capacity template if applicable), `dbId` (mock), and `compatibleAircraftICAOs` (array of strings matching ICAO codes in `aircraftTypes.json`).
    - [x] Example: `{ "code": "S101", "dbId": 1, "compatibleAircraftICAOs": ["A320", "B738"] }`
- [x] **`mockData/aircraftTypes.json`**
    - [x] Define array of aircraft type objects.
    - [x] Include `icao_code`, `size_category_code` (e.g., "C", "D", "E"), `averageTurnaroundMinutes`, and `bodyType` ("narrowBody" or "wideBody").
    - [x] Example: `{ "icao_code": "A320", "size_category_code": "C", "averageTurnaroundMinutes": 45, "bodyType": "narrowBody" }`
- [x] **`mockData/operationalSettings.json`**
    - [x] Define object with `default_gap_minutes` and `slot_duration_minutes`.
    - [x] Example: `{ "default_gap_minutes": 15, "slot_duration_minutes": 60 }`
- [x] **`mockData/maintenanceStatusTypes.json`** (or hardcode in `analyzer.js`)
    - [x] Define array mapping status IDs to names.
    - [x] Example: `[{ "id": 1, "name": "Requested" }, { "id": 2, "name": "Approved" }, ...]`

### 3.3. Implement Core Logic (`analyzer.js`)

- [x] **Create `CapacityImpactAnalyzer` class or main function `calculateDailyImpacts`**.
- [x] **Implement Initialization Logic (simulating service constructor):**
    - [x] Function to load and process mock stand data into `Map<standCode, { dbId, compatibleAircraftICAOs }>`.
    - [x] Function to load and process mock aircraft type data into `Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }>`. Define/use `getBodyType(sizeCategoryCode)` utility.
    - [x] Function to load mock operational settings.
    - [x] Function to load/define maintenance status type mappings.
- [x] **Implement Main Processing Logic (`calculateDailyImpacts(options, mockData)`):**
    - [x] Input: `options = { startDate, endDate, maintenanceStatusIdsToInclude }`, `mockData = { dailyGrossCapacityTemplate, allMaintenanceRequests, standsMap, aircraftTypesMap, opSettings, statusTypesMap }`.
    - [x] **Loop through each day (`currentDate`)** from `options.startDate` to `options.endDate`.
        - [x] **Calculate Original Daily Totals:** Sum capacities from `dailyGrossCapacityTemplate.bestCaseCapacity` across all slots, categorizing into narrow/wide body totals.
        - [x] **Initialize Daily Impact Accumulators:** `dailyDefiniteReduction`, `dailyPotentialReduction`, `contributingDefiniteRequests`, `contributingPotentialRequests`.
        - [x] **Deep copy `dailyGrossCapacityTemplate.bestCaseCapacity`** to `currentDayNetSlotCapacities`.
        - [x] **Filter `allMaintenanceRequests`** for those active on `currentDate`.
        - [x] **Loop through each `templateSlot`** in `dailyGrossCapacityTemplate.timeSlots`:
            - [x] Construct absolute `slotStartDateTime` and `slotEndDateTime` using `currentDate` and `templateSlot.startTime/endTime` (use a date library like `date-fns` or `moment` if complex, or simple string manipulation and `Date` objects for ISO strings).
            - [x] Identify maintenance requests active during this specific slot and day.
            - [x] For each active maintenance on a `standCode`:
                - [x] Retrieve `compatibleAircraftICAOs` for the `standCode`.
                - [x] For each `aircraftTypeICAO`:
                    - [x] Calculate `singleStandSlotContribution`.
                    - [x] Determine `bodyType`.
                    - [x] Identify impact type (definite/potential) based on `status_id`.
                    - [x] Calculate actual reduction and decrement `currentDayNetSlotCapacities`.
                    - [x] Add reduction to relevant daily accumulator (`dailyDefiniteReduction` or `dailyPotentialReduction`).
                    - [x] Store contributing maintenance request details.
        - [x] **Calculate Final Daily Totals for Output:** `capacityAfterDefiniteImpact`, `finalNetCapacity`.
        - [x] **Assemble and store the daily result object.**
    - [x] **Return the array of daily result objects.**
- [x] **Helper functions:**
    - [x] Date/time manipulation (e.g., combining date with HH:MM:SS time, checking overlaps).
    - [x] Deep copy utility for objects/arrays.

### 3.4. Implement CLI Script (`cli.js`)

- [x] **Include necessary modules** (`fs`, `path`, argument parser like `yargs` or `commander`).
- [x] **Define CLI arguments:**
    - [x] `--startDate` (required, YYYY-MM-DD)
    - [x] `--endDate` (required, YYYY-MM-DD)
    - [x] `--mockDataDir` (optional, default to `./mockData/` relative to `cli.js`)
    - [x] `--outputFile` (optional, if specified, save JSON output here, otherwise print to console)
- [x] **Implement main CLI function:**
    - [x] Parse arguments.
    - [x] Validate `startDate` and `endDate` formats.
    - [x] **Load all mock JSON files** from `mockDataDir` (use `fs.readFileSync` and `JSON.parse`).
    - [x] **Prepare `maintenanceStatusIdsToInclude`** configuration (can be hardcoded initially as per design doc: `{ definite: [2, 4, 5], potential: [1] }`).
    - [x] **Instantiate or call the main analyzer function** from `analyzer.js`, passing loaded mock data and parsed options.
    - [x] **Handle output:** Print to console or save to `outputFile`.
    - [x] Implement basic error handling.

### 3.5. Testing and Refinement

- [x] Create a `README.md` in `capacityImpactAnalyzer/` with instructions on how to run the CLI tool and expected arguments.
- [x] Run `cli.js` with various date ranges and mock data scenarios.
    - [x] Test days with no maintenance.
    - [x] Test days with only definite maintenance.
    - [x] Test days with only potential maintenance.
    - [x] Test days with mixed maintenance types.
    - [x] Test maintenance spanning across slot boundaries.
    - [x] Test maintenance starting before/ending after the analysis period but overlapping.
- [x] Verify the output JSON structure and calculations against manual checks or simple spreadsheets for a small dataset.
- [x] Debug and refine logic in `analyzer.js` as needed.

## 4. Definition of Done for Phase 1

- [x] All mock data files are created and populated with representative data.
- [x] The `analyzer.js` correctly implements the core calculation logic as per the design document.
- [x] The `cli.js` successfully loads mock data, calls the analyzer, and produces output in the specified JSON format.
- [x] Basic test scenarios have been run, and the output is verified for correctness.
- [x] `README.md` for the CLI tool is complete.

## 5. Test Results and Observations

The CLI tool has been successfully implemented and tested with the following scenarios:

- **Date Range Tests:** Tested with multiple dates (December 15-17, 2023) to verify processing of different days
- **Maintenance Status Tests:** Confirmed handling of different maintenance statuses (Requested, Approved, In Progress, Completed)
- **Output Verification:** Validated that the output includes all required fields:
  - Original daily capacity (separated by narrow-body, wide-body, total)
  - Capacity after definite impact
  - Final net capacity
  - Detailed lists of contributing maintenance requests
  
The tests showed that the tool correctly:
- Identifies maintenance requests active on specific dates
- Calculates slot-by-slot capacity reductions based on stand and aircraft compatibility
- Aggregates these into daily totals
- Categorizes impacts as definite or potential based on maintenance status
- Generates properly formatted JSON output

**Sample Test Command:**
```bash
node cli.js --startDate 2023-12-15 --endDate 2023-12-17 --outputFile ./test-output.json
```

**Observations:**
- The mock data provides a good variety of test cases
- The algorithm handles time-based overlaps correctly
- The structure matches the design requirements
- Adding more complex test cases (e.g., stands with partial day availability) could be useful for further testing

Phase 1 is complete and ready to proceed to Phase 2. 