# Phase 3: Backend Service Implementation - Detailed Plan

## 1. Goal

Integrate the validated capacity impact calculation logic (from Phases 1 & 2) into a reusable backend service (`AggregatedCapacityImpactService`). This service will be callable via an API endpoint, providing the daily impacted capacity data for frontend consumption.

## 2. Prerequisites

- [ ] Completion of Phase 2: CLI tool functions correctly with live data sources.
- [ ] Design Document for `AggregatedCapacityImpactService` is finalized (including API input/output structure).
- [ ] Backend project structure is set up to accommodate new services and routes.

## 3. Task Breakdown

### 3.1. Create Service File and Class Structure

- [ ] Create the service file: `backend/src/services/AggregatedCapacityImpactService.js`.
- [ ] Define the `AggregatedCapacityImpactService` class structure.
    ```javascript
    // backend/src/services/AggregatedCapacityImpactService.js
    const standCapacityToolService = require('./standCapacityToolService');
    const maintenanceRequestService = require('./maintenanceRequestService');
    const Stand = require('../models/Stand');
    const AircraftType = require('../models/AircraftType');
    const OperationalSettings = require('../models/OperationalSettings');
    const MaintenanceStatusType = require('../models/MaintenanceStatusType');
    // Potentially db instance for direct queries if necessary for some helper data
    const { db } = require('../utils/db'); 
    // Date manipulation library (e.g., date-fns)
    // const { parseISO, format, eachDayOfInterval, ... } = require('date-fns');

    class AggregatedCapacityImpactService {
      constructor() {
        // Cached data, loaded asynchronously if needed
        this.standsData = null; // Map<standCode, { dbId, compatibleAircraftICAOs }>
        this.aircraftTypesData = null; // Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }>
        this.operationalSettings = null;
        this.maintenanceStatusTypes = null; // Map<id, name>
        this.isInitialized = false;

        // Configuration for maintenance statuses
        this.MAINTENANCE_IMPACT_CATEGORIES = {
          DEFINITE: [2, 4, 5], // Approved, In Progress, Completed
          POTENTIAL: [1],      // Requested
        };
      }

      async _initialize() {
        if (this.isInitialized) return;
        // Implement logic from Phase 2 for fetching and processing:
        // - Stands and their compatible aircraft types
        // - Aircraft types with body type and turnaround
        // - Operational settings
        // - Maintenance status types
        // Populate this.standsData, this.aircraftTypesData, etc.
        this.isInitialized = true;
      }

      _getBodyType(sizeCategoryCode) {
        // Implement mapping (e.g., A-D narrow, E-F wide)
      }

      // Helper to get compatible aircraft for a stand (mirrors standCapacityToolService logic)
      async _getCompatibleAircraftForStand(standModelInstance) { /* ... */ }

      async getDailyImpactedCapacity(options) {
        // options: { startDate, endDate }
        // (maintenanceStatusIdsToInclude is now internal via this.MAINTENANCE_IMPACT_CATEGORIES)
        await this._initialize();

        // 1. Fetch Daily Gross Capacity Template (from standCapacityToolService)
        // 2. Fetch All Relevant Maintenance Requests (for date range and configured statuses)
        // 3. Loop through each day in [startDate, endDate]
            // a. Calculate Original Daily Totals (from template)
            // b. Initialize Daily Impact Accumulators
            // c. Deep copy template slot capacities for current day net calculation
            // d. Filter maintenance for current day
            // e. Loop through template slots
                // i. Construct absolute slot DateTimes
                // ii. Identify active maintenance in slot
                // iii. For each maintenance, for each compatible aircraft:
                    // 1. Calculate singleStandSlotContribution
                    // 2. Determine impact type (definite/potential)
                    // 3. Apply reduction to net slot capacities
                    // 4. Accumulate daily reduction totals & store contributing request info
            // f. Calculate final daily total capacities (afterDefiniteImpact, finalNetCapacity)
            // g. Assemble and add daily result object to results array
        // 4. Return results array
      }
    }

    module.exports = new AggregatedCapacityImpactService();
    ```

### 3.2. Implement Initialization Logic (`_initialize` method)

- [ ] **Fetch and Cache Stands Data:**
    - [ ] Query active `Stand` models.
    - [ ] For each stand, determine `compatibleAircraftICAOs` (replicating `standCapacityToolService.convertStandsData` logic: query `stand_aircraft_constraints`, fallback to `max_aircraft_size_code`). This might involve temporary helper functions or accessing parts of `standCapacityToolService` if possible, or re-implementing the specific data gathering logic.
    - [ ] Store in `this.standsData` as `Map<standCode, { dbId, compatibleAircraftICAOs }>.
- [ ] **Fetch and Cache Aircraft Types Data:**
    - [ ] Query active `AircraftType` models.
    - [ ] Determine `bodyType` using `_getBodyType(size_category_code)` utility.
    - [ ] Get `averageTurnaroundMinutes` (requires fetching related `TurnaroundRule` or adapting `standCapacityToolService.getAircraftTypes` logic).
    - [ ] Store in `this.aircraftTypesData` as `Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }> `.
- [ ] **Fetch and Cache Operational Settings:**
    - [ ] Query `OperationalSettings.query().first()`.
    - [ ] Store `default_gap_minutes`, `slot_duration_minutes` in `this.operationalSettings`.
- [ ] **Fetch and Cache Maintenance Status Types:**
    - [ ] Query `MaintenanceStatusType.query()`.
    - [ ] Store in `this.maintenanceStatusTypes` as `Map<id, name>` for easy lookup of `statusName`.
- [ ] Set `this.isInitialized = true`.

### 3.3. Implement Core Logic in `getDailyImpactedCapacity`

- [ ] **Transfer and Adapt Logic from `analyzer.js` (Phase 1 & 2):**
    - [ ] Ensure `await this._initialize()` is called at the beginning.
    - [ ] **Step 1: Fetch Daily Gross Capacity Template:**
        - [ ] Call `standCapacityToolService.calculateCapacity({ useDefinedTimeSlots: false, standIds: /* all active stand DB IDs from this.standsData */ })`. Handle promise.
        - [ ] Extract `bestCaseCapacity` and `timeSlots` from the result.
    - [ ] **Step 2: Fetch Maintenance Requests:**
        - [ ] Use `this.MAINTENANCE_IMPACT_CATEGORIES` to get all relevant status IDs.
        - [ ] Call `maintenanceRequestService.getAllRequests({ startDate: options.startDate, endDate: options.endDate, status: allRelevantStatusIds })`. Handle promise.
        - [ ] Ensure fetched requests include `stand.code` (or fetch `Stand` model with relation to get code if only `stand_id` is present) and `status.name` (or lookup from `this.maintenanceStatusTypes`).
    - [ ] **Step 3: Daily Processing Loop (ported from `analyzer.js`):**
        - [ ] Iterate from `options.startDate` to `options.endDate` (use `date-fns` or similar for robust date iteration).
        - [ ] All sub-steps (a-g) from Phase 1, Section 3.3 (`analyzer.js` logic) should be implemented here, using the cached reference data (`this.standsData`, `this.aircraftTypesData`, etc.) and live data fetched in steps 1 & 2.
        - [ ] Ensure `deepCopy` is used for `currentDayNetSlotCapacities` each day.
        - [ ] When storing contributing maintenance request details, include `id`, `title`, `standCode`, `statusName`, `startTime` (actual `start_datetime` of request), `endTime` (actual `end_datetime` of request).
- [ ] Ensure the final returned array matches the JSON structure specified in the Design Document.

### 3.4. Create API Endpoint

- [ ] **Define a new route** (e.g., in `backend/src/routes/capacityRoutes.js` or a new `dashboardRoutes.js`).
    - [ ] Example: `GET /api/capacity/impact-analysis` or `GET /api/dashboard/capacity-impact`.
- [ ] **Create a controller function** (e.g., in `backend/src/controllers/capacityController.js`).
    - [ ] The controller will parse query parameters (`startDate`, `endDate`).
    - [ ] Call `AggregatedCapacityImpactService.getDailyImpactedCapacity({ startDate, endDate })`.
    - [ ] Send the JSON response or handle errors.
    ```javascript
    // Example in controller
    const aggregatedCapacityImpactService = require('../services/AggregatedCapacityImpactService');

    exports.getCapacityImpactAnalysis = async (req, res, next) => {
      try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
          return res.status(400).json({ message: 'startDate and endDate query parameters are required.' });
        }
        // Add validation for date formats if needed
        const result = await aggregatedCapacityImpactService.getDailyImpactedCapacity({ startDate, endDate });
        res.json(result);
      } catch (error) {
        next(error); // Pass to global error handler
      }
    };
    ```
- [ ] Register the new route in the main Express app (`backend/src/index.js` or relevant app setup file).

### 3.5. Unit and Integration Testing

- [ ] **Unit Tests for `AggregatedCapacityImpactService`:**
    - [ ] Mock dependencies (`standCapacityToolService`, `maintenanceRequestService`, DB models).
    - [ ] Test `_initialize` method: verify data is fetched and cached correctly.
    - [ ] Test `_getBodyType` utility.
    - [ ] Test `getDailyImpactedCapacity` with various mock inputs for `standCapacityToolService` and `maintenanceRequestService` to cover different scenarios (no maintenance, definite only, potential only, mixed, overlaps, etc.). Verify output structure and calculations.
- [ ] **Integration Tests for the API Endpoint:**
    - [ ] Use a testing framework like `supertest`.
    - [ ] Make actual API calls to the new endpoint with different `startDate` and `endDate` parameters.
    - [ ] Verify HTTP status codes and response structure against a test database seeded with relevant data.
    - [ ] Test error responses (e.g., missing date parameters).

### 3.6. Documentation

- [ ] Update API documentation (e.g., Swagger/OpenAPI, or `api-documentation.md`) to include the new endpoint, its parameters, and response structure.
- [ ] Add JSDoc comments to the `AggregatedCapacityImpactService` class and its methods.

## 4. Definition of Done for Phase 3

- [ ] `AggregatedCapacityImpactService.js` is implemented with all core logic and data fetching capabilities.
- [ ] The service correctly uses live data from other services and the database.
- [ ] A new API endpoint is created and successfully serves data from the service.
- [ ] Unit and integration tests pass, covering key functionalities and scenarios.
- [ ] API documentation is updated.
- [ ] The service produces output matching the design document for given date ranges. 