# Stand Capacity Tool Integration Plan

This document outlines the plan to integrate the CLI-based Stand Capacity Tool into the Airport Capacity Planner web application, replacing the existing capacity tool while maintaining the same UI structure.

## Overview

The Stand Capacity Tool calculates the capacity by plane type at an airport based on:
- Stand capability and availability
- Gap between usage of stands
- Average turnaround times by plane type
- Potential impacts from stand adjacencies

## Implementation Checklist

### 1. Backend Implementation

#### 1.1 Create Stand Capacity Service
- [x] Create `standCapacityService.js` in the backend
  - [x] Implement method to get operational settings data
  - [x] Implement method to get stand data
  - [x] Implement method to get aircraft type data
  - [x] Implement method to get turnaround rules
  - [x] Implement method to get stand adjacency rules
  - [x] Implement method to get or generate time slots
  - [x] Implement core capacity calculation algorithm based on the documented logic
  - [x] Add best case capacity calculation
  - [x] Add worst case capacity calculation
  - [x] Add calculation metadata and timestamps

#### 1.2 Create API Endpoints
- [x] Add stand capacity endpoints to the capacity routes file:
  - [x] `GET /api/capacity/stand-capacity` - Main calculation endpoint
  - [x] `GET /api/capacity/stand-capacity/by-time-slot` - Capacity organized by time slots
  - [x] `GET /api/capacity/stand-capacity/by-aircraft-type` - Capacity organized by aircraft types

#### 1.3 Testing Backend
- [x] Create unit tests for the stand capacity service
  - [x] Test data retrieval methods
  - [x] Test time slot generation functionality
  - [x] Test capacity calculation with mock data
  - [x] Test edge cases (no stands, no aircraft types)
- [x] Create API endpoint tests
  - [x] Test with various query parameters
  - [x] Test error handling scenarios

### 2. Frontend Implementation

#### 2.1 Create API Client
- [x] Add stand capacity API methods to capacity API client
  - [x] `calculateStandCapacity` function with options
  - [x] `getCapacityByTimeSlot` function (if needed)
  - [x] `getCapacityByAircraftType` function (if needed)

#### 2.2 Create UI Components
- [x] Create stand capacity calculator component
  - [x] Form for selecting time slots
  - [x] Option to use predefined time slots or generate from operational settings
  - [x] Stand selection filters
  - [x] Calculate button with loading state
  - [x] Error handling display
- [x] Create capacity results components
  - [x] Tabbed view for best case/worst case
  - [x] Table to display results by aircraft type and time slot
  - [x] Summary statistics display
  - [x] Export functionality (CSV/PDF)

#### 2.3 Replace Existing Components
- [x] Identify the existing capacity page components to replace
- [x] Update routing to use new components while maintaining URL structure
- [x] Ensure any existing functionality is preserved or improved

#### 2.4 Testing Frontend
- [x] Test UI components with mock data
- [x] Test integration with the backend services
- [x] Test user workflows and form submissions
- [x] Test error states and edge cases

### 3. Data Models and Migrations

#### 3.1 Update/Verify Data Models
- [x] Check if any database schema changes are needed
  - [x] Verify stand model includes required fields
  - [x] Verify aircraft type model includes required fields
  - [x] Consider adding a capacity results table for historical calculations

#### 3.2 Data Migrations
- [x] Create any necessary migration scripts
- [x] Test migrations on development databases
- [x] Document rollback procedures

### 4. Integration with Time Slots

#### 4.1 Connect with Time Slots Feature
- [x] Enable filtering by user-defined time slots
- [x] Update capacity calculation to use time slot definitions
- [x] Allow toggling between time slot-based and regular time intervals

### 5. Documentation and User Guides

#### 5.1 Technical Documentation
- [x] Update API documentation
- [x] Document capacity calculation algorithm
- [x] Document service architecture changes

#### 5.2 User Documentation
- [x] Create user guide for the new capacity tool
- [x] Add examples of different calculation scenarios
- [x] Document how to interpret results

### 6. Deployment and Testing

#### 6.1 Staging Deployment
- [x] Deploy changes to staging environment
- [x] Test all functionality in staging
- [x] Get user feedback on the new tool

#### 6.2 Production Deployment
- [x] Create deployment plan
- [x] Execute deployment to production
- [x] Monitor for issues post-deployment

## Implementation Details

### Core Algorithm Implementation

The core capacity calculation algorithm follows these steps:

1. **Define Time Slots:**
   - Use predefined time slots from the database, or
   - Generate slots based on operational settings

2. **Get Required Data:**
   - Stand information (compatibility with aircraft types)
   - Aircraft type information (turnaround times)
   - Operational settings (gap between flights)
   - Stand adjacency rules

3. **For Each Time Slot:**
   - **For Each Stand:**
     - Determine compatible aircraft types for best case
     - Determine compatible aircraft types for worst case (considering adjacencies)
     - Calculate how many aircraft of each type can be processed
     - Increment capacity counts in result structures

4. **Return Results:**
   - Best case capacity (by time slot and aircraft type)
   - Worst case capacity (by time slot and aircraft type)
   - Metadata about the calculation

### Data Structures

The results will use the following structure:

```javascript
{
  bestCaseCapacity: {
    // Keyed by timeSlotId or timeSlotName
    "Morning Peak": {
      // Keyed by aircraftTypeId or code
      "B738": 5,
      "A320": 3,
      // etc.
    },
    // other time slots
  },
  worstCaseCapacity: {
    // Similar structure to bestCaseCapacity
  },
  timeSlots: [
    { id: 1, name: "Morning Peak", start_time: "06:00:00", end_time: "09:00:00" },
    // etc.
  ],
  metadata: {
    calculatedAt: "2025-05-09T22:30:00.000Z",
    standCount: 10,
    aircraftTypeCount: 8,
    // etc.
  }
}
```

## Timeline

1. **Week 1: Backend Implementation**
   - Complete stand capacity service
   - Create API endpoints
   - Write unit tests

2. **Week 2: Frontend Implementation**
   - Create UI components
   - Integrate with backend services
   - Update routing and navigation

3. **Week 3: Testing and Refinement**
   - Complete end-to-end testing
   - Refine UI based on feedback
   - Complete documentation

4. **Week 4: Deployment**
   - Deploy to staging
   - User acceptance testing
   - Deploy to production

## Resources

- Existing Stand Capacity Tool documentation
- Current capacity tool codebase
- API documentation
- Database schema 