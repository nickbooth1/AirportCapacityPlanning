# Stand Capacity Tool - Backend Technical Implementation Plan

This document provides detailed technical specifications for implementing the Stand Capacity Tool backend service and API endpoints.

## 1. Service Architecture

### 1.1 Stand Capacity Service

- [x] Create `backend/src/services/standCapacityService.js`

```javascript
const OperationalSettings = require('../models/OperationalSettings');
const Stand = require('../models/Stand');
const AircraftType = require('../models/AircraftType');
const TurnaroundRule = require('../models/TurnaroundRule');
const StandAdjacencyRule = require('../models/StandAdjacencyRule');
const TimeSlot = require('../models/TimeSlot');
const { transaction } = require('objection');

class StandCapacityService {
  /**
   * Calculate stand capacity based on various parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Capacity calculation results
   */
  async calculateStandCapacity(options = {}) {
    // Implementation of the main calculation function
  }
  
  // Helper methods
  async getOperationalSettings() { /* ... */ }
  async getStandData(standIds) { /* ... */ }
  async getAircraftTypeData() { /* ... */ }
  async getTurnaroundRules() { /* ... */ }
  async getStandAdjacencyRules() { /* ... */ }
  async getDefinedTimeSlots(timeSlotIds) { /* ... */ }
  
  /**
   * Generate time slots based on operational settings
   * @param {Object} operationalSettings - The operational settings object
   * @returns {Array} Generated time slots
   */
  generateTimeSlots(operationalSettings) {
    // Implementation of time slot generation
  }
  
  /**
   * Calculate capacity for a specific time slot
   * @param {Object} timeSlot - The time slot
   * @param {Array} stands - The stands data
   * @param {Array} aircraftTypes - The aircraft types data
   * @param {Object} turnaroundRules - Map of aircraft type to turnaround rules
   * @param {Array} adjacencyRules - The stand adjacency rules
   * @param {Number} gapBetweenFlights - Gap between flights in minutes
   * @returns {Object} Capacity for the time slot
   */
  calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
    // Implementation of capacity calculation for a single time slot
  }
}

module.exports = new StandCapacityService();
```

### 1.2 Time Slot Generation

- [x] Implement time slot generation logic

```javascript
/**
 * Generate time slots based on operational settings
 * @param {Object} operationalSettings - The operational settings object
 * @returns {Array} Generated time slots
 */
generateTimeSlots(operationalSettings) {
  const slots = [];
  const { operating_start_time, operating_end_time, slot_duration_minutes } = operationalSettings;
  
  // Parse start and end times
  const startDate = new Date(`1970-01-01T${operating_start_time}`);
  const endDate = new Date(`1970-01-01T${operating_end_time}`);
  
  // Handle case where end time crosses midnight
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  // Generate slots at regular intervals
  let currentTime = new Date(startDate);
  let slotId = 0;
  
  while (currentTime < endDate) {
    const slotStartTime = currentTime.toTimeString().substring(0, 8);
    
    // Calculate end time for this slot
    const slotEndTime = new Date(currentTime);
    slotEndTime.setMinutes(slotEndTime.getMinutes() + slot_duration_minutes);
    
    // Ensure end time doesn't exceed operating end time
    const actualEndTime = slotEndTime > endDate ? endDate : slotEndTime;
    const slotEndTimeString = actualEndTime.toTimeString().substring(0, 8);
    
    slots.push({
      id: `generated_${slotId++}`,
      name: `${slotStartTime} - ${slotEndTimeString}`,
      start_time: slotStartTime,
      end_time: slotEndTimeString,
      is_generated: true
    });
    
    // Move to next slot
    currentTime = slotEndTime;
  }
  
  return slots;
}
```

### 1.3 Core Capacity Calculation

- [x] Implement the core capacity calculation algorithm

```javascript
/**
 * Calculate capacity for a specific time slot
 * @param {Object} timeSlot - The time slot
 * @param {Array} stands - The stands data
 * @param {Array} aircraftTypes - The aircraft types data
 * @param {Object} turnaroundRules - Map of aircraft type to turnaround rules
 * @param {Array} adjacencyRules - The stand adjacency rules
 * @param {Number} gapBetweenFlights - Gap between flights in minutes
 * @returns {Object} Capacity for the time slot
 */
calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
  const bestCaseCapacity = {};
  const worstCaseCapacity = {};
  
  // Initialize capacity counters for each aircraft type
  aircraftTypes.forEach(aircraftType => {
    bestCaseCapacity[aircraftType.code] = 0;
    worstCaseCapacity[aircraftType.code] = 0;
  });
  
  // Calculate slot duration in minutes
  const slotStart = new Date(`1970-01-01T${timeSlot.start_time}`);
  const slotEnd = new Date(`1970-01-01T${timeSlot.end_time}`);
  const slotDurationMinutes = (slotEnd - slotStart) / (1000 * 60);
  
  // For each stand
  stands.forEach(stand => {
    // Get base compatible aircraft types for this stand
    const baseCompatibleTypes = stand.compatible_aircraft_types || [];
    
    // Best case: Just use base compatibility
    baseCompatibleTypes.forEach(aircraftTypeCode => {
      const turnaroundRule = turnaroundRules[aircraftTypeCode];
      if (!turnaroundRule) return;
      
      // Calculate how many aircraft of this type can be processed in this time slot
      const totalOccupationTime = turnaroundRule.min_turnaround_minutes + gapBetweenFlights;
      const capacity = Math.floor(slotDurationMinutes / totalOccupationTime);
      
      // Update best case capacity
      bestCaseCapacity[aircraftTypeCode] += capacity;
    });
    
    // Worst case: Consider adjacency restrictions
    let worstCaseCompatibleTypes = [...baseCompatibleTypes];
    
    // Apply most restrictive adjacency rules
    adjacencyRules.forEach(rule => {
      if (rule.affected_stand_id === stand.id) {
        // Apply the most restrictive possible limitation
        if (rule.restriction_type === 'NO_USE_AFFECTED_STAND') {
          worstCaseCompatibleTypes = [];
        } else if (rule.restriction_type === 'MAX_AIRCRAFT_SIZE_REDUCED_TO') {
          // Filter to keep only smaller aircraft
          // This requires knowing size hierarchy of aircraft types
          // For now, just simulating a restriction
          worstCaseCompatibleTypes = worstCaseCompatibleTypes.filter(
            type => restrictedAircraftTypes.includes(type)
          );
        } else if (rule.restriction_type === 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND') {
          worstCaseCompatibleTypes = worstCaseCompatibleTypes.filter(
            type => type !== rule.restricted_to_aircraft_type_or_size
          );
        }
      }
    });
    
    // Calculate worst case capacity
    worstCaseCompatibleTypes.forEach(aircraftTypeCode => {
      const turnaroundRule = turnaroundRules[aircraftTypeCode];
      if (!turnaroundRule) return;
      
      // Calculate how many aircraft of this type can be processed in this time slot
      const totalOccupationTime = turnaroundRule.min_turnaround_minutes + gapBetweenFlights;
      const capacity = Math.floor(slotDurationMinutes / totalOccupationTime);
      
      // Update worst case capacity
      worstCaseCapacity[aircraftTypeCode] += capacity;
    });
  });
  
  return {
    bestCaseCapacity,
    worstCaseCapacity
  };
}
```

## 2. API Implementation

### 2.1 API Routes

- [x] Add routes to `backend/src/routes/capacity.js`

```javascript
const express = require('express');
const router = express.Router();
const standCapacityService = require('../services/standCapacityService');

// Calculate stand capacity
router.get('/stand-capacity', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get capacity by time slot
router.get('/stand-capacity/by-time-slot', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date,
      organizationType: 'timeSlot'
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get capacity by aircraft type
router.get('/stand-capacity/by-aircraft-type', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date,
      organizationType: 'aircraftType'
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 2.2 API Response Format

- [x] Document the API response format

```javascript
// Example response format
{
  // Capacity by time slot
  bestCaseCapacity: {
    "Morning Peak": {
      "B738": 5,
      "A320": 3,
      // Other aircraft types...
    },
    "Afternoon": {
      "B738": 6,
      "A320": 4,
      // Other aircraft types...
    },
    // Other time slots...
  },
  
  // Similar structure for worst case
  worstCaseCapacity: { /* ... */ },
  
  // Time slots used in the calculation
  timeSlots: [
    { id: 1, name: "Morning Peak", start_time: "06:00:00", end_time: "09:00:00" },
    { id: 3, name: "Afternoon", start_time: "12:00:00", end_time: "15:00:00" },
    // Other time slots...
  ],
  
  // Metadata about the calculation
  metadata: {
    calculatedAt: "2025-05-09T22:30:00.000Z",
    operationalSettings: {
      default_gap_minutes: 15,
      operating_start_time: "06:00:00",
      operating_end_time: "23:59:59",
      slot_duration_minutes: 10
    },
    stands: {
      total: 10,
      filtered: 5 // If standIds filter was applied
    },
    aircraftTypes: {
      total: 8
    }
  }
}
```

## 3. Data Requirements

### 3.1 Required Data Models

- [x] Verify the following models exist and contain required fields:

#### Stand Model
```javascript
{
  id: Number,
  code: String,
  pier_id: Number,
  terminal_id: Number,
  compatible_aircraft_types: Array, // Array of aircraft type codes
  is_active: Boolean
}
```

#### Aircraft Type Model
```javascript
{
  id: Number,
  code: String,
  name: String,
  size_category: String, // e.g., "Code C", "Code E"
  wingspan: Number,
  length: Number,
  is_active: Boolean
}
```

#### Turnaround Rule Model
```javascript
{
  id: Number,
  aircraft_type_id: Number,
  min_turnaround_minutes: Number,
  is_active: Boolean
}
```

#### Stand Adjacency Rule Model
```javascript
{
  id: Number,
  primary_stand_id: Number,
  aircraft_type_trigger: String, // Aircraft type or size category
  affected_stand_id: Number,
  restriction_type: String, // One of predefined restriction types
  restricted_to_aircraft_type_or_size: String, // If applicable
  notes: String,
  is_active: Boolean
}
```

#### Time Slot Model
```javascript
{
  id: Number,
  name: String,
  start_time: String, // HH:MM:SS
  end_time: String, // HH:MM:SS
  description: String,
  is_active: Boolean
}
```

### 3.2 Data Retrieval Methods

- [x] Implement data retrieval methods in the stand capacity service:

```javascript
/**
 * Get operational settings
 * @returns {Promise<Object>} Operational settings
 */
async getOperationalSettings() {
  return OperationalSettings.getSettings();
}

/**
 * Get stand data, optionally filtered by IDs
 * @param {Array} standIds - Optional stand IDs to filter by
 * @returns {Promise<Array>} Array of stand objects
 */
async getStandData(standIds) {
  let query = Stand.query().where('is_active', true);
  
  if (standIds && standIds.length > 0) {
    query = query.whereIn('id', standIds);
  }
  
  return query;
}

/**
 * Get aircraft type data
 * @returns {Promise<Array>} Array of aircraft type objects
 */
async getAircraftTypeData() {
  return AircraftType.query().where('is_active', true);
}

/**
 * Get turnaround rules for each aircraft type
 * @returns {Promise<Object>} Map of aircraft type code to turnaround rule
 */
async getTurnaroundRules() {
  const rules = await TurnaroundRule.query()
    .withGraphFetched('aircraftType')
    .where('is_active', true);
    
  // Convert to map for easier lookup
  const rulesMap = {};
  rules.forEach(rule => {
    if (rule.aircraftType) {
      rulesMap[rule.aircraftType.code] = rule;
    }
  });
  
  return rulesMap;
}

/**
 * Get stand adjacency rules
 * @returns {Promise<Array>} Array of stand adjacency rule objects
 */
async getStandAdjacencyRules() {
  return StandAdjacencyRule.query().where('is_active', true);
}

/**
 * Get defined time slots, optionally filtered by IDs
 * @param {Array} timeSlotIds - Optional time slot IDs to filter by
 * @returns {Promise<Array>} Array of time slot objects
 */
async getDefinedTimeSlots(timeSlotIds) {
  let query = TimeSlot.query().where('is_active', true);
  
  if (timeSlotIds && timeSlotIds.length > 0) {
    query = query.whereIn('id', timeSlotIds);
  }
  
  return query.orderBy('start_time');
}
```

## 4. Unit Tests

### 4.1 Test Cases

- [ ] Create unit tests for the Stand Capacity Service:

```javascript
// backend/tests/services/standCapacityService.test.js
const standCapacityService = require('../../src/services/standCapacityService');
const OperationalSettings = require('../../src/models/OperationalSettings');
const Stand = require('../../src/models/Stand');
const AircraftType = require('../../src/models/AircraftType');
const TurnaroundRule = require('../../src/models/TurnaroundRule');
const StandAdjacencyRule = require('../../src/models/StandAdjacencyRule');
const TimeSlot = require('../../src/models/TimeSlot');

// Mock the models
jest.mock('../../src/models/OperationalSettings');
jest.mock('../../src/models/Stand');
jest.mock('../../src/models/AircraftType');
jest.mock('../../src/models/TurnaroundRule');
jest.mock('../../src/models/StandAdjacencyRule');
jest.mock('../../src/models/TimeSlot');

describe('StandCapacityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock data
    // ... (mock implementation for each method)
  });
  
  test('should generate time slots correctly from operational settings', () => {
    // Test time slot generation logic
  });
  
  test('should calculate capacity for a specific time slot', () => {
    // Test capacity calculation for a single time slot
  });
  
  test('should calculate overall capacity correctly', async () => {
    // Test overall capacity calculation
  });
  
  test('should handle different organization types', async () => {
    // Test capacity calculation with different organization options
  });
  
  test('should handle filtering by stand IDs', async () => {
    // Test stand filtering
  });
  
  test('should handle filtering by time slot IDs', async () => {
    // Test time slot filtering
  });
  
  test('should handle edge cases', async () => {
    // Test with no stands, no aircraft types, etc.
  });
});
```

## 5. Integration Points

### 5.1 Integration with Existing Features

- [x] Integrate with the Time Slots feature
- [x] Integrate with the Operational Settings feature
- [x] Integrate with the Stand Management feature
- [x] Integrate with the Aircraft Types feature
- [x] Integrate with the Turnaround Rules feature

## 6. Optimization Considerations

- [ ] Consider caching results for performance
- [ ] Implement pagination for large datasets
- [ ] Add monitoring for API performance
- [ ] Consider background processing for complex calculations 