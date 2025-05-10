# Flight Schedule Validator - Design Document

## 1. Overview

### 1.1 Purpose
The Flight Schedule Validation Tool validates incoming flight data against the mandatory field requirements of the Stand Allocation Algorithm, provides column mapping capabilities for different data formats, and ensures data integrity before processing.

### 1.2 Business Value
- Reduces allocation failures due to invalid input data
- Streamlines data preparation workflow
- Enables use of diverse data sources through mapping
- Provides early feedback on data quality issues

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌───────────────┐     ┌──────────────┐     ┌────────────────┐     ┌────────────────┐
│ File Handling │────▶│ Data Mapping │────▶│ Data Validation│────▶│ Results Output │
└───────────────┘     └──────────────┘     └────────────────┘     └────────────────┘
```

### 2.2 Components
- **File Handler**: Detects file format, reads data
- **Data Mapper**: Maps source columns to required target fields
- **Validator**: Performs schema, integrity, and business rule validation
- **Output Handler**: Formats and presents validation results

## 3. Core Modules

### 3.1 File Handler Module
```javascript
// fileHandler.js
module.exports = {
  detectFileFormat(filePath),  // Detects CSV, JSON, Excel
  parseFile(filePath, format), // Returns array of record objects
  getFileStats(filePath),      // Size, record count, etc.
  getSampleRecords(data, count) // Get n sample records for mapping preview
}
```

### 3.2 Data Mapper Module
```javascript
// dataMapper.js
module.exports = {
  getMappingFields(entityType), // Returns required fields for entity type
  suggestMappings(sourceFields, targetFields), // AI-assisted mapping
  applyMapping(rawData, mappingProfile), // Transform data using mapping
  loadMappingProfile(profileName), // Load saved mapping
  saveMappingProfile(profileName, mappingProfile) // Save mapping for reuse
}
```

### 3.3 Validator Module
```javascript
// validator.js
module.exports = {
  validateSchema(data, entityType), // Checks required fields present
  validateDataIntegrity(data, referenceData), // Checks references valid
  validateBusinessRules(data, settings), // Checks operational constraints
  validate(data, entityType, referenceData, settings) // Full validation
}
```

### 3.4 CLI Interface Module
```javascript
// cli.js
module.exports = {
  parseArgs(argv), // Parse command line arguments
  promptForMapping(sourceFields, targetFields), // Interactive prompts
  displayValidationResults(results), // Format and show results
  handleInteractiveMode(data, options) // Manage interactive workflow
}
```

## 4. Data Requirements

### 4.1 Flight Data Mandatory Fields
- `FlightID`: Unique identifier for the flight
- `FlightNumber`: Commercial flight number
- `AirlineCode`: Operating airline code
- `AircraftType`: Type of aircraft (e.g., "B737", "A320") 
- `Origin`: Origin airport for the flight
- `Destination`: Destination airport for the flight
- `ScheduledTime`: Arrival or departure time
- `Terminal`: Assigned terminal
- `IsArrival`: Boolean flag (true for arrivals, false for departures)

### 4.2 Stand Data Mandatory Fields
- `StandName`: Unique identifier for the stand
- `Terminal`: Terminal where stand is located
- `IsContactStand`: Whether it's a contact stand
- `SizeLimit`: Maximum aircraft size category

### 4.3 Airline Data Mandatory Fields
- `AirlineCode`: Unique code for the airline
- `AirlineName`: Full name of the airline
- `BaseTerminal`: Preferred terminal for this airline
- `RequiresContactStand`: Whether airline requires contact stands

### 4.4 Maintenance Data Mandatory Fields
- `StandName`: Stand being maintained
- `StartTime`: Start of maintenance period
- `EndTime`: End of maintenance period

## 5. Validation Rules

### 5.1 Schema Validation
- Check presence of all mandatory fields
- Validate data types (string, number, boolean)
- Validate date/time formats (ISO8601 or HH:MM)

### 5.2 Data Integrity Rules
- `AirlineCode` must exist in Airline reference data
- `AircraftType` should match known aircraft types
- `Terminal` values must match configured terminals
- `LinkID` (if present) must reference existing flight

### 5.3 Business Logic Rules
- Linked flights (arrival/departure pairs) must have sufficient turnaround time
- Transfer times between connecting flights must meet min/max constraints
- Flight schedules for same aircraft registration must not overlap
- Scheduled maintenance periods must not conflict

## 6. CLI Implementation

### 6.1 Command Structure
```
validator-cli <command> [options] <file>

Commands:
  validate       Validate a flight schedule file
  map            Create or edit a mapping profile
  reference      Manage reference data

Options:
  --mapping, -m   Use a saved mapping profile
  --output, -o    Output results to file
  --format, -f    Specify input format (csv|json|xlsx)
  --interactive   Run in interactive mode (default: true)
  --verbose, -v   Show detailed validation information
```

### 6.2 Interactive Workflow
1. File selection and parsing
2. Column mapping (interactive or from profile)
3. Data transformation
4. Validation execution
5. Results display
6. Action selection (fix, export, proceed)

## 7. Mapping Features

### 7.1 Mapping Profile Structure
```json
{
  "profileName": "IATA-Standard",
  "entityType": "flights",
  "lastUsed": "2023-06-15T10:30:00Z",
  "mappings": {
    "FlightID": "flight_id",
    "FlightNumber": "flight_no",
    "AirlineCode": "carrier_code",
    "AircraftType": "equipment",
    "Origin": "orig",
    "Destination": "dest",
    "ScheduledTime": "sched_datetime",
    "Terminal": "terminal",
    "IsArrival": "is_arrival"
  },
  "transformations": {
    "ScheduledTime": "convertDateTime",
    "IsArrival": "stringToBoolean"
  }
}
```

### 7.2 Transformation Functions
- String formatting functions
- Date/time format conversion
- Boolean conversion from various formats
- Unit conversion functions
- Multiple field concatenation

## 8. Validation Results Format

```json
{
  "isValid": false,
  "timestamp": "2023-06-15T15:30:00Z",
  "filename": "flights-2023.csv",
  "recordCount": 156,
  "errors": [
    {
      "severity": "error",
      "field": "AirlineCode",
      "recordId": "BA123",
      "message": "Airline code 'XZ' not found in reference data",
      "value": "XZ",
      "row": 12
    }
  ],
  "warnings": [
    {
      "severity": "warning",
      "field": "AircraftType",
      "recordId": "LH456",
      "message": "Aircraft type 'B73X' not recognized, assuming 'B737'",
      "value": "B73X",
      "row": 45,
      "suggestedFix": "B737"
    }
  ],
  "summary": {
    "errorCount": 3,
    "warningCount": 12,
    "categoryCounts": {
      "schemaErrors": 1,
      "referenceErrors": 2,
      "businessRuleViolations": 0
    }
  }
}
```

## 9. Development Roadmap

### Phase 1: Core CLI Functionality
- File parsing (CSV, JSON)
- Basic column mapping
- Schema validation
- Command-line interface
- Simple reporting

### Phase 2: Enhanced Validation
- Reference data validation
- Business rule validation
- Expanded file format support (Excel)
- Saved mapping profiles

### Phase 3: API Layer
- Convert core modules to API service
- Create REST endpoints
- Authentication for API access
- Validation result storage

### Phase 4: Web Interface
- Frontend for file upload
- Interactive mapping UI
- Validation results dashboard
- Fix suggestions interface

## 10. Technical Specifications

### 10.1 Technology Stack
- **Language**: Node.js (v16+)
- **Core Libraries**:
  - commander (CLI argument parsing)
  - inquirer (interactive prompts)
  - csv-parser (CSV handling)
  - xlsx (Excel file handling)
  - ajv (JSON schema validation)
  - chalk (terminal coloring)
  - jest (testing)

### 10.2 Project Structure
```
/validator-tool/
  /src/
    /lib/
      fileHandler.js
      dataMapper.js
      validator.js
      referenceData.js
      transformers.js
    /cli/
      index.js
      prompts.js
      display.js
    /api/ (future)
      server.js
      routes/
  /test/
    unit/
    integration/
    fixtures/
  /config/
    validationRules.js
    defaultMappings.js
  /mappings/ (generated)
  package.json
  README.md
```

### 10.3 Performance Requirements
- Handle files up to 100MB
- Process 10,000+ flight records
- Complete validation within 30 seconds for large files

## 11. Testing Strategy

### 11.1 Unit Tests
- Test each validation rule independently
- Test mapping transformations
- Test file format detection

### 11.2 Integration Tests
- End-to-end workflow tests
- Cross-field validation tests
- Error handling tests

### 11.3 Test Data Sets
- Valid flight schedules
- Schedules with schema errors
- Schedules with integrity errors
- Schedules with business rule violations
- Various file formats and layouts

## 12. Appendix

### 12.1 Example Usage
```bash
# Validate with interactive mapping
$ node validator-cli.js validate flights.csv

# Use saved mapping
$ node validator-cli.js validate flights.csv -m iata-format

# Output report to file
$ node validator-cli.js validate flights.csv -o validation-report.json

# Create new mapping profile
$ node validator-cli.js map flights.csv -o my-mapping.json
```

### 12.2 Error Code Reference
| Code | Description |
|------|-------------|
| E001 | Missing required field |
| E002 | Invalid data type |
| E003 | Invalid date/time format |
| E004 | Reference integrity violation |
| E005 | Business rule violation | 