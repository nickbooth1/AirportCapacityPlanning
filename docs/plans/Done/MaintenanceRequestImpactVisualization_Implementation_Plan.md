# Maintenance Request Impact Visualization Implementation Plan

This document outlines the tasks required to implement the maintenance request impact visualization feature, which will allow users to visualize the impact of maintenance requests on stand capacity.

## Overview

The feature will enhance the maintenance request approval process by providing clear visualizations and explanations of how each maintenance request affects airport stand capacity. When a user views a maintenance request, they will see both a textual description and graphical representation of the capacity impact.

## Implementation Tasks

### 1. Backend Development

#### 1.1 Capacity Impact Calculation Service

- [x] **Enhance MaintenanceCapacityIntegrationService**
  - [x] Add method to retrieve baseline capacity without maintenance
  - [x] Add method to calculate capacity with maintenance request's impact
  - [x] Implement differential analysis logic (comparing before/after)
  - [x] Create data structure for impact summary metrics (total reduction, peak impact periods)

- [x] **Create Impact Data Model**
  - [x] Define data structure for capacity impact results
  - [x] Include fields for baseline capacity, reduced capacity, and differential
  - [x] Add metadata for time periods and affected aircraft types

#### 1.2 API Endpoints

- [x] **Add new endpoint in MaintenanceController**
  - [x] Create `getRequestCapacityImpact` controller method
  - [x] Add validation for request parameters
  - [x] Implement error handling

- [x] **Update API Routes**
  - [x] Add route `/api/maintenance/requests/:id/capacity-impact`
  - [x] Configure route parameters and validation

### 2. Frontend Development

#### 2.1 API Service Functions

- [x] **Enhance Maintenance API Service**
  - [x] Add function to call capacity impact endpoint
  - [x] Implement data transformation for chart-ready format

#### 2.2 Impact Visualization Components

- [x] **Create MaintenanceImpactSummary Component**
  - [x] Design layout for impact metrics (total reduction, peak impact, etc.)
  - [x] Implement styling consistent with application design

- [x] **Create MaintenanceImpactChart Component**
  - [x] Implement comparative bar/line chart using Recharts
  - [x] Add toggle for different view options (by time slot, by aircraft type)
  - [x] Add hover tooltips with detailed information

- [x] **Create MaintenanceImpactText Component**
  - [x] Generate human-readable explanation of impact
  - [x] Highlight critical information (total flights affected, peak impact)

#### 2.3 UI Integration

- [x] **Update MaintenanceRequestDetail Component**
  - [x] Add "Capacity Impact" tab or section
  - [x] Implement tab switching logic
  - [x] Add loading states for impact data

- [x] **Enhance MaintenanceApproval Component**
  - [x] Surface impact summary in approval section
  - [x] Highlight critical impacts that may affect decision-making

### 3. Data Integration

- [x] **Integrate with Stand Capacity Tool**
  - [x] Ensure impact calculation correctly references stand capacity data
  - [x] Handle time zone conversions consistently
  - [x] Add caching mechanism for performance optimization

### 4. Testing

- [ ] **Write Backend Tests**
  - [ ] Unit tests for impact calculation logic
  - [ ] API endpoint tests with various scenarios
  - [ ] Performance testing for large date ranges

- [ ] **Write Frontend Tests**
  - [ ] Component tests for visualization elements
  - [ ] Integration tests for data flow
  - [ ] UI tests for responsive design

### 5. Documentation

- [x] **Update API Documentation**
  - [x] Document new endpoints with request/response formats
  - [x] Include example requests and responses

- [x] **Create User Documentation**
  - [x] Write user guide for understanding impact visualizations
  - [x] Add explanations of metrics and their significance

## Implementation Details

### Key Backend Functions

```javascript
// maintenanceCapacityIntegrationService.js
async calculateRequestCapacityImpact(requestId) {
  // Get the maintenance request details
  const request = await maintenanceRequestService.getRequestById(requestId);
  
  // Get baseline capacity (without maintenance)
  const baselineCapacity = await this.getBaselineCapacity(
    request.start_datetime, 
    request.end_datetime
  );
  
  // Get capacity with maintenance applied
  const impactedCapacity = await this.getCapacityWithMaintenance(
    request.start_datetime, 
    request.end_datetime,
    request.stand_id
  );
  
  // Calculate differential and impact metrics
  return this.generateImpactAnalysis(baselineCapacity, impactedCapacity);
}
```

### Key Frontend Components

```jsx
// MaintenanceImpactVisualization.jsx
const MaintenanceImpactVisualization = ({ requestId }) => {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchImpactData = async () => {
      try {
        const data = await maintenanceApi.getRequestCapacityImpact(requestId);
        setImpactData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchImpactData();
  }, [requestId]);
  
  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div className="impact-visualization">
      <MaintenanceImpactSummary data={impactData.summary} />
      <MaintenanceImpactChart 
        baseline={impactData.baselineCapacity}
        impacted={impactData.impactedCapacity}
        timeSlots={impactData.timeSlots}
      />
      <MaintenanceImpactText summary={impactData.summary} />
    </div>
  );
};
```

## API Contract

### Request Capacity Impact Endpoint

**GET** `/api/maintenance/requests/:id/capacity-impact`

**Parameters:**
- `id`: Maintenance request ID
- `startDate` (optional): Override start date for calculation
- `endDate` (optional): Override end date for calculation

**Response:**
```json
{
  "requestId": "uuid",
  "summary": {
    "totalCapacityReduction": 42,
    "percentageReduction": 15.3,
    "peakImpactTimeSlot": "Time Slot 8",
    "peakReductionValue": 8,
    "mostAffectedAircraftType": "B737",
    "totalAffectedHours": 24,
    "impactDescription": "Medium impact - noticeable capacity shortfall"
  },
  "timeSlots": ["Time Slot 1", "Time Slot 2", ...],
  "baselineCapacity": {
    "byTimeSlot": {
      "Time Slot 1": {
        "total": 18,
        "byAircraftType": {
          "A320": 8,
          "B737": 6,
          "B788": 4
        }
      },
      // Additional time slots...
    }
  },
  "impactedCapacity": {
    "byTimeSlot": {
      "Time Slot 1": {
        "total": 14,
        "byAircraftType": {
          "A320": 6,
          "B737": 5,
          "B788": 3
        }
      },
      // Additional time slots...
    }
  },
  "differential": {
    "byTimeSlot": {
      "Time Slot 1": {
        "total": -4,
        "byAircraftType": {
          "A320": -2,
          "B737": -1,
          "B788": -1
        }
      },
      // Additional time slots...
    }
  }
}
```

## Dependencies and Requirements

- Access to stand capacity calculation APIs
- Recharts or ReactApexChart for visualization
- Maintenance request data model
- Stand data model

## Timeline Estimate

- Backend Implementation: ~3-4 days
- Frontend Implementation: ~3-4 days
- Testing and Bug Fixes: ~2-3 days
- Documentation and Refinement: ~1-2 days

**Total Estimated Time: 9-13 days** 