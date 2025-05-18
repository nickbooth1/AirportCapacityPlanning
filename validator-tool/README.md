# Flight Schedule Validator Tool

An enhanced validation tool for flight schedules used in the Airport Capacity Planner system.

## Overview

The Flight Schedule Validator provides robust validation capabilities for flight data, including:

- Schema validation (required fields, data types)
- Reference data validation (aircraft types, airlines, terminals)
- Business rule validation (turnaround times, gate compatibility)
- Comprehensive reporting in multiple formats (JSON, CSV, HTML)

## Enhanced Features

### Aircraft Type Repository
- Comprehensive database of aircraft types with detailed metadata
- Includes IATA/ICAO codes, wingspan, length, capacity, turnaround times
- Aircraft categorization (narrow/wide-body)
- Support for multiple reference data sources

### Advanced Date/Time Handling
- Multi-format date/time parsing with automatic detection
- Support for regional formats (US, European)
- Detailed validation results with format suggestions
- ISO-8601 standardization

### Enhanced Error Reporting
- Detailed validation reports with severity levels (ERROR, WARNING, INFO)
- Precise error location (row/column) in data files
- Suggested corrections based on reference data
- Field-level error aggregation and analysis
- Multiple output formats (terminal display, JSON, CSV, HTML)

### Report Generator
- Flexible reporting with configurable details
- Rich HTML reports with visualizations
- Machine-readable JSON for APIs
- CSV exports for data analysis
- Interactive terminal output with color-coding

## Usage Examples

### Basic Validation

```javascript
const validator = require('./src/lib/validator');
const referenceData = require('./src/lib/referenceData');

// Load reference data
const refData = await referenceData.loadAllReferenceData('./data/reference');

// Validate flight data
const validationResults = validator.validateFlightData(flightData, refData);

// Check results
if (validationResults.isValid) {
  console.log('Flight data is valid!');
} else {
  console.log(`Found ${validationResults.errors.length} errors`);
}
```

### Generate Reports

```javascript
const reportGenerator = require('./src/lib/reportGenerator');

// Generate a validation report
const report = reportGenerator.generateValidationReport(validationResults, {
  filename: 'flights.csv',
  recordCount: flightData.length,
  includeDetailedErrors: true
});

// Export to different formats
reportGenerator.exportToJson(report, 'output/validation-report.json');
reportGenerator.exportToCsv(report, 'output/validation-report.csv');
reportGenerator.exportToHtml(report, 'output/validation-report.html', {
  includeCharts: true,
  title: 'Flight Schedule Validation Report'
});

// Display in terminal
console.log(reportGenerator.formatReportForDisplay(report, {
  colorize: true,
  detailedErrors: 10
}));
```

## CLI Usage

```
node src/cli/index.js validate flights.csv --reference=./data/reference --format=html
```

## Directory Structure

```
validator-tool/
  ├── src/
  │   ├── cli/           # Command-line interface
  │   │   └── index.js           # Main CLI entry point
  │   ├── lib/           # Core libraries
  │   │   ├── validator.js           # Main validation engine
  │   │   ├── reportGenerator.js     # Report generation module
  │   │   └── referenceData.js       # Reference data management
  │   ├── utils/         # Utility functions
  │   │   └── dateParser.js          # Advanced date parsing
  │   └── scripts/       # Example scripts
  ├── test/
  │   ├── fixtures/      # Test data
  │   │   └── reference-data-enhanced/  # Enhanced reference data
  │   └── unit/          # Unit tests
  ├── data/
  │   └── reference/     # Reference data files
  └── output/
      └── reports/       # Generated reports
```

## Future Enhancements

- Real-time validation with WebSocket support
- Integration with external reference data APIs
- Machine learning for intelligent error correction suggestions
- Interactive validation dashboard 