# Stand Adjacency Feature: Technical Documentation

## Architecture Overview

The Stand Adjacency feature is implemented as part of the capacity calculation system. It extends the calculation logic to consider how adjacency rules affect stand utilization and capacity.

## Data Model

### Stand Adjacency Rule

The `stand_adjacencies` table in the database stores the adjacency rules with the following key fields:

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| stand_id | Integer | ID of the primary stand that, when occupied, affects another stand |
| adjacent_stand_id | Integer | ID of the stand that is affected by the primary stand's occupation |
| impact_direction | String | Spatial relationship (left, right, behind, front, other) |
| restriction_type | String | Type of restriction (no_use, size_limited, aircraft_type_limited) |
| max_aircraft_size_code | String | Maximum aircraft size code allowed (for size_limited restriction) |
| restriction_details | Text | JSON string containing detailed restrictions (for aircraft_type_limited) |
| is_active | Boolean | Whether the rule is currently active |

## Implementation Details

### Core Components

The adjacency calculation is implemented across several key components:

1. **StandAdjacencyRule Model**: Defines the database schema and relationships
2. **StandCapacityService**: Provides methods to retrieve and process adjacency rules
3. **CapacityCalculator**: Applies adjacency rules to capacity calculations

### Capacity Calculation Algorithm

The capacity calculator follows these steps:

1. Calculate the **Best Case** capacity:
   - For each stand, determine base compatible aircraft types
   - Calculate how many aircraft of each type can be processed in each time slot
   - Sum up the total capacity across all stands

2. Calculate the **Worst Case** capacity:
   - For each stand, apply adjacency rules to determine restricted compatible types
   - Apply the same capacity calculation as best case, but with restricted types
   - Sum up the total capacity across all stands with adjacency constraints applied

### Key Methods

#### `_getCompatibleTypesWithAdjacency`

This method applies adjacency rules to determine which aircraft types can use a stand when considering adjacency constraints:

```javascript
_getCompatibleTypesWithAdjacency(stand, baseCompatibleTypes, adjacencyRules) {
  // Get rules affecting this stand
  const applicableRules = adjacencyRules.filter(rule => 
    rule.adjacent_stand_id === stand.id && rule.is_active);
  
  // Handle each type of restriction:
  // - No use: stand cannot be used at all
  // - Size limited: only aircraft up to a certain size can use the stand
  // - Aircraft type limited: specific aircraft types cannot use the stand
  
  // Return the filtered list of compatible types
}
```

#### `_filterTypesByMaxSize`

This helper method filters aircraft types based on a maximum size category:

```javascript
_filterTypesByMaxSize(types, maxSizeCode) {
  // Size hierarchy from smallest to largest
  const sizeHierarchy = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Filter to only include types that are equal or smaller than max size
  return types.filter(typeCode => {
    const aircraftType = // Get aircraft type by code
    const typeSizeIndex = // Get index in size hierarchy
    return typeSizeIndex <= maxSizeIndex; // Keep if smaller or equal
  });
}
```

#### `calculateCapacityForTimeSlot`

This method calculates both best case and worst case capacity for a specific time slot:

```javascript
calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
  // Initialize capacity structures
  
  // For each stand
  stands.forEach(stand => {
    // Get base compatible types
    const baseCompatibleTypes = this._getCompatibleAircraftTypes(stand, aircraftTypes);
    
    // Best case: No adjacency constraints
    // Calculate capacity for each aircraft type
    
    // Worst case: With adjacency restrictions
    const worstCaseCompatibleTypes = this._getCompatibleTypesWithAdjacency(
      stand, baseCompatibleTypes, adjacencyRules
    );
    
    // Calculate capacity for each aircraft type with restrictions
  });
  
  // Return the combined results
}
```

## Error Handling

The implementation includes robust error handling:

1. **JSON Parsing**: Safe handling of JSON string fields to prevent parsing errors
2. **Null Checks**: Guards against null/undefined fields and properties
3. **Logging**: Comprehensive logging of adjacency rule application for debugging

## Performance Considerations

To maintain good performance with adjacency rules:

1. **Adjacency Rule Indexing**: Rules are indexed by affected stand ID for faster lookup
2. **Caching**: Aircraft type information is cached to reduce database queries
3. **Efficient Filtering**: Optimized filtering of aircraft types based on adjacency rules

## Testing

The implementation includes comprehensive tests to verify:

1. Base functionality with no adjacency rules
2. "No use" adjacency rules correctly prevent stand usage
3. Size limitation adjacency rules correctly restrict aircraft types
4. Aircraft type-specific restrictions are properly applied

## Example Scenarios

### Example 1: No Use Restriction

When Stand A1 is occupied, Stand A2 cannot be used at all:

```javascript
{
  stand_id: 1, // A1
  adjacent_stand_id: 2, // A2
  impact_direction: 'right',
  restriction_type: 'no_use',
  is_active: true
}
```

### Example 2: Size Limited Restriction

When Stand A1 is occupied, Stand A2 can only accommodate aircraft up to size category 'C' (narrow body):

```javascript
{
  stand_id: 1, // A1
  adjacent_stand_id: 2, // A2
  impact_direction: 'right',
  restriction_type: 'size_limited',
  max_aircraft_size_code: 'C',
  is_active: true
}
```

### Example 3: Aircraft Type Limited Restriction

When Stand A1 is occupied, Stand A2 cannot accommodate A388 aircraft:

```javascript
{
  stand_id: 1, // A1
  adjacent_stand_id: 2, // A2
  impact_direction: 'right',
  restriction_type: 'aircraft_type_limited',
  restriction_details: '["A388"]',
  is_active: true
}
``` 