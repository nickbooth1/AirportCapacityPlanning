const db = require('../db');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const { performance } = require('perf_hooks');
const xlsx = require('xlsx');
const { Parser } = require('json2csv');
const csvParser = require('csv-parser');
const through2 = require('through2');
const RepositoryValidationService = require('./RepositoryValidationService');

/**
 * Batch size for processing and database operations
 * @type {number}
 */
const BATCH_SIZE = 1000;

/**
 * Helper to create batch processing streams
 * @param {Function} processBatch - Function to process a batch of records
 * @param {number} size - Batch size
 * @returns {object} - Streaming transform
 */
const createBatcher = (processBatch, size = BATCH_SIZE) => {
  let batch = [];
  
  return through2.obj(
    function (chunk, enc, callback) {
      batch.push(chunk);
      
      if (batch.length >= size) {
        processBatch(batch)
          .then(() => {
            batch = [];
            callback();
          })
          .catch(err => callback(err));
      } else {
        callback();
      }
    },
    function (callback) {
      if (batch.length > 0) {
        processBatch(batch)
          .then(() => callback())
          .catch(err => callback(err));
      } else {
        callback();
      }
    }
  );
};

class FlightValidationService {
  constructor() {
    this.repositoryService = new RepositoryValidationService();
    this.validationCache = {};
    this.resultCache = {};
    this.statsCache = {};
  }

  /**
   * Validate flight data for a specific upload
   * Uses streaming and batch processing for high performance
   * @param {number} uploadId - The ID of the upload to validate
   * @returns {Promise<Object>} - Validation results summary
   */
  async validateFlightData(uploadId) {
    console.log(`Starting validation for upload ${uploadId}`);
    const startTime = performance.now();
    
    try {
      // Get the upload record
      const upload = await db('flight_uploads').where({ id: uploadId }).first();
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }
      
      // Create or update validation record
      let validation = await db('flight_validations')
        .where({ upload_id: uploadId })
        .first();
      
      if (!validation) {
        // Create new validation record
        const [validationId] = await db('flight_validations')
          .insert({
            upload_id: uploadId,
            validation_status: 'in_progress',
            started_at: new Date()
          });
        
        validation = await db('flight_validations')
          .where({ id: validationId })
          .first();
      } else {
        // Update existing validation record
        await db('flight_validations')
          .where({ id: validation.id })
          .update({
            validation_status: 'in_progress',
            valid_count: 0,
            invalid_count: 0,
            started_at: new Date(),
            completed_at: null
          });
      }
      
      // Process in batches using streams
      let validCount = 0;
      let invalidCount = 0;
      let totalProcessed = 0;
      
      const fileStream = fs.createReadStream(upload.file_path);
      
      const handleBatch = async (flightBatch) => {
        // Validate flights in parallel within batch
        const validationPromises = flightBatch.map(flight => this.validateSingleFlight({
          ...flight,
          upload_id: uploadId
        }));
        
        const validationResults = await Promise.all(validationPromises);
        
        // Prepare updates for batch processing
        const toUpdate = validationResults.map(result => {
          const updateData = {
            id: result.flightId,
            validation_status: result.isValid ? 'valid' : 'invalid',
            validation_errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null
          };
          
          // Add enriched data if available
          if (result.enrichedData) {
            if (result.enrichedData.airline_name) {
              updateData.airline_name = result.enrichedData.airline_name;
            }
            if (result.enrichedData.origin_destination_name) {
              updateData.origin_destination_name = result.enrichedData.origin_destination_name;
            }
          }
          
          return updateData;
        });
        
        // Count results
        validCount += validationResults.filter(r => r.isValid).length;
        invalidCount += validationResults.filter(r => !r.isValid).length;
        totalProcessed += flightBatch.length;
        
        // Update database in a single transaction for better performance
        await db.transaction(async (trx) => {
          // Process updates in chunks to avoid query size limits
          const updateChunks = [];
          for (let i = 0; i < toUpdate.length; i += 500) {
            updateChunks.push(toUpdate.slice(i, i + 500));
          }
          
          for (const chunk of updateChunks) {
            // Build a case statement for each field to update
            // This is more efficient than running separate queries
            await trx.raw(`
              UPDATE flights 
              SET validation_status = CASE 
                ${chunk.map(f => `WHEN id = ${f.id} THEN '${f.validation_status}'`).join(' ')}
              END,
              validation_errors = CASE 
                ${chunk.map(f => `WHEN id = ${f.id} THEN ${f.validation_errors ? `'${f.validation_errors.replace(/'/g, "''")}'` : 'NULL'}`).join(' ')}
              END,
              airline_name = CASE 
                ${chunk.map(f => `WHEN id = ${f.id} THEN ${f.airline_name ? `'${f.airline_name.replace(/'/g, "''")}'` : 'NULL'}`).join(' ')}
              END,
              origin_destination_name = CASE 
                ${chunk.map(f => `WHEN id = ${f.id} THEN ${f.origin_destination_name ? `'${f.origin_destination_name.replace(/'/g, "''")}'` : 'NULL'}`).join(' ')}
              END
              WHERE id IN (${chunk.map(f => f.id).join(',')})
            `);
          }
          
          // Create validation error records for invalid flights
          const errorRecords = [];
          
          for (const result of validationResults) {
            if (!result.isValid && result.errors.length > 0) {
              result.errors.forEach(error => {
                errorRecords.push({
                  flight_id: result.flightId,
                  error_type: error.code.toLowerCase(),
                  error_severity: error.severity || 'error',
                  error_message: error.message,
                  created_at: new Date(),
                  updated_at: new Date()
                });
              });
            }
          }
          
          // Insert error records in chunks
          if (errorRecords.length > 0) {
            const errorChunks = [];
            for (let i = 0; i < errorRecords.length; i += 500) {
              errorChunks.push(errorRecords.slice(i, i + 500));
            }
            
            for (const chunk of errorChunks) {
              await trx('flight_validation_errors').insert(chunk);
            }
          }
        });
        
        // Log progress periodically
        if (totalProcessed % 5000 === 0 || totalProcessed < 5000) {
          console.log(`Validated ${totalProcessed} flights (${validCount} valid, ${invalidCount} invalid)`);
        }
      };
      
      await new Promise((resolve, reject) => {
        let flightId = 0;
        
        fileStream
          .pipe(csvParser())
          .pipe(through2.obj(function(chunk, enc, callback) {
            // Transform CSV row to flight object and assign ID
            flightId++;
            this.push({
              ...chunk,
              id: flightId  // Temp ID for tracking
            });
            callback();
          }))
          .pipe(createBatcher(handleBatch))
          .on('finish', resolve)
          .on('error', reject);
      });
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`Validation completed in ${duration.toFixed(2)} seconds`);
      
      // Update validation record
      await db('flight_validations')
        .where({ id: validation.id })
        .update({
          validation_status: 'completed',
          valid_count: validCount,
          invalid_count: invalidCount,
          completed_at: new Date()
        });
      
      // Update cache for fast access
      this.validationCache = this.validationCache || {};
      this.validationCache[uploadId] = {
        totalFlights: totalProcessed,
        validFlights: validCount,
        invalidFlights: invalidCount,
        updatedAt: new Date()
      };
      
      return {
        uploadId,
        totalFlights: totalProcessed,
        validFlights: validCount,
        invalidFlights: invalidCount,
        duration
      };
    } catch (error) {
      console.error(`Error validating flights for upload ${uploadId}:`, error);
      
      // Update validation record to failed status
      await db('flight_validations')
        .where({ upload_id: uploadId })
        .update({
          validation_status: 'failed',
          completed_at: new Date()
        });
      
      throw error;
    }
  }
  
  /**
   * Validate a single flight record
   * @param {Object} flight - Flight record to validate
   * @returns {Promise<Object>} - Validation result for this flight
   */
  async validateSingleFlight(flight) {
    const errors = [];
    const enrichedData = {};
    
    // Required fields validation
    const requiredFields = [
      'airline_iata',
      'flight_number',
      'scheduled_datetime',
      'flight_nature',
      'origin_destination_iata',
      'aircraft_type_iata',
      'terminal',
      'seat_capacity'
    ];
    
    for (const field of requiredFields) {
      if (!flight[field]) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'error',
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Validate against repositories (airports, airlines, aircraft)
    if (flight.airline_iata) {
      const airline = await this.repositoryService.validateAirlineCode(flight.airline_iata);
      if (!airline) {
        errors.push({
          field: 'airline_iata',
          code: 'AIRLINE_UNKNOWN',
          severity: 'error',
          message: `Unknown airline code: ${flight.airline_iata}`
        });
      } else {
        // Store airline name for display
        enrichedData.airline_name = airline.name;
      }
    }
    
    if (flight.origin_destination_iata) {
      const airport = await this.repositoryService.validateAirportCode(flight.origin_destination_iata);
      if (!airport) {
        errors.push({
          field: 'origin_destination_iata',
          code: 'AIRPORT_UNKNOWN',
          severity: 'error',
          message: `Unknown airport code: ${flight.origin_destination_iata}`
        });
      } else {
        // Store airport name for display
        enrichedData.origin_destination_name = airport.name;
      }
    }
    
    if (flight.aircraft_type_iata) {
      const aircraftType = await this.repositoryService.validateAircraftType(flight.aircraft_type_iata);
      if (!aircraftType) {
        errors.push({
          field: 'aircraft_type_iata',
          code: 'AIRCRAFT_UNKNOWN',
          severity: 'error',
          message: `Unknown aircraft type code: ${flight.aircraft_type_iata}`
        });
      }
    }
    
    // Flight number format validation
    if (flight.flight_number && !/^\d+[A-Z]?$/.test(flight.flight_number)) {
      errors.push({
        field: 'flight_number',
        code: 'FORMAT_INVALID',
        severity: 'error',
        message: 'Flight number must be in the format of digits optionally followed by a letter'
      });
    }
    
    // Flight nature validation
    if (flight.flight_nature && !['A', 'D'].includes(flight.flight_nature)) {
      errors.push({
        field: 'flight_nature',
        code: 'FORMAT_INVALID',
        severity: 'error',
        message: "Flight nature must be 'A' for arrival or 'D' for departure"
      });
    }
    
    // Scheduled datetime validation
    if (flight.scheduled_datetime) {
      const scheduledDate = new Date(flight.scheduled_datetime);
      if (isNaN(scheduledDate.getTime())) {
        errors.push({
          field: 'scheduled_datetime',
          code: 'DATE_INVALID',
          severity: 'error',
          message: 'Invalid scheduled date/time format'
        });
      } else {
        // Check if date is in the past
        const now = new Date();
        if (scheduledDate < now) {
          errors.push({
            field: 'scheduled_datetime',
            code: 'DATE_INVALID',
            severity: 'warning',
            message: 'Scheduled date is in the past'
          });
        }
      }
    }
    
    // Estimated datetime validation (if provided)
    if (flight.estimated_datetime) {
      const estimatedDate = new Date(flight.estimated_datetime);
      if (isNaN(estimatedDate.getTime())) {
        errors.push({
          field: 'estimated_datetime',
          code: 'DATE_INVALID',
          severity: 'error',
          message: 'Invalid estimated date/time format'
        });
      }
    }
    
    // Terminal validation (if specified)
    if (flight.terminal && flight.origin_destination_iata) {
      const terminalExists = await this.repositoryService.validateTerminal(
        flight.terminal, 
        flight.origin_destination_iata
      );
      
      if (!terminalExists) {
        errors.push({
          field: 'terminal',
          code: 'TERMINAL_INVALID',
          severity: 'error',
          message: `Unknown terminal: ${flight.terminal} for airport: ${flight.origin_destination_iata}`
        });
      }
    }
    
    // Seat capacity validation
    if (flight.seat_capacity && flight.aircraft_type_iata) {
      const isValidCapacity = await this.repositoryService.validateCapacityForAircraft(
        flight.seat_capacity,
        flight.aircraft_type_iata
      );
      
      if (!isValidCapacity) {
        errors.push({
          field: 'seat_capacity',
          code: 'CAPACITY_INVALID',
          severity: 'warning',
          message: `Seat capacity ${flight.seat_capacity} is not typical for aircraft type ${flight.aircraft_type_iata}`
        });
      }
    }
    
    return {
      flightId: flight.id,
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      enrichedData
    };
  }
  
  /**
   * Get validation results for an upload with tabs for arrivals and departures
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number for pagination
   * @param {number} options.limit - Results per page
   * @param {string} options.flightNature - Filter by flight nature (A/D)
   * @param {string} options.validationStatus - Filter by validation status
   * @returns {Promise<Object>} - Validation results with pagination
   */
  async getValidationResults(uploadId, options = {}) {
    try {
      const { page = 1, limit = 100, flightNature, validationStatus, sort = 'scheduled_datetime', direction = 'asc' } = options;
      
      // Cache key for this specific query
      const cacheKey = `results:${uploadId}:${page}:${limit}:${flightNature || ''}:${validationStatus || ''}:${sort}:${direction}`;
      
      // Check cache (valid for 1 minute)
      if (this.resultCache[cacheKey] && (Date.now() - this.resultCache[cacheKey].timestamp) < 60000) {
        return this.resultCache[cacheKey].data;
      }
      
      // Build base query with optimized select
      let query = db('flights')
        .where({ upload_id: uploadId })
        .select(
          'id', 
          'airline_iata', 
          'flight_number', 
          'scheduled_datetime',
          'flight_nature', 
          'origin_destination_iata', 
          'aircraft_type_iata',
          'terminal',
          'seat_capacity',
          'validation_status',
          'validation_errors'
        );
      
      // Apply filters if provided
      if (flightNature) {
        query = query.where({ flight_nature: flightNature });
      }
      
      if (validationStatus) {
        query = query.where({ validation_status: validationStatus });
      }
      
      // Get total count with optimized query
      const countQuery = query.clone().count('id as count');
      const { count } = await countQuery.first();
      const total = parseInt(count, 10);
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      // Get results with optimized indexing and limiting
      const flights = await query
        .orderBy(sort, direction)
        .limit(limit)
        .offset(offset);
      
      // Format dates for consistency
      const formattedFlights = flights.map(flight => ({
        ...flight,
        scheduled_datetime: flight.scheduled_datetime ? new Date(flight.scheduled_datetime).toISOString() : null,
        validation_errors: flight.validation_errors ? JSON.parse(flight.validation_errors) : []
      }));
      
      const result = {
        data: formattedFlights,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages
        }
      };
      
      // Cache the result
      this.resultCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error('Error getting validation results:', error);
      throw error;
    }
  }
  
  /**
   * Get validation statistics for an upload with caching
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} - Validation statistics
   */
  async getValidationStats(uploadId) {
    try {
      // Check cache (valid for 30 seconds)
      if (this.statsCache[uploadId] && (Date.now() - this.statsCache[uploadId].timestamp) < 30000) {
        return this.statsCache[uploadId].data;
      }
      
      // Check if upload exists
      const upload = await db('flight_uploads').where({ id: uploadId }).first();
      if (!upload) return null;
      
      // Get validation record
      const validation = await db('flight_validations')
        .where({ upload_id: uploadId })
        .first();
      
      // Use more efficient queries with fewer round trips to database
      const stats = await db.raw(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid,
          SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid,
          SUM(CASE WHEN flight_nature = 'A' AND validation_status = 'valid' THEN 1 ELSE 0 END) as arrival_valid,
          SUM(CASE WHEN flight_nature = 'A' AND validation_status = 'invalid' THEN 1 ELSE 0 END) as arrival_invalid,
          SUM(CASE WHEN flight_nature = 'D' AND validation_status = 'valid' THEN 1 ELSE 0 END) as departure_valid,
          SUM(CASE WHEN flight_nature = 'D' AND validation_status = 'invalid' THEN 1 ELSE 0 END) as departure_invalid
        FROM flights
        WHERE upload_id = ?
      `, [uploadId]);
      
      // Extract the first row from the query result
      const row = stats.rows[0];
      
      // Get most common error types using the validation_errors table
      const errorStats = await db.raw(`
        SELECT 
          error_type,
          error_severity,
          COUNT(*) as count 
        FROM flight_validation_errors 
        WHERE flight_id IN (SELECT id FROM flights WHERE upload_id = ?) 
        GROUP BY error_type, error_severity 
        ORDER BY count DESC 
        LIMIT 10
      `, [uploadId]);
      
      const result = {
        uploadId,
        filename: upload.filename,
        validationStatus: validation ? validation.validation_status : 'not_started',
        startedAt: validation ? validation.started_at : null,
        completedAt: validation ? validation.completed_at : null,
        total: parseInt(row.total, 10),
        valid: parseInt(row.valid, 10),
        invalid: parseInt(row.invalid, 10),
        validPercentage: Math.round((parseInt(row.valid, 10) / parseInt(row.total, 10)) * 100) || 0,
        arrivals: {
          valid: parseInt(row.arrival_valid, 10),
          invalid: parseInt(row.arrival_invalid, 10),
          total: parseInt(row.arrival_valid, 10) + parseInt(row.arrival_invalid, 10)
        },
        departures: {
          valid: parseInt(row.departure_valid, 10),
          invalid: parseInt(row.departure_invalid, 10),
          total: parseInt(row.departure_valid, 10) + parseInt(row.departure_invalid, 10)
        },
        commonErrorTypes: errorStats.rows.map(err => ({
          type: err.error_type,
          severity: err.error_severity,
          count: parseInt(err.count, 10)
        }))
      };
      
      // Cache the result
      this.statsCache[uploadId] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error('Error getting validation stats:', error);
      throw error;
    }
  }
  
  /**
   * Generate validation report with separate tabs for arrivals and departures
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Report options
   * @param {string} options.flightNature - Filter by flight nature (A/D)
   * @param {boolean} options.includeValid - Include valid flights
   * @param {boolean} options.includeInvalid - Include invalid flights
   * @returns {Promise<Object>} Report data object with arrivals and departures separated
   */
  async generateValidationReport(uploadId, { flightNature, includeValid, includeInvalid }) {
    try {
      // Check if upload exists
      const upload = await db('flight_uploads').where({ id: uploadId }).first();
      if (!upload) return null;
      
      // Build query
      let query = db('flights')
        .where({ upload_id: uploadId })
        .select([
          'id',
          'flight_number',
          'airline_iata',
          'flight_nature',
          'origin_destination_iata',
          'scheduled_datetime',
          'aircraft_type_iata',
          'terminal',
          'seat_capacity',
          'validation_status',
          'validation_errors'
        ]);
      
      // Apply filters
      if (flightNature) {
        query = query.where({ flight_nature: flightNature });
      }
      
      // Handle validation status filter
      if (includeValid && !includeInvalid) {
        query = query.where({ validation_status: 'valid' });
      } else if (!includeValid && includeInvalid) {
        query = query.where({ validation_status: 'invalid' });
      } else if (!includeValid && !includeInvalid) {
        // Return empty report if neither valid nor invalid flights are included
        return { 
          upload: upload,
          flights: [],
          arrivals: [],
          departures: [],
          timestamp: new Date().toISOString()
        };
      }
      
      // Execute query
      const flights = await query;
      
      // Process results
      const processedFlights = flights.map(flight => {
        // Parse JSON validation errors
        let errors = [];
        if (flight.validation_errors) {
          try {
            if (typeof flight.validation_errors === 'string') {
              errors = JSON.parse(flight.validation_errors);
            } else {
              errors = flight.validation_errors;
            }
          } catch (e) {
            errors = [{ message: 'Error parsing validation errors' }];
          }
        }
        
        return {
          ...flight,
          validation_errors: errors,
          error_summary: errors.map(e => e.message || e).join('; ')
        };
      });
      
      // Separate into arrivals and departures
      const arrivals = processedFlights.filter(f => f.flight_nature === 'A');
      const departures = processedFlights.filter(f => f.flight_nature === 'D');
      
      return {
        upload: {
          id: upload.id,
          filename: upload.filename,
          uploaded_at: upload.created_at
        },
        flights: processedFlights,
        arrivals,
        departures,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating validation report:', error);
      throw error;
    }
  }
  
  /**
   * Format report data as CSV with arrivals and departures separated
   * @param {Object} reportData - Report data object
   * @returns {Object} Object with arrival and departure CSV data
   */
  formatReportAsCSV(reportData) {
    try {
      // Prepare fields for CSV
      const fields = [
        { label: 'Flight ID', value: 'id' },
        { label: 'Flight Number', value: 'flight_number' },
        { label: 'Airline', value: 'airline_iata' },
        { label: 'Type', value: 'flight_nature' },
        { label: 'Origin/Destination', value: 'origin_destination_iata' },
        { label: 'Scheduled Time', value: 'scheduled_datetime' },
        { label: 'Aircraft Type', value: 'aircraft_type_iata' },
        { label: 'Terminal', value: 'terminal' },
        { label: 'Seat Capacity', value: 'seat_capacity' },
        { label: 'Validation Status', value: 'validation_status' },
        { label: 'Validation Errors', value: 'error_summary' }
      ];
      
      const csvParser = new Parser({ fields });
      
      return {
        all: csvParser.parse(reportData.flights),
        arrivals: reportData.arrivals.length ? csvParser.parse(reportData.arrivals) : null,
        departures: reportData.departures.length ? csvParser.parse(reportData.departures) : null
      };
    } catch (error) {
      console.error('Error formatting CSV report:', error);
      throw error;
    }
  }
  
  /**
   * Format report data as XLSX with arrivals and departures as separate sheets
   * @param {Object} reportData - Report data object
   * @returns {Buffer} XLSX file as buffer
   */
  async formatReportAsXLSX(reportData) {
    try {
      // Create workbook
      const workbook = xlsx.utils.book_new();
      
      // Format the flight data for display
      const formatFlightData = flights => flights.map(flight => ({
        'Flight ID': flight.id,
        'Flight Number': flight.flight_number,
        'Airline': flight.airline_iata,
        'Type': flight.flight_nature === 'A' ? 'Arrival' : 'Departure',
        'Origin/Destination': flight.origin_destination_iata,
        'Scheduled Time': flight.scheduled_datetime,
        'Aircraft Type': flight.aircraft_type_iata,
        'Terminal': flight.terminal,
        'Seat Capacity': flight.seat_capacity,
        'Validation Status': flight.validation_status === 'valid' ? 'Valid' : 'Invalid',
        'Validation Errors': flight.error_summary
      }));
      
      // Add overview sheet
      const summaryData = [{
        'Upload ID': reportData.upload.id,
        'Filename': reportData.upload.filename,
        'Upload Date': reportData.upload.uploaded_at,
        'Total Flights': reportData.flights.length,
        'Valid Flights': reportData.flights.filter(f => f.validation_status === 'valid').length,
        'Invalid Flights': reportData.flights.filter(f => f.validation_status === 'invalid').length,
        'Total Arrivals': reportData.arrivals.length,
        'Total Departures': reportData.departures.length,
        'Report Generated': reportData.timestamp
      }];
      
      const summarySheet = xlsx.utils.json_to_sheet(summaryData);
      xlsx.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Add all flights sheet
      if (reportData.flights.length > 0) {
        const allSheet = xlsx.utils.json_to_sheet(formatFlightData(reportData.flights));
        xlsx.utils.book_append_sheet(workbook, allSheet, 'All Flights');
      }
      
      // Add arrivals sheet
      if (reportData.arrivals.length > 0) {
        const arrivalSheet = xlsx.utils.json_to_sheet(formatFlightData(reportData.arrivals));
        xlsx.utils.book_append_sheet(workbook, arrivalSheet, 'Arrivals');
      }
      
      // Add departures sheet
      if (reportData.departures.length > 0) {
        const departureSheet = xlsx.utils.json_to_sheet(formatFlightData(reportData.departures));
        xlsx.utils.book_append_sheet(workbook, departureSheet, 'Departures');
      }
      
      // Generate buffer
      return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error formatting XLSX report:', error);
      throw error;
    }
  }
  
  /**
   * Get arrivals with validation status
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Arrivals with pagination
   */
  async getArrivalFlights(uploadId, options = {}) {
    const flightOptions = {
      ...options,
      flightNature: 'A'
    };
    
    return this.getValidationResults(uploadId, flightOptions);
  }
  
  /**
   * Get departures with validation status
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Departures with pagination
   */
  async getDepartureFlights(uploadId, options = {}) {
    const flightOptions = {
      ...options,
      flightNature: 'D'
    };
    
    return this.getValidationResults(uploadId, flightOptions);
  }
}

module.exports = FlightValidationService; 