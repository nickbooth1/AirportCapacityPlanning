# Standard Case Capacity: Technical Documentation

## Overview

The Stand Capacity Tool now includes three distinct capacity calculation scenarios:

1. **Best Case Capacity**: Theoretical maximum capacity without considering adjacency restrictions.
2. **Standard Case Capacity**: Simple count of how many flights all stands can accommodate per time slot, ignoring adjacency information.
3. **Worst Case Capacity**: Most restrictive scenario where all possible adjacency restrictions are applied.

This document explains the technical implementation details of the standard case calculation.

## Implementation Details

### Data Model

The `CapacityResult` class has been enhanced to support standard case capacity:

```javascript
class CapacityResult {
  constructor() {
    this.bestCaseCapacity = new Map();
    this.standardCaseCapacity = new Map(); // New map for standard case
    this.worstCaseCapacity = new Map();
    // other properties...
  }
}
```

### Calculation Logic

The standard case calculation uses the same compatible aircraft types as the best case, ignoring any adjacency restrictions. 

In the `calculateCapacityForTimeSlot` method of the `StandCapacityService`:

```javascript
// Best case and standard case use the same compatible types
baseCompatibleTypes.forEach(aircraftTypeCode => {
  // Calculate capacity...
  
  // Update best case capacity
  bestCaseCapacity[aircraftTypeCode] += capacity;
  
  // Standard case is the same as best case (ignoring adjacency)
  standardCaseCapacity[aircraftTypeCode] += capacity;
});
```

In the `CapacityCalculator` class, the standard case is explicitly calculated:

```javascript
// For each stand, calculate capacity
this.stands.forEach(stand => {
  // Process best case (no adjacency restrictions)
  this._processStandCapacity(stand, stand.baseCompatibleAircraftTypeIDs, slot, result, 'best');
  
  // Process standard case (ignoring adjacency information)
  this._processStandCapacity(stand, stand.baseCompatibleAircraftTypeIDs, slot, result, 'standard');
  
  // Process worst case (with adjacency restrictions)
  const worstCaseCompatibleTypes = this._getWorstCaseCompatibleTypes(stand);
  this._processStandCapacity(stand, worstCaseCompatibleTypes, slot, result, 'worst');
});
```

### API Response

The API response now includes standard case capacity alongside best and worst case capacities:

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

## Frontend Implementation

The frontend has been enhanced with a new tab for standard case capacity:

```jsx
<Tabs 
  value={tabValue} 
  onChange={handleTabChange} 
  aria-label="capacity results tabs"
>
  <Tab label="Best Case Capacity" />
  <Tab label="Standard Case Capacity" />
  <Tab label="Worst Case Capacity" />
</Tabs>
```

The CSV export function now includes data for all three capacity scenarios:

```javascript
// Create CSV content
let csv = 'Best Case Capacity\n';
csv += headers.join(',') + '\n';
csv += bestCaseRows.map(row => row.join(',')).join('\n');
csv += '\n\nStandard Case Capacity\n';
csv += headers.join(',') + '\n';
csv += standardCaseRows.map(row => row.join(',')).join('\n');
csv += '\n\nWorst Case Capacity\n';
csv += headers.join(',') + '\n';
csv += worstCaseRows.map(row => row.join(',')).join('\n');
```

## Relation Between Cases

The relationship between the three capacity scenarios:

1. **Best Case** = **Standard Case**: Both ignore adjacency restrictions and provide the theoretical maximum capacity. The standard case is included as a distinct concept to allow for future implementation of additional factors.

2. **Standard Case** ≥ **Worst Case**: The worst case includes all adjacency restrictions, which can only reduce capacity, never increase it.

## Testing

The implementation has been verified with comprehensive testing:

### Mock-Based Tests
Mock-based tests confirmed:
1. Standard case capacity equals best case capacity
2. Worst case capacity is less than or equal to standard case capacity

### Database Tests
We also created database-based tests that:
1. Create test data with realistic schema
2. Execute the capacity calculator against actual database data
3. Verify that standard case equals best case in real-world scenarios

To run the database test:
```bash
cd docs/plans/tests
node test-standard-case-with-db.js
```

The database test required several adjustments to match the production database schema:
- Adding missing columns (e.g., `is_active` in tables)
- Removing non-existent columns (e.g., `notes` in stand_adjacencies)
- Using correct enum values for constraint fields
- Properly handling database-specific uniqueness constraints

These tests verify that the standard case calculation works correctly with real database data, providing confidence that the implementation will work as expected in production.

## Future Enhancements

In future versions, the standard case could be enhanced to consider additional factors beyond adjacency restrictions, such as:

1. Operational constraints like staff availability
2. Ground handling equipment limitations
3. Passenger processing capacity

These enhancements would make the standard case a distinct middle ground between best and worst cases. 