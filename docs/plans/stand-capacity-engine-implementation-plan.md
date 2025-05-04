# Stand Capacity Engine Implementation Plan

## Overview
This document outlines the implementation plan for the Stand Capacity Engine module as specified in the CapaCity MVP. This core calculation component will determine the theoretical maximum stand capacity of the airport over a defined operational period, utilizing airport definition data, operational settings, turnaround rules, and handling stand adjacency constraints.

## Implementation Phases

### Phase 1: Database Schema Updates
- [x] Create migration to add slot-related fields to `operational_settings` table:
  - [x] `slot_duration_minutes` (INTEGER, default 10)
  - [x] `slot_block_size` (INTEGER, default 6 for hourly reporting)
- [x] Update `OperationalSettings` model to include new fields
- [x] Create seed updates for default slot configuration values
- [x] Test database migration with existing data

### Phase 2: Core Service Structure
- [x] Create `standCapacityService.js` service file
- [x] Implement data fetching methods:
  - [x] `fetchStands()` - Get all active stands with attributes
  - [x] `fetchAircraftTypes()` - Get aircraft type data
  - [x] `fetchTurnaroundRules()` - Get turnaround time configurations
  - [x] `fetchOperationalSettings()` - Get operating hours and settings
  - [x] `fetchStandAdjacencies()` - Get stand adjacency constraints
- [x] Create utilities for slot and time operations in `slotUtils.js`
- [x] Implement basic API structure with placeholder calculation
- [x] Add service skeleton unit tests

### Phase 3: Time Slot Logic Implementation
- [x] Implement `generateTimeSlots()` method to create slots based on operational settings
- [x] Create slot data structure optimized for capacity calculations
- [x] Add methods to convert between time formats and slot indices
- [x] Implement time range validation logic
- [x] Create helper methods for slot operations
- [x] Test time slot generation with various settings

### Phase 4: Stand Allocation Simulation Logic
- [x] Implement adjacency constraint graph builder
- [x] Create single-stand capacity calculation logic:
  - [x] Determine maximum aircraft size per stand
  - [x] Calculate turnaround and gap times in slots
  - [x] Simulate placement of aircraft in available slots
- [x] Build stand occupation tracking mechanism
- [x] Implement adjacency constraint propagation
- [x] Test stand allocation with simple stand configurations

### Phase 5: Multi-Stand Processing and Aggregation
- [x] Extend simulation logic to process all stands
- [x] Implement capacity aggregation by aircraft size category
- [x] Create hourly and daily capacity summaries
- [x] Build result formatting methods
- [x] Optimize for performance with larger datasets
- [x] Add comprehensive logging for calculation steps
- [x] Test with complex multi-stand scenarios

### Phase 6: API and Controller Implementation
- [x] Create `capacityController.js` with calculateCapacity method
- [x] Implement `capacity.js` routes file with appropriate endpoints
- [x] Add input validation and error handling
- [x] Implement parameter parsing (e.g., date selection)
- [x] Register routes in main Express application
- [x] Document API endpoints in API documentation
- [x] Create integration tests for API endpoints

### Phase 7: Frontend Integration
- [x] Add capacity calculation trigger to appropriate UI location
- [x] Create visualization components for capacity results:
  - [x] Summary statistics view
  - [x] Hourly capacity breakdown chart
  - [x] Aircraft size category distribution
- [x] Implement settings UI for slot configuration
- [x] Add loading indicators and error handling
- [x] Test UI with various data scenarios

### Phase 8: Testing and Optimization
- [ ] Create comprehensive unit tests for all calculation logic
- [ ] Implement integration tests with realistic stand data
- [ ] Add performance testing for large airport configurations
- [ ] Optimize critical calculation paths
- [ ] Implement caching strategy for frequent calculations
- [ ] Add proper error logging and debugging information
- [ ] Conduct end-to-end testing of the entire capacity workflow

## Integration Considerations
- **Data Dependencies**: Requires airport definition data and capacity configuration to be complete
- **Adjacency Handling**: Complex constraints between stands must be properly encoded and processed
- **Performance**: Calculations should be optimized for larger airports with many stands
- **Slot Alignment**: Time slot logic must align with airport operational practices
- **UI Representation**: Capacity results need clear visualization for user understanding

## Risk Assessment
- Complex adjacency constraints may significantly impact calculation performance
- Slot-based capacity calculation must balance precision with performance
- Testing with realistic data is essential to validate calculation correctness
- Integration with maintenance system adds another layer of complexity
- Edge cases like overnight operations need special handling

## Progress Tracking
- Phase 1: Completed (100%)
- Phase 2: Completed (100%)
- Phase 3: Completed (100%)
- Phase 4: Completed (100%)
- Phase 5: Completed (100%)
- Phase 6: Completed (100%)
- Phase 7: Completed (100%)
- Phase 8: Not Started (0%) 