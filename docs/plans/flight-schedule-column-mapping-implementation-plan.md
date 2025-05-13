# Flight Schedule Column Mapping Implementation Plan

## Overview
This implementation plan outlines the steps required to add column mapping functionality to the Airport Capacity Planner's flight upload process. Currently, the system expects specific column names in uploaded CSV files, but lacks the ability to map user-provided columns to these expected fields. This plan addresses this gap by implementing an interactive column mapping interface in the web application, similar to the functionality specified in the Flight Schedule Validator CLI prototype.

## Business Value
- Removes the primary cause of upload failures due to column name mismatches
- Improves user experience by guiding users through the column mapping process
- Increases system flexibility by supporting diverse file formats and layouts
- Allows users to save mapping profiles for reuse with similar file formats

## Requirements

### Functional Requirements
1. Detect column names from uploaded CSV files
2. Present an interactive interface to map source columns to required target fields
3. Apply the mapping to transform the data before validation and processing
4. Save mapping profiles for future reuse
5. Suggest potential mappings based on column name similarity
6. Support optional transformation functions for data format conversion
7. Validate mapped data before proceeding to the next step

### Technical Requirements
1. Integrate column mapping into the existing upload workflow
2. Store mapping profiles in the database
3. Create backend API endpoints for mapping operations
4. Implement frontend components for the mapping interface
5. Ensure compatibility with existing validation and allocation processes

## Phase 1: Backend Implementation (Days 1-3)

### 1.1 Data Mapper Service
- [x] Create `ColumnMappingService.js` with methods:
  - [x] `detectColumns(fileData)` - Extract column names from CSV data
  - [x] `getMappingFields()` - Get required fields and their descriptions
  - [x] `suggestMappings(sourceColumns)` - Generate mapping suggestions
  - [x] `applyMapping(data, mappingProfile)` - Transform data using mapping
  - [x] `validateMapping(mappingProfile)` - Validate mapping completeness
  - [x] `transformField(value, transformType)` - Apply data transformations

### 1.2 Mapping Profile Management
- [x] Create migration for `column_mapping_profiles` table:
  - [x] `id` (primary key)
  - [x] `name` (profile name)
  - [x] `description` (optional description)
  - [x] `user_id` (creator)
  - [x] `mappings` (JSON object with mapping configuration)
  - [x] `transformations` (JSON object with transformation rules)
  - [x] `last_used` (timestamp)
  - [x] `is_default` (boolean)
  - [x] `created_at` and `updated_at` timestamps

- [x] Implement mapping profile CRUD operations:
  - [x] `createMappingProfile(profileData)` - Create new profile
  - [x] `getMappingProfile(id)` - Get profile by ID
  - [x] `updateMappingProfile(id, profileData)` - Update existing profile
  - [x] `deleteMappingProfile(id)` - Delete a profile
  - [x] `listMappingProfiles(userId)` - List available profiles for user

### 1.3 API Endpoints
- [x] Create routes in `flightUploadController.js`:
  - [x] `POST /api/column-mapping/detect-columns` - Detect columns from uploaded file
  - [x] `GET /api/column-mapping/uploads/:uploadId/columns` - Get columns from existing upload
  - [x] `GET /api/column-mapping/fields` - Get required mapping fields
  - [x] `POST /api/column-mapping/suggest` - Generate mapping suggestions
  - [x] `POST /api/column-mapping/apply` - Apply mapping to transform data
  - [x] `GET /api/column-mapping/profiles` - List mapping profiles
  - [x] `POST /api/column-mapping/profiles` - Create mapping profile
  - [x] `GET /api/column-mapping/profiles/:id` - Get mapping profile details
  - [x] `PUT /api/column-mapping/profiles/:id` - Update mapping profile
  - [x] `DELETE /api/column-mapping/profiles/:id` - Delete mapping profile

## Phase 2: Frontend Implementation (Days 4-7)

### 2.1 API Client Extensions
- [x] Add methods to API client for mapping operations:
  - [x] `detectColumns(file)` - Submit file for column detection
  - [x] `getMappingFields()` - Get required fields for mapping
  - [x] `suggestMappings(sourceColumns)` - Get mapping suggestions
  - [x] `applyMapping(uploadId, mappingProfile)` - Apply mapping to data
  - [x] `saveMapping(mappingProfile)` - Save mapping profile
  - [x] `listMappingProfiles()` - Get available mapping profiles
  - [x] `getMappingProfile(id)` - Get specific mapping profile

### 2.2 Mapping Context
- [x] Create `ColumnMappingContext.js`:
  - [x] State for detected columns
  - [x] State for required fields
  - [x] State for mapping selections
  - [x] State for suggested mappings
  - [x] State for available profiles
  - [x] Loading and error states
  - [x] Methods for context operations
  - [x] Context provider component

### 2.3 Column Mapping Component
- [x] Create `ColumnMappingPanel.js` component:
  - [x] Visual representation of source and target columns
  - [x] Drag-and-drop interface for mapping
  - [x] Dropdown selectors for each required field
  - [x] Visual indicators for mapped/unmapped fields
  - [x] Input validation and feedback
  - [x] Option to skip non-essential fields
  - [x] Advanced options for field transformations

### 2.4 Mapping Profile Management
- [x] Create `MappingProfileManager.js` component:
  - [x] List of saved mapping profiles
  - [x] Create new profile form
  - [x] Edit existing profile
  - [x] Delete profile confirmation
  - [x] Apply profile button
  - [x] Set default profile option

## Phase 3: Upload Workflow Integration (Days 8-10)

### 3.1 Upload Workflow Enhancement
- [x] Modify `UploadWorkflow.js` component:
  - [x] Add column mapping step after file selection
  - [x] Update workflow state machine to include mapping
  - [x] Add conditional rendering for mapping step
  - [x] Connect mapping context to upload context
  - [x] Pass mapping results to validation and processing steps

### 3.2 UploadTool Component Enhancement
- [x] Modify `UploadTool.js` component:
  - [x] Add support for mapping step
  - [x] Update progress tracking to include mapping
  - [x] Connect to mapping profile selector
  - [x] Add option to skip mapping with default profile
  - [x] Handle mapping errors

### 3.3 FlightUploadContext Enhancement
- [x] Update `FlightUploadContext.js`:
  - [x] Add mapping state and operations
  - [x] Connect mapping step to upload flow
  - [x] Add methods for handling mapping
  - [x] Update status tracking to include mapping

## Phase 4: Testing & Optimization (Days 11-12)

### 4.1 Integration Testing
- [ ] Create integration tests:
  - [ ] Test column detection with various file formats
  - [ ] Test mapping suggestions accuracy
  - [ ] Test applying mappings to data
  - [ ] Test end-to-end workflow with mapping
  - [ ] Test error handling scenarios
  - [ ] Test with large files and many columns

### 4.2 Performance Optimization
- [ ] Implement performance enhancements:
  - [ ] Optimize column detection for large files
  - [ ] Cache mapping suggestions
  - [ ] Add pagination for previewing mapped data
  - [ ] Optimize rendering for large column sets
  - [ ] Add debouncing for user interactions

### 4.3 Error Handling & Recovery
- [ ] Enhance error handling:
  - [ ] Provide clear error messages for mapping issues
  - [ ] Add validation for required fields
  - [ ] Create recovery options for failed mappings
  - [ ] Implement data sampling for validation
  - [ ] Add tooltips and help text for common errors

## Phase 5: Documentation & Deployment (Days 13-14)

### 5.1 User Documentation
- [ ] Create user documentation:
  - [ ] Step-by-step guide for column mapping
  - [ ] Examples with screenshots
  - [ ] Tips for creating effective mappings
  - [ ] Managing mapping profiles
  - [ ] Troubleshooting common issues

### 5.2 Developer Documentation
- [ ] Create developer documentation:
  - [ ] Architecture and component overview
  - [ ] API endpoint documentation
  - [ ] State management between contexts
  - [ ] Extending the mapping functionality
  - [ ] Performance considerations

### 5.3 Deployment & Release
- [ ] Prepare for deployment:
  - [ ] Create database migration scripts
  - [ ] Update build configuration
  - [ ] Test in staging environment
  - [ ] Create rollback plan
  - [ ] Prepare release notes

## Required Data Structures

### Mapping Profile Structure
```json
{
  "id": 1,
  "name": "IATA Standard Format",
  "description": "Mapping for standard IATA flight schedule format",
  "user_id": 123,
  "mappings": {
    "AirlineIATA": "carrier",
    "FlightNumber": "flight_no",
    "ScheduledTime": "sched_time",
    "EstimatedTime": null,
    "FlightNature": "is_arrival",
    "DestinationIATA": "dest",
    "AircraftTypeIATA": "aircraft",
    "Terminal": "terminal",
    "SeatCapacity": null
  },
  "transformations": {
    "FlightNature": "booleanToArrDep",
    "ScheduledTime": "isoDatetime"
  },
  "last_used": "2023-05-12T04:46:33.840Z",
  "is_default": false,
  "created_at": "2023-05-10T00:00:00.000Z",
  "updated_at": "2023-05-12T04:46:33.840Z"
}
```

### Required Mapping Fields
```json
[
  {
    "field": "AirlineIATA",
    "description": "2-character IATA code for the airline",
    "required": true,
    "example": "BA"
  },
  {
    "field": "FlightNumber",
    "description": "Flight number without airline code",
    "required": true,
    "example": "123"
  },
  {
    "field": "ScheduledTime",
    "description": "Scheduled arrival or departure time",
    "required": true,
    "example": "2023-06-01T08:30:00Z"
  },
  {
    "field": "EstimatedTime",
    "description": "Estimated arrival or departure time",
    "required": false,
    "example": "2023-06-01T08:45:00Z"
  },
  {
    "field": "FlightNature",
    "description": "A for arrival, D for departure",
    "required": true,
    "example": "A"
  },
  {
    "field": "DestinationIATA",
    "description": "3-character IATA code for origin/destination airport",
    "required": true,
    "example": "JFK"
  },
  {
    "field": "AircraftTypeIATA",
    "description": "IATA code for aircraft type",
    "required": true,
    "example": "B738"
  },
  {
    "field": "Terminal",
    "description": "Terminal number or letter",
    "required": false,
    "example": "T5"
  },
  {
    "field": "SeatCapacity",
    "description": "Number of passenger seats",
    "required": false,
    "example": "180"
  }
]
```

## Transformation Functions
- `booleanToArrDep` - Convert boolean to A/D format (e.g., true → "A", false → "D")
- `arrDepToBoolean` - Convert A/D to boolean (e.g., "A" → true, "D" → false)
- `isoDatetime` - Format date/time as ISO 8601
- `ddmmyyyyHHMM` - Format date/time as DD/MM/YYYY HH:MM
- `concatenate` - Combine multiple fields (e.g., concat carrier + flight_no)
- `split` - Split a field into parts
- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `numberFormat` - Format numeric values
- `nullDefault` - Provide default value for null/empty fields

## Deliverables
1. Backend services for column mapping functionality
2. Frontend components for interactive mapping interface
3. Database schema for storing mapping profiles
4. Enhanced upload workflow with mapping step
5. Comprehensive documentation for users and developers
6. Integration with existing validation and processing pipeline

## Dependencies
1. Access to existing upload workflow components
2. Access to database for adding new tables
3. Familiarity with frontend framework (React.js)
4. Familiarity with backend framework (Express.js)
5. Existing CSV parsing libraries 