# NEW Stand Capacity Tool Integration Plan

This document outlines the plan to integrate the CLI-based Stand Capacity Tool into the Airport Capacity Planner web application, replacing the existing capacity tool with an enhanced version.

## Overview

The Stand Capacity Tool is currently implemented as a command-line interface (CLI) tool that calculates airport stand capacity based on:
- Stand compatibility with different aircraft types
- Turnaround times for various aircraft types
- Gap time requirements between consecutive flights
- Stand adjacency constraints and restrictions

This plan details how we will:
1. Remove the existing stand capacity page
2. Create a new stand capacity tool with a modern web interface
3. Adapt the CLI tool's core functionality for use in a web application
4. Leverage the new time slots feature in the capacity calculations

## Implementation Approach

The integration will **preserve the CLI tool's core algorithms** while adapting them to work in a web context. Rather than executing the CLI tool and parsing its output, we will:

1. Extract the core calculation logic from the CLI tool 
2. Adapt it to work with our database models instead of file-based data
3. Create API endpoints that expose this functionality
4. Build a modern frontend interface that utilizes these endpoints

## Implementation Checklist

### 1. Backend Implementation

#### 1.1 Extract and Adapt CLI Tool Components
- [x] Create adapted versions of core calculation components:
  - [x] `CapacityCalculator` class 
  - [ ] Data models (OperationalSettings, AircraftType, Stand, etc.)
  - [x] TimeSlot handling logic
- [ ] Implement data conversion functions to translate between database models and CLI models

#### 1.2 Create Stand Capacity Service
- [x] Create `standCapacityToolService.js` in the backend:
  - [x] Implement method to get required data from database
  - [x] Implement data conversion methods
  - [x] Implement wrapper for the capacity calculator
  - [x] Add result formatting methods

#### 1.3 Create API Endpoints
- [x] Add new stand capacity endpoints:
  - [x] `POST /api/capacity/calculate` - Main calculation endpoint
  - [x] `GET /api/capacity/results/:id` - Retrieve saved calculation results (optional)
  - [x] `GET /api/capacity/export/:id` - Export calculation results (optional)

#### 1.4 Testing Backend
- [x] Create unit tests for the adapted capacity calculator
- [ ] Test data conversion functions
- [ ] Create API endpoint tests
- [ ] Compare results with original CLI tool for validation

### 2. Frontend Implementation

#### 2.1 Remove Existing Components
- [ ] Remove `/frontend/src/pages/capacity/index.js`
- [ ] Remove components in `/frontend/src/components/capacity/`

#### 2.2 Create New Components
- [x] Create new capacity page with "NEW Stand Capacity Tool" branding
- [x] Create form components for:
  - [x] Time slot selection
  - [x] Stand filtering
  - [x] Calculation options
- [x] Create results visualization components:
  - [x] Tables for best/worst case results
  - [x] Charts and graphs 
  - [x] Export functionality

#### 2.3 Update Navigation
- [x] Add "NEW Stand Capacity Tool" to the navigation menu
- [x] Ensure proper routing to the new page

#### 2.4 Create API Client
- [x] Implement API client for the new endpoints
- [x] Add error handling and loading states

#### 2.5 Testing Frontend
- [ ] Test UI components
- [ ] Test integration with the backend
- [ ] Test error states and edge cases

### 3. Time Slots Integration

#### 3.1 Connect with Time Slots Feature
- [ ] Enable selection of user-defined time slots
- [ ] Update capacity calculation to use selected time slots
- [ ] Add option to generate time slots from operational settings

### 4. Documentation

#### 4.1 Technical Documentation
- [ ] Document the adaptation of CLI components
- [ ] Document API endpoints
- [ ] Update service architecture documentation

#### 4.2 User Documentation
- [ ] Create user guide for the new tool
- [ ] Add examples of different calculation scenarios
- [ ] Document how to interpret results

### 5. Deployment Plan

#### 5.1 Staging Deployment
- [ ] Deploy changes to staging environment
- [ ] Test functionality in staging
- [ ] Get user feedback

#### 5.2 Production Deployment
- [ ] Create deployment plan
- [ ] Execute deployment
- [ ] Monitor for issues

## Technical Details

### Core Components to Adapt

1. **CapacityCalculator**
   - Adapting `stand-capacity-tool/src/calculator/capacityCalculator.js`
   - This contains the core algorithm for calculating stand capacity

2. **Data Models**
   - Adapting models from `stand-capacity-tool/src/models/`
   - OperationalSettings, AircraftType, Stand, StandAdjacencyRule, etc.

3. **Result Formatting**
   - Adapting `CapacityResult` class for API responses
   - Adding visualization-friendly data structures

### Data Conversion

The web application and CLI tool use different data models. We'll need mappings between:

1. **Database Stand Model ↔ CLI Stand Model**
   ```javascript
   // Example conversion function
   function convertDatabaseStandToCliStand(dbStand) {
     return new Stand({
       standID: dbStand.code,
       baseCompatibleAircraftTypeIDs: dbStand.compatible_aircraft_types.map(type => type.code)
     });
   }
   ```

2. **Database Aircraft Type Model ↔ CLI Aircraft Type Model**
3. **Database Time Slot Model ↔ CLI Time Slot Model**
4. **Database Adjacency Rules ↔ CLI Adjacency Rules**

### API Response Format

The new API will return results in this format:

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
  worstCaseCapacity: {
    // Similar structure
  },
  timeSlots: [
    { id: 1, name: "Morning Peak", start_time: "06:00:00", end_time: "09:00:00" },
    // other time slots
  ],
  visualization: {
    // Additional data structures optimized for charts and tables
    byHour: [...],
    bySize: [...],
    byPier: [...]
  },
  metadata: {
    calculatedAt: "2025-05-09T22:30:00.000Z",
    stands: {
      total: 15,
      filtered: 8
    },
    aircraftTypes: {
      total: 12
    },
    settings: {
      // Operational settings used
    }
  }
}
```

## Timeline

1. **Phase 1: Backend Integration (Days 1-10)**
   - Extract and adapt CLI components
   - Create services and API endpoints
   - Implement data conversion

2. **Phase 2: Frontend Implementation (Days 11-20)**
   - Remove old components
   - Create new UI components
   - Update navigation

3. **Phase 3: Testing and Refinement (Days 21-25)**
   - End-to-end testing
   - Performance optimization
   - UI/UX refinement

4. **Phase 4: Documentation and Deployment (Days 26-30)**
   - Complete documentation
   - Deployment to staging
   - Production deployment

## Resources and References

- Original CLI tool source code: `stand-capacity-tool/`
- Time slots implementation: `backend/src/models/TimeSlot.js`
- Current capacity page: `frontend/src/pages/capacity/index.js`
- API endpoints: `backend/src/routes/capacity.js` 