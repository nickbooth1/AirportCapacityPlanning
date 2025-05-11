# Stand Capacity Tool: Adjacency Implementation Plan

This document outlines the tasks required to properly implement stand adjacency considerations in the Airport Capacity Planner application's capacity calculations.

## Background

Currently, the stand capacity tool calculates capacity in two scenarios:
- **Best case:** Theoretical maximum capacity without adjacency restrictions
- **Worst case:** Capacity with adjacency restrictions applied

The current implementation has a bug where adjacency restrictions aren't being properly considered in the worst case calculation, specifically:
1. The `_filterStandsByLocation` method is not being found when called in `calculateStandCapacity`
2. The actual adjacency impact calculation is not properly implemented

## Implementation Tasks

### 1. Fix the Immediate Error

- [x] Fix the `_filterStandsByLocation` method error in `standCapacityService.js`
  - [x] Resolve the `TypeError: this._filterStandsByLocation is not a function` error
  - [x] Either move the function to be part of the class prototype, or create a properly scoped implementation

### 2. Enhance the Adjacency Model

- [x] Update the adjacency model to properly represent stand constraints:
  - [x] Ensure the `stand_adjacencies` table has all necessary fields:
    - [x] Primary stand ID
    - [x] Adjacent stand ID
    - [x] Impact direction (e.g., left, right, behind, front)
    - [x] Restriction type (e.g., no_use, size_limited, aircraft_type_limited)
    - [x] Max aircraft size code (if applicable)
    - [x] Restriction details (for complex rules)
    - [x] Active/inactive flag

### 3. Implement Adjacency Impact Logic

- [x] Implement or update the `_getCompatibleTypesWithAdjacency` method:
  - [x] Replace the placeholder implementation with proper adjacency logic
  - [x] Handle different restriction types:
    - [x] No use case (stand completely unusable)
    - [x] Size limitation (reduce max aircraft size allowed)
    - [x] Aircraft type restriction (prohibit specific aircraft types)
  - [x] Consider impact direction in the adjacency calculations

- [x] Create a `_filterTypesByMaxSize` helper method to filter aircraft types by size category

### 4. Update the Capacity Calculator Logic

- [x] Enhance `calculateCapacityForTimeSlot` to properly use adjacency data:
  - [x] Build an adjacency graph for easier adjacency rule lookups
  - [x] Apply adjacency rules based on their restriction types
  - [x] Ensure narrow/wide body categorization works with adjacency constraints

- [x] Update the `_getWorstCaseCompatibleTypes` method to properly handle all adjacency rule types

### 5. Fix the JSON Serialization Error

- [x] Fix the error in `getLatestCapacityResults`:
  - [x] Address `SyntaxError: Unexpected token 'o', "[object Obj"... is not valid JSON`
  - [x] Ensure proper serialization of objects before storing in database
  - [x] Implement proper deserialization of JSON data when retrieving results

### 6. Testing

- [x] Create test cases to verify adjacency implementation:
  - [x] Test stands with no adjacency constraints (worst case = best case)
  - [x] Test stands with "no use" adjacency constraints (worst case = 0)
  - [x] Test stands with size limitation adjacency (worst case < best case)
  - [x] Test stands with aircraft type restrictions
  - [x] Test adjacency impact across different time slots

- [ ] Create integration tests to verify end-to-end functionality:
  - [ ] Test UI display of adjacency-impacted capacity
  - [ ] Test body type classification with adjacency constraints
  - [ ] Verify CSV export with adjacency-constrained capacity data

### 7. Documentation

- [x] Update the technical documentation:
  - [x] Document the adjacency model and how it impacts capacity
  - [x] Document the algorithms for calculating worst-case capacity
  - [x] Provide examples of adjacency rules and their impacts

- [x] Update the user documentation:
  - [x] Explain what adjacency constraints mean for capacity
  - [x] Show how to interpret the best vs. worst case results
  - [x] Provide guidance on managing stand adjacencies

## Implementation Approach

1. **Fix Immediate Issues:** Start by resolving the function call error and JSON serialization issues to get the system working
2. **Enhance the Model:** Update the adjacency data model to represent all constraint types properly
3. **Implement Core Logic:** Build out the adjacency impact calculation functionality
4. **Test & Validate:** Create comprehensive tests to ensure the functionality works correctly
5. **Document:** Update technical and user documentation to reflect the changes

## Future Enhancements

- Consider adding a visualization of stand adjacency constraints in the UI
- Add ability to simulate "what-if" scenarios with different adjacency rules
- Enhance reporting to highlight adjacency-constrained stands
- Implement more complex adjacency rules based on time of day or operational conditions 