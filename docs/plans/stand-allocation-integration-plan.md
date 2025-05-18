# Stand Allocation Tool Integration Plan

## Overview
This document outlines the detailed implementation plan for integrating the currently isolated Stand Allocation Tool with the rest of the Airport Capacity Planner system. The integration will enable seamless processing of validated flight schedules through stand allocation, visualization of results, and comprehensive reporting.

## Current State
1. The Stand Allocation Tool functions primarily as a CLI-based prototype
2. Flight data must be manually converted to a compatible JSON format
3. No direct connection with the flight upload and validation processes
4. Output results are not stored in the database or visualized in the UI
5. Users must use separate tools for each step of the workflow

## Integration Goals
1. Create a seamless end-to-end workflow from upload to allocation
2. Build a RESTful API wrapper around the stand allocation algorithm
3. Develop a modern UI for allocation results visualization
4. Implement database storage for allocation results and metrics
5. Enable performance monitoring and optimization

## Phase 1: Core Integration Infrastructure (Days 1-7)

### 1.1 Data Model Extension (Days 1-2)
- [ ] Create database migrations for new tables:
  - [ ] `stand_allocations` - Store stand assignments for flights
  - [ ] `allocation_runs` - Track allocation algorithm runs
  - [ ] `allocation_metrics` - Store performance metrics
  - [ ] `allocation_issues` - Track unallocated flights and conflicts
  - [ ] `stand_utilization` - Store stand utilization statistics
- [ ] Define relationships between existing models and new allocation models
- [ ] Create Objection.js model classes for each new table
- [ ] Implement model validation rules

### 1.2 Stand Allocation Service (Days 3-4)
- [ ] Create `StandAllocationService.js` with core methods:
  - [ ] `prepareAllocationData(flightIds)` - Format flight data for the algorithm
  - [ ] `runAllocation(allocationData, options)` - Execute the allocation algorithm
  - [ ] `processAllocationResults(results)` - Process and store results
  - [ ] `generateAllocationMetrics(allocationId)` - Calculate utilization metrics
  - [ ] `getAllocationSummary(allocationId)` - Generate summary statistics
- [ ] Add proper error handling and logging

### 1.3 Algorithm Integration (Days 5-6)
- [ ] Create wrapper for the Stand Allocation Algorithm:
  - [ ] `StandAllocationAlgorithm.js` - Adapter for the core algorithm
  - [ ] `StandAllocationConfig.js` - Configuration manager
  - [ ] Add support for running the algorithm directly vs. via CLI
  - [ ] Implement result parsing and standardization
  - [ ] Add performance tracking and logging

### 1.4 API Endpoints (Day 7)
- [ ] Create RESTful API endpoints in `AllocationController.js`:
  - [ ] `POST /api/allocations` - Start a new allocation run
  - [ ] `GET /api/allocations/:id` - Get allocation results
  - [ ] `GET /api/allocations/:id/metrics` - Get performance metrics
  - [ ] `GET /api/allocations/:id/issues` - Get allocation issues
  - [ ] `GET /api/allocations/:id/stand-utilization` - Get stand utilization
  - [ ] `GET /api/allocations/:id/export` - Export allocation results

## Phase 2: User Interface Development (Days 8-14)

### 2.1 API Client Implementation (Day 8)
- [ ] Add allocation methods to the API client:
  - [ ] `runAllocation(flightScheduleId, options)`
  - [ ] `getAllocationResults(allocationId)`
  - [ ] `getAllocationMetrics(allocationId)`
  - [ ] `getAllocationIssues(allocationId)`
  - [ ] `getStandUtilization(allocationId)`
  - [ ] `exportAllocationResults(allocationId, format)`

### 2.2 Flight Schedule Upload Integration (Days 9-10)
- [ ] Enhance the flight upload workflow:
  - [ ] Add an option to run stand allocation after validation
  - [ ] Create allocation configuration panel
  - [ ] Add allocation status tracking
  - [ ] Implement navigation to allocation results
  - [ ] Add support for scheduling allocations for later

### 2.3 Allocation Results Page (Days 11-12)
- [ ] Create `AllocationResultsPage.js` with the following components:
  - [ ] Allocation summary panel with key statistics
  - [ ] Allocated flights data table with filtering and search
  - [ ] Unallocated flights table with reasons
  - [ ] Time-based visualization of stand occupancy
  - [ ] Export functionality for allocation results

### 2.4 Stand Utilization Visualization (Days 13-14)
- [ ] Create visualization components:
  - [ ] `StandTimelineChart.js` - Timeline view of stand usage
  - [ ] `UtilizationHeatmapChart.js` - Heatmap of stand utilization
  - [ ] `AllocationSummaryCharts.js` - Pie/bar charts of key metrics
  - [ ] `StandConflictVisualizer.js` - Visualization of allocation conflicts
  - [ ] Add interactive features (zooming, filtering, tooltips)

## Phase 3: Advanced Features & Optimization (Days 15-21)

### 3.1 Manual Allocation Adjustments (Days 15-16)
- [ ] Implement manual adjustment capabilities:
  - [ ] Create `ManualAllocationEditor.js` component
  - [ ] Add drag-and-drop interface for reassigning flights
  - [ ] Implement validation of manual changes
  - [ ] Add conflict detection and resolution suggestions
  - [ ] Create API endpoints for saving manual adjustments

### 3.2 Performance Optimization (Days 17-18)
- [ ] Implement performance enhancements:
  - [ ] Add caching for allocation results
  - [ ] Implement parallel processing for large datasets
  - [ ] Add background processing with notifications
  - [ ] Optimize database queries for allocation data
  - [ ] Implement incremental updates for partial re-allocation

### 3.3 Advanced Allocation Options (Days 19-20)
- [ ] Add advanced configuration options:
  - [ ] Prioritization settings for airlines/aircraft types
  - [ ] Rule-based allocation preferences
  - [ ] Optimization targets (minimize walking distance, maximize utilization)
  - [ ] Time window constraints
  - [ ] Gate and ground handling resource constraints

### 3.4 Reporting & Analytics (Day 21)
- [ ] Implement reporting features:
  - [ ] Create PDF/Excel export of allocation results
  - [ ] Add comparative analysis with previous allocations
  - [ ] Implement KPI dashboard for allocation quality
  - [ ] Add resource utilization analytics
  - [ ] Create automated allocation recommendations

## Phase 4: Testing & Deployment (Days 22-28)

### 4.1 Unit & Integration Testing (Days 22-24)
- [ ] Develop comprehensive test suite:
  - [ ] Unit tests for allocation service methods
  - [ ] API endpoint tests
  - [ ] Frontend component tests
  - [ ] End-to-end workflow tests
  - [ ] Performance benchmarks with various dataset sizes

### 4.2 User Acceptance Testing (Days 25-26)
- [ ] Conduct UAT with stakeholders:
  - [ ] Prepare test scenarios and data
  - [ ] Document test procedures
  - [ ] Collect and address feedback
  - [ ] Verify all requirements are met
  - [ ] Identify potential future enhancements

### 4.3 Documentation & Training (Day 27)
- [ ] Create documentation:
  - [ ] User guide for allocation features
  - [ ] API documentation for developers
  - [ ] System architecture documentation
  - [ ] Create training materials
  - [ ] Record tutorial videos

### 4.4 Deployment Planning (Day 28)
- [ ] Prepare for deployment:
  - [ ] Create deployment checklist
  - [ ] Configure staging environment
  - [ ] Plan database migrations
  - [ ] Create rollback procedures
  - [ ] Set up monitoring for new components

## Implementation Details

### Database Schema

```sql
-- Allocation runs table
CREATE TABLE allocation_runs (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER REFERENCES flight_uploads(id),
  status VARCHAR(50) NOT NULL,
  algorithm_version VARCHAR(50),
  configuration JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stand allocations table
CREATE TABLE stand_allocations (
  id SERIAL PRIMARY KEY,
  allocation_run_id INTEGER REFERENCES allocation_runs(id),
  flight_id INTEGER REFERENCES flights(id),
  stand_id INTEGER REFERENCES stands(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_manual BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Allocation issues table
CREATE TABLE allocation_issues (
  id SERIAL PRIMARY KEY,
  allocation_run_id INTEGER REFERENCES allocation_runs(id),
  flight_id INTEGER REFERENCES flights(id),
  issue_type VARCHAR(50) NOT NULL,
  issue_description TEXT,
  severity VARCHAR(20),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stand utilization metrics
CREATE TABLE stand_utilization (
  id SERIAL PRIMARY KEY,
  allocation_run_id INTEGER REFERENCES allocation_runs(id),
  stand_id INTEGER REFERENCES stands(id),
  date_hour TIMESTAMP,
  utilization_percentage NUMERIC(5,2),
  allocated_minutes INTEGER,
  allocation_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```javascript
// Allocation endpoints
router.post('/api/allocations', allocationController.createAllocation);
router.get('/api/allocations/:id', allocationController.getAllocation);
router.get('/api/allocations/:id/metrics', allocationController.getAllocationMetrics);
router.get('/api/allocations/:id/issues', allocationController.getAllocationIssues);
router.get('/api/allocations/:id/stand-utilization', allocationController.getStandUtilization);
router.get('/api/allocations/:id/export/:format', allocationController.exportAllocation);

// Manual adjustment endpoints
router.post('/api/allocations/:id/manual-adjustments', allocationController.createManualAdjustment);
router.put('/api/allocations/:id/manual-adjustments/:adjustmentId', allocationController.updateManualAdjustment);
router.delete('/api/allocations/:id/manual-adjustments/:adjustmentId', allocationController.deleteManualAdjustment);

// Analysis endpoints
router.get('/api/allocations/:id/analysis', allocationController.getAllocationAnalysis);
router.get('/api/allocations/compare', allocationController.compareAllocations);
```

### Frontend Component Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── allocation/
│   │   │   ├── AllocationSummary.js
│   │   │   ├── AllocationTable.js
│   │   │   ├── StandTimelineChart.js
│   │   │   ├── UtilizationHeatmap.js
│   │   │   ├── UnallocatedFlightsTable.js
│   │   │   ├── ManualAllocationEditor.js
│   │   │   └── AllocationConfigPanel.js
│   │   └── common/
│   │       ├── DataTable.js
│   │       ├── TimelineView.js
│   │       ├── HeatmapChart.js
│   │       └── ExportPanel.js
│   ├── pages/
│   │   ├── flights/
│   │   │   └── allocation-results.js
│   │   └── upload/
│   │       └── index.js (updated)
│   ├── api/
│   │   └── allocationApi.js
│   └── contexts/
│       └── AllocationContext.js
```

## Integration Points

### 1. Upload Workflow Integration

The upload process will be enhanced to include an optional stand allocation step:

```javascript
// In UploadWorkflow.js
const [shouldRunAllocation, setShouldRunAllocation] = useState(false);
const [allocationOptions, setAllocationOptions] = useState({
  prioritizeWideBodies: true,
  respectAirlinePreferences: true,
  optimizeForWalkingDistance: false
});

// After successful validation
if (shouldRunAllocation) {
  const allocationId = await api.runAllocation(uploadId, allocationOptions);
  navigateToAllocationResults(allocationId);
}
```

### 2. Stand Allocation Algorithm Integration

The algorithm will be integrated through a wrapper class that allows both direct and CLI execution:

```javascript
// In StandAllocationAlgorithm.js
class StandAllocationAlgorithm {
  constructor(config) {
    this.config = config;
  }
  
  async allocate(flightData, standData, options) {
    if (this.config.useDirectExecution) {
      // Direct execution
      return this._directExecution(flightData, standData, options);
    } else {
      // CLI execution
      return this._cliExecution(flightData, standData, options);
    }
  }
  
  // Private methods for execution strategies
  async _directExecution(flightData, standData, options) {
    // Direct JavaScript execution
    const engine = new StandAllocationEngine(flightData, standData, options);
    return engine.runAllocation();
  }
  
  async _cliExecution(flightData, standData, options) {
    // Write data to temp files
    // Execute CLI command
    // Parse output files
    // Return results
  }
}
```

### 3. Database Integration

Allocation results will be saved to the database for persistence and future analysis:

```javascript
// In StandAllocationService.js
async processAllocationResults(allocationId, results) {
  // Start transaction
  const trx = await transaction.start(this.knex);
  
  try {
    // Update allocation run status
    await trx('allocation_runs')
      .where({ id: allocationId })
      .update({ 
        status: 'completed',
        completed_at: new Date()
      });
    
    // Insert stand allocations
    const allocations = results.allocatedFlights.map(flight => ({
      allocation_run_id: allocationId,
      flight_id: flight.flightId,
      stand_id: flight.assignedStandId,
      start_time: flight.startTime,
      end_time: flight.endTime
    }));
    
    await trx('stand_allocations').insert(allocations);
    
    // Insert allocation issues
    const issues = results.unallocatedFlights.map(flight => ({
      allocation_run_id: allocationId,
      flight_id: flight.flightId,
      issue_type: 'unallocated',
      issue_description: flight.reason,
      severity: 'high'
    }));
    
    await trx('allocation_issues').insert(issues);
    
    // Calculate and insert utilization metrics
    const metrics = this._calculateUtilizationMetrics(allocationId, results);
    await trx('stand_utilization').insert(metrics);
    
    // Commit transaction
    await trx.commit();
    
    return { success: true, allocationId };
  } catch (error) {
    // Rollback transaction on error
    await trx.rollback();
    throw error;
  }
}
```

## Risk Assessment

### 1. Algorithm Performance
- **Risk**: The algorithm may not scale efficiently for large flight schedules
- **Mitigation**: Implement incremental processing, background jobs, and progress tracking

### 2. Data Format Compatibility
- **Risk**: Mismatches between flight data format and algorithm expectations
- **Mitigation**: Create robust data transformation layer with validation

### 3. User Interface Complexity
- **Risk**: Complex allocation results may be difficult to visualize effectively
- **Mitigation**: Focus on clear, interactive visualizations with multiple view options

### 4. Dependency Management
- **Risk**: Changes to related components may affect allocation functionality
- **Mitigation**: Create clear interfaces and minimize coupling between components

### 5. Performance Bottlenecks
- **Risk**: Database operations for large allocations may cause performance issues
- **Mitigation**: Optimize database schema, implement caching, and use pagination for results

## Success Criteria

1. Flight schedules can be uploaded, validated, and allocated in a single workflow
2. Stand allocation results are visually displayed with comprehensive metrics
3. Unallocated flights are clearly identified with reasons
4. Manual adjustments to allocations are supported with conflict detection
5. Export functionality for allocation results is available in multiple formats
6. System can handle large flight schedules (1000+ flights) with reasonable performance

## Conclusion

This implementation plan provides a comprehensive approach to integrating the Stand Allocation Tool with the rest of the Airport Capacity Planner system. By following this phased approach, the development team can systematically build a seamless, end-to-end workflow for flight schedule processing, stand allocation, and results visualization. The plan addresses current limitations while adding significant new functionality and ensuring proper integration with existing components. 