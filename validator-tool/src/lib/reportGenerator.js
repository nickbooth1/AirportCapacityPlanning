/**
 * Report Generator Module
 * Creates detailed validation reports in different formats
 */
const fs = require('fs');
const path = require('path');

/**
 * Generate a structured validation report
 * @param {Object} results - Validation results
 * @param {Object} options - Report options
 * @returns {Object} - Formatted report
 */
function generateValidationReport(results, options = {}) {
  const { 
    filename = '', 
    recordCount = 0, 
    entityType = 'flights',
    includeDetailedErrors = true,
    includeWarnings = true,
    includeInfoMessages = true,
    maxErrorsToInclude = 100
  } = options;
  
  // Count error types
  const errorCategories = {
    schemaErrors: 0,
    referenceErrors: 0,
    businessRuleViolations: 0,
    formatErrors: 0,
    dateFormatErrors: 0
  };
  
  // Categorize errors
  results.errors.forEach(error => {
    if (error.code?.startsWith('E001')) {
      errorCategories.schemaErrors++;
    } else if (error.code?.startsWith('E002')) {
      errorCategories.formatErrors++;
      
      // Check specifically for date format errors
      if (error.field && (
        error.field.toLowerCase().includes('time') || 
        error.field.toLowerCase().includes('date')
      )) {
        errorCategories.dateFormatErrors++;
      }
    } else if (error.code?.startsWith('E003')) {
      errorCategories.formatErrors++;
    } else if (error.code?.startsWith('E004')) {
      errorCategories.referenceErrors++;
    } else {
      errorCategories.businessRuleViolations++;
    }
  });
  
  // Limit the number of errors included in the report
  const limitedErrors = includeDetailedErrors 
    ? results.errors.slice(0, maxErrorsToInclude)
    : [];
  
  const limitedWarnings = includeWarnings 
    ? results.warnings.slice(0, maxErrorsToInclude)
    : [];
  
  const limitedInfo = includeInfoMessages && results.info
    ? results.info.slice(0, maxErrorsToInclude)
    : [];
  
  // Create report structure
  const report = {
    isValid: results.isValid,
    timestamp: new Date().toISOString(),
    filename,
    entityType,
    recordCount,
    errorCount: results.errors.length,
    warningCount: results.warnings.length,
    infoCount: results.info ? results.info.length : 0,
    categoryCounts: errorCategories,
    errors: limitedErrors,
    warnings: limitedWarnings,
    info: limitedInfo,
    additionalInfo: {
      truncated: (
        results.errors.length > limitedErrors.length || 
        results.warnings.length > limitedWarnings.length ||
        (results.info && results.info.length > limitedInfo.length)
      ),
      totalErrorCount: results.errors.length,
      totalWarningCount: results.warnings.length,
      totalInfoCount: results.info ? results.info.length : 0
    }
  };
  
  return report;
}

/**
 * Export report to JSON file
 * @param {Object} report - Report object
 * @param {string} filePath - Output file path
 * @returns {string} - Path to saved file
 */
function exportToJson(report, filePath) {
  const outputDir = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  
  return filePath;
}

/**
 * Export report to CSV file
 * @param {Object} report - Report object
 * @param {string} filePath - Output file path
 * @returns {string} - Path to saved file
 */
function exportToCsv(report, filePath) {
  const outputDir = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create CSV content
  let csvContent = 'Severity,Code,Field,RecordID,Row,Column,Message,Value,SuggestedFix\n';
  
  // Add errors
  report.errors.forEach(error => {
    csvContent += [
      'ERROR',
      error.code || '',
      error.field || '',
      `"${(error.recordId || '').replace(/"/g, '""')}"`,
      error.row || '',
      error.column || '',
      `"${(error.message || '').replace(/"/g, '""')}"`,
      `"${(error.value || '').toString().replace(/"/g, '""')}"`,
      `"${(error.suggestedFix || '').toString().replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });
  
  // Add warnings
  report.warnings.forEach(warning => {
    csvContent += [
      'WARNING',
      warning.code || '',
      warning.field || '',
      `"${(warning.recordId || '').replace(/"/g, '""')}"`,
      warning.row || '',
      warning.column || '',
      `"${(warning.message || '').replace(/"/g, '""')}"`,
      `"${(warning.value || '').toString().replace(/"/g, '""')}"`,
      `"${(warning.suggestedFix || '').toString().replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });
  
  // Add info messages
  if (report.info && report.info.length > 0) {
    report.info.forEach(info => {
      csvContent += [
        'INFO',
        info.code || '',
        info.field || '',
        `"${(info.recordId || '').replace(/"/g, '""')}"`,
        info.row || '',
        info.column || '',
        `"${(info.message || '').replace(/"/g, '""')}"`,
        `"${(info.value || '').toString().replace(/"/g, '""')}"`,
        ''
      ].join(',') + '\n';
    });
  }
  
  // Write to file
  fs.writeFileSync(filePath, csvContent);
  
  return filePath;
}

/**
 * Export report to HTML file
 * @param {Object} report - Report object
 * @param {string} filePath - Output file path
 * @param {Object} options - HTML options
 * @returns {string} - Path to saved file
 */
function exportToHtml(report, filePath, options = {}) {
  const {
    includeCharts = true,
    includeInfoMessages = true,
    maxItemsPerTable = 100,
    title = 'Validation Report'
  } = options;
  
  const outputDir = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // HTML template with embedded styles
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 5px solid #007bff;
    }
    h1, h2, h3 {
      color: #007bff;
    }
    .summary-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-box {
      flex: 1 1 250px;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .valid { background-color: #d4edda; border-left: 4px solid #28a745; }
    .invalid { background-color: #f8d7da; border-left: 4px solid #dc3545; }
    .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; }
    .info-box { background-color: #d1ecf1; border-left: 4px solid #17a2b8; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #f8f9fa;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #dee2e6;
      vertical-align: top;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .error { background-color: #fff2f2; }
    .warning { background-color: #fffbf0; }
    .info { background-color: #f0f8ff; }
    .badge {
      display: inline-block;
      padding: 3px 7px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .badge-error { background-color: #dc3545; }
    .badge-warning { background-color: #ffc107; color: #212529; }
    .badge-info { background-color: #17a2b8; }
    
    .chart-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    .chart {
      flex: 1 1 300px;
      min-height: 300px;
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 15px;
    }
    .bar-chart {
      display: flex;
      flex-direction: column;
      height: 220px;
    }
    .bar-container {
      display: flex;
      align-items: flex-end;
      height: 200px;
      gap: 5px;
    }
    .bar {
      flex: 1;
      background-color: #007bff;
      min-width: 30px;
      position: relative;
      transition: height 0.5s;
    }
    .bar-error { background-color: #dc3545; }
    .bar-warning { background-color: #ffc107; }
    .bar-label {
      text-align: center;
      font-size: 12px;
      padding: 5px 0;
      word-break: break-word;
    }
    .bar span {
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      text-align: center;
      font-weight: bold;
    }
    footer {
      margin-top: 40px;
      border-top: 1px solid #dee2e6;
      padding-top: 20px;
      font-size: 14px;
      color: #6c757d;
      text-align: center;
    }
    .suggestions {
      margin-top: 5px;
      font-style: italic;
      color: #28a745;
    }
  </style>
</head>
<body>
  <header>
    <h1>Flight Schedule Validation Report</h1>
    <p>File: <strong>${report.filename}</strong> | Generated: <strong>${new Date(report.timestamp).toLocaleString()}</strong></p>
  </header>

  <div class="summary-container">
    <div class="summary-box ${report.isValid ? 'valid' : 'invalid'}">
      <h3>Status: ${report.isValid ? 'VALID' : 'INVALID'}</h3>
      <p>Records processed: <strong>${report.recordCount}</strong></p>
    </div>
    <div class="summary-box ${report.errorCount > 0 ? 'invalid' : 'valid'}">
      <h3>Errors: ${report.errorCount}</h3>
      <p>
        Schema: <strong>${report.categoryCounts.schemaErrors}</strong><br>
        Reference: <strong>${report.categoryCounts.referenceErrors}</strong><br>
        Business rules: <strong>${report.categoryCounts.businessRuleViolations}</strong><br>
        Format: <strong>${report.categoryCounts.formatErrors}</strong>
      </p>
    </div>
    <div class="summary-box warning-box">
      <h3>Warnings: ${report.warningCount}</h3>
      <p>Items that may require attention but don't invalidate the data</p>
    </div>
    <div class="summary-box info-box">
      <h3>Info: ${report.infoCount}</h3>
      <p>Informational messages about the processed data</p>
    </div>
  </div>
`;

  // Add charts if enabled
  if (includeCharts) {
    html += `
  <h2>Validation Issues Overview</h2>
  <div class="chart-container">
    <div class="chart">
      <h3>Error Categories</h3>
      <div class="bar-chart">
        <div class="bar-container">
          <div class="bar bar-error" style="height: ${Math.min(100, (report.categoryCounts.schemaErrors / Math.max(1, report.errorCount) * 100))}%">
            <span>${report.categoryCounts.schemaErrors}</span>
          </div>
          <div class="bar bar-error" style="height: ${Math.min(100, (report.categoryCounts.referenceErrors / Math.max(1, report.errorCount) * 100))}%">
            <span>${report.categoryCounts.referenceErrors}</span>
          </div>
          <div class="bar bar-error" style="height: ${Math.min(100, (report.categoryCounts.businessRuleViolations / Math.max(1, report.errorCount) * 100))}%">
            <span>${report.categoryCounts.businessRuleViolations}</span>
          </div>
          <div class="bar bar-error" style="height: ${Math.min(100, (report.categoryCounts.formatErrors / Math.max(1, report.errorCount) * 100))}%">
            <span>${report.categoryCounts.formatErrors}</span>
          </div>
          <div class="bar bar-warning" style="height: ${Math.min(100, (report.warningCount / Math.max(1, report.errorCount + report.warningCount) * 100))}%">
            <span>${report.warningCount}</span>
          </div>
        </div>
        <div class="bar-container" style="height: auto">
          <div class="bar-label">Schema</div>
          <div class="bar-label">Reference</div>
          <div class="bar-label">Business Rules</div>
          <div class="bar-label">Format</div>
          <div class="bar-label">Warnings</div>
        </div>
      </div>
    </div>
    <!-- Additional charts could be added here -->
  </div>
`;
  }

  // Add error table if there are errors
  if (report.errors.length > 0) {
    html += `
  <h2>Errors <span class="badge badge-error">${report.errorCount}</span></h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Field</th>
        <th>Record/Row</th>
        <th>Message</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
`;

    const displayErrors = report.errors.slice(0, maxItemsPerTable);
    displayErrors.forEach(error => {
      html += `
      <tr class="error">
        <td><strong>${error.code || ''}</strong></td>
        <td>${error.field || ''}</td>
        <td>${error.recordId || ''} ${error.row ? `(Row ${error.row})` : ''}</td>
        <td>${error.message || ''}${error.details ? `<br><small>${error.details}</small>` : ''}</td>
        <td>${error.value || ''}
          ${error.suggestedFix ? `<div class="suggestions">Suggestion: ${error.suggestedFix}</div>` : ''}
        </td>
      </tr>`;
    });

    if (report.errors.length > maxItemsPerTable) {
      html += `
      <tr>
        <td colspan="5" style="text-align: center;">
          <em>...and ${report.errors.length - maxItemsPerTable} more errors</em>
        </td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  // Add warning table if there are warnings
  if (report.warnings.length > 0) {
    html += `
  <h2>Warnings <span class="badge badge-warning">${report.warningCount}</span></h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Field</th>
        <th>Record/Row</th>
        <th>Message</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>`;

    const displayWarnings = report.warnings.slice(0, maxItemsPerTable);
    displayWarnings.forEach(warning => {
      html += `
      <tr class="warning">
        <td><strong>${warning.code || ''}</strong></td>
        <td>${warning.field || ''}</td>
        <td>${warning.recordId || ''} ${warning.row ? `(Row ${warning.row})` : ''}</td>
        <td>${warning.message || ''}${warning.details ? `<br><small>${warning.details}</small>` : ''}</td>
        <td>${warning.value || ''}
          ${warning.suggestions ? `<div class="suggestions">Did you mean: ${warning.suggestions.join(', ')}</div>` : ''}
          ${warning.suggestedFix && !warning.suggestions ? `<div class="suggestions">Suggestion: ${warning.suggestedFix}</div>` : ''}
        </td>
      </tr>`;
    });

    if (report.warnings.length > maxItemsPerTable) {
      html += `
      <tr>
        <td colspan="5" style="text-align: center;">
          <em>...and ${report.warnings.length - maxItemsPerTable} more warnings</em>
        </td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  // Add info table if enabled and there are info messages
  if (includeInfoMessages && report.info && report.info.length > 0) {
    html += `
  <h2>Info <span class="badge badge-info">${report.infoCount}</span></h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Field</th>
        <th>Record/Row</th>
        <th>Message</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>`;

    const displayInfo = report.info.slice(0, maxItemsPerTable);
    displayInfo.forEach(info => {
      html += `
      <tr class="info">
        <td><strong>${info.code || ''}</strong></td>
        <td>${info.field || ''}</td>
        <td>${info.recordId || ''} ${info.row ? `(Row ${info.row})` : ''}</td>
        <td>${info.message || ''}</td>
        <td>${info.details || ''}</td>
      </tr>`;
    });

    if (report.info.length > maxItemsPerTable) {
      html += `
      <tr>
        <td colspan="5" style="text-align: center;">
          <em>...and ${report.info.length - maxItemsPerTable} more info messages</em>
        </td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  html += `
  <footer>
    <p>Generated by Flight Schedule Validator on ${new Date().toLocaleString()}</p>
  </footer>
</body>
</html>`;

  // Write to file
  fs.writeFileSync(filePath, html);
  
  return filePath;
}

/**
 * Generate a summary of validation errors
 * @param {Object} report - Validation report
 * @returns {Object} - Error summary
 */
function getErrorSummary(report) {
  // Count field-specific errors
  const fieldErrors = {};
  
  report.errors.forEach(error => {
    if (!error.field) return;
    
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = {
        count: 0,
        samples: []
      };
    }
    
    fieldErrors[error.field].count++;
    
    if (fieldErrors[error.field].samples.length < 3) {
      fieldErrors[error.field].samples.push({
        recordId: error.recordId,
        message: error.message,
        value: error.value
      });
    }
  });
  
  // Generate top errors by frequency
  const topErrorsByField = Object.entries(fieldErrors)
    .map(([field, data]) => ({
      field,
      count: data.count,
      samples: data.samples
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    valid: report.isValid,
    totalErrors: report.errorCount,
    totalWarnings: report.warningCount,
    totalInfoMessages: report.infoCount,
    schemaErrors: report.categoryCounts.schemaErrors,
    referenceErrors: report.categoryCounts.referenceErrors,
    businessRuleViolations: report.categoryCounts.businessRuleViolations,
    formatErrors: report.categoryCounts.formatErrors,
    dateFormatErrors: report.categoryCounts.dateFormatErrors,
    topErrorsByField: topErrorsByField.slice(0, 5)
  };
}

/**
 * Format a validation report for terminal display
 * @param {Object} report - Validation report
 * @param {Object} options - Display options
 * @returns {string} - Formatted report string
 */
function formatReportForDisplay(report, options = {}) {
  const { 
    colorize = true, 
    detailedErrors = 5,
    detailedWarnings = 5,
    detailedInfo = 3,
    showSummary = true,
    showInfoMessages = true
  } = options;
  
  // Helper function to colorize text for terminal
  const color = {
    red: text => colorize ? `\x1b[31m${text}\x1b[0m` : text,
    green: text => colorize ? `\x1b[32m${text}\x1b[0m` : text,
    yellow: text => colorize ? `\x1b[33m${text}\x1b[0m` : text,
    blue: text => colorize ? `\x1b[34m${text}\x1b[0m` : text,
    magenta: text => colorize ? `\x1b[35m${text}\x1b[0m` : text,
    cyan: text => colorize ? `\x1b[36m${text}\x1b[0m` : text,
    bold: text => colorize ? `\x1b[1m${text}\x1b[0m` : text
  };
  
  let output = '';
  
  // Report header
  output += color.bold('=== VALIDATION REPORT ===\n\n');
  
  // Status summary
  output += `Status: ${report.isValid ? color.green('VALID') : color.red('INVALID')}\n`;
  output += `File: ${report.filename}\n`;
  output += `Records: ${report.recordCount}\n`;
  output += `Errors: ${color.red(report.errorCount.toString())}\n`;
  output += `Warnings: ${color.yellow(report.warningCount.toString())}\n`;
  if (report.infoCount) {
    output += `Info: ${color.blue(report.infoCount.toString())}\n`;
  }
  output += `\n`;
  
  // Error categories
  if (showSummary && report.errorCount > 0) {
    output += color.bold('Error Categories:\n');
    output += `  Schema errors: ${color.red(report.categoryCounts.schemaErrors.toString())}\n`;
    output += `  Reference errors: ${color.red(report.categoryCounts.referenceErrors.toString())}\n`;
    output += `  Business rule violations: ${color.red(report.categoryCounts.businessRuleViolations.toString())}\n`;
    output += `  Format errors: ${color.red(report.categoryCounts.formatErrors.toString())}\n`;
    if (report.categoryCounts.dateFormatErrors > 0) {
      output += `    - Date format errors: ${color.red(report.categoryCounts.dateFormatErrors.toString())}\n`;
    }
    output += `\n`;
  }
  
  // Detailed errors
  if (report.errors.length > 0) {
    output += color.bold(color.red('=== ERRORS ===\n'));
    
    const errorsToShow = report.errors.slice(0, detailedErrors);
    errorsToShow.forEach((error, index) => {
      output += `${index + 1}. ${color.red(error.code || 'ERROR')}: ${error.message}\n`;
      output += `   Field: ${color.cyan(error.field || 'N/A')}, `;
      output += `Record: ${color.cyan(error.recordId || 'N/A')}, `;
      if (error.row) output += `Row: ${color.cyan(error.row.toString())}, `;
      output += `Value: ${color.yellow(String(error.value || 'N/A'))}\n`;
      
      if (error.details) {
        output += `   Details: ${error.details}\n`;
      }
      
      if (error.suggestedFix) {
        output += `   Suggested fix: ${color.green(error.suggestedFix)}\n`;
      } else if (error.suggestions && error.suggestions.length > 0) {
        output += `   Did you mean: ${color.green(error.suggestions.join(', '))}\n`;
      }
      
      output += `\n`;
    });
    
    if (report.errors.length > detailedErrors) {
      output += color.yellow(`... and ${report.errors.length - detailedErrors} more errors\n\n`);
    }
  }
  
  // Detailed warnings
  if (report.warnings.length > 0) {
    output += color.bold(color.yellow('=== WARNINGS ===\n'));
    
    const warningsToShow = report.warnings.slice(0, detailedWarnings);
    warningsToShow.forEach((warning, index) => {
      output += `${index + 1}. ${color.yellow(warning.code || 'WARNING')}: ${warning.message}\n`;
      output += `   Field: ${color.cyan(warning.field || 'N/A')}, `;
      output += `Record: ${color.cyan(warning.recordId || 'N/A')}, `;
      if (warning.row) output += `Row: ${color.cyan(warning.row.toString())}, `;
      output += `Value: ${color.yellow(String(warning.value || 'N/A'))}\n`;
      
      if (warning.details) {
        output += `   Details: ${warning.details}\n`;
      }
      
      if (warning.suggestedFix) {
        output += `   Suggested fix: ${color.green(warning.suggestedFix)}\n`;
      } else if (warning.suggestions && warning.suggestions.length > 0) {
        output += `   Did you mean: ${color.green(warning.suggestions.join(', '))}\n`;
      }
      
      output += `\n`;
    });
    
    if (report.warnings.length > detailedWarnings) {
      output += color.yellow(`... and ${report.warnings.length - detailedWarnings} more warnings\n\n`);
    }
  }
  
  // Detailed info messages
  if (showInfoMessages && report.info && report.info.length > 0) {
    output += color.bold(color.blue('=== INFO ===\n'));
    
    const infoToShow = report.info.slice(0, detailedInfo);
    infoToShow.forEach((info, index) => {
      output += `${index + 1}. ${color.blue(info.code || 'INFO')}: ${info.message}\n`;
      if (info.field) output += `   Field: ${color.cyan(info.field)}, `;
      if (info.recordId) output += `Record: ${color.cyan(info.recordId)}, `;
      if (info.row) output += `Row: ${color.cyan(info.row.toString())}, `;
      output += `\n`;
      
      if (info.details) {
        output += `   Details: ${info.details}\n`;
      }
      
      output += `\n`;
    });
    
    if (report.info.length > detailedInfo) {
      output += color.blue(`... and ${report.info.length - detailedInfo} more info messages\n\n`);
    }
  }
  
  return output;
}

/**
 * Generate a machine-readable report suitable for API responses
 * @param {Object} report - Validation report
 * @param {Object} options - Options for the API report
 * @returns {Object} - API-friendly report
 */
function generateApiReport(report, options = {}) {
  const {
    includeFullDetails = false,
    maxItems = 50
  } = options;
  
  // Create a simplified version for API responses
  const apiReport = {
    status: report.isValid ? 'valid' : 'invalid',
    summary: {
      recordCount: report.recordCount,
      errorCount: report.errorCount,
      warningCount: report.warningCount,
      infoCount: report.infoCount || 0,
      categories: {
        schema: report.categoryCounts.schemaErrors,
        reference: report.categoryCounts.referenceErrors,
        businessRules: report.categoryCounts.businessRuleViolations,
        format: report.categoryCounts.formatErrors,
        dateFormat: report.categoryCounts.dateFormatErrors || 0
      }
    },
    timestamp: report.timestamp
  };
  
  // Include details if requested
  if (includeFullDetails) {
    apiReport.details = {
      errors: report.errors.slice(0, maxItems).map(cleanIssueForApi),
      warnings: report.warnings.slice(0, maxItems).map(cleanIssueForApi),
      info: (report.info || []).slice(0, maxItems).map(cleanIssueForApi)
    };
    
    // Add metadata for pagination/truncation
    apiReport.metadata = {
      truncated: report.additionalInfo.truncated,
      totalErrors: report.additionalInfo.totalErrorCount,
      totalWarnings: report.additionalInfo.totalWarningCount,
      totalInfo: report.additionalInfo.totalInfoCount || 0
    };
  } else {
    // Just include counts of issues by field
    const errorsByField = countIssuesByField(report.errors);
    const warningsByField = countIssuesByField(report.warnings);
    
    apiReport.fieldSummary = {
      errors: errorsByField,
      warnings: warningsByField
    };
  }
  
  return apiReport;
}

/**
 * Helper to clean up issue objects for API responses
 * @private
 * @param {Object} issue - Issue object
 * @returns {Object} - Cleaned issue
 */
function cleanIssueForApi(issue) {
  return {
    code: issue.code,
    field: issue.field,
    message: issue.message,
    recordId: issue.recordId,
    row: issue.row,
    column: issue.column,
    suggestions: issue.suggestions || (issue.suggestedFix ? [issue.suggestedFix] : undefined)
  };
}

/**
 * Helper to count issues by field
 * @private
 * @param {Array} issues - Array of issue objects
 * @returns {Object} - Counts by field
 */
function countIssuesByField(issues) {
  const fieldCounts = {};
  
  issues.forEach(issue => {
    if (issue.field) {
      fieldCounts[issue.field] = (fieldCounts[issue.field] || 0) + 1;
    }
  });
  
  return fieldCounts;
}

module.exports = {
  generateValidationReport,
  exportToJson,
  exportToCsv,
  exportToHtml,
  getErrorSummary,
  formatReportForDisplay,
  generateApiReport
}; 