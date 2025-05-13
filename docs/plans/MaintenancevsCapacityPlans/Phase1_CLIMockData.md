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

- [ ] Create the base directory: `backend/src/cli/capacityImpactAnalyzer/`
- [ ] Create `mockData/` subdirectory.
- [ ] Initialize `package.json` if needed for CLI dependencies (e.g., `yargs`, `fs-extra`). (Potentially use existing backend `package.json` if CLI is run via `node src/...`)
- [ ] Create empty files: `analyzer.js`, `cli.js`, `README.md`.

### 3.2. Define and Create Mock Data Files

- [ ] **`mockData/dailyGrossCapacityTemplate.json`**
    - [ ] Define structure based on `CapacityResult.toJson()` from `stand-capacity-tool` (best case scenario).
    - [ ] Include diverse time slots (e.g., 5-10 slots).
    - [ ] Include various aircraft types (e.g., 3-5 types - A320, B738, B77W, A350).
    - [ ] Populate with sample capacity counts for each slot/aircraft type.
- [ ] **`mockData/maintenanceRequests.json`**
    - [ ] Define array of maintenance request objects.
    - [ ] Include requests with different statuses (Requested, Approved, In Progress, Completed).
    - [ ] Ensure `start_datetime` and `end_datetime` allow for various overlap scenarios with capacity time slots (within a day, across multiple days if the tool is to support multi-day views directly from one template, though current design is daily processing).
    - [ ] Use `stand_id_or_code` that matches codes in `stands.json`.
    - [ ] Include fields: `id`, `stand_id_or_code`, `title`, `status_id`, `statusName`, `start_datetime`, `end_datetime`.
- [ ] **`mockData/stands.json`**
    - [ ] Define array of stand objects.
    - [ ] Include `code` (matching `stand_id_or_code` in maintenance requests and capacity template if applicable), `dbId` (mock), and `compatibleAircraftICAOs` (array of strings matching ICAO codes in `aircraftTypes.json`).
    - [ ] Example: `{ "code": "S101", "dbId": 1, "compatibleAircraftICAOs": ["A320", "B738"] }`
- [ ] **`mockData/aircraftTypes.json`**
    - [ ] Define array of aircraft type objects.
    - [ ] Include `icao_code`, `size_category_code` (e.g., "C", "D", "E"), `averageTurnaroundMinutes`, and `bodyType` ("narrowBody" or "wideBody").
    - [ ] Example: `{ "icao_code": "A320", "size_category_code": "C", "averageTurnaroundMinutes": 45, "bodyType": "narrowBody" }`
- [ ] **`mockData/operationalSettings.json`**
    - [ ] Define object with `default_gap_minutes` and `slot_duration_minutes`.
    - [ ] Example: `{ "default_gap_minutes": 15, "slot_duration_minutes": 60 }`
- [ ] **`mockData/maintenanceStatusTypes.json`** (or hardcode in `analyzer.js`)
    - [ ] Define array mapping status IDs to names.
    - [ ] Example: `[{ "id": 1, "name": "Requested" }, { "id": 2, "name": "Approved" }, ...]`

### 3.3. Implement Core Logic (`analyzer.js`)

- [ ] **Create `CapacityImpactAnalyzer` class or main function `calculateDailyImpacts`**.
- [ ] **Implement Initialization Logic (simulating service constructor):**
    - [ ] Function to load and process mock stand data into `Map<standCode, { dbId, compatibleAircraftICAOs }>`.
    - [ ] Function to load and process mock aircraft type data into `Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }>`. Define/use `getBodyType(sizeCategoryCode)` utility.
    - [ ] Function to load mock operational settings.
    - [ ] Function to load/define maintenance status type mappings.
- [ ] **Implement Main Processing Logic (`calculateDailyImpacts(options, mockData)`):**
    - [ ] Input: `options = { startDate, endDate, maintenanceStatusIdsToInclude }`, `mockData = { dailyGrossCapacityTemplate, allMaintenanceRequests, standsMap, aircraftTypesMap, opSettings, statusTypesMap }`.
    - [ ] **Loop through each day (`currentDate`)** from `options.startDate` to `options.endDate`.
        - [ ] **Calculate Original Daily Totals:** Sum capacities from `dailyGrossCapacityTemplate.bestCaseCapacity` across all slots, categorizing into narrow/wide body totals.
        - [ ] **Initialize Daily Impact Accumulators:** `dailyDefiniteReduction`, `dailyPotentialReduction`, `contributingDefiniteRequests`, `contributingPotentialRequests`.
        - [ ] **Deep copy `dailyGrossCapacityTemplate.bestCaseCapacity`** to `currentDayNetSlotCapacities`.
        - [ ] **Filter `allMaintenanceRequests`** for those active on `currentDate`.
        - [ ] **Loop through each `templateSlot`** in `dailyGrossCapacityTemplate.timeSlots`:
            - [ ] Construct absolute `slotStartDateTime` and `slotEndDateTime` using `currentDate` and `templateSlot.startTime/endTime` (use a date library like `date-fns` or `moment` if complex, or simple string manipulation and `Date` objects for ISO strings).
            - [ ] Identify maintenance requests active during this specific slot and day.
            - [ ] For each active maintenance on a `standCode`:
                - [ ] Retrieve `compatibleAircraftICAOs` for the `standCode`.
                - [ ] For each `aircraftTypeICAO`:
                    - [ ] Calculate `singleStandSlotContribution`.
                    - [ ] Determine `bodyType`.
                    - [ ] Identify impact type (definite/potential) based on `status_id`.
                    - [ ] Calculate actual reduction and decrement `currentDayNetSlotCapacities`.
                    - [ ] Add reduction to relevant daily accumulator (`dailyDefiniteReduction` or `dailyPotentialReduction`).
                    - [ ] Store contributing maintenance request details.
        - [ ] **Calculate Final Daily Totals for Output:** `capacityAfterDefiniteImpact`, `finalNetCapacity`.
        - [ ] **Assemble and store the daily result object.**
    - [ ] **Return the array of daily result objects.**
- [ ] **Helper functions:**
    - [ ] Date/time manipulation (e.g., combining date with HH:MM:SS time, checking overlaps).
    - [ ] Deep copy utility for objects/arrays.

### 3.4. Implement CLI Script (`cli.js`)

- [ ] **Include necessary modules** (`fs`, `path`, argument parser like `yargs` or `commander`).
- [ ] **Define CLI arguments:**
    - [ ] `--startDate` (required, YYYY-MM-DD)
    - [ ] `--endDate` (required, YYYY-MM-DD)
    - [ ] `--mockDataDir` (optional, default to `./mockData/` relative to `cli.js`)
    - [ ] `--outputFile` (optional, if specified, save JSON output here, otherwise print to console)
- [ ] **Implement main CLI function:**
    - [ ] Parse arguments.
    - [ ] Validate `startDate` and `endDate` formats.
    - [ ] **Load all mock JSON files** from `mockDataDir` (use `fs.readFileSync` and `JSON.parse`).
    - [ ] **Prepare `maintenanceStatusIdsToInclude`** configuration (can be hardcoded initially as per design doc: `{ definite: [2, 4, 5], potential: [1] }`).
    - [ ] **Instantiate or call the main analyzer function** from `analyzer.js`, passing loaded mock data and parsed options.
    - [ ] **Handle output:** Print to console or save to `outputFile`.
    - [ ] Implement basic error handling.

### 3.5. Testing and Refinement

- [ ] Create a `README.md` in `capacityImpactAnalyzer/` with instructions on how to run the CLI tool and expected arguments.
- [ ] Run `cli.js` with various date ranges and mock data scenarios.
    - [ ] Test days with no maintenance.
    - [ ] Test days with only definite maintenance.
    - [ ] Test days with only potential maintenance.
    - [ ] Test days with mixed maintenance types.
    - [ ] Test maintenance spanning across slot boundaries.
    - [ ] Test maintenance starting before/ending after the analysis period but overlapping.
- [ ] Verify the output JSON structure and calculations against manual checks or simple spreadsheets for a small dataset.
- [ ] Debug and refine logic in `analyzer.js` as needed.

## 4. Definition of Done for Phase 1

- [ ] All mock data files are created and populated with representative data.
- [ ] The `analyzer.js` correctly implements the core calculation logic as per the design document.
- [ ] The `cli.js` successfully loads mock data, calls the analyzer, and produces output in the specified JSON format.
- [ ] Basic test scenarios have been run, and the output is verified for correctness.
- [ ] `README.md` for the CLI tool is complete. 