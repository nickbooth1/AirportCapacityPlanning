# Stand Capacity Tool - Narrow/Wide Body Visualization Implementation Plan

## Overview

This implementation plan outlines the changes needed to enhance the Stand Capacity Tool to show capacity by narrow-body vs wide-body aircraft instead of by specific aircraft types. The changes will support the following requirements:

1. Modify the aircraft_types table to include a narrow_body or wide_body categorization
2. Update backend services to aggregate capacity data by body type
3. Modify frontend visualization to display narrow vs wide body capacity
4. Add filtering capabilities for time slots, stands, fuel-enabled stands, terminals, and piers
5. Enhance test data to provide a robust demonstration of the tool's capabilities

## 1. Database Changes

- [x] 1.1. Add `body_type` column to `aircraft_types` table
  - [x] Create migration file to add the column
  - [x] Update column with values ('narrow' or 'wide') for all existing aircraft types
  - [x] Update database schema documentation

- [x] 1.2. Create a SQL script to populate the new `body_type` field
  - [x] Map aircraft to body types based on size categories:
    - Size categories A, B, C: narrow body
    - Size categories D, E, F: wide body
  - [x] Test the script with existing data

## 2. Backend Changes

- [x] 2.1. Update `StandCapacityService` to calculate capacity by body type
  - [x] Modify `calculateCapacityForTimeSlot` method to aggregate capacity by body type
  - [x] Add new method `_aggregateCapacityByBodyType` to transform aircraft-specific data
  - [x] Update result format to include narrow/wide body breakdowns

- [x] 2.2. Update API response structure
  - [x] Modify capacity result format to include:
    - Total capacity by time slot (best case/worst case)
    - Narrow body capacity by time slot (best case/worst case)
    - Wide body capacity by time slot (best case/worst case)
  - [x] Maintain original detailed aircraft type data for backward compatibility

- [x] 2.3. Add filtering capabilities
  - [x] Enhance `calculateStandCapacity` to accept additional filter parameters:
    - `fuelEnabled` boolean filter
    - `terminalIds` array filter
    - `pierIds` array filter
  - [x] Implement `_filterStandsByLocation` method

## 3. Frontend Changes

- [x] 3.1. Update `NewCapacityResults` component to show body type visualization
  - [x] Modify `CapacityChart` component to display narrow vs wide body data
  - [x] Update color scheme and legends
  - [x] Add toggle to switch between body type view and detailed aircraft view

- [x] 3.2. Enhance filtering UI
  - [x] Add filter controls for:
    - Time slot selection
    - Stand selection
    - Fuel-enabled stands toggle
    - Terminal selection
    - Pier selection
  - [x] Implement filter state management
  - [x] Connect filters to API request parameters

- [x] 3.3. Create summary statistics display
  - [x] Show total capacity across all time slots
  - [x] Show average capacity per time slot
  - [x] Display narrow body / wide body ratio

## 4. Test Data Enhancement

- [ ] 4.1. Create additional test stands (total of 30)
  - [ ] Add various stand capabilities and restrictions
  - [ ] Create stands with different terminal/pier assignments
  - [ ] Add fuel-enabled attribute to appropriate stands

- [ ] 4.2. Set up adjacency constraints
  - [ ] Define adjacency relationships between stands
  - [ ] Create different types of restrictions based on aircraft size
  - [ ] Set up scenarios for testing worst-case capacity

- [ ] 4.3. Create comprehensive test script
  - [ ] Script to insert all test data
  - [ ] Documentation of test scenarios
  - [ ] Expected results for verification

## 5. Testing

- [x] 5.1. Unit tests
  - [x] Test body type classification logic
  - [x] Test capacity aggregation methods
  - [x] Test filter functionality

- [ ] 5.2. Integration tests
  - [ ] Test end-to-end capacity calculation with new data model
  - [ ] Validate API responses with expected structure
  - [ ] Test all filter combinations

- [ ] 5.3. UI testing
  - [x] Verify chart displays correctly with test data
  - [x] Test filter controls and visualization updates
  - [ ] Test responsiveness and edge cases

## 6. Documentation

- [x] 6.1. Update API documentation
  - [x] Document new filter parameters
  - [x] Update response format specifications

- [ ] 6.2. Update user guide
  - [ ] Document new visualization features
  - [ ] Add instructions for filtering
  - [ ] Include screenshots of new UI

- [x] 6.3. Technical documentation
  - [x] Document database changes
  - [x] Describe aggregation algorithms
  - [ ] Document test data setup

## Implementation Details

### Database Migration

```sql
-- Migration to add body_type column to aircraft_types
ALTER TABLE aircraft_types ADD COLUMN body_type VARCHAR(10);

-- Update existing records based on size category
UPDATE aircraft_types 
SET body_type = 
  CASE 
    WHEN size_category IN ('A', 'B', 'C') THEN 'narrow'
    WHEN size_category IN ('D', 'E', 'F') THEN 'wide'
    ELSE 'unknown'
  END;
```

### Backend Service Updates

The `calculateCapacityForTimeSlot` method will need to be modified to aggregate aircraft capacities by body type. The updated method should:

1. Calculate capacity for each aircraft type as before
2. Aggregate capacities by body type (narrow/wide)
3. Include both aggregated and detailed data in the result

### Frontend Visualization Updates

The frontend visualization will need to be updated to show:

1. Stacked bar charts showing narrow vs wide body capacity
2. Ability to toggle between this view and more detailed views
3. Filter controls to slice the data by different dimensions

### Test Data Changes

Additional test data will include:

1. 30 stands with varied configurations
2. Adjacency relationships between stands
3. Different stand capabilities (fuel, terminal assignments, etc.)

## Timeline

- Week 1: Database changes and backend service updates
- Week 2: Frontend visualization updates
- Week 3: Test data enhancement and testing
- Week 4: Documentation and final adjustments

## Risks and Mitigations

1. **Risk**: Changes to existing data structure might break current functionality
   **Mitigation**: Maintain backward compatibility and implement extensive testing

2. **Risk**: Performance impact from additional data aggregation
   **Mitigation**: Optimize aggregation methods and consider caching results

3. **Risk**: User confusion with new visualization
   **Mitigation**: Provide clear documentation and intuitive UI controls 