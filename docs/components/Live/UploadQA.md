# UploadQA Component

## Overview
The UploadQA component is responsible for validating flight data after it has been uploaded via the UploadTool component. It analyzes the uploaded data against business rules, checks for data quality issues, and provides detailed feedback to the user before committing the data to the system.

## Core Functionality
- **Data validation**: Validates uploaded flight data against required fields and business rules
- **Error reporting**: Identifies and reports issues at both file and record level
- **Data visualization**: Provides summary statistics and sample data for review
- **Resolution suggestions**: Offers guidance on how to fix identified issues
- **Approval workflow**: Allows users to approve valid data while addressing errors
- **Repository validation**: Verifies airlines and airports against existing system repositories

## Component Responsibility
The UploadQA component is responsible **only** for the validation and quality assurance process. It:
- Receives file references or data from the UploadTool
- Validates content based on system requirements
- Provides actionable feedback on data quality
- Allows selective approval of valid records
- Supports exporting validation results

The component does NOT handle:
- File uploading (handled by UploadTool)
- Data storage in the database (handled by a separate service)
- Modification of the source data files

## Required Flight Data Fields

The UploadQA component validates that each flight record contains the following minimum required fields:

| Field | Validation Rules |
|-------|------------------|
| Airline IATA code | Required, 2-3 characters, must exist in airline database repository |
| Flight number | Required, valid format (alphanumeric) |
| Scheduled date | Required, valid date format, not in the past |
| Flight nature | Required, must be 'D' (departure) or 'A' (arrival) |
| Origin/Destination | Required, valid IATA code, must exist in airport database repository |
| Scheduled time | Required, valid time format |
| Aircraft type | Required, valid IATA code, must exist in aircraft type database |
| Terminal | Required, must exist in terminal database for the airport |
| Seat capacity | Required, positive integer, must match expected capacity for aircraft type |

## Validation Against Repositories

The component uses existing system repositories to validate critical reference data:

1. **Airline Validation**:
   - Each airline IATA code is checked against the system's airline repository
   - Unknown airlines are flagged as errors and those flights are excluded from import
   - The validation report includes specific information about unknown airlines

2. **Airport Validation**:
   - Origin/destination IATA codes are verified against the airport repository
   - Unknown airports are flagged as errors and those flights are excluded from import
   - Suggestions for similar airport codes may be provided for easy correction

3. **Aircraft Type Validation**:
   - Aircraft type codes are checked against the aircraft type repository
   - Unknown types are flagged as errors and trigger capacity validation failure
   - Capacity values are cross-checked with the expected capacity for the aircraft type

## Handling of Invalid Records

The UploadQA component implements a partial acceptance model:

1. **Invalid flights are excluded**: Any flight record failing critical validation is excluded from import
2. **Valid flights proceed**: The system continues processing and will import all valid flights
3. **Detailed reporting**: A comprehensive report shows which flights were excluded and why
4. **No all-or-nothing requirement**: The import process does not require all flights to be valid

This approach ensures that data quality standards are maintained while maximizing the utility of the upload process.

## Props/Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileReference` | string | undefined | Reference ID of the uploaded file from UploadTool |
| `dataSource` | array | undefined | Direct data array if not using file reference |
| `onValidationComplete` | function | undefined | Callback when validation process completes |
| `onApproveData` | function | undefined | Callback when user approves valid data |
| `validationRules` | object | defaultRules | Custom validation rules to apply |
| `strictMode` | boolean | false | If true, rejects all data if critical errors are found |
| `samplingRate` | number | 100 | Percentage of records to validate (for very large files) |
| `autoValidate` | boolean | true | Whether validation starts automatically |
| `repositoryOptions` | object | undefined | Configuration for repository validation (caching, timeout, etc.) |

## Usage Example

```jsx
import UploadTool from '../../components/UploadTool';
import UploadQA from '../../components/UploadQA';
import { useState } from 'react';
import { message } from 'antd';

function FlightDataImportPage() {
  const [uploadedFileRef, setUploadedFileRef] = useState(null);
  const [validationComplete, setValidationComplete] = useState(false);
  const [validationStats, setValidationStats] = useState(null);
  
  const handleUploadSuccess = (data) => {
    message.success(`File uploaded successfully: ${data.filename}`);
    setUploadedFileRef(data.fileReference);
  };
  
  const handleValidationComplete = (results) => {
    setValidationComplete(true);
    setValidationStats(results.summary);
    
    if (results.summary.errorCount > 0) {
      message.warning(`Validation completed with ${results.summary.errorCount} errors. These flights will be excluded.`);
    } else {
      message.success('All data validated successfully!');
    }
  };
  
  const handleApproveData = (approvedData) => {
    message.loading(`Importing ${approvedData.length} approved flight records...`);
    
    // Call API to save the approved data
    api.saveFlightData(approvedData)
      .then(() => {
        message.success('Flight data imported successfully!');
        // Navigate to flight management page or show success page
      })
      .catch(error => {
        message.error('Error importing flight data: ' + error.message);
      });
  };
  
  return (
    <Layout>
      <Steps current={uploadedFileRef ? 1 : 0}>
        <Step title="Upload" description="Upload flight data CSV" />
        <Step title="Validate" description="Check data quality" />
        <Step title="Import" description="Save valid data" />
      </Steps>
      
      {!uploadedFileRef ? (
        <UploadTool 
          title="Upload Flight Schedule"
          description="Upload CSV file with flight schedule data"
          endpoint="/api/flights/upload"
          acceptedFileTypes={['.csv']}
          maxFileSize={50}
          onUploadSuccess={handleUploadSuccess}
        />
      ) : (
        <UploadQA
          fileReference={uploadedFileRef}
          onValidationComplete={handleValidationComplete}
          onApproveData={handleApproveData}
          strictMode={false}
          validationRules={{
            requiredFields: [
              'airline_iata', 'flight_number', 'scheduled_date', 
              'flight_nature', 'destination_iata', 'aircraft_type', 
              'terminal', 'seat_capacity'
            ],
            // Additional custom rules
            customValidators: [
              {
                name: 'validateAircraftCapacity',
                description: 'Validates seat capacity matches the aircraft type',
                severity: 'warning'
              }
            ]
          }}
          repositoryOptions={{
            useCache: true,
            cacheExpiry: 3600, // 1 hour
            fallbackToLocal: true
          }}
        />
      )}
    </Layout>
  );
}
```

## Validation Process

The UploadQA component performs validation in the following stages:

1. **File-level validation**:
   - Checks if all required columns are present
   - Validates file structure and format
   - Scans for obvious structural issues

2. **Record-level validation**:
   - Validates each row against field-specific rules
   - Checks relationships between fields (e.g., aircraft type vs. seat capacity)
   - Verifies referential integrity with external data (airports, airlines)

3. **Cross-record validation**:
   - Identifies duplicates
   - Checks for scheduling conflicts
   - Validates related flights (return journeys, connections)

4. **Summary generation**:
   - Provides validation statistics
   - Categorizes issues by severity
   - Generates exportable validation report

## Validation Results Display

The component displays validation results in a tab-based interface dividing content by flight nature:

### Tab Structure
1. **Departures Tab**:
   - Shows all departure flights (Flight Nature = 'D')
   - Displays validation status for each departure record
   - Allows filtering of departures by validation status
   
2. **Arrivals Tab**:
   - Shows all arrival flights (Flight Nature = 'A')
   - Displays validation status for each arrival record
   - Allows filtering of arrivals by validation status

3. **Summary Tab**:
   - Total records processed
   - Valid/invalid count for both arrivals and departures
   - Record counts by error type
   - Validation time

### Data Tables (for both Arrivals and Departures)
- Sortable/filterable tables with columns for all key flight fields
- Visual indicators for records with issues
- Filter options to show:
  - All records
  - Only invalid records
  - Only valid records
- Ability to exclude specific records from import

### Issue Details
- Expandable rows showing specific validation errors
- Severity indicators (critical, warning, info)
- Suggestions for correcting common issues
- Reference links to validation rules

### Export Options
- Download validation report as CSV/Excel
- Export only valid records
- Export only records with issues
- Separate export options for arrivals and departures

## Input/Output Relationship with UploadTool

### Input from UploadTool
- **File reference**: Identifier for the uploaded file
- **Metadata**: File size, record count, upload timestamp
- **User context**: Who uploaded the file, intended purpose

### Output to Database Service
- **Approved data**: Only records that passed validation and were approved by user
- **Validation report**: Detailed log of validation process and results
- **Excluded records**: List of flights that were not imported due to validation failures
- **Audit information**: Who validated/approved the data and when

## Benefits of Separation

Separating the upload and validation processes provides several advantages:

1. **Clear separation of concerns**:
   - UploadTool focuses on efficient file handling
   - UploadQA focuses on data quality rules

2. **Independent testing**:
   - Each component can be tested in isolation
   - Mocked data can be used for validation testing

3. **Performance optimization**:
   - Large file uploads can be handled efficiently
   - Validation can be performed in batches or asynchronously

4. **Enhanced user experience**:
   - Users receive clear feedback at each stage
   - Validation issues don't block the upload process

5. **Maintenance benefits**:
   - Business rules can be updated without changing upload logic
   - New validation types can be added independently

6. **Partial data acceptance**:
   - Valid records can be imported even when some records fail validation
   - Users get clear visibility into which records will and won't be imported

## Accessibility

The component implements accessibility best practices:
- Screen reader support for validation results
- Keyboard navigation for error review and resolution
- Color-independent issue indicators (icons plus colors)
- Clear error messaging with actionable guidance

## Browser Compatibility

Tested and compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
