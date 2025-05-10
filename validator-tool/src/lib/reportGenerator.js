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
    maxErrorsToInclude = 100
  } = options;
  
  // Count error types
  const errorCategories = {
    schemaErrors: 0,
    referenceErrors: 0,
    businessRuleViolations: 0,
    formatErrors: 0
  };
  
  // Categorize errors
  results.errors.forEach(error => {
    if (error.code?.startsWith('E001')) {
      errorCategories.schemaErrors++;
    } else if (error.code?.startsWith('E002') || error.code?.startsWith('E003')) {
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
  
  // Create report structure
  const report = {
    isValid: results.isValid,
    timestamp: new Date().toISOString(),
    filename,
    entityType,
    recordCount,
    errorCount: results.errors.length,
    warningCount: results.warnings.length,
    categoryCounts: errorCategories,
    errors: limitedErrors,
    warnings: limitedWarnings,
    additionalInfo: {
      truncated: (results.errors.length > limitedErrors.length || results.warnings.length > limitedWarnings.length),
      totalErrorCount: results.errors.length,
      totalWarningCount: results.warnings.length
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
  let csvContent = 'Severity,Code,Field,RecordID,Row,Message,Value\n';
  
  // Add errors
  report.errors.forEach(error => {
    csvContent += [
      'ERROR',
      error.code || '',
      error.field || '',
      `"${(error.recordId || '').replace(/"/g, '""')}"`,
      error.row || '',
      `"${(error.message || '').replace(/"/g, '""')}"`,
      `"${(error.value || '').toString().replace(/"/g, '""')}"`
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
      `"${(warning.message || '').replace(/"/g, '""')}"`,
      `"${(warning.value || '').toString().replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });
  
  // Write to file
  fs.writeFileSync(filePath, csvContent);
  
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
    schemaErrors: report.categoryCounts.schemaErrors,
    referenceErrors: report.categoryCounts.referenceErrors,
    businessRuleViolations: report.categoryCounts.businessRuleViolations,
    formatErrors: report.categoryCounts.formatErrors,
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
    showSummary = true
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
  output += `Warnings: ${color.yellow(report.warningCount.toString())}\n\n`;
  
  // Error categories
  if (showSummary && report.errorCount > 0) {
    output += color.bold('Error Categories:\n');
    output += `  Schema errors: ${color.red(report.categoryCounts.schemaErrors.toString())}\n`;
    output += `  Reference errors: ${color.red(report.categoryCounts.referenceErrors.toString())}\n`;
    output += `  Business rule violations: ${color.red(report.categoryCounts.businessRuleViolations.toString())}\n`;
    output += `  Format errors: ${color.red(report.categoryCounts.formatErrors.toString())}\n\n`;
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
      output += `Value: ${color.yellow(String(error.value || 'N/A'))}\n\n`;
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
      
      if (warning.suggestedFix) {
        output += `   Suggested fix: ${color.green(warning.suggestedFix)}\n`;
      }
      
      output += '\n';
    });
    
    if (report.warnings.length > detailedWarnings) {
      output += color.yellow(`... and ${report.warnings.length - detailedWarnings} more warnings\n\n`);
    }
  }
  
  return output;
}

module.exports = {
  generateValidationReport,
  exportToJson,
  exportToCsv,
  getErrorSummary,
  formatReportForDisplay
}; 