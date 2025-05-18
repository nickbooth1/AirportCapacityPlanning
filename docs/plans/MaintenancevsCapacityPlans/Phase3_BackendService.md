# Phase 3: Backend Service Implementation - Detailed Plan

## 1. Goal

Integrate the validated capacity impact calculation logic (from Phases 1 & 2) into a reusable backend service (`AggregatedCapacityImpactService`). This service will be callable via an API endpoint, providing the daily impacted capacity data for frontend consumption.

## 2. Prerequisites

- [x] Completion of Phase 2: CLI tool functions correctly with live data sources.
- [x] Design Document for `AggregatedCapacityImpactService` is finalized (including API input/output structure).
- [x] Backend project structure is set up to accommodate new services and routes.

## 3. Task Breakdown

### 3.1. Create Service File and Class Structure

- [x] Create the service file: `backend/src/services/AggregatedCapacityImpactService.js`.
- [x] Define the `AggregatedCapacityImpactService` class structure with the following components:
    - [x] Constructor with cache initialization
    - [x] Configuration for maintenance status categories (Definite/Potential)
    - [x] Initialization method `_initialize()` for fetching reference data
    - [x] Helper methods for aircraft body type and stand compatibility
    - [x] Main method `getDailyImpactedCapacity()` for analysis

### 3.2. Implement Initialization Logic (`_initialize` method)

- [x] **Fetch and Cache Stands Data:**
    - [x] Query active `Stand` models
    - [x] For each stand, determine compatible aircraft ICAOs
    - [x] Store in `this.standsData` as a Map
- [x] **Fetch and Cache Aircraft Types Data:**
    - [x] Query active `AircraftType` models
    - [x] Determine body type for each aircraft
    - [x] Get average turnaround minutes from rules
    - [x] Store in `this.aircraftTypesData` as a Map
- [x] **Fetch and Cache Operational Settings:**
    - [x] Query `OperationalSettings` and store in `this.operationalSettings`
- [x] **Fetch and Cache Maintenance Status Types:**
    - [x] Query `MaintenanceStatusType` models
    - [x] Store in `this.maintenanceStatusTypes` as a Map

### 3.3. Implement Core Logic in `getDailyImpactedCapacity`

- [x] **Transfer and Adapt Logic from Phase 2:**
    - [x] Initialize data with `await this._initialize()`
    - [x] Fetch daily gross capacity template from `standCapacityToolService`
    - [x] Fetch maintenance requests for date range
    - [x] Process each day in the date range:
        - [x] Calculate original daily capacity totals
        - [x] Initialize daily impact accumulators
        - [x] Deep copy template slot capacities
        - [x] Filter maintenance requests for the current day
        - [x] Process each time slot:
            - [x] Construct absolute slot date-times
            - [x] Identify active maintenance in the slot
            - [x] For each maintenance, calculate capacity impact by aircraft type
            - [x] Reduce capacity and accumulate reduction totals
            - [x] Store contributing request information
        - [x] Calculate final capacity values
        - [x] Assemble daily results object
    - [x] Return array of daily results

### 3.4. Create API Endpoint

- [x] **Create a controller function** in `backend/src/controllers/capacityController.js`:
    - [x] Implement `getCapacityImpactAnalysis` function
    - [x] Add input validation for startDate and endDate
    - [x] Call `AggregatedCapacityImpactService.getDailyImpactedCapacity()`
    - [x] Return formatted JSON response
- [x] **Define a new route** in `backend/src/routes/capacity.js`:
    - [x] Add route for `GET /api/capacity/impact-analysis`
    - [x] Connect to the controller function
    - [x] Add Swagger documentation

### 3.5. Unit and Integration Testing

- [x] **Unit Tests for `AggregatedCapacityImpactService`:**
    - [x] Test helpers like `_getBodyType`, `_getCompatibleTypesFromSizeCode`
    - [x] Test `_calculateDailyTotals`
    - [x] Test `_deepCopy` utility
    - [x] Test main `getDailyImpactedCapacity` method
- [x] **Integration Tests for the API Endpoint:**
    - [x] Test validation (missing startDate/endDate)
    - [x] Test date formatting validation
    - [x] Test date range validation
    - [x] Test successful response structure

### 3.6. Documentation

- [x] **Update API documentation** to include the new endpoint:
    - [x] Added to `api-documentation.md`
    - [x] Documented request parameters
    - [x] Documented response structure with example
    - [x] Documented error responses
- [x] **Add JSDoc comments** to all methods in `AggregatedCapacityImpactService`

## 4. Implementation Details and Test Results

### 4.1. Service Implementation

The `AggregatedCapacityImpactService` was successfully implemented with the following key features:

1. **Efficient Data Caching:**
   - Reference data (stands, aircraft types, settings) is loaded once and cached
   - Initialization happens on first use with lazy loading pattern

2. **Robust Data Processing:**
   - Each maintenance request's impact is precisely calculated
   - Handles overlapping maintenance in the same time slot
   - Properly categorizes impacts as definite or potential based on status

3. **Proper Error Handling:**
   - Validation of input parameters
   - Graceful handling of missing data
   - Detailed error messages for troubleshooting

### 4.2. API Endpoint Implementation

The API endpoint follows RESTful design principles:

1. **Clear Parameter Requirements:**
   - Required: `startDate` and `endDate` in YYYY-MM-DD format
   - Validation ensures proper date formatting and logical date ranges

2. **Structured Response Format:**
   - Top-level metadata includes analysis date and date range
   - Daily results with original capacity, capacity after definite impact, and final net capacity
   - Detailed breakdown of maintenance impacts by category
   - List of contributing maintenance requests with relevant details

3. **Comprehensive Error Handling:**
   - 400 Bad Request for missing or invalid parameters
   - 500 Internal Server Error with informative messages for server-side issues

### 4.3. Test Results

Unit and integration tests were created to verify functionality:

1. **Unit Tests:**
   - Tested helper methods with various input scenarios
   - Verified core calculation logic with mock data
   - Confirmed proper handling of edge cases

2. **Integration Tests:**
   - Verified API endpoint correctly validates input
   - Confirmed proper response structure
   - Tested with representative data for realistic scenarios

All tests pass successfully, indicating the implementation meets requirements.

## 5. Definition of Done for Phase 3

- [x] `AggregatedCapacityImpactService.js` is implemented with all core logic and data fetching capabilities.
- [x] The service correctly uses live data from other services and the database.
- [x] A new API endpoint is created and successfully serves data from the service.
- [x] Unit and integration tests pass, covering key functionalities and scenarios.
- [x] API documentation is updated.
- [x] The service produces output matching the design document for given date ranges.

## 6. Conclusion

Phase 3 has been successfully completed, delivering the backend service implementation as planned. The implementation integrates the capacity impact calculation logic from Phases 1 and 2 into a reusable service accessible via an API endpoint. The service has been thoroughly tested and documented, ensuring it meets all requirements and is ready for integration with the frontend application. 