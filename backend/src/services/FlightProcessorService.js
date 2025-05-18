const db = require('../db');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const FlightUploadService = require('./FlightUploadService');
const FlightValidationService = require('./FlightValidationService');
const FlightValidatorAdapter = require('./adapted/FlightValidatorAdapter');
const StandAllocationAdapter = require('./adapted/StandAllocationAdapter');

/**
 * Flight Processor Service
 * 
 * This service orchestrates the entire workflow of flight schedule processing,
 * from validation to stand allocation, serving as the integration point between
 * the different components of the system.
 */
class FlightProcessorService {
  constructor() {
    this.uploadService = new FlightUploadService();
    this.validationService = new FlightValidationService();
    this.validatorAdapter = new FlightValidatorAdapter();
    this.allocationAdapter = new StandAllocationAdapter();
  }

  /**
   * Process a flight schedule from an upload
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processFlightSchedule(uploadId, options = {}) {
    console.log(`[DEBUG] ========== PROCESS FLIGHT SCHEDULE START ==========`);
    console.log(`[DEBUG] Processing flight schedule for upload ${uploadId} with options:`, JSON.stringify(options));
    
    let scheduleId = null;
    let validationResults = null;
    
    try {
      // 1. Validate input
      if (!uploadId) {
        throw new Error('Upload ID is required');
      }
      
      if (typeof uploadId !== 'number') {
        uploadId = parseInt(uploadId, 10);
        
        if (isNaN(uploadId)) {
          throw new Error('Invalid upload ID - must be a number');
        }
      }
      
      console.log(`[DEBUG] Validated upload ID: ${uploadId}`);
      
      // 2. Create flight schedule
      const db = require('../db');
      
      // Check if upload exists
      const upload = await db('flight_uploads').where('id', uploadId).first();
      if (!upload) {
        throw new Error(`Upload with ID ${uploadId} not found`);
      }
      
      console.log(`[DEBUG] Found upload: ${upload.id} - ${upload.file_name || 'Unnamed'}`);
      
      // Create schedule for this upload
      const schedule = {
        name: `Schedule from ${upload.file_name || `Upload ${uploadId}`}`,
        description: `Generated from upload ${uploadId} on ${new Date().toLocaleString()}`,
        upload_id: uploadId,
        created_by: upload.user_id || 1, // Default to 1 if no user ID
        status: 'processing',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      console.log(`[DEBUG] Creating flight schedule:`, JSON.stringify(schedule));
      
      // Insert schedule
      const [insertedIdObj] = await db('flight_schedules').insert(schedule).returning('id');
      // Extract the actual ID value
      scheduleId = typeof insertedIdObj === 'object' && insertedIdObj !== null ? insertedIdObj.id : insertedIdObj;
      console.log(`[DEBUG] Inserted schedule ID type: ${typeof insertedIdObj}, value:`, insertedIdObj);
      
      console.log(`[DEBUG] Created flight schedule with ID: ${scheduleId}`);
      
      // 3. Set date range based on flights
      const dateRange = await db('flights')
        .where('upload_id', uploadId)
        .min('scheduled_datetime as earliest')
        .max('scheduled_datetime as latest')
        .first();
      
      if (dateRange && dateRange.earliest && dateRange.latest) {
        console.log(`[DEBUG] Flight date range: ${dateRange.earliest} to ${dateRange.latest}`);
        
        await db('flight_schedules')
          .where('id', scheduleId)
          .update({
            start_date: new Date(dateRange.earliest),
            end_date: new Date(dateRange.latest)
          });
      }
      
      // 4. Run validation (unless skipped)
      if (!options.skipValidation) {
        console.log(`[DEBUG] Running validation for upload ${uploadId}`);
        try {
          validationResults = await this.validateFlightData(uploadId);
          console.log(`[DEBUG] Validation completed with results:`, JSON.stringify(validationResults));
          await this.storeValidationResults(scheduleId, validationResults);
          
          if (validationResults.invalidFlights > 0) {
            console.log(`[DEBUG] Found ${validationResults.invalidFlights} invalid flights out of ${validationResults.totalFlights} total flights`);
          }
        } catch (validationError) {
          console.error(`[DEBUG] Validation error:`, validationError);
          throw new Error(`Validation failed: ${validationError.message}`);
        }
      } else {
        console.log(`[DEBUG] Validation skipped as requested`);
      }
      
      // 5. Run stand allocation (unless skipped)
      let allocationResults = null;
      if (!options.skipAllocation) {
        console.log(`[DEBUG] ========== STAND ALLOCATION START ==========`);
        
        try {
          // Prepare data for stand allocation
          console.log(`[DEBUG] Preparing allocation data for upload ${uploadId}`);
          const allocationInput = await this.prepareAllocationData(uploadId);
          console.log(`[DEBUG] Allocation input prepared with:
            - ${allocationInput.flights.length} flights 
            - ${allocationInput.stands.length} stands
            - ${allocationInput.airlines.length} airlines`);
          
          // Log sample data
          if (allocationInput.flights.length > 0) {
            console.log(`[DEBUG] Sample flight:`, JSON.stringify(allocationInput.flights[0]));
          }
          
          if (allocationInput.stands.length > 0) {
            console.log(`[DEBUG] Sample stand:`, JSON.stringify(allocationInput.stands[0]));
          }
          
          // Check if we have valid data for allocation
          if (allocationInput.flights.length === 0) {
            console.warn(`[DEBUG] No flights to allocate for upload ${uploadId}`);
          }
          
          if (allocationInput.stands.length === 0) {
            console.warn(`[DEBUG] No stands available for allocation`);
          }
          
          // Run stand allocation
          console.log(`[DEBUG] Executing stand allocation algorithm`);
          allocationResults = await this.runStandAllocation(allocationInput, options.allocationSettings);
          console.log(`[DEBUG] Allocation completed with:
            - ${allocationResults.allocated?.length || 0} allocated flights 
            - ${allocationResults.unallocated?.length || 0} unallocated flights
            - Allocation rate: ${allocationResults.allocationRate?.toFixed(2) || 0}%`);
          
          // Store allocation results
          console.log(`[DEBUG] Storing allocation results for schedule ${scheduleId}`);
          const storedAllocations = await this.storeAllocationResults(scheduleId, allocationResults);
          console.log(`[DEBUG] Successfully stored ${storedAllocations.length} allocation records`);
          
          // Calculate and store utilization metrics
          console.log(`[DEBUG] Calculating utilization metrics`);
          const utilizationMetrics = await this.calculateUtilizationMetrics(scheduleId, allocationResults);
          if (utilizationMetrics && utilizationMetrics.length > 0) {
            console.log(`[DEBUG] Generated ${utilizationMetrics.length} utilization metrics`);
            await this.storeUtilizationMetrics(scheduleId, utilizationMetrics);
          } else {
            console.warn(`[DEBUG] No utilization metrics generated`);
          }
          
          // Identify and store allocation issues
          console.log(`[DEBUG] Identifying allocation issues`);
          const allocationIssues = await this.identifyAllocationIssues(scheduleId, allocationResults, utilizationMetrics);
          if (allocationIssues && allocationIssues.length > 0) {
            console.log(`[DEBUG] Identified ${allocationIssues.length} allocation issues`);
            await this.storeAllocationIssues(scheduleId, allocationIssues);
          } else {
            console.log(`[DEBUG] No allocation issues identified`);
          }
          
          console.log(`[DEBUG] ========== STAND ALLOCATION COMPLETE ==========`);
        } catch (allocationError) {
          console.error(`[DEBUG] Allocation error:`, allocationError);
          console.error(`[DEBUG] Allocation error stack:`, allocationError.stack);
          
          // Update status to failed
          await db('flight_schedules')
            .where('id', scheduleId)
            .update({ 
              status: 'failed',
              updated_at: new Date()
            });
            
          throw new Error(`Allocation failed: ${allocationError.message}`);
        }
      } else {
        console.log(`[DEBUG] Stand allocation skipped as requested`);
      }
      
      // 6. Update status to completed
      if (scheduleId) {
        // Check allocation counts from database
        let allocatedCount = 0;
        let unallocatedCount = 0;
        
        try {
          // Get allocated count from database
          const allocatedResult = await db('stand_allocations')
            .where('schedule_id', scheduleId)
            .count('id as count')
            .first();
            
          if (allocatedResult) {
            allocatedCount = parseInt(allocatedResult.count, 10) || 0;
          }
          
          // Get unallocated count from database
          const unallocatedResult = await db('unallocated_flights')
            .where('schedule_id', scheduleId)
            .count('id as count')
            .first();
            
          if (unallocatedResult) {
            unallocatedCount = parseInt(unallocatedResult.count, 10) || 0;
          }
          
          console.log(`[DEBUG] Final counts from database: ${allocatedCount} allocated, ${unallocatedCount} unallocated`);
          
          // Update allocation results with actual counts from database
          if (allocationResults) {
            allocationResults.allocated = allocationResults.allocated || [];
            allocationResults.unallocated = allocationResults.unallocated || [];
            
            // Set the actual allocation counts
            allocationResults.allocated.length = allocatedCount;
            allocationResults.unallocated.length = unallocatedCount;
          }
        } catch (countError) {
          console.error('[DEBUG] Error getting allocation counts from database:', countError);
        }
        
        // Set the final status
        const finalStatus = allocatedCount > 0 ? 
          'allocated' : 
          (!options.skipValidation ? 'validated' : 'draft');
        
        console.log(`[DEBUG] Setting schedule ${scheduleId} final status to: ${finalStatus}`);
        
        await db('flight_schedules')
          .where('id', scheduleId)
          .update({ 
            status: finalStatus,
            allocated_flights: allocatedCount,
            unallocated_flights: unallocatedCount,
            allocated_at: allocatedCount > 0 ? new Date() : null,
            updated_at: new Date()
          });
      }
      
      console.log(`[DEBUG] ========== PROCESS FLIGHT SCHEDULE COMPLETE ==========`);
      
      // Return result
      return {
        success: true,
        scheduleId,
        validation: validationResults,
        allocation: allocationResults ? {
          allocated: allocationResults.allocated?.length || 0,
          unallocated: allocationResults.unallocated?.length || 0,
          allocationRate: allocationResults.allocationRate || 0
        } : null
      };
    } catch (error) {
      console.error(`[DEBUG] Error processing flight schedule:`, error);
      console.error(`[DEBUG] Error stack:`, error.stack);
      
      // Update status to failed if schedule was created
      if (scheduleId) {
        try {
          await db('flight_schedules')
            .where('id', scheduleId)
            .update({ 
              status: 'failed',
              updated_at: new Date()
            });
        } catch (updateError) {
          console.error(`[DEBUG] Error updating schedule status to failed:`, updateError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Create a new flight schedule record
   * @param {number} uploadId - Upload ID
   * @returns {Promise<number>} Schedule ID
   */
  async createFlightSchedule(uploadId) {
    try {
      // Get upload info
      const upload = await this.uploadService.getUploadById(uploadId);
      if (!upload) {
        throw new Error(`Upload not found with ID: ${uploadId}`);
      }
      
      // Get date range from flight data
      const dateRange = await this.getFlightDateRange(uploadId);
      
      // Generate schedule name based on upload
      const scheduleName = `Schedule from ${upload.filename} (${dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Unknown'} - ${dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'Unknown'})`;
      
      console.log('Creating flight schedule with data:', {
        name: scheduleName,
        upload_id: uploadId,
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      
      // Create schedule record without using returning
      await db('flight_schedules').insert({
        name: scheduleName,
        description: `Automatically created from upload ${upload.id} (${upload.filename})`,
        upload_id: uploadId,
        created_by: upload.user_id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Get the most recent schedule for this upload
      const lastInsertResult = await db('flight_schedules')
        .where('upload_id', uploadId)
        .orderBy('created_at', 'desc')
        .first();
        
      if (!lastInsertResult) {
        console.error('Failed to retrieve the created flight schedule');
        return null;
      }
      
      console.log('Created flight schedule:', lastInsertResult);
      return lastInsertResult.id;
    } catch (error) {
      console.error('Error creating flight schedule:', error);
      throw error;
    }
  }
  
  /**
   * Get date range of flights in upload
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Start and end dates
   */
  async getFlightDateRange(uploadId) {
    try {
      const result = await db('flights')
        .where('upload_id', uploadId)
        .min('scheduled_datetime as start')
        .max('scheduled_datetime as end')
        .first();
      
      return {
        start: result.start || null,
        end: result.end || null
      };
    } catch (error) {
      console.error('Error getting flight date range:', error);
      return { start: null, end: null };
    }
  }
  
  /**
   * Validate flight data using validation rules
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Validation results
   */
  async validateFlightData(uploadId) {
    try {
      // Option 1: Use built-in validation service
      const results = await this.validationService.validateFlightData(uploadId);
      
      // Option 2: Use the Flight QA Tool via adapter
      // const results = await this.validatorAdapter.validateFlights(uploadId);
      
      return results;
    } catch (error) {
      console.error(`Error validating flight data for upload ${uploadId}:`, error);
      throw error;
    }
  }
  
  /**
   * Store validation results in flight schedule
   * 
   * @param {number} scheduleId - The schedule ID
   * @param {Object} validationResults - Validation results object
   * @param {number} validationResults.validFlights - Number of valid flights
   * @param {number} validationResults.invalidFlights - Number of invalid flights
   * @param {number} validationResults.totalFlights - Total number of flights
   * @returns {Promise<void>}
   */
  async storeValidationResults(scheduleId, validationResults) {
    console.info(`Storing validation results for schedule ${scheduleId}`);
    
    // Handle case where validationResults is undefined or missing properties
    const validFlights = validationResults?.validFlights || 0;
    const invalidFlights = validationResults?.invalidFlights || 0;
    
    try {
      await db('flight_schedules')
        .where({ id: scheduleId })
        .update({
          validated_at: db.fn.now(),
          valid_flights: validFlights,
          invalid_flights: invalidFlights,
          status: validFlights > 0 ? 'validated' : 'invalid'
        });
      
      console.info(`Successfully stored validation results for schedule ${scheduleId}`);
    } catch (error) {
      console.error(`Error storing validation results for schedule ${scheduleId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Prepare data for the stand allocation algorithm
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Data formatted for allocation
   */
  async prepareAllocationData(uploadId) {
    try {
      console.log(`Preparing allocation data for upload ${uploadId}`);
      
      // Get flights from database
      const flights = await db('flights')
        .where({ upload_id: uploadId })
        .select('*');
      
      if (!flights || flights.length === 0) {
        throw new Error(`No flights found for upload ${uploadId}`);
      }
      
      // Get the base airport configuration
      const airportConfigService = require('./airportConfigService');
      const config = await airportConfigService.getConfig();
      const baseAirport = config.baseAirport;
      
      // Use a default IATA code if no base airport is configured
      const baseAirportCode = baseAirport?.iata_code || 'BASE';
      
      console.log(`Using base airport: ${baseAirportCode} for flight normalization`);
      
      // Normalize flight data for the allocation service
      const normalizedFlights = flights.map(flight => {
        const isArrival = flight.flight_nature === 'A';
        const isDeparture = flight.flight_nature === 'D' || !isArrival; // Default to departure if not specified
        
        return {
          // Core flight identifiers
          id: flight.id,
          FlightID: flight.id,
          // Flight details - use actual data from database fields
          FlightNumber: flight.flight_number || flight.id.toString(), // Use flight number from DB or ID as fallback
          AircraftType: flight.aircraft_type_iata || 'UNKN',
          AircraftSize: flight.aircraft_size_category || 'C', // Default to medium
          Airline: flight.airline_iata || 'UNKN',
          // Set origin/destination using base airport
          Origin: isArrival ? flight.origin_destination_iata : baseAirportCode,
          Destination: isDeparture ? flight.origin_destination_iata : baseAirportCode,
          // Times
          ScheduledArrival: isArrival ? flight.scheduled_datetime : null,
          ScheduledDeparture: isDeparture ? flight.scheduled_datetime : null,
          EstimatedArrival: isArrival ? (flight.estimated_datetime || flight.scheduled_datetime) : null,
          EstimatedDeparture: isDeparture ? (flight.estimated_datetime || flight.scheduled_datetime) : null,
          // Additional properties
          Terminal: flight.terminal,
          IsArrival: isArrival,
          IsDeparture: isDeparture,
          TurnaroundTime: 45, // Default turnaround time in minutes
          Registration: flight.registration || `${flight.airline_iata || 'UNKN'}${flight.flight_number || 'UNKN'}-REG`
        };
      });
      
      console.log(`Normalized ${normalizedFlights.length} flights for allocation`);
      
      // Get stands from database
      const stands = await db('stands').select('*');
      
      console.log(`Found ${stands.length} stands for allocation`);
      
      // Normalize stand data
      const normalizedStands = stands.map(stand => ({
        StandID: stand.id,
        Name: stand.name,
        Terminal: stand.terminal,
        Type: stand.stand_type || 'remote',
        MaxAircraftSize: stand.max_aircraft_size || 'large',
        AirlinePriorities: stand.airline_priorities || [],
        Restrictions: stand.restrictions || [],
        IsActive: stand.is_active || true
      }));
      
      // Prepare input data for allocation algorithm
      const inputData = {
        flights: normalizedFlights,
        stands: normalizedStands,
        // Add other required data for allocation
        airlines: [{ code: 'ALL', name: 'All Airlines' }], // Default airline for testing
        settings: {
          allocation_priority: 'stand_utilization',
          respect_airline_preferences: true,
          allow_remote_stands_for_all: true
        }
      };
      
      console.log(`[DEBUG] Allocation input prepared with:
            - ${inputData.flights.length} flights 
            - ${inputData.stands.length} stands
            - ${inputData.airlines.length} airlines`);
      
      if (inputData.flights.length > 0) {
        console.log(`[DEBUG] Sample flight: ${JSON.stringify(inputData.flights[0])}`);
      }
      
      if (inputData.stands.length > 0) {
        console.log(`[DEBUG] Sample stand: ${JSON.stringify(inputData.stands[0])}`);
      }
      
      return inputData;
    } catch (error) {
      console.error('Error preparing allocation data:', error);
      throw error;
    }
  }
  
  /**
   * Run stand allocation
   * @param {Object} allocationInput - Data for stand allocation
   * @param {Object} settings - Additional settings for allocation
   * @returns {Promise<Object>} Allocation results
   */
  async runStandAllocation(allocationInput, settings = {}) {
    try {
      console.log('Running stand allocation');
      
      // Validate input data
      if (!allocationInput) {
        console.warn('Missing allocation input data');
        return {
          allocated: [],
          unallocated: [],
          total: 0,
          allocationRate: 0
        };
      }
      
      if (!allocationInput.flights || !Array.isArray(allocationInput.flights) || allocationInput.flights.length === 0) {
        console.warn(`No flights provided for allocation. Input: ${JSON.stringify({
          flightsLength: allocationInput.flights?.length || 0,
          standsLength: allocationInput.stands?.length || 0
        })}`);
        return {
          allocated: [],
          unallocated: [],
          total: 0,
          allocationRate: 0
        };
      }
      
      console.log(`Allocating stands for ${allocationInput.flights.length} flights`);
      
      // Run stand allocation using adapter
      const allocationResults = await this.allocationAdapter.allocateStands(allocationInput, settings);
      
      console.log(`Allocation completed with ${allocationResults.allocated?.length || 0} allocated flights and ${allocationResults.unallocated?.length || 0} unallocated flights`);
      
      // Ensure we have properly structured results
      const normalizedResults = {
        allocated: Array.isArray(allocationResults.allocated) ? allocationResults.allocated : [],
        unallocated: Array.isArray(allocationResults.unallocated) ? allocationResults.unallocated : [],
        total: allocationInput.flights.length,
        allocationRate: 0
      };
      
      // Calculate allocation rate
      if (normalizedResults.total > 0) {
        normalizedResults.allocationRate = (normalizedResults.allocated.length / normalizedResults.total) * 100;
      }
      
      return normalizedResults;
    } catch (error) {
      console.error('Error running stand allocation:', error);
      console.error('Stack trace:', error.stack);
      
      // Return a structured object even if there's an error
      return {
        allocated: [],
        unallocated: allocationInput?.flights?.map(flight => ({
          flight: { id: flight.FlightID },
          reason: `Allocation error: ${error.message?.substring(0, 200) || 'Unknown error'}`
        })) || [],
        total: allocationInput?.flights?.length || 0,
        allocationRate: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Store allocation results in database
   * @param {number} scheduleId - Schedule ID
   * @param {Object} allocationResults - Allocation results
   * @returns {Promise<Array>} Stored allocation records
   */
  async storeAllocationResults(scheduleId, allocationResults) {
    try {
      console.log(`[DEBUG] STORING ALLOCATION RESULTS - START - for schedule ${scheduleId}`);
      
      // Validate inputs
      if (!scheduleId) {
        console.warn('[DEBUG] No schedule ID provided for storing allocation results');
        return [];
      }
      
      if (!allocationResults) {
        console.warn('[DEBUG] No allocation results provided');
        return [];
      }
      
      // DEBUG: Detailed logging
      console.log(`[DEBUG] Raw allocation results:`, JSON.stringify({
        allocatedCount: allocationResults.allocated?.length || 0,
        unallocatedCount: allocationResults.unallocated?.length || 0,
        firstAllocatedFlight: allocationResults.allocated?.[0] || null,
        firstUnallocatedFlight: allocationResults.unallocated?.[0] || null,
      }));
      
      // Make sure we have valid arrays for allocated and unallocated flights
      const allocated = Array.isArray(allocationResults.allocated) ? allocationResults.allocated : [];
      const unallocated = Array.isArray(allocationResults.unallocated) ? allocationResults.unallocated : [];
      
      console.log(`[DEBUG] Processing ${allocated.length} allocated flights and ${unallocated.length} unallocated flights`);
      
      // Process allocated flights
      const allocations = [];
      
      for (const allocation of allocated) {
        try {
          // DEBUG - Log each allocation object
          console.log(`[DEBUG] Processing allocation:`, JSON.stringify(allocation));
          
          if (!allocation.flight || !allocation.stand) {
            console.warn('[DEBUG] Skipping invalid allocation record - missing flight or stand:', JSON.stringify(allocation));
            continue;
          }
          
          // Check if flight ID exists in the correct format
          console.log(`[DEBUG] Flight ID type: ${typeof allocation.flight.id}, value: ${allocation.flight.id}`);
          console.log(`[DEBUG] Stand ID type: ${typeof allocation.stand.id}, value: ${allocation.stand.id}`);
          
          const flightId = typeof allocation.flight.id === 'string' 
            ? parseInt(allocation.flight.id, 10) 
            : allocation.flight.id;
            
          const standId = typeof allocation.stand.id === 'string'
            ? parseInt(allocation.stand.id, 10)
            : allocation.stand.id;
          
          if (isNaN(flightId) || isNaN(standId)) {
            console.warn(`[DEBUG] Skipping invalid allocation record - invalid IDs: flightId=${flightId}, standId=${standId}`);
            continue;
          }
          
          let startTime = null;
          let endTime = null;
          
          try {
            console.log(`[DEBUG] Original start_time: ${allocation.start_time}, end_time: ${allocation.end_time}`);
            startTime = allocation.start_time ? new Date(allocation.start_time) : null;
            endTime = allocation.end_time ? new Date(allocation.end_time) : null;
            
            // Validate dates
            if (startTime && isNaN(startTime.getTime())) {
              console.warn(`[DEBUG] Invalid start time: ${allocation.start_time}`);
              startTime = null;
            }
            
            if (endTime && isNaN(endTime.getTime())) {
              console.warn(`[DEBUG] Invalid end time: ${allocation.end_time}`);
              endTime = null;
            }
            
            // If we have only one valid time, try to estimate the other
            if (startTime && !endTime) {
              // Add 45 minutes for turnaround time as a default
              endTime = new Date(startTime.getTime() + (45 * 60 * 1000));
              console.log(`[DEBUG] Generated end time: ${endTime.toISOString()} from start time`);
            } else if (!startTime && endTime) {
              // Subtract 45 minutes
              startTime = new Date(endTime.getTime() - (45 * 60 * 1000));
              console.log(`[DEBUG] Generated start time: ${startTime.toISOString()} from end time`);
            }
            
            // If we still have no valid times, skip
            if (!startTime || !endTime) {
              console.warn(`[DEBUG] Skipping allocation for flight ${flightId} with no valid times`);
              continue;
            }
          } catch (dateError) {
            console.error(`[DEBUG] Error parsing allocation times for flight ${flightId}:`, dateError);
            continue;
          }
          
          // Create allocation record
          const record = {
            flight_id: flightId,
            stand_id: standId,
            schedule_id: scheduleId,
            start_time: startTime,
            end_time: endTime,
            is_manual: false,
            status: 'allocated',
            allocation_source: 'automated',
            created_at: new Date(),
            updated_at: new Date()
          };
          
          // DEBUG - Log allocation record
          console.log(`[DEBUG] Created allocation record:`, JSON.stringify(record));
          
          allocations.push(record);
        } catch (allocationError) {
          console.error('[DEBUG] Error processing allocation record:', allocationError);
          continue;
        }
      }
      
      // Store allocated flights
      if (allocations.length > 0) {
        try {
          console.log(`[DEBUG] Storing ${allocations.length} stand allocation records`);
          
          // Store in batches of 10 to avoid issues with large inserts
          const batchSize = 10;
          for (let i = 0; i < allocations.length; i += batchSize) {
            const batch = allocations.slice(i, i + batchSize);
            if (batch.length > 0) {
              try {
                console.log(`[DEBUG] Inserting batch ${i/batchSize + 1} with ${batch.length} allocations`);
                await db('stand_allocations').insert(batch);
                console.log(`[DEBUG] Successfully inserted batch ${i/batchSize + 1}`);
              } catch (batchError) {
                console.error(`[DEBUG] Error inserting allocation batch ${i/batchSize + 1}:`, batchError);
                console.error('[DEBUG] First record in failed batch:', JSON.stringify(batch[0]));
              }
            }
          }
          
          // Verify insertion worked
          const count = await db('stand_allocations')
            .where('schedule_id', scheduleId)
            .count('id as count')
            .first();
            
          console.log(`[DEBUG] After insertion, database has ${count.count} allocations for schedule ${scheduleId}`);
        } catch (insertError) {
          console.error('[DEBUG] Error storing stand allocations:', insertError);
          console.error('[DEBUG] Error details:', insertError.stack);
        }
      } else {
        console.warn('[DEBUG] No valid allocations to store');
      }
      
      // Process unallocated flights
      const unallocatedRecords = [];
      
      for (const unallocation of unallocated) {
        try {
          if (!unallocation.flight || !unallocation.flight.id) {
            console.warn('[DEBUG] Skipping invalid unallocation record:', JSON.stringify(unallocation));
            continue;
          }
          
          console.log(`[DEBUG] Processing unallocated flight ID: ${unallocation.flight.id}`);
          
          unallocatedRecords.push({
            flight_id: unallocation.flight.id,
            schedule_id: scheduleId,
            reason: unallocation.reason?.substring(0, 250) || 'Unknown reason',
            created_at: new Date(),
            updated_at: new Date()
          });
        } catch (unallocationError) {
          console.error('[DEBUG] Error processing unallocation record:', unallocationError);
          continue;
        }
      }
      
      // Store unallocated flights
      if (unallocatedRecords.length > 0) {
        try {
          console.log(`[DEBUG] Storing ${unallocatedRecords.length} unallocated flight records`);
          await db('unallocated_flights').insert(unallocatedRecords);
          
          // Verify insertion worked
          const count = await db('unallocated_flights')
            .where('schedule_id', scheduleId)
            .count('id as count')
            .first();
            
          console.log(`[DEBUG] After insertion, database has ${count.count} unallocated flights for schedule ${scheduleId}`);
        } catch (insertError) {
          console.error('[DEBUG] Error storing unallocated flights:', insertError);
        }
      } else {
        console.log('[DEBUG] No unallocated flights to store');
      }
      
      console.log(`[DEBUG] STORING ALLOCATION RESULTS - COMPLETE - for schedule ${scheduleId}`);
      
      return allocations;
    } catch (error) {
      console.error(`[DEBUG] Error storing allocation results for schedule ${scheduleId}:`, error);
      console.error('[DEBUG] Stack trace:', error.stack);
      return [];
    }
  }
  
  /**
   * Calculate utilization metrics for stands
   * @param {number} scheduleId - Schedule ID
   * @param {Object} allocationResults - Allocation results
   * @returns {Promise<Array>} Utilization metrics by stand and time period
   */
  async calculateUtilizationMetrics(scheduleId, allocationResults) {
    try {
      console.log(`Starting utilization metrics calculation for schedule ${scheduleId}`);
      
      // Validate input parameters
      if (!scheduleId) {
        console.warn('Missing schedule ID for utilization metrics calculation');
        return [];
      }
      
      if (!allocationResults || !allocationResults.allocated) {
        console.warn('Missing or invalid allocation results for utilization metrics calculation');
        return [];
      }
      
      // Use the stand allocation adapter to calculate metrics
      console.log(`Calculating metrics using adapter for ${allocationResults.allocated.length} allocated flights`);
      
      try {
        const metrics = await this.allocationAdapter.calculateUtilizationMetrics(allocationResults);
        console.log(`Adapter returned ${metrics ? metrics.length : 0} utilization metrics`);
        
        if (!metrics || metrics.length === 0) {
          console.warn('No metrics returned from allocation adapter');
          return [];
        }
        
        // Store metrics in database
        const metricsRecords = [];
        
        for (const metric of metrics) {
          // Skip invalid metrics
          if (!metric || !metric.stand_id || !metric.period_start || !metric.period_end) {
            console.warn('Skipping invalid metric record:', metric);
            continue;
          }
          
          // Ensure utilization_percentage is a number
          const utilizationPercentage = typeof metric.utilization_percentage === 'number' 
            ? metric.utilization_percentage 
            : parseFloat(metric.utilization_percentage || 0);
          
          metricsRecords.push({
            schedule_id: scheduleId,
            stand_id: metric.stand_id,
            time_period: metric.time_period || 'daily',
            period_start: new Date(metric.period_start),
            period_end: new Date(metric.period_end),
            minutes_utilized: parseInt(metric.minutes_utilized || 0, 10), 
            utilization_percentage: utilizationPercentage,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        
        // Report what we're storing
        console.log(`Prepared ${metricsRecords.length} metric records for database storage`);
        
        // Store metrics in batches to avoid exceeding query size limits
        const BATCH_SIZE = 50;
        for (let i = 0; i < metricsRecords.length; i += BATCH_SIZE) {
          const batch = metricsRecords.slice(i, i + BATCH_SIZE);
          
          try {
            await db('stand_utilization_metrics').insert(batch);
            console.log(`Inserted chunk of ${batch.length} metrics (${i+1}-${i+batch.length} of ${metricsRecords.length})`);
          } catch (batchError) {
            console.error(`Error storing metrics batch ${i+1}-${i+batch.length}:`, batchError);
          }
        }
        
        console.log(`Generated ${metricsRecords.length} utilization metrics`);
        
        return metricsRecords;
      } catch (adapterError) {
        console.error('Error in allocation adapter metric calculation:', adapterError);
        return [];
      }
    } catch (error) {
      console.error('Error calculating utilization metrics:', error);
      return [];
    }
  }
  
  /**
   * Identify utilization issues based on metrics
   * @param {number} scheduleId - Schedule ID
   * @param {Array} metrics - Utilization metrics
   * @returns {Promise<Array>} Identified issues
   */
  async identifyUtilizationIssues(scheduleId, metrics) {
    try {
      console.log(`Starting utilization issues identification for schedule ${scheduleId}`);
      
      // Validate input parameters
      if (!scheduleId) {
        console.warn('Missing schedule ID for utilization issues identification');
        return [];
      }
      
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        console.warn('No metrics provided for utilization issues identification');
        return [];
      }
      
      // Use the stand allocation adapter to identify issues
      console.log(`Identifying issues using adapter with ${metrics.length} metrics`);
      
      try {
        const issues = await this.allocationAdapter.identifyUtilizationIssues(metrics);
        console.log(`Adapter identified ${issues ? issues.length : 0} utilization issues`);
        
        if (!issues || issues.length === 0) {
          console.log('No utilization issues identified');
          return [];
        }
        
        // Store issues in database
        const issueRecords = [];
        
        for (const issue of issues) {
          // Skip invalid issues
          if (!issue || !issue.type || !issue.description) {
            console.warn('Skipping invalid issue record:', issue);
            continue;
          }
          
          // Ensure affected_entities is a valid JSON
          let affectedEntitiesJson;
          try {
            // First check if it's already a string
            if (typeof issue.affected_entities === 'string') {
              // If it's already a string, validate that it's valid JSON
              JSON.parse(issue.affected_entities);
              affectedEntitiesJson = issue.affected_entities;
            } else {
              // Otherwise stringify the object
              affectedEntitiesJson = JSON.stringify(issue.affected_entities || {});
            }
          } catch (jsonError) {
            console.warn('Error processing affected entities:', jsonError);
            affectedEntitiesJson = '{}';
          }
          
          // Truncate long fields
          const description = issue.description?.substring(0, 250) || '';
          const recommendation = issue.recommendation?.substring(0, 250) || '';
          
          issueRecords.push({
            schedule_id: scheduleId,
            issue_type: issue.type,
            severity: issue.severity || 'medium',
            description: description,
            affected_entities: affectedEntitiesJson,
            recommendation: recommendation,
            is_resolved: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        
        console.log(`Prepared ${issueRecords.length} issue records for database storage`);
        
        // Insert issues
        if (issueRecords.length > 0) {
          try {
            await db('allocation_issues').insert(issueRecords);
            console.log(`Successfully inserted ${issueRecords.length} utilization issues`);
          } catch (insertError) {
            console.error('Error inserting utilization issues:', insertError);
          }
        } else {
          console.warn('No valid issue records to store');
        }
        
        return issues;
      } catch (adapterError) {
        console.error('Error identifying issues with adapter:', adapterError);
        return [];
      }
    } catch (error) {
      console.error(`Error identifying utilization issues for schedule ${scheduleId}:`, error);
      console.error('Error stack:', error.stack);
      return [];
    }
  }
  
  /**
   * Identify allocation issues
   * @param {number} scheduleId - Schedule ID
   * @param {Object} allocationResults - Allocation results
   * @param {Array} utilizationMetrics - Utilization metrics
   * @returns {Promise<Array>} Allocation issues
   */
  async identifyAllocationIssues(scheduleId, allocationResults, utilizationMetrics) {
    try {
      console.log(`[DEBUG] Identifying allocation issues for schedule ${scheduleId}`);
      
      const issues = [];
      
      // Check if we have unallocated flights
      if (allocationResults && allocationResults.unallocated && allocationResults.unallocated.length > 0) {
        console.log(`[DEBUG] Found ${allocationResults.unallocated.length} unallocated flights`);
        
        // Group unallocated flights by reason
        const reasonGroups = {};
        
        for (const unallocated of allocationResults.unallocated) {
          const reason = unallocated.reason || 'Unknown reason';
          reasonGroups[reason] = reasonGroups[reason] || [];
          reasonGroups[reason].push(unallocated.flight.id);
        }
        
        // Create issues for each reason group
        for (const reason in reasonGroups) {
          const flightCount = reasonGroups[reason].length;
          
          issues.push({
            schedule_id: scheduleId,
            issue_type: 'unallocated_flights',
            severity: flightCount > 10 ? 'critical' : (flightCount > 5 ? 'high' : 'medium'),
            description: `${flightCount} flights could not be allocated: ${reason}`,
            affected_entities: JSON.stringify({
              flight_count: flightCount,
              flight_ids: reasonGroups[reason].slice(0, 10), // Include first 10 flight IDs
              reason: reason
            }),
            recommendation: 'Review stands availability or flight schedule to resolve conflicts',
            is_resolved: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
      
      // Check utilization metrics for over-utilized stands
      if (utilizationMetrics && utilizationMetrics.length > 0) {
        // Get daily utilization over 90%
        const highUtilization = utilizationMetrics.filter(
          metric => metric.time_period === 'daily' && metric.utilization_percentage > 90
        );
        
        if (highUtilization.length > 0) {
          console.log(`[DEBUG] Found ${highUtilization.length} stands with high utilization`);
          
          // Group by stand
          const standGroups = {};
          
          for (const metric of highUtilization) {
            standGroups[metric.stand_id] = standGroups[metric.stand_id] || [];
            standGroups[metric.stand_id].push(metric);
          }
          
          // Create issues for each stand
          for (const standId in standGroups) {
            const standMetrics = standGroups[standId];
            const maxUtilization = Math.max(...standMetrics.map(m => m.utilization_percentage));
            
            issues.push({
              schedule_id: scheduleId,
              issue_type: 'high_stand_utilization',
              severity: maxUtilization > 95 ? 'critical' : 'high',
              description: `Stand ${standId} has high utilization (${maxUtilization.toFixed(1)}%)`,
              affected_entities: JSON.stringify({
                stand_id: standId,
                utilization_percentage: maxUtilization,
                metrics: standMetrics.map(m => ({
                  period_start: m.period_start,
                  period_end: m.period_end,
                  utilization_percentage: m.utilization_percentage
                }))
              }),
              recommendation: 'Consider redistributing flights to less utilized stands',
              is_resolved: false,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
      }
      
      return issues;
    } catch (error) {
      console.error('[DEBUG] Error identifying allocation issues:', error);
      return [];
    }
  }
  
  /**
   * Store allocation issues in the database
   * @param {number} scheduleId - Schedule ID 
   * @param {Array} issues - Allocation issues
   * @returns {Promise<Array>} Stored issues
   */
  async storeAllocationIssues(scheduleId, issues) {
    try {
      console.log(`[DEBUG] Storing ${issues.length} allocation issues for schedule ${scheduleId}`);
      
      if (!issues || !Array.isArray(issues) || issues.length === 0) {
        console.log('[DEBUG] No issues to store');
        return [];
      }
      
      // Insert issues into the database
      await db('allocation_issues').insert(issues);
      
      return issues;
    } catch (error) {
      console.error('[DEBUG] Error storing allocation issues:', error);
      return [];
    }
  }
  
  /**
   * Store utilization metrics in database
   * @param {number} scheduleId - Schedule ID
   * @param {Array} metrics - Utilization metrics
   * @returns {Promise<Array>} Stored metrics
   */
  async storeUtilizationMetrics(scheduleId, metrics) {
    try {
      console.log(`[DEBUG] Storing ${metrics.length} utilization metrics for schedule ${scheduleId}`);
      
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        console.log('[DEBUG] No metrics to store');
        return [];
      }
      
      // Add schedule ID to each metric
      const metricsWithScheduleId = metrics.map(metric => ({
        ...metric,
        schedule_id: scheduleId
      }));
      
      // Insert metrics into the database
      await db('stand_utilization_metrics').insert(metricsWithScheduleId);
      
      return metricsWithScheduleId;
    } catch (error) {
      console.error('[DEBUG] Error storing utilization metrics:', error);
      return [];
    }
  }
  
  /**
   * Generate a comprehensive report for a flight schedule
   * @param {number} scheduleId - Schedule ID
   * @returns {Promise<Object>} Comprehensive report
   */
  async generateAllocationReport(scheduleId) {
    try {
      // Get flight schedule
      const schedule = await db('flight_schedules')
        .where('id', scheduleId)
        .first();
      
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      // Get allocation data
      const allocatedFlights = await db('stand_allocations')
        .where('schedule_id', scheduleId)
        .join('flights', 'stand_allocations.flight_id', 'flights.id')
        .join('stands', 'stand_allocations.stand_id', 'stands.id')
        .select(
          'stand_allocations.*',
          'flights.flight_number',
          'flights.airline_iata',
          'flights.aircraft_type_iata',
          'flights.flight_nature',
          'flights.scheduled_datetime',
          'stands.name as stand_name',
          'stands.terminal'
        );
      
      // Get unallocated flights
      const unallocatedFlights = await db('unallocated_flights')
        .where('schedule_id', scheduleId)
        .join('flights', 'unallocated_flights.flight_id', 'flights.id')
        .select(
          'unallocated_flights.*',
          'flights.flight_number',
          'flights.airline_iata',
          'flights.aircraft_type_iata',
          'flights.flight_nature',
          'flights.scheduled_datetime'
        );
      
      // Get utilization metrics
      const utilizationMetrics = await db('stand_utilization_metrics')
        .where('schedule_id', scheduleId)
        .join('stands', 'stand_utilization_metrics.stand_id', 'stands.id')
        .select(
          'stand_utilization_metrics.*',
          'stands.name as stand_name',
          'stands.terminal'
        );
      
      // Get allocation issues
      const issues = await db('allocation_issues')
        .where('schedule_id', scheduleId)
        .select('*');
      
      return {
        schedule,
        allocatedFlights,
        unallocatedFlights,
        utilizationMetrics,
        issues
      };
    } catch (error) {
      console.error(`Error generating allocation report for schedule ${scheduleId}:`, error);
      throw error;
    }
  }
}

module.exports = FlightProcessorService; 