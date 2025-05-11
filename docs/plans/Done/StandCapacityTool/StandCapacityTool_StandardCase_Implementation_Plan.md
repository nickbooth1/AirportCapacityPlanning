# Stand Capacity Tool: Standard Case Implementation Plan

## Overview

This document outlines the plan to implement the "Standard Case" calculation in the NEW Stand Capacity Tool. The standard case represents a middle ground between the best and worst case scenarios for stand capacity.

### Definition of Cases

1. **Best Case Capacity**: Theoretical maximum capacity without considering adjacency restrictions.
2. **Standard Case Capacity**: Simple count of how many flights all stands can accommodate per time slot, ignoring any adjacencies, broken down by aircraft type.
3. **Worst Case Capacity**: Most restrictive scenario where all possible adjacency restrictions are applied.

## Implementation Checklist

### 1. Backend Implementation

#### 1.1 Update Capacity Result Model
- [ ] Update `backend/src/services/adapted/models/capacityResult.js`:
  - [ ] Add `standardCaseCapacity` map in the constructor
  - [ ] Update `setTimeSlots()` to initialize standard case capacity maps
  - [ ] Update `setAircraftTypes()` to initialize standard case counters
  - [ ] Refactor `incrementCapacity()` to accept case type parameter
  - [ ] Refactor `getCapacity()` to accept case type parameter
  - [ ] Update `toJson()` to include standard case in output

#### 1.2 Update Capacity Calculator
- [ ] Update `backend/src/services/adapted/calculator/capacityCalculator.js`:
  - [ ] Add standard case calculation to `calculate()` method
  - [ ] Create `_getStandardCaseCompatibleTypes()` method
  - [ ] Update `_processStandCapacity()` to handle case type parameter
  - [ ] Ensure standard case ignores adjacency information

#### 1.3 Update Stand Capacity Service
- [ ] Update `backend/src/services/standCapacityService.js`:
  - [ ] Modify `calculateStandCapacity()` to include standard case capacity
  - [ ] Update `calculateCapacityForTimeSlot()` to calculate standard case capacity
  - [ ] Ensure API response includes standard case capacity

### 2. Frontend Implementation

#### 2.1 Update Capacity Results Component
- [ ] Update `frontend/src/components/new-capacity/NewCapacityResults.js`:
  - [ ] Add tab for standard case capacity
  - [ ] Create table component for standard case capacity
  - [ ] Update CSV export to include standard case capacity data

#### 2.2 Update Visualization Components
- [ ] Update any charts or visualizations to include standard case data
  - [ ] Update stacked bar charts to show standard case
  - [ ] Use consistent color coding across visualizations

### 3. Testing

#### 3.1 Backend Testing
- [ ] Write unit tests for standard case capacity calculation:
  - [ ] Test `CapacityResult` model with standard case
  - [ ] Test `CapacityCalculator` with standard case
  - [ ] Test `standCapacityService` with standard case

#### 3.2 End-to-End Testing
- [ ] Create an end-to-end test script to verify:
  - [ ] Standard case calculations are correct
  - [ ] Standard case data appears correctly in API responses
  - [ ] Standard case visualizations render correctly

#### 3.3 Mock Data Testing
- [ ] Create a test script with mock data:
  - [ ] Generate mock stands, aircraft types, and time slots
  - [ ] Calculate best, standard, and worst case capacities
  - [ ] Verify that standard case values are between best and worst case values
  - [ ] Confirm that standard case ignores adjacency restrictions

```javascript
// Test script: test-standard-case.js

const CapacityResult = require('./backend/src/services/adapted/models/capacityResult');
const CapacityCalculator = require('./backend/src/services/adapted/calculator/capacityCalculator');

// Mock data
const mockTimeSlots = [
  {
    label: "Morning",
    startTime: "08:00",
    endTime: "12:00",
    getDurationMinutes: () => 240
  }
];

const mockAircraftTypes = [
  {
    aircraftTypeID: "A320",
    sizeCategory: "C",
    averageTurnaroundMinutes: 45
  },
  {
    aircraftTypeID: "B777",
    sizeCategory: "E",
    averageTurnaroundMinutes: 90
  }
];

const mockStands = [
  {
    standID: "Stand1",
    baseCompatibleAircraftTypeIDs: ["A320", "B777"],
    adjacentStands: ["Stand2"]
  },
  {
    standID: "Stand2",
    baseCompatibleAircraftTypeIDs: ["A320"],
    adjacentStands: ["Stand1"]
  }
];

const mockAdjacencyRules = new Map();
mockAdjacencyRules.set("Stand1", [
  {
    restrictionType: "MAX_AIRCRAFT_SIZE_REDUCED_TO",
    triggerStandID: "Stand2",
    triggerAircraftTypeID: "A320",
    restrictedToAircraftTypeOrSize: "C"
  }
]);

// Settings
const mockSettings = {
  gapBetweenFlightsMinutes: 15
};

// Create aircraft type map
const aircraftTypeMap = new Map();
mockAircraftTypes.forEach(type => aircraftTypeMap.set(type.aircraftTypeID, type));

// Test calculation
function runTest() {
  console.log("Running capacity calculation test...");
  
  // Create calculator
  const calculator = new CapacityCalculator({
    timeSlots: mockTimeSlots,
    stands: mockStands,
    aircraftTypes: mockAircraftTypes,
    aircraftTypeMap: aircraftTypeMap,
    adjacencyRules: mockAdjacencyRules,
    settings: mockSettings
  });
  
  // Calculate capacity
  const result = calculator.calculate();
  
  // Convert to JSON for easier inspection
  const jsonResult = result.toJson();
  
  // Log results
  console.log("Test Results:");
  console.log("Best Case Capacity:", jsonResult.bestCaseCapacity);
  console.log("Standard Case Capacity:", jsonResult.standardCaseCapacity);
  console.log("Worst Case Capacity:", jsonResult.worstCaseCapacity);
  
  // Verify expectations
  verifyResults(jsonResult);
}

function verifyResults(result) {
  const slotLabel = "Morning";
  
  // Expected best case: Both stands can handle all compatible aircraft
  const bestA320 = result.bestCaseCapacity[slotLabel]["A320"];
  const bestB777 = result.bestCaseCapacity[slotLabel]["B777"];
  
  // Expected standard case: Should match the best case as it ignores adjacency
  const standardA320 = result.standardCaseCapacity[slotLabel]["A320"];
  const standardB777 = result.standardCaseCapacity[slotLabel]["B777"];
  
  // Expected worst case: All restrictions applied
  const worstA320 = result.worstCaseCapacity[slotLabel]["A320"];
  const worstB777 = result.worstCaseCapacity[slotLabel]["B777"];
  
  console.log("Verification:");
  console.log(`A320 capacity: best=${bestA320}, standard=${standardA320}, worst=${worstA320}`);
  console.log(`B777 capacity: best=${bestB777}, standard=${standardB777}, worst=${worstB777}`);
  
  // We expect:
  // 1. Standard case should match best case (since standard ignores adjacency)
  // 2. Worst case should be less than or equal to standard case
  const verificationPassed = 
    standardA320 === bestA320 && 
    standardA320 >= worstA320 &&
    standardB777 === bestB777 && 
    standardB777 >= worstB777;
  
  console.log(`Verification ${verificationPassed ? 'PASSED' : 'FAILED'}`);
}

// Run the test
runTest();
```

### 4. Documentation

#### 4.1 Update Technical Documentation
- [ ] Document the standard case calculation in technical docs
- [ ] Update API documentation to include standard case in responses
- [ ] Document the differences between all three capacity cases

#### 4.2 Update User Documentation
- [ ] Update user guide to explain the new standard case capacity
- [ ] Add examples of how to interpret standard case results
- [ ] Create comparison guidance between the three cases

## Implementation Timeline

1. **Day 1-2: Model Updates**
   - Update CapacityResult model
   - Initial unit tests for the model

2. **Day 3-4: Calculator Updates**
   - Update CapacityCalculator with standard case logic
   - Create unit tests for calculator

3. **Day 5-6: Service Updates**
   - Update StandCapacityService
   - Ensure API responses include standard case
   - Service-level tests

4. **Day 7-8: Frontend Updates**
   - Update results component
   - Update visualization components
   - Frontend unit tests

5. **Day 9-10: End-to-End Testing**
   - Create end-to-end tests
   - Run with mock data
   - Verify data accuracy

6. **Day 11-12: Documentation and Polish**
   - Update documentation
   - Final adjustments based on testing results
   - Code review and cleanup

## Technical Notes

### Standard Case Definition

The standard case calculation should:

1. **Ignore All Adjacency Rules**: Unlike the worst case, the standard case should not consider any adjacency restrictions
2. **Use Base Compatibility**: Use the same aircraft compatibility as the best case
3. **Include All Stands**: Calculate capacity for all stands without restrictions

### API Response Format

The updated API response format will be:

```javascript
{
  bestCaseCapacity: {
    // Organized by time slot
    "Morning Peak": {
      "B738": 5,
      "A320": 3,
      // other aircraft types
    },
    // other time slots
  },
  standardCaseCapacity: {
    // Same structure as best case
    "Morning Peak": {
      "B738": 5,
      "A320": 3,
      // other aircraft types
    },
    // other time slots
  },
  worstCaseCapacity: {
    // Similar structure
  },
  timeSlots: [
    { id: 1, name: "Morning Peak", start_time: "06:00:00", end_time: "09:00:00" },
    // other time slots
  ],
  metadata: {
    calculatedAt: "2025-05-09T22:30:00.000Z",
    // Other metadata
  }
}
```

### Implementation Notes

Since the standard case ignores adjacency restrictions, in many scenarios it will be identical to the best case. This is expected, as the distinction becomes important only when:

1. Additional stand restriction logic is implemented
2. Other factors beyond adjacency are considered in capacity calculations

The frontend should clearly explain these distinctions to avoid confusion for users. 