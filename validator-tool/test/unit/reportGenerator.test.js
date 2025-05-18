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
        suggestion: 'Use YYYY-MM-DD format'
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
      expect(report.categoryCounts.schemaErrors).to.equal(1);
      expect(report.categoryCounts.referenceErrors).to.equal(1);
      expect(report.categoryCounts.formatErrors).to.equal(1);
      expect(report.categoryCounts.dateFormatErrors).to.equal(1);
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

    before(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

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

    before(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

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

    before(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

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
      expect(fileContent).to.include('Flight Schedule Validation Report');
      expect(fileContent).to.include('Errors <span class="badge badge-error">3</span>');
      expect(fileContent).to.include('Warnings <span class="badge badge-warning">1</span>');
      expect(fileContent).to.include('Info <span class="badge badge-info">1</span>');
    });
  });

  describe('getErrorSummary', () => {
    it('should generate a summary of validation errors', () => {
      const report = reportGenerator.generateValidationReport(mockValidationResults, {
        filename: 'test_flights.csv',
        recordCount: 10
      });

      const summary = reportGenerator.getErrorSummary(report);

      expect(summary).to.be.an('object');
      expect(summary.valid).to.be.false;
      expect(summary.totalErrors).to.equal(3);
      expect(summary.totalWarnings).to.equal(1);
      expect(summary.schemaErrors).to.equal(1);
      expect(summary.referenceErrors).to.equal(1);
      expect(summary.formatErrors).to.equal(1);
      expect(summary.dateFormatErrors).to.equal(1);
      expect(summary.topErrorsByField).to.be.an('array');
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
      expect(apiReport.fieldSummary).to.be.an('object');
      expect(apiReport.fieldSummary.errors).to.be.an('object');
      expect(apiReport.fieldSummary.warnings).to.be.an('object');
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