# Stand Allocation Tool

## Overview
The Stand Allocation Tool is a critical component of the Airport Capacity Planner that enables airport operators to efficiently allocate aircraft to appropriate stands based on various constraints and optimization criteria. This tool provides both automated allocation functionality and detailed visualization of stand utilization.

## Key Features

### 1. Flight Allocation Engine
- **Input**: Flight schedules (from Upload Tool), stand configuration, constraints
- **Output**: Optimized allocation of flights to stands
- **Processing**: Multi-criteria allocation algorithm that respects operational constraints

### 2. Visualization Components
- **Stand Timeline Gantt Chart**: Horizontal timeline with stands listed vertically on the left
- **Utilization Dashboard**: Analytics on stand utilization rates and efficiency
- **Allocation Conflict Resolution**: Interface for resolving allocation conflicts

### 3. Analytics & Reporting
- **Stand Utilization Reports**: Percentage utilization by stand, terminal, and time period
- **Capacity Analysis**: Identifying peak demand periods and bottlenecks
- **Optimization Opportunities**: Suggestions for improving stand allocation efficiency

## Allocation Algorithm

### Allocation Criteria (in priority order)
1. **Airline Terminal Assignment**: Primary filter based on airline operating terminal
2. **Aircraft Size Compatibility**: Ensures aircraft fits the stand dimensions
3. **Terminal/Pier Constraints**: Respects terminal and pier allocation rules
4. **Stand Adjacency Restrictions**: Accounts for stands that cannot be used simultaneously
5. **Maintenance Blocks**: Avoids scheduled maintenance periods
6. **Airline Preferences**: Considers airline-specific stand preferences
7. **Buffer Times**: Adds configurable buffer between flights
8. **Aircraft Turnaround Requirements**: Ensures sufficient time for servicing
9. **Minimize Towing**: Groups flights with same aircraft registration

### Adjacency Handling
The algorithm accounts for stand adjacency constraints where the use of one stand may restrict the usage of neighboring stands:
- **Impact Types**: No-use, size limitation, aircraft type limitation
- **Direction**: Left, right, behind, front
- **Time-based Restriction**: Applies constraints only during actual occupation

## User Interface Components

### 1. Configuration Panel
- **Date Range Selection**: Set allocation period
- **Flight Schedule Selection**: Choose upload ID to allocate
- **Allocation Rules Configuration**: Customize priority rules
- **Constraint Controls**: Toggle various constraints on/off

### 2. Results Panel
- **Allocation Summary**: Statistics on allocated/unallocated flights
- **Allocated Flights Table**: Detailed view of all allocations
- **Unallocated Flights Table**: Flights that couldn't be allocated with reasons

### 3. Stand Timeline (Gantt Chart)
- **Vertical Axis**: Stands listed by terminal and pier
- **Horizontal Axis**: Time (hours/days)
- **Allocation Blocks**: Color-coded by flight type (arrival/departure)
- **Interactive Controls**: Zoom, pan, day navigation
- **Details on Hover**: Shows flight information on mouseover
- **Conflict Highlighting**: Visual indicators for potential issues

### 4. Utilization Analysis
- **Stand Utilization Chart**: Bar/pie charts showing utilization percentages
- **Terminal Utilization**: Aggregated metrics by terminal
- **Peak Period Analysis**: Identification of high-demand periods
- **Underutilized Resources**: Highlighting stands with low utilization

## Technical Implementation

### Backend Components
- **StandAllocationService**: Core service handling allocation logic
- **StandAllocationController**: API endpoints for allocation operations
- **AirlineTerminalMappingService**: Service to manage airline terminal assignments
- **StandAdjacencyService**: Service to manage stand adjacency constraints
- **AllocationMetricsService**: Service to calculate utilization metrics

### API Endpoints
- `POST /api/stand-allocation/allocate`: Run allocation with given parameters
- `GET /api/stand-allocation/results`: Get allocation results
- `GET /api/stand-allocation/metrics`: Get utilization metrics
- `GET /api/airline-terminal-mappings`: Get airline terminal mappings
- `GET /api/stand-adjacencies`: Get stand adjacency constraints

### Frontend Components
- **StandAllocator**: Main component for the allocation tool
- **AllocationConfigForm**: Form for allocation configuration
- **StandTimelineGantt**: Gantt chart visualization component
- **StandUtilizationChart**: Chart component for utilization metrics
- **AllocationResultsTables**: Tabular display of allocation results

## Database Schema Extensions

### Airline Terminal Mappings Table
```
CREATE TABLE airline_terminal_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_iata VARCHAR NOT NULL,
  terminal_code VARCHAR NOT NULL,
  is_default BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (airline_iata) REFERENCES airlines(iata_code),
  FOREIGN KEY (terminal_code) REFERENCES terminals(code),
  UNIQUE(airline_iata, terminal_code)
);
```

### Stand Allocations Table
```
CREATE TABLE stand_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER NOT NULL,
  stand_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'allocated',
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
  FOREIGN KEY (stand_id) REFERENCES stands(id) ON DELETE CASCADE
);
```

## Integration Points

### Input Integration
- **Flight Upload Tool**: Receives flight data from the Upload Tool
- **Airport Configuration**: Gets stand, terminal, and pier configuration
- **Aircraft Registry**: Obtains aircraft specifications

### Output Integration
- **Capacity Analysis Dashboard**: Provides utilization data
- **Flight Information Display**: Shares stand allocation information
- **Resource Planning**: Helps optimize stand usage and planning

## User Stories

1. **Airport Operator**: "I want to automatically allocate flights to appropriate stands based on our operational constraints so that I can efficiently manage airport resources."

2. **Capacity Planner**: "I need to analyze stand utilization over time to identify bottlenecks and make informed decisions about infrastructure improvements."

3. **Terminal Manager**: "I need to ensure airlines are allocated to their designated terminals while maximizing stand utilization efficiency."

4. **Operations Analyst**: "I want to perform what-if scenarios with different allocation rules to optimize our stand allocation strategy."

5. **Ground Handler**: "I need to know which stands are allocated to which flights so I can plan equipment and staff positioning."

## Future Enhancements

1. **Machine Learning Optimization**: Use historical data to improve allocation efficiency
2. **Real-time Reallocation**: Adjust allocations based on flight delays and operational changes
3. **Multi-objective Optimization**: Balance multiple competing objectives (passenger walking distance, airline preferences, etc.)
4. **Collaborative Decision Making**: Interface for stakeholders to negotiate allocation conflicts
5. **3D Visualization**: Enhanced visualization of the airport layout with allocation overlays

## Implementation Plan

### Phase 1: Core Functionality
- Implement basic allocation algorithm
- Create stand timeline visualization
- Develop configuration interface

### Phase 2: Advanced Features
- Add adjacency constraint handling
- Implement utilization analytics
- Develop airline terminal mapping management

### Phase 3: Optimization & Integration
- Enhance algorithm with additional optimization criteria
- Integrate with real-time flight data
- Add what-if scenario capabilities
