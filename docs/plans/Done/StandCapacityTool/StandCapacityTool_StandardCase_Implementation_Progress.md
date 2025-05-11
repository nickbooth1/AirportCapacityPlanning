# Stand Capacity Tool: Implementation Progress

This document tracks the progress of implementing capacity calculations in the Airport Capacity Planner application.

## Implementation Timeline

### Phase 1: Initial Implementation of Best & Worst Case (Completed)

The initial implementation included:
- Best case capacity (theoretical maximum without adjacency restrictions)
- Worst case capacity (with all adjacency restrictions applied)

### Phase 2: Standard Case Implementation (Removed)

The standard case calculation was initially implemented as a third capacity scenario that, like the best case, ignored adjacency information. 

**Decision to Remove:** Since the standard case was functionally identical to the best case in the current implementation, it was removed to avoid confusion for users. The system now has just two cases:
1. Best case (theoretical maximum without adjacency)
2. Worst case (with adjacency restrictions)

This simplifies the UI and user experience while maintaining all functional capabilities. If different factors beyond adjacency are identified in the future, the standard case concept could be reintroduced with clearer differentiation from the best case.

## Test Data Setup

- [x] Create SQL script to populate test data
  - [x] Define terminals and piers
  - [x] Define aircraft types
  - [x] Define stands
  - [x] Define stand aircraft constraints
  - [x] Define turnaround rules
  - [x] Define stand adjacencies
  - [x] Define time slots
  - [x] Configure operational settings

- [x] Create test scripts
  - [x] Mock-based test script (`test-standard-case.js`)
  - [x] Database-based test script (`test-standard-case-with-db.js`)
  - [x] Test runner shell scripts

## Implementation Tasks

### 1. Backend Implementation

#### 1.1 Update Capacity Result Model
- [x] Update `backend/src/services/adapted/models/capacityResult.js`:
  - [x] Remove `standardCaseCapacity` map from the constructor
  - [x] Update `setTimeSlots()` to remove standard case initialization
  - [x] Update `setAircraftTypes()` to remove standard case counters
  - [x] Refactor `incrementCapacity()` to handle only best and worst cases
  - [x] Refactor `getCapacity()` to handle only best and worst cases
  - [x] Update `toJson()` to include only best and worst cases in output

#### 1.2 Update Capacity Calculator
- [x] Update `backend/src/services/adapted/calculator/capacityCalculator.js`:
  - [x] Remove standard case calculation from `calculate()` method
  - [x] Update `_processStandCapacity()` to handle only best and worst cases

#### 1.3 Update Stand Capacity Service
- [x] Update `backend/src/services/standCapacityService.js`:
  - [x] Modify `calculateStandCapacity()` to remove standard case capacity
  - [x] Update `calculateCapacityForTimeSlot()` to calculate only best and worst cases
  - [x] Ensure API response includes only best and worst case capacity

### 2. Frontend Implementation

#### 2.1 Update Capacity Results Component
- [x] Update `frontend/src/components/new-capacity/NewCapacityResults.js`:
  - [x] Remove tab for standard case capacity
  - [x] Remove table component for standard case capacity
  - [x] Update CSV export to include only best and worst case capacity data

#### 2.2 Update Visualization Components
- [x] Update charts or visualizations for two cases
  - [x] Update stacked bar charts to show only best and worst cases
  - [x] Use consistent color coding across visualizations

### 3. Testing

#### 3.1 Backend Testing
- [x] Test capacity calculation:
  - [x] Run mock-based tests
  - [x] Run database-based tests
  - [x] Verify worst case is less than or equal to best case

#### 3.2 End-to-End Testing
- [x] Test end-to-end functionality:
  - [x] UI shows best and worst cases correctly
  - [x] CSV export includes both cases
  - [x] Visualizations work correctly

### 4. Documentation

#### 4.1 Update Technical Documentation
- [x] Document the capacity calculations in technical docs
- [x] Update API documentation to reflect the current capacity cases
- [x] Document the differences between the two capacity cases

#### 4.2 Update User Documentation
- [x] Update user guide to explain the best and worst case capacity
- [x] Add examples of how to interpret results
- [x] Create comparison guidance between the two cases

## Notes

- Future enhancements might reintroduce the standard case if additional differentiating factors beyond adjacency are identified
- Database tests confirmed the worst case capacity is properly calculated considering adjacency restrictions 
- Test data script needed several adjustments to match the production database schema 