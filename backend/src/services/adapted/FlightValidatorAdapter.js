const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const db = require('../../db');

/**
 * FlightValidatorAdapter
 * 
 * This adapter integrates the CLI-based Flight QA Tool with the web application,
 * allowing validation of flight data through the existing validation rules.
 */
class FlightValidatorAdapter {
  constructor() {
    // Path to the validator CLI tool - update as needed
    this.validatorPath = path.resolve(__dirname, '../../../../validator-tool/src/cli/index.js');
    
    // Path to reference data directory
    this.referenceDataDir = path.resolve(__dirname, '../../../../validator-tool/reference-data');
    
    // Temporary directory for input/output files
    this.tempDir = path.resolve(__dirname, '../../../temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Validate flights from an uploaded file
   * @param {number} uploadId - ID of the upload to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateFlights(uploadId) {
    try {
      console.log(`Validating flights for upload ID: ${uploadId}`);
      
      // Get upload record
      const upload = await db('flight_uploads').where({ id: uploadId }).first();
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }
      
      // Generate temporary file paths
      const tempInputPath = path.join(this.tempDir, `upload_${uploadId}_input.csv`);
      const tempOutputPath = path.join(this.tempDir, `upload_${uploadId}_validation.json`);
      
      // Extract flights from the database and save to a temporary CSV file
      await this._exportFlightsToCSV(uploadId, tempInputPath);
      
      // Build the validator CLI command
      const cmd = `node ${this.validatorPath} validate "${tempInputPath}" --output "${tempOutputPath}" --reference-data "${this.referenceDataDir}" --format csv --no-interactive`;
      
      console.log(`Executing validator command: ${cmd}`);
      
      // Run the validator CLI
      await exec(cmd);
      
      // Read validation results
      const validationResults = await this.readValidationResults(tempOutputPath);
      
      // Update flight records in database with validation results
      await this.updateFlightValidation(uploadId, validationResults);
      
      // Clean up temporary files
      this._cleanupTempFiles([tempInputPath, tempOutputPath]);
      
      return {
        uploadId,
        totalFlights: validationResults.summary.totalRecords || 0,
        validFlights: validationResults.summary.validRecords || 0,
        invalidFlights: validationResults.summary.invalidRecords || 0
      };
    } catch (error) {
      console.error('Error in validateFlights:', error);
      throw error;
    }
  }
  
  /**
   * Read validation results from output file
   * @param {string} filePath - Path to validation results file
   * @returns {Promise<Object>} Parsed validation results
   */
  async readValidationResults(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Validation results file not found: ${filePath}`);
      }
      
      // Read and parse the results
      const resultsJson = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(resultsJson);
    } catch (error) {
      console.error('Error reading validation results:', error);
      throw error;
    }
  }
  
  /**
   * Update flight records with validation results
   * @param {number} uploadId - Upload ID
   * @param {Object} validationResults - Results from validator
   * @returns {Promise<void>}
   */
  async updateFlightValidation(uploadId, validationResults) {
    try {
      // Start transaction
      await db.transaction(async trx => {
        // Process valid records
        if (validationResults.valid && validationResults.valid.length > 0) {
          // Bulk update to valid
          const flightIds = validationResults.valid.map(record => {
            // Map record identifier to flight ID based on your schema
            return this._findFlightId(uploadId, record);
          }).filter(id => id !== null);
          
          if (flightIds.length > 0) {
            await trx('flights')
              .whereIn('id', flightIds)
              .update({
                validation_status: 'valid',
                validation_errors: null
              });
          }
        }
        
        // Process invalid records
        if (validationResults.invalid && validationResults.invalid.length > 0) {
          for (const record of validationResults.invalid) {
            const flightId = this._findFlightId(uploadId, record);
            if (flightId) {
              // Transform errors to the format used in database
              const errors = record.errors.map(err => ({
                field: err.field,
                code: err.code,
                severity: err.severity || 'error',
                message: err.message
              }));
              
              // Update flight record
              await trx('flights')
                .where('id', flightId)
                .update({
                  validation_status: 'invalid',
                  validation_errors: JSON.stringify(errors)
                });
              
              // Insert validation error records
              const errorRecords = errors.map(error => ({
                flight_id: flightId,
                error_type: error.code.toLowerCase(),
                error_severity: error.severity,
                error_message: error.message,
                created_at: new Date(),
                updated_at: new Date()
              }));
              
              if (errorRecords.length > 0) {
                await trx('flight_validation_errors').insert(errorRecords);
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error updating flight validation:', error);
      throw error;
    }
  }
  
  /**
   * Export flights from database to CSV file
   * @param {number} uploadId - Upload ID
   * @param {string} outputPath - Path to output CSV file
   * @returns {Promise<void>}
   */
  async _exportFlightsToCSV(uploadId, outputPath) {
    try {
      // Get flights from database
      const flights = await db('flights')
        .where({ upload_id: uploadId })
        .select('*');
      
      if (flights.length === 0) {
        throw new Error(`No flights found for upload ${uploadId}`);
      }
      
      // Convert to CSV format (simple implementation)
      const headers = Object.keys(flights[0]).join(',');
      const rows = flights.map(flight => 
        Object.values(flight).map(val => 
          val === null ? '' : `"${String(val).replace(/"/g, '""')}"`
        ).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      
      // Write to file
      fs.writeFileSync(outputPath, csv, 'utf8');
      
      console.log(`Exported ${flights.length} flights to ${outputPath}`);
    } catch (error) {
      console.error('Error exporting flights to CSV:', error);
      throw error;
    }
  }
  
  /**
   * Find flight ID from validation record
   * @param {number} uploadId - Upload ID
   * @param {Object} record - Validation record
   * @returns {number|null} Flight ID or null if not found
   */
  async _findFlightId(uploadId, record) {
    try {
      // This will depend on your data model and how you identify flights
      // Example implementation assuming we match by flight number and scheduled time
      const flight = await db('flights')
        .where({
          upload_id: uploadId,
          flight_number: record.FlightNumber,
          scheduled_datetime: new Date(record.ScheduledTime)
        })
        .first();
      
      return flight ? flight.id : null;
    } catch (error) {
      console.error('Error finding flight ID:', error);
      return null;
    }
  }
  
  /**
   * Clean up temporary files
   * @param {Array<string>} filePaths - Paths to files to delete
   */
  _cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
        }
      }
    }
  }
  
  /**
   * Map validation results to standard format
   * @param {Object} rawResults - Raw results from validator
   * @returns {Object} Standardized validation results
   */
  mapValidationResults(rawResults) {
    // Transform the raw validation results to the expected format
    return {
      totalFlights: rawResults.summary.totalRecords || 0,
      validFlights: rawResults.summary.validRecords || 0,
      invalidFlights: rawResults.summary.invalidRecords || 0,
      errors: this._aggregateErrors(rawResults.invalid || [])
    };
  }
  
  /**
   * Aggregate validation errors
   * @param {Array} invalidRecords - Invalid records
   * @returns {Object} Aggregated errors by type
   */
  _aggregateErrors(invalidRecords) {
    const errorsByType = {};
    
    for (const record of invalidRecords) {
      if (record.errors && Array.isArray(record.errors)) {
        for (const error of record.errors) {
          const type = error.code || 'UNKNOWN';
          errorsByType[type] = errorsByType[type] || { count: 0, examples: [] };
          errorsByType[type].count++;
          
          // Add an example if we don't have too many
          if (errorsByType[type].examples.length < 3) {
            errorsByType[type].examples.push({
              message: error.message,
              field: error.field,
              record: this._summarizeRecord(record)
            });
          }
        }
      }
    }
    
    return errorsByType;
  }
  
  /**
   * Create a summary of a record for error reporting
   * @param {Object} record - Record to summarize
   * @returns {Object} Summarized record
   */
  _summarizeRecord(record) {
    // Pick the most relevant fields for identification
    return {
      FlightNumber: record.FlightNumber,
      AirlineCode: record.AirlineCode,
      ScheduledTime: record.ScheduledTime,
      FlightNature: record.FlightNature
    };
  }
  
  /**
   * Generate a validation summary
   * @param {Object} results - Validation results
   * @returns {Object} Summary statistics
   */
  generateValidationSummary(results) {
    return {
      total: results.totalFlights,
      valid: results.validFlights,
      invalid: results.invalidFlights,
      validationRate: results.totalFlights ? 
        Math.round((results.validFlights / results.totalFlights) * 100) : 0,
      errorTypes: Object.keys(results.errors || {}).length,
      mostCommonErrors: this._getMostCommonErrors(results.errors || {}, 5)
    };
  }
  
  /**
   * Get most common error types
   * @param {Object} errors - Aggregated errors
   * @param {number} limit - Maximum number to return
   * @returns {Array} Most common errors
   */
  _getMostCommonErrors(errors, limit = 5) {
    return Object.entries(errors)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([type, data]) => ({
        type,
        count: data.count,
        example: data.examples[0]?.message || 'No example'
      }));
  }
}

module.exports = FlightValidatorAdapter; 