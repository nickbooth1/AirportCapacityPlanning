// Using CommonJS requires
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const reportGenerator = require('../../src/lib/reportGenerator');

describe('Report Generator Module', () => {
  const mockValidationResults = {
    isValid: false,
    errors: [
      {
        severity: 'error',
        code: 'E001',
        field: 'ScheduledTime',
        recordId: 'FL123',
        message: 'Missing required field',
        row: 2,
        column: 'ScheduledTime'
      },
      {
        severity: 'error',
        code: 'E002',
        field: 'ScheduledTime',
        recordId: 'FL124',
        message: 'Invalid date format',
        value: '25/13/2023',
        row: 3,
        column: 'ScheduledTime',
        suggestion: 'Use format: YYYY-MM-DD'
      },
      {
        severity: 'error',
        code: 'E004',
        field: 'AircraftType',
        recordId: 'FL125',
        message: 'Aircraft type not found',
        value: 'A339',
        row: 4,
        column: 'AircraftType',
        suggestions: ['A330', 'A380', 'A320']
      }
    ],
    warnings: [
      {
        severity: 'warning',
        code: 'W001',
        field: 'TurnaroundTime',
        recordId: 'FL126',
        message: 'Turnaround time is less than minimum',
        value: 25,
        row: 5,
        column: 'TurnaroundTime'
      }
    ],
    info: [
      {
        severity: 'info',
        code: 'I001',
        field: 'ScheduledTime',
        recordId: 'FL127',
        message: 'Date format identified',
        details: 'Original: 2023-05-15, Parsed to ISO: 2023-05-15T00:00:00.000Z',
        row: 6,
        column: 'ScheduledTime'
      }
    ]
  };

  // Create a test directory for temporary files
  before(() => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  describe('generateValidationReport', () => {
    it('should generate a structured report from validation results', () => {
      const options = {
        filename: 'test_flights.csv',
        recordCount: 10,
        entityType: 'flights'
      };

      const report = reportGenerator.generateValidationReport(mockValidationResults, options);

      expect(report).to.be.an('object');
      expect(report.isValid).to.be.false;
      expect(report.filename).to.equal('test_flights.csv');
      expect(report.recordCount).to.equal(10);
      expect(report.entityType).to.equal('flights');
      expect(report.errorCount).to.equal(3);
      expect(report.warningCount).to.equal(1);
      expect(report.infoCount).to.equal(1);
      expect(report.categoryCounts).to.be.an('object');
      expect(report.errors).to.be.an('array').with.lengthOf(3);
      expect(report.warnings).to.be.an('array').with.lengthOf(1);
      expect(report.info).to.be.an('array').with.lengthOf(1);
    });

    it('should limit errors and warnings based on options', () => {
      const options = {
        filename: 'test_flights.csv',
        recordCount: 10,
        maxErrorsToInclude: 1
      };

      const report = reportGenerator.generateValidationReport(mockValidationResults, options);

      expect(report.errors.length).to.equal(1);
      expect(report.warnings.length).to.equal(1);
      expect(report.additionalInfo.truncated).to.be.true;
    });
  });

  describe('exportToJson', () => {
    const tempDir = path.join(__dirname, '../../temp');
    const jsonFile = path.join(tempDir, 'test-report.json');

    after(() => {
      if (fs.existsSync(jsonFile)) {
        fs.unlinkSync(jsonFile);
      }
    });

    it('should export a report to JSON file', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const filePath = reportGenerator.exportToJson(report, jsonFile);

      expect(fs.existsSync(filePath)).to.be.true;

      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(fileContent).to.be.an('object');
      expect(fileContent.isValid).to.be.false;
      expect(fileContent.errorCount).to.equal(3);
    });
  });

  describe('exportToCsv', () => {
    const tempDir = path.join(__dirname, '../../temp');
    const csvFile = path.join(tempDir, 'test-report.csv');

    after(() => {
      if (fs.existsSync(csvFile)) {
        fs.unlinkSync(csvFile);
      }
    });

    it('should export a report to CSV file', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const filePath = reportGenerator.exportToCsv(report, csvFile);

      expect(fs.existsSync(filePath)).to.be.true;

      const fileContent = fs.readFileSync(filePath, 'utf8');
      expect(fileContent).to.be.a('string');
      expect(fileContent).to.include('Severity,Code,Field,RecordID,Row,Column,Message,Value,SuggestedFix');
      expect(fileContent).to.include('ERROR,E001,ScheduledTime');
      expect(fileContent).to.include('WARNING,W001,TurnaroundTime');
      expect(fileContent).to.include('INFO,I001,ScheduledTime');
    });
  });
  
  describe('exportToHtml', () => {
    const tempDir = path.join(__dirname, '../../temp');
    const htmlFile = path.join(tempDir, 'test-report.html');

    after(() => {
      if (fs.existsSync(htmlFile)) {
        fs.unlinkSync(htmlFile);
      }
    });

    it('should export a report to HTML file', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const filePath = reportGenerator.exportToHtml(report, htmlFile);

      expect(fs.existsSync(filePath)).to.be.true;

      const fileContent = fs.readFileSync(filePath, 'utf8');
      expect(fileContent).to.be.a('string');
      expect(fileContent).to.include('<!DOCTYPE html>');
      expect(fileContent).to.include('Validation Report');
      expect(fileContent).to.include('Errors');
      expect(fileContent).to.include('Warnings');
      expect(fileContent).to.include('Info');
    });
  });

  describe('formatReportForDisplay', () => {
    it('should format a report for terminal display', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const formattedReport = reportGenerator.formatReportForDisplay(report, {
        colorize: false
      });

      expect(formattedReport).to.be.a('string');
      expect(formattedReport).to.include('=== VALIDATION REPORT ===');
      expect(formattedReport).to.include('Status: INVALID');
      expect(formattedReport).to.include('Errors: 3');
      expect(formattedReport).to.include('Warnings: 1');
      expect(formattedReport).to.include('Info: 1');
      expect(formattedReport).to.include('=== ERRORS ===');
      expect(formattedReport).to.include('=== WARNINGS ===');
      expect(formattedReport).to.include('=== INFO ===');
    });
  });

  describe('generateApiReport', () => {
    it('should generate a machine-readable report for API responses', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const apiReport = reportGenerator.generateApiReport(report);

      expect(apiReport).to.be.an('object');
      expect(apiReport.status).to.equal('invalid');
      expect(apiReport.summary).to.be.an('object');
      expect(apiReport.summary.errorCount).to.equal(3);
      expect(apiReport.summary.warningCount).to.equal(1);
      expect(apiReport.summary.categories).to.be.an('object');
    });

    it('should include full details when requested', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const apiReport = reportGenerator.generateApiReport(report, {
        includeFullDetails: true
      });

      expect(apiReport.details).to.be.an('object');
      expect(apiReport.details.errors).to.be.an('array');
      expect(apiReport.details.warnings).to.be.an('array');
      expect(apiReport.details.info).to.be.an('array');
      expect(apiReport.metadata).to.be.an('object');
    });
  });
}); 