/**
 * Flight Schedule Validator Report Generator Demo
 * Demonstrates the enhanced report generation capabilities
 * 
 * Usage: node src/scripts/reportDemo.js [output-format]
 *   output-format: json, csv, html, all (default: all)
 */

const fs = require('fs');
const path = require('path');
const reportGenerator = require('../lib/reportGenerator');

// Mock validation results for demo
const mockResults = {
  isValid: false,
  errors: [
    {
      severity: 'error',
      code: 'E001',
      field: 'AircraftType',
      recordId: 'FL002',
      message: 'Missing required field: AircraftType',
      row: 2,
      column: 'AircraftType'
    },
    {
      severity: 'error',
      code: 'E002',
      field: 'ScheduledTime',
      recordId: 'FL003',
      message: 'Invalid date format for ScheduledTime. Expected datetime',
      value: '15/05/2023 14:30:00',
      row: 3,
      column: 'ScheduledTime',
      suggestion: 'Use format: YYYY-MM-DDTHH:mm:ss'
    },
    {
      severity: 'error',
      code: 'E004',
      field: 'AircraftType',
      recordId: 'FL002',
      message: 'Aircraft type \'B736\' not found in reference data',
      value: 'B736',
      row: 2,
      column: 'AircraftType',
      suggestions: ['B738', 'B737', 'B788']
    }
  ],
  warnings: [
    {
      severity: 'warning',
      code: 'W001',
      field: 'LinkID',
      recordId: 'FL005-FL006',
      message: 'Turnaround time of 15 minutes is less than minimum required 45 minutes for LinkID \'FL005\'',
      value: 15
    },
    {
      severity: 'warning',
      code: 'W004',
      field: 'Terminal',
      recordId: 'FL004',
      message: 'Terminal change for linked flights may require additional time',
      details: 'Arrival at T2, departure from T2 for flight pair'
    }
  ],
  info: [
    {
      severity: 'info',
      code: 'I001',
      field: 'ScheduledTime',
      recordId: 'FL003',
      message: 'Date format identified as: DD/MM/YYYY HH:mm:ss',
      details: 'Original: 15/05/2023 14:30:00, Parsed to ISO: 2023-05-15T14:30:00.000Z',
      row: 3,
      column: 'ScheduledTime'
    },
    {
      severity: 'info',
      code: 'I002',
      field: 'AircraftType',
      recordId: 'FL001',
      message: 'Aircraft type \'B738\' matches Boeing 737-800',
      details: 'Notes: Most common 737 variant'
    }
  ]
};

function runDemo() {
  try {
    console.log('Flight Schedule Validator Report Demo');
    console.log('=====================================\n');
    
    // Create output directory
    const outputDir = path.join(__dirname, '../../output/reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate a validation report
    console.log('Generating validation report...');
    const report = reportGenerator.generateValidationReport(mockResults, {
      filename: 'sample_flights.csv',
      recordCount: 6,
      entityType: 'flights',
      includeDetailedErrors: true,
      includeWarnings: true,
      includeInfoMessages: true
    });
    
    // Get the command line argument for output format
    const args = process.argv.slice(2);
    const outputFormat = args[0] || 'all';
    
    // Generate reports based on selected format
    if (outputFormat === 'json' || outputFormat === 'all') {
      const jsonPath = path.join(outputDir, 'validation-report.json');
      reportGenerator.exportToJson(report, jsonPath);
      console.log(`JSON report exported to: ${jsonPath}`);
    }
    
    if (outputFormat === 'csv' || outputFormat === 'all') {
      const csvPath = path.join(outputDir, 'validation-report.csv');
      reportGenerator.exportToCsv(report, csvPath);
      console.log(`CSV report exported to: ${csvPath}`);
    }
    
    if (outputFormat === 'html' || outputFormat === 'all') {
      const htmlPath = path.join(outputDir, 'validation-report.html');
      reportGenerator.exportToHtml(report, htmlPath, {
        includeCharts: true,
        includeInfoMessages: true,
        title: 'Flight Schedule Validation Report'
      });
      console.log(`HTML report exported to: ${htmlPath}`);
    }
    
    // Display a summary in the console
    console.log('\nValidation Summary:');
    console.log('------------------');
    console.log(`Status: ${report.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`Total records: ${report.recordCount}`);
    console.log(`Errors: ${report.errorCount}`);
    console.log(`Warnings: ${report.warningCount}`);
    console.log(`Info: ${report.infoCount}`);
    
    // Display detailed report
    console.log('\nDetailed Report:');
    console.log('---------------');
    const formattedReport = reportGenerator.formatReportForDisplay(report, {
      colorize: true,
      detailedErrors: 10,
      detailedWarnings: 10,
      showSummary: true,
      showInfoMessages: true
    });
    
    console.log(formattedReport);
    
    // API report example
    console.log('\nAPI Report Example:');
    console.log('------------------');
    const apiReport = reportGenerator.generateApiReport(report, {
      includeFullDetails: true
    });
    console.log(JSON.stringify(apiReport, null, 2));
    
    console.log('\nDemo completed successfully');
  } catch (error) {
    console.error('Error running demo:', error.message);
    console.error(error.stack);
  }
}

// Run the demo
runDemo(); 