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
   * Process a flight schedule from upload through validation to stand allocation
   * @param {number} uploadId - The ID of the uploaded flight schedule
   * @param {Object} options - Processing options
   * @param {boolean} options.skipValidation - Skip validation step
   * @param {boolean} options.skipAllocation - Skip allocation step
   * @param {Object} options.allocationSettings - Settings for stand allocation
   * @returns {Promise<object>} Process results
   */
  async processFlightSchedule(uploadId, options = {}) {
    console.log(`Starting flight schedule processing for upload ${uploadId} with options:`, JSON.stringify(options));
    const startTime = Date.now();
    
    try {
      // 1. Fetch upload information
      const upload = await this.uploadService.getUploadById(uploadId);
      if (!upload) {
        throw new Error(`Upload not found with ID: ${uploadId}`);
      }
      
      console.log(`Retrieved upload: ${upload.id} (${upload.filename})`);
      
      // 2. Create flight schedule record
      const scheduleId = await this.createFlightSchedule(uploadId);
      console.log(`Created flight schedule with ID: ${scheduleId}`);
      
      if (!scheduleId) {
        throw new Error('Failed to create flight schedule - no ID returned');
      }
      
      // 3. Update status to processing
      await db('flight_schedules')
        .where('id', scheduleId)
        .update({ status: 'processing' });
      
      // 4. Run validation (unless skipped)
      let validationResults = null;
      if (!options.skipValidation) {
        console.log(`Running validation for upload ${uploadId}`);
        try {
          validationResults = await this.validateFlightData(uploadId);
          console.log(`Validation completed for upload ${uploadId}:`, JSON.stringify(validationResults));
          await this.storeValidationResults(scheduleId, validationResults);
          
          if (validationResults.invalidFlights > 0) {
            console.log(`Found ${validationResults.invalidFlights} invalid flights out of ${validationResults.totalFlights} total flights`);
          }
        } catch (validationError) {
          console.error(`Validation error for upload ${uploadId}:`, validationError);
          throw new Error(`Validation failed: ${validationError.message}`);
        }
      }
      
      // 5. Run stand allocation (unless skipped)
      let allocationResults = null;
      if (!options.skipAllocation) {
        console.log(`Running stand allocation for upload ${uploadId}`);
        
        try {
          // Prepare data for stand allocation
          console.log(`Preparing allocation data for upload ${uploadId}`);
          const allocationInput = await this.prepareAllocationData(uploadId);
          console.log(`Allocation input prepared with ${allocationInput.flights.length} flights, ${allocationInput.stands.length} stands, and ${allocationInput.airlines.length} airlines`);
          
          // Run stand allocation
          console.log(`Executing stand allocation for upload ${uploadId}`);
          allocationResults = await this.runStandAllocation(allocationInput, options.allocationSettings);
          console.log(`Allocation completed with results:`, JSON.stringify({
            allocated: allocationResults.allocated?.length || 0, 
            unallocated: allocationResults.unallocated?.length || 0
          }));
          
          // Store allocation results
          console.log(`Storing allocation results for schedule ${scheduleId}`);
          await this.storeAllocationResults(scheduleId, allocationResults);
          console.log(`Successfully stored allocation results for schedule ${scheduleId}`);
          
          // Calculate and store utilization metrics
          console.log(`Calculating utilization metrics for schedule ${scheduleId}`);
          const utilizationMetrics = await this.calculateUtilizationMetrics(scheduleId, allocationResults);
          console.log(`Calculated ${utilizationMetrics.length} utilization metrics`);
          
          // Identify and store utilization issues
          console.log(`Identifying utilization issues for schedule ${scheduleId}`);
          const issues = await this.identifyUtilizationIssues(scheduleId, utilizationMetrics);
          console.log(`Identified ${issues.length} utilization issues`);
        } catch (allocationError) {
          console.error('Error during allocation process:', allocationError);
          console.error('Stack trace:', allocationError.stack);
          
          // Still continue the process, but mark allocation as failed
          await db('flight_schedules')
            .where('id', scheduleId)
            .update({ 
              status: 'validation_only',
              updated_at: new Date()
            });
        }
      }
      
      // 6. Update status to completed
      if (scheduleId) {
        const finalStatus = allocationResults ? 
          (!options.skipAllocation ? 'allocated' : (!options.skipValidation ? 'validated' : 'draft')) :
          (!options.skipValidation ? 'validated' : 'draft');
          
        await db('flight_schedules')
          .where('id', scheduleId)
          .update({ 
            status: finalStatus,
            updated_at: new Date()
          });
      } else {
        console.warn('Cannot update schedule status - no valid schedule ID available');
      }
      
      const endTime = Date.now();
      
      console.log(`Flight schedule processing completed in ${(endTime - startTime) / 1000} seconds`);
      
      return {
        scheduleId,
        uploadId,
        validation: validationResults,
        allocation: allocationResults ? {
          allocated: allocationResults.allocated?.length || 0,
          unallocated: allocationResults.unallocated?.length || 0
        } : null,
        processingTime: (endTime - startTime) / 1000
      };
    } catch (error) {
      console.error(`Error processing flight schedule for upload ${uploadId}:`, error);
      console.error('Stack trace:', error.stack);
      
      // Update status to failed for both upload and schedule
      try {
        // Truncate error message to avoid DB error with varchar limits
        let errorMessage = error.message || "Unknown error";
        
        // Ensure error message is not too long for the database field
        if (errorMessage && errorMessage.length > 250) {
          errorMessage = errorMessage.substring(0, 247) + '...';
        }
          
        await db('flight_uploads')
          .where('id', uploadId)
          .update({ 
            upload_status: 'failed',
            error_message: errorMessage
          });
        
        // Get schedule ID
        const schedule = await db('flight_schedules')
          .where('upload_id', uploadId)
          .orderBy('created_at', 'desc')
          .first();
        
        if (schedule) {
          await db('flight_schedules')
            .where('id', schedule.id)
            .update({ 
              status: 'failed',
              updated_at: new Date()
            });
        }
      } catch (dbError) {
        console.error('Error updating status after failure:', dbError);
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
   * Prepare data for stand allocation
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Data for stand allocation
   */
  async prepareAllocationData(uploadId) {
    try {
      console.log(`Preparing allocation data for upload ${uploadId}`);
      
      // Fetch flights from database
      const flights = await db('flights')
        .where({ 
          upload_id: uploadId,
          validation_status: 'valid' // Only use valid flights
        })
        .select('*');
      
      console.log(`Found ${flights.length} valid flights for allocation`);
      
      if (!flights || flights.length === 0) {
        console.warn(`No valid flights found for upload ${uploadId}`);
        return {
          flights: [],
          stands: [],
          airlines: []
        };
      }
      
      // Normalize flight data
      const normalizedFlights = [];
      
      for (const flight of flights) {
        try {
          // Ensure flight has the required fields
          if (!flight.id || !flight.flight_number) {
            console.warn(`Skipping invalid flight ID ${flight.id || 'unknown'}: missing required fields`);
            continue;
          }
          
          // Parse flight_data JSON
          let flightData = {};
          try {
            if (flight.flight_data && typeof flight.flight_data === 'string') {
              flightData = JSON.parse(flight.flight_data);
            } else if (flight.flight_data && typeof flight.flight_data === 'object') {
              flightData = flight.flight_data;
            } else {
              console.warn(`Flight ${flight.id} has missing or invalid flight_data`);
              flightData = {};
            }
          } catch (parseError) {
            console.error(`Error parsing flight_data for flight ${flight.id}:`, parseError);
            flightData = {};
          }
          
          // Extract times as Date objects
          let scheduledArrival = null;
          let scheduledDeparture = null;
          let estimatedArrival = null;
          let estimatedDeparture = null;
          
          try {
            scheduledArrival = flight.scheduled_arrival_time ? new Date(flight.scheduled_arrival_time) : null;
            scheduledDeparture = flight.scheduled_departure_time ? new Date(flight.scheduled_departure_time) : null;
            estimatedArrival = flight.estimated_arrival_time ? new Date(flight.estimated_arrival_time) : scheduledArrival;
            estimatedDeparture = flight.estimated_departure_time ? new Date(flight.estimated_departure_time) : scheduledDeparture;
            
            // Check if dates are valid
            if (scheduledArrival && isNaN(scheduledArrival.getTime())) scheduledArrival = null;
            if (scheduledDeparture && isNaN(scheduledDeparture.getTime())) scheduledDeparture = null;
            if (estimatedArrival && isNaN(estimatedArrival.getTime())) estimatedArrival = scheduledArrival;
            if (estimatedDeparture && isNaN(estimatedDeparture.getTime())) estimatedDeparture = scheduledDeparture;
            
            // Ensure we have at least one valid time
            if (!scheduledArrival && !scheduledDeparture) {
              console.warn(`Skipping flight ${flight.id} with no valid times`);
              continue;
            }
          } catch (dateError) {
            console.error(`Error parsing dates for flight ${flight.id}:`, dateError);
            continue;
          }
          
          // Create a normalized flight object
          normalizedFlights.push({
            FlightID: flight.id,
            FlightNumber: flight.flight_number,
            Registration: flight.registration || flight.aircraft_registration || '',
            AircraftType: flight.aircraft_type || flightData.aircraft_type || '',
            AircraftSize: flight.aircraft_size || flightData.aircraft_size || 'medium',
            Airline: flight.airline || flightData.airline || '',
            Origin: flight.origin || flightData.origin || '',
            Destination: flight.destination || flightData.destination || '',
            ScheduledArrival: scheduledArrival,
            ScheduledDeparture: scheduledDeparture,
            EstimatedArrival: estimatedArrival,
            EstimatedDeparture: estimatedDeparture,
            Terminal: flight.terminal || flightData.terminal || null,
            StandPreferences: flight.stand_preferences || flightData.stand_preferences || [],
            StandRestrictions: flight.stand_restrictions || flightData.stand_restrictions || [],
            HasFixed: flight.has_fixed_allocation || false,
            TurnaroundTime: flight.turnaround_time || flightData.turnaround_time || 45, // Default 45 minutes
            Status: flight.status || 'scheduled'
          });
        } catch (flightError) {
          console.error(`Error processing flight ${flight.id}:`, flightError);
          continue;
        }
      }
      
      console.log(`Normalized ${normalizedFlights.length} flights for allocation`);
      
      // Fetch stands from database
      let stands = [];
      try {
        stands = await db('stands').select('*');
        console.log(`Found ${stands.length} stands for allocation`);
      } catch (standsError) {
        console.error('Error fetching stands:', standsError);
        stands = [];
      }
      
      if (!stands || stands.length === 0) {
        console.warn('No stands available for allocation');
      }
      
      // Normalize stand data
      const normalizedStands = stands.map(stand => ({
        StandID: stand.id,
        Name: stand.name || `Stand ${stand.id}`,
        Terminal: stand.terminal || '',
        Type: stand.type || 'remote',
        MaxAircraftSize: stand.max_aircraft_size || 'large',
        AirlinePriorities: stand.airline_priorities || [],
        Restrictions: stand.restrictions || [],
        IsActive: stand.is_active !== false // Default to true if undefined
      }));
      
      // Extract unique airlines
      const airlines = [...new Set(normalizedFlights.map(f => f.Airline).filter(Boolean))];
      
      return {
        flights: normalizedFlights,
        stands: normalizedStands,
        airlines: airlines
      };
    } catch (error) {
      console.error(`Error preparing allocation data for upload ${uploadId}:`, error);
      console.error('Stack trace:', error.stack);
      return {
        flights: [],
        stands: [],
        airlines: []
      };
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
      console.log(`Storing allocation results for schedule ${scheduleId}`);
      
      // Validate inputs
      if (!scheduleId) {
        console.warn('No schedule ID provided for storing allocation results');
        return [];
      }
      
      if (!allocationResults) {
        console.warn('No allocation results provided');
        return [];
      }
      
      // Make sure we have valid arrays for allocated and unallocated flights
      const allocated = Array.isArray(allocationResults.allocated) ? allocationResults.allocated : [];
      const unallocated = Array.isArray(allocationResults.unallocated) ? allocationResults.unallocated : [];
      
      console.log(`Processing ${allocated.length} allocated flights and ${unallocated.length} unallocated flights`);
      
      // Process allocated flights
      const allocations = [];
      
      for (const allocation of allocated) {
        try {
          if (!allocation.flight || !allocation.flight.id || !allocation.stand || !allocation.stand.id) {
            console.warn('Skipping invalid allocation record:', allocation);
            continue;
          }
          
          let startTime = null;
          let endTime = null;
          
          try {
            startTime = allocation.start_time ? new Date(allocation.start_time) : null;
            endTime = allocation.end_time ? new Date(allocation.end_time) : null;
            
            // Validate dates
            if (startTime && isNaN(startTime.getTime())) startTime = null;
            if (endTime && isNaN(endTime.getTime())) endTime = null;
            
            // If we have only one valid time, try to estimate the other
            if (startTime && !endTime) {
              // Add 45 minutes for turnaround time as a default
              endTime = new Date(startTime.getTime() + (45 * 60 * 1000));
            } else if (!startTime && endTime) {
              // Subtract 45 minutes
              startTime = new Date(endTime.getTime() - (45 * 60 * 1000));
            }
            
            // If we still have no valid times, skip
            if (!startTime || !endTime) {
              console.warn(`Skipping allocation for flight ${allocation.flight.id} with no valid times`);
              continue;
            }
          } catch (dateError) {
            console.error(`Error parsing allocation times for flight ${allocation.flight.id}:`, dateError);
            continue;
          }
          
          allocations.push({
            flight_id: allocation.flight.id,
            stand_id: allocation.stand.id,
            schedule_id: scheduleId,
            start_time: startTime,
            end_time: endTime,
            is_manual: false,
            status: 'allocated',
            allocation_source: 'automated',
            created_at: new Date(),
            updated_at: new Date()
          });
        } catch (allocationError) {
          console.error('Error processing allocation record:', allocationError);
          continue;
        }
      }
      
      // Process unallocated flights
      const unallocatedRecords = [];
      
      for (const unallocation of unallocated) {
        try {
          if (!unallocation.flight || !unallocation.flight.id) {
            console.warn('Skipping invalid unallocation record:', unallocation);
            continue;
          }
          
          unallocatedRecords.push({
            flight_id: unallocation.flight.id,
            schedule_id: scheduleId,
            reason: unallocation.reason?.substring(0, 250) || 'Unknown reason',
            created_at: new Date(),
            updated_at: new Date()
          });
        } catch (unallocationError) {
          console.error('Error processing unallocation record:', unallocationError);
          continue;
        }
      }
      
      // Store allocated flights
      if (allocations.length > 0) {
        try {
          console.log(`Storing ${allocations.length} stand allocation records`);
          await db('stand_allocations').insert(allocations);
        } catch (insertError) {
          console.error('Error storing stand allocations:', insertError);
        }
      } else {
        console.warn('No valid allocations to store');
      }
      
      // Store unallocated flights
      if (unallocatedRecords.length > 0) {
        try {
          console.log(`Storing ${unallocatedRecords.length} unallocated flight records`);
          await db('unallocated_flights').insert(unallocatedRecords);
        } catch (insertError) {
          console.error('Error storing unallocated flights:', insertError);
        }
      } else {
        console.log('No unallocated flights to store');
      }
      
      console.log(`Completed storing allocation results for schedule ${scheduleId}`);
      
      return allocations;
    } catch (error) {
      console.error(`Error storing allocation results for schedule ${scheduleId}:`, error);
      console.error('Stack trace:', error.stack);
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
          
          // Format date objects properly
          let periodStart, periodEnd;
          try {
            periodStart = new Date(metric.period_start);
            periodEnd = new Date(metric.period_end);
            
            // Skip if dates are invalid
            if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
              console.warn('Skipping metric with invalid dates:', metric);
              continue;
            }
          } catch (dateError) {
            console.warn('Error parsing dates for metric:', dateError);
            continue;
          }
          
          metricsRecords.push({
            schedule_id: scheduleId,
            stand_id: metric.stand_id,
            time_period: metric.time_period || 'daily',
            period_start: periodStart,
            period_end: periodEnd,
            utilization_percentage: metric.utilization_percentage || 0,
            minutes_utilized: metric.minutes_utilized || 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        
        console.log(`Prepared ${metricsRecords.length} metric records for database storage`);
        
        // Insert in chunks
        const chunkSize = 500;
        if (metricsRecords.length > 0) {
          for (let i = 0; i < metricsRecords.length; i += chunkSize) {
            const chunk = metricsRecords.slice(i, i + chunkSize);
            if (chunk.length > 0) {
              try {
                await db('stand_utilization_metrics').insert(chunk);
                console.log(`Inserted chunk of ${chunk.length} metrics (${i+1}-${Math.min(i+chunkSize, metricsRecords.length)} of ${metricsRecords.length})`);
              } catch (insertError) {
                console.error(`Error inserting metrics chunk ${i+1}-${Math.min(i+chunkSize, metricsRecords.length)}:`, insertError);
                // Continue with next chunk
              }
            }
          }
        } else {
          console.warn('No valid metrics records to store');
        }
        
        return metrics;
      } catch (adapterError) {
        console.error('Error calculating metrics with adapter:', adapterError);
        return [];
      }
    } catch (error) {
      console.error(`Error calculating utilization metrics for schedule ${scheduleId}:`, error);
      console.error('Error stack:', error.stack);
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
            affectedEntitiesJson = JSON.stringify(issue.affected_entities || {});
          } catch (jsonError) {
            console.warn('Error serializing affected entities:', jsonError);
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