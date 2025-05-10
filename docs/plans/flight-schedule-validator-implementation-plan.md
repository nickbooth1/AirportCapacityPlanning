# Flight Schedule Validator Implementation Plan

## Overview
This plan outlines the steps required to implement the Flight Schedule Validator tool for the Airport Capacity Planner system. The tool will validate flight schedule data against the requirements of the Stand Allocation Algorithm, providing column mapping capabilities, data validation, and reporting. This implementation plan focuses on Phase 1 and Phase 2, creating a fully functional Command Line Interface (CLI) tool before later web interface development.

## Prerequisites
- Node.js (v16+) development environment
- Access to sample flight schedule files in various formats (CSV, JSON, Excel)
- Reference data for airlines, aircraft types, and airport terminals
- Familiarity with the Stand Allocation Algorithm input requirements

## Phase 1: Core CLI Functionality (Days 1-7)

### 1.1 Project Setup (Day 1)
- [ ] Initialize Node.js project with package.json
- [ ] Set up project directory structure
- [ ] Install core dependencies:
  - commander (CLI argument parsing)
  - inquirer (interactive prompts)
  - csv-parser (CSV handling)
  - chalk (terminal coloring)
  - jest (testing)
- [ ] Create README with basic usage instructions
- [ ] Set up Git repository with .gitignore

### 1.2 File Handler Module (Days 1-2)
- [ ] Implement `fileHandler.js` with methods:
  - [ ] `detectFileFormat(filePath)` - Detect file format based on extension and content
  - [ ] `parseFile(filePath, format)` - Parse file contents into JSON objects
  - [ ] `getFileStats(filePath)` - Get file size, record count, etc.
  - [ ] `getSampleRecords(data, count)` - Get sample records for mapping preview
- [ ] Add support for CSV parsing
- [ ] Add support for JSON parsing
- [ ] Create unit tests for file handling

### 1.3 Data Mapping Module (Days 2-3)
- [ ] Implement `dataMapper.js` with methods:
  - [ ] `getMappingFields(entityType)` - Get required fields for entity type
  - [ ] `generateMappingSuggestions(sourceFields, targetFields)` - Suggest mappings based on field names
  - [ ] `applyMapping(rawData, mappingProfile)` - Transform data using mapping
  - [ ] `generateMappingProfile(sourceFields, targetFields, mappings)` - Create mapping profile object
- [ ] Define mapping profile schema
- [ ] Create basic file/directory utilities for mapping profiles
- [ ] Create unit tests for data mapping functions

### 1.4 Basic Validator Module (Days 3-4)
- [ ] Implement `validator.js` with methods:
  - [ ] `validateSchema(data, entityType)` - Check for required fields
  - [ ] `validateDataTypes(data, entityType)` - Validate basic data types
  - [ ] `validateTimeFormat(timeString)` - Check time format correctness
  - [ ] `validate(data, entityType)` - Run all validations
- [ ] Define validation rules for flight data
- [ ] Create error and warning collection utilities
- [ ] Create unit tests for validation functions

### 1.5 CLI Interface Module (Days 4-5)
- [ ] Implement `cli.js` with methods:
  - [ ] `parseArgs(argv)` - Parse command line arguments
  - [ ] `promptForMapping(sourceFields, targetFields)` - Interactive mapping prompts
  - [ ] `displayValidationResults(results)` - Format and display results
  - [ ] `handleInteractiveMode(data, options)` - Manage interactive workflow
- [ ] Create main CLI entry point script
- [ ] Implement command structure and help text
- [ ] Implement colored terminal output
- [ ] Create structured validation results format

### 1.6 Configuration Management (Day 6)
- [ ] Implement `configManager.js` for:
  - [ ] Loading default configurations
  - [ ] Saving user preferences
  - [ ] Managing mapping profiles
- [ ] Create default configuration files
- [ ] Add configuration command to CLI
- [ ] Implement profile listing and selection

### 1.7 Integration and Testing (Day 7)
- [ ] Connect all modules for end-to-end functionality
- [ ] Create integration tests with sample files
- [ ] Create test fixtures for different file formats
- [ ] Test for correct error handling
- [ ] Create comprehensive CLI help documentation
- [ ] Update README with usage examples

## Phase 2: Enhanced Validation (Days 8-14)

### 2.1 Reference Data Module (Days 8-9)
- [ ] Implement `referenceData.js` with methods:
  - [ ] `loadAirlineData(filePath)` - Load airline reference data
  - [ ] `loadAircraftData(filePath)` - Load aircraft type reference data
  - [ ] `loadTerminalData(filePath)` - Load terminal/stand reference data
  - [ ] `validateAgainstReference(dataType, value)` - Check value against reference
- [ ] Create sample reference data files
- [ ] Add reference data commands to CLI
- [ ] Implement reference data caching
- [ ] Create unit tests for reference data validation

### 2.2 Data Integrity Validation (Days 9-10)
- [ ] Enhance `validator.js` with methods:
  - [ ] `validateDataIntegrity(data, referenceData)` - Check references valid
  - [ ] `validateAirlineCode(code, airlines)` - Validate airline exists
  - [ ] `validateAircraftType(type, aircraft)` - Validate aircraft type exists
  - [ ] `validateTerminal(terminal, terminals)` - Validate terminal exists
- [ ] Implement reference data integration with validator
- [ ] Add detailed error messages with suggestions
- [ ] Create unit tests for integrity validation

### 2.3 Business Rule Validation (Days 10-11)
- [ ] Enhance `validator.js` with methods:
  - [ ] `validateBusinessRules(data, settings)` - Check operational constraints
  - [ ] `validateTurnaroundTimes(flights)` - Check sufficient turnaround times
  - [ ] `validateFlightConnections(flights)` - Check connection times
  - [ ] `validateAircraftUtilization(flights)` - Check for scheduling conflicts
- [ ] Implement business rule validation logic
- [ ] Create custom rule configuration options
- [ ] Create unit tests for business rules

### 2.4 Enhanced Mapping Features (Days 11-12)
- [ ] Enhance `dataMapper.js` with methods:
  - [ ] `saveMappingProfile(profileName, mappingProfile)` - Save mapping for reuse
  - [ ] `loadMappingProfile(profileName)` - Load saved mapping
  - [ ] `listMappingProfiles()` - List available mappings
- [ ] Add transformation functions for common data formats
- [ ] Implement field transformation capabilities
- [ ] Create unit tests for enhanced mapping

### 2.5 Excel File Support (Day 12)
- [ ] Install xlsx library for Excel support
- [ ] Enhance fileHandler.js with Excel parsing capabilities
- [ ] Add sheet selection for multi-sheet workbooks
- [ ] Implement cell format detection
- [ ] Create sample Excel test files
- [ ] Add unit tests for Excel parsing

### 2.6 Validation Reporting (Day 13)
- [ ] Implement `reportGenerator.js` with methods:
  - [ ] `generateValidationReport(results)` - Create detailed report
  - [ ] `exportToJson(report, filePath)` - Export report to JSON
  - [ ] `exportToCsv(report, filePath)` - Export report to CSV
  - [ ] `getErrorSummary(report)` - Generate error summary
- [ ] Add export options to CLI
- [ ] Create sample report templates
- [ ] Implement different verbosity levels

### 2.7 Interactive Error Resolution (Day 14)
- [ ] Implement interactive error correction in CLI
- [ ] Add prompts for fixing common validation issues
- [ ] Create helper utilities for automated fixes
- [ ] Add ability to re-validate after corrections
- [ ] Test with various error scenarios

## Testing Plan

### Unit Tests
- Test each module independently
- Test with valid and invalid inputs
- Test edge cases for all functions
- Test performance with large files

### Integration Tests
- Test end-to-end CLI workflow
- Test with various file formats
- Test with different mapping scenarios
- Test error handling and recovery

### Test Data Sets
- Create test files with known issues to validate detection
- Include various file formats (CSV, JSON, Excel)
- Include files with different column structures
- Create reference data test sets

## Deliverables
1. Fully functional CLI validator tool
2. Comprehensive test suite
3. Sample data files and mapping profiles
4. Documentation for usage and extension
5. Configuration files for common use cases

## Future Phases (Not Included in This Plan)
- Phase 3: API layer development
- Phase 4: Web interface implementation

## Usage Examples

```bash
# Basic validation with interactive mapping
$ node validator-cli.js validate flights.csv

# Use saved mapping profile
$ node validator-cli.js validate flights.csv -m airline-format

# Export validation report
$ node validator-cli.js validate flights.csv -o report.json

# Create and save a mapping profile
$ node validator-cli.js map flights.csv -o new-mapping.json

# Validate against reference data
$ node validator-cli.js validate flights.csv --reference-data ./references
``` 