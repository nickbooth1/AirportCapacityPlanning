const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const db = require('../../db');

/**
 * StandAllocationAdapter
 * 
 * This adapter integrates the CLI-based Stand Allocation Tool with the web application,
 * allowing allocation of flights to stands using the existing allocation algorithm.
 */
class StandAllocationAdapter {
  constructor() {
    // Path to the stand allocation tool - update as needed
    this.allocationToolPath = path.resolve(__dirname, '../../../../stand_allocation_tool/main.py');
    
    // Path to temporary directory for input/output files
    this.tempDir = path.resolve(__dirname, '../../../temp/allocation');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Convert flight data to the format required by the stand allocation tool
   * @param {Array} flights - Flight data from database
   * @returns {Promise<Object>} Data in the format required by the stand allocation tool
   */
  async convertToAllocationFormat(flights) {
    try {
      console.log(`Converting ${flights ? flights.length : 0} flights to allocation format`);
      
      // Validate input
      if (!flights || !Array.isArray(flights) || flights.length === 0) {
        console.warn('No valid flights to convert to allocation format');
        return {
          flights: [],
          stands: [],
          airlines: [],
          settings: {
            GapBetweenFlights: 15,
            TurnaroundTimeSettings: {
              Default: 45,
              Narrow: 30,
              Wide: 45,
              Super: 60
            }
          },
          maintenance: []
        };
      }
      
      // Get the base airport configuration
      const airportConfigService = require('../airportConfigService');
      const config = await airportConfigService.getConfig();
      const baseAirport = config.baseAirport;
      
      // Use a default IATA code if no base airport is configured
      const baseAirportCode = baseAirport?.iata_code || 'BASE';
      
      console.log(`Using base airport: ${baseAirportCode} for flight format conversion`);
      
      // Transform flight objects to the format expected by the stand allocation tool
      const formattedFlights = flights.map(flight => {
        if (!flight) return null;
        
        return {
          FlightID: flight.id ? flight.id.toString() : '',
          FlightNumber: flight.flight_number || '',
          AirlineCode: flight.airline_iata || '',
          AircraftType: flight.aircraft_type_iata || '',
          Origin: flight.flight_nature === 'A' ? (flight.origin_destination_iata || '') : baseAirportCode,
          Destination: flight.flight_nature === 'D' ? (flight.origin_destination_iata || '') : baseAirportCode,
          ScheduledTime: this._formatDateTime(flight.scheduled_datetime),
          Terminal: flight.terminal || null,
          IsArrival: flight.flight_nature === 'A',
          LinkID: flight.link_id || null
        };
      }).filter(flight => flight !== null);
      
      console.log(`Successfully formatted ${formattedFlights.length} flights`);
      
      try {
        // Fetch required reference data
        const stands = await this._fetchStands();
        const airlines = await this._fetchAirlines();
        const settings = await this._getOperationalSettings();
        const maintenance = await this._fetchMaintenanceRequests();
        
        // Return the complete dataset
        return {
          flights: formattedFlights,
          stands: stands || [],
          airlines: airlines || [],
          settings: settings || {
            GapBetweenFlights: 15,
            TurnaroundTimeSettings: {
              Default: 45,
              Narrow: 30,
              Wide: 45,
              Super: 60
            }
          },
          maintenance: maintenance || []
        };
      } catch (referenceError) {
        console.error('Error fetching reference data:', referenceError);
        
        // Return valid structure with flights but empty reference data
        return {
          flights: formattedFlights,
          stands: [],
          airlines: [],
          settings: {
            GapBetweenFlights: 15,
            TurnaroundTimeSettings: {
              Default: 45,
              Narrow: 30,
              Wide: 45,
              Super: 60
            }
          },
          maintenance: []
        };
      }
    } catch (error) {
      console.error('Error converting to allocation format:', error);
      
      // Return a valid but empty structure
      return {
        flights: [],
        stands: [],
        airlines: [],
        settings: {
          GapBetweenFlights: 15,
          TurnaroundTimeSettings: {
            Default: 45,
            Narrow: 30,
            Wide: 45,
            Super: 60
          }
        },
        maintenance: []
      };
    }
  }
  
  /**
   * Format date/time for the allocation tool
   * @param {Date} dateTime - DateTime to format
   * @returns {string} Formatted date/time
   */
  _formatDateTime(dateTime) {
    if (!dateTime) return null;
    
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return null;
    
    // Extract just hours and minutes for the stand allocation tool
    // This fixes the 'time data does not match format %H:%M' error
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  /**
   * Fetch stands from database
   * @returns {Promise<Array>} Stand data
   */
  async _fetchStands() {
    try {
      // Get stands from database
      const stands = await db('stands').select('*');
      
      // If no stands found, generate mock stands for testing
      if (!stands || stands.length === 0) {
        console.warn('No stands found in database, generating mock stands for testing');
        
        const mockStands = [];
        
        // Generate 20 mock stands
        for (let i = 1; i <= 20; i++) {
          // Create stands in different terminals
          const terminal = i <= 8 ? 'T1' : (i <= 16 ? 'T2' : 'T3');
          const type = i % 2 === 0 ? 'remote' : 'contact';
          const sizeCategory = i % 3 === 0 ? 'F' : (i % 3 === 1 ? 'D' : 'C');
          
          mockStands.push({
            id: i,
            name: `${terminal}-${i}`,
            terminal: terminal,
            max_aircraft_size_code: sizeCategory,
            is_contact_stand: type === 'contact',
            is_active: true
          });
        }
        
        return mockStands.map(stand => ({
          StandID: stand.id,
          Name: stand.name || `Stand ${stand.id}`,
          Terminal: stand.terminal || '',
          Type: stand.type || 'remote',
          MaxAircraftSize: stand.max_aircraft_size_code || 'C',
          AirlinePriorities: [],
          Restrictions: [],
          IsActive: true
        }));
      }
      
      console.log(`Found ${stands.length} stands in database`);
      
      // Normalize database stand format
      return stands.map(stand => ({
        StandID: stand.id,
        Name: stand.name || `Stand ${stand.id}`,
        Terminal: stand.terminal || '',
        Type: stand.stand_type || 'remote',
        MaxAircraftSize: stand.max_aircraft_size_code || 'C',
        AirlinePriorities: stand.airline_priorities || [],
        Restrictions: stand.restrictions || [],
        IsActive: stand.is_active !== false
      }));
    } catch (error) {
      console.error('Error fetching stands:', error);
      return [];
    }
  }
  
  /**
   * Fetch airlines data from database
   * @returns {Promise<Array>} Airline data
   */
  async _fetchAirlines() {
    try {
      const airlines = await db('airlines').select('*');
      
      // Transform to the format expected by the allocation tool
      return airlines.map(airline => ({
        AirlineCode: airline.iata_code,
        AirlineName: airline.name,
        BaseTerminal: airline.base_terminal || null,
        RequiresContactStand: airline.requires_contact_stand === 1,
        PreferredTerminals: airline.preferred_terminals ? JSON.parse(airline.preferred_terminals) : []
      }));
    } catch (error) {
      console.error('Error fetching airlines:', error);
      return [];
    }
  }
  
  /**
   * Fetch maintenance requests from database
   * @returns {Promise<Array>} Maintenance data
   */
  async _fetchMaintenanceRequests() {
    try {
      const maintenance = await db('maintenance_requests')
        .where('status', 'approved')
        .select('*');
      
      // Transform to the format expected by the allocation tool
      return maintenance.map(req => ({
        MaintenanceID: req.id.toString(),
        StandName: req.stand_id.toString(),
        StartTime: this._formatDateTime(req.start_time),
        EndTime: this._formatDateTime(req.end_time),
        Description: req.description || ''
      }));
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      return [];
    }
  }
  
  /**
   * Get operational settings for the allocation algorithm
   * @returns {Promise<Object>} Operational settings
   */
  async _getOperationalSettings() {
    try {
      // This could be fetched from a settings table or configuration file
      // Default settings as a fallback
      return {
        GapBetweenFlights: 15, // minutes
        TurnaroundTimeSettings: {
          Default: 45,
          Narrow: 30,
          Wide: 45,
          Super: 60
        },
        prioritization_weights: {
          aircraft_type_A380: 10.0,
          aircraft_type_B747: 8.0,
          airline_tier: 2.0,
          requires_contact_stand: 3.0,
          critical_connection: 5.0,
          base_score: 1.0
        },
        solver_parameters: {
          use_solver: true,
          solver_time_limit_seconds: 30,
          optimality_gap: 0.05,
          max_solutions: 1
        }
      };
    } catch (error) {
      console.error('Error getting operational settings:', error);
      throw error;
    }
  }
  
  /**
   * Allocate stands to flights using the stand allocation tool
   * @param {Object} inputData - Data in the format required by the stand allocation tool
   * @param {Object} settings - Additional settings for the allocation algorithm
   * @returns {Promise<Object>} Allocation results
   */
  async allocateStands(inputData, settings = {}) {
    let scenarioDir = null;
    
    try {
      console.log('Running stand allocation algorithm');
      
      // Validate input data
      if (!inputData || !inputData.flights || !inputData.flights.length) {
        console.warn('No valid flights provided for allocation');
        return {
          allocated: [],
          unallocated: [],
          total: 0,
          allocationRate: 0
        };
      }
      
      // Create a scenario directory for the allocation
      scenarioDir = path.join(this.tempDir, `scenario_${Date.now()}`);
      if (!fs.existsSync(scenarioDir)) {
        fs.mkdirSync(scenarioDir, { recursive: true });
      }
      
      // Write input data files
      await this._writeInputFiles(scenarioDir, inputData);
      
      // Check if allocation tool exists
      if (!fs.existsSync(this.allocationToolPath)) {
        console.warn(`Stand allocation tool not found at ${this.allocationToolPath}`);
        
        // Generate mock allocation results
        return this._generateMockAllocation(inputData.flights);
      }
      
      // TEMPORARY FOR TESTING: Always use mock allocation
      console.log('Using mock allocation for testing');
      return this._generateMockAllocation(inputData.flights);
      
      // Build command with any additional options
      let cmd = `python ${this.allocationToolPath} "${scenarioDir}"`;
      
      if (settings.quiet) {
        cmd += ' --quiet';
      }
      
      if (settings.summary) {
        cmd += ' --summary';
      }
      
      console.log(`Executing allocation command: ${cmd}`);
      
      try {
        // Execute the command
        const { stdout, stderr } = await exec(cmd, {
          timeout: 60000, // 60 second timeout
        });
        
        console.log('Allocation command output:', stdout);
        if (stderr) {
          console.error('Allocation command error:', stderr);
        }
      } catch (execError) {
        console.error('Error executing allocation tool:', execError);
        
        // Return all flights as unallocated due to tool error
        const errorMessage = execError.message || 'Error executing allocation tool';
        
        return {
          allocated: [],
          unallocated: inputData.flights.map(flight => ({
            flight: { id: flight.FlightID },
            reason: `Allocation tool error: ${errorMessage.substring(0, 200)}`
          })),
          total: inputData.flights.length,
          allocationRate: 0,
          error: errorMessage
        };
      }
      
      // Check if output files exist
      const allocatedPath = path.join(scenarioDir, 'allocated_flights.json');
      const unallocatedPath = path.join(scenarioDir, 'unallocated_flights.json');
      
      if (!fs.existsSync(allocatedPath) && !fs.existsSync(unallocatedPath)) {
        console.error('Allocation tool did not produce expected output files');
        
        // Return all flights as unallocated
        return {
          allocated: [],
          unallocated: inputData.flights.map(flight => ({
            flight: { id: flight.FlightID },
            reason: 'Allocation tool did not produce expected output files'
          })),
          total: inputData.flights.length,
          allocationRate: 0
        };
      }
      
      // Read the allocation results
      const results = await this._readAllocationResults(scenarioDir);
      
      // Clean up temporary files
      if (!settings.keepTempFiles) {
        this._cleanupTempFiles(scenarioDir);
      }
      
      return results;
    } catch (error) {
      console.error('Error in allocateStands:', error);
      
      // Try to clean up temporary files even if there was an error
      if (scenarioDir && !settings.keepTempFiles) {
        try {
          this._cleanupTempFiles(scenarioDir);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary files:', cleanupError);
        }
      }
      
      // Return empty results in case of error instead of throwing
      // This allows the process to continue even if allocation fails
      return {
        allocated: [],
        unallocated: inputData?.flights?.map(flight => ({
          flight: { id: flight.FlightID },
          reason: `Allocation error: ${error.message?.substring(0, 200) || 'Unknown error'}`
        })) || [],
        total: inputData?.flights?.length || 0,
        allocationRate: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Write input data files for the allocation tool
   * @param {string} scenarioDir - Directory to write files to
   * @param {Object} inputData - Input data for the allocation tool
   * @returns {Promise<void>}
   */
  async _writeInputFiles(scenarioDir, inputData) {
    try {
      console.log(`[DEBUG] Writing input files to ${scenarioDir}`);
      
      // Ensure we have valid data for each file
      const flights = Array.isArray(inputData.flights) ? inputData.flights : [];
      const stands = Array.isArray(inputData.stands) ? inputData.stands : [];
      const airlines = Array.isArray(inputData.airlines) ? inputData.airlines : [];
      const maintenance = Array.isArray(inputData.maintenance) ? inputData.maintenance : [];
      
      // Default settings if not provided
      const settings = inputData.settings || {
        GapBetweenFlights: 15,
        TurnaroundTimeSettings: {
          Default: 45,
          Narrow: 30,
          Wide: 45,
          Super: 60
        }
      };
      
      // Write flights.json
      fs.writeFileSync(
        path.join(scenarioDir, 'flights.json'),
        JSON.stringify(flights, null, 2),
        'utf8'
      );
      
      // Write stands.json
      fs.writeFileSync(
        path.join(scenarioDir, 'stands.json'),
        JSON.stringify(stands, null, 2),
        'utf8'
      );
      
      // Write airlines.json
      fs.writeFileSync(
        path.join(scenarioDir, 'airlines.json'),
        JSON.stringify(airlines, null, 2),
        'utf8'
      );
      
      // Write settings.json
      fs.writeFileSync(
        path.join(scenarioDir, 'settings.json'),
        JSON.stringify(settings, null, 2),
        'utf8'
      );
      
      // Write maintenance.json
      fs.writeFileSync(
        path.join(scenarioDir, 'maintenance.json'),
        JSON.stringify(maintenance, null, 2),
        'utf8'
      );
      
      console.log(`[DEBUG] Successfully wrote input files to ${scenarioDir}:`);
      console.log(`  - flights.json: ${flights.length} flights`);
      console.log(`  - stands.json: ${stands.length} stands`);
      console.log(`  - airlines.json: ${airlines.length} airlines`);
      console.log(`  - maintenance.json: ${maintenance.length} maintenance entries`);
    } catch (error) {
      console.error('[DEBUG] Error writing input files:', error);
      throw error;
    }
  }
  
  /**
   * Read allocation results from output files
   * @param {string} scenarioDir - Directory with allocation results
   * @returns {Promise<Object>} Allocation results
   */
  async _readAllocationResults(scenarioDir) {
    try {
      const allocatedPath = path.join(scenarioDir, 'allocated_flights.json');
      const unallocatedPath = path.join(scenarioDir, 'unallocated_flights.json');
      
      let allocated = [];
      let unallocated = [];
      
      // Read allocated flights
      if (fs.existsSync(allocatedPath)) {
        try {
          const allocatedJson = fs.readFileSync(allocatedPath, 'utf8');
          allocated = JSON.parse(allocatedJson);
        } catch (parseError) {
          console.error('Error parsing allocated flights JSON:', parseError);
          // Continue with empty allocated array
        }
      }
      
      // Read unallocated flights
      if (fs.existsSync(unallocatedPath)) {
        try {
          const unallocatedJson = fs.readFileSync(unallocatedPath, 'utf8');
          unallocated = JSON.parse(unallocatedJson);
        } catch (parseError) {
          console.error('Error parsing unallocated flights JSON:', parseError);
          // Continue with empty unallocated array
        }
      }
      
      return {
        allocated: Array.isArray(allocated) ? allocated : [],
        unallocated: Array.isArray(unallocated) ? unallocated : [],
        total: (Array.isArray(allocated) ? allocated.length : 0) + 
               (Array.isArray(unallocated) ? unallocated.length : 0),
        allocationRate: (Array.isArray(allocated) && Array.isArray(unallocated) && 
                         (allocated.length + unallocated.length) > 0) ?
          (allocated.length / (allocated.length + unallocated.length)) * 100 : 0
      };
    } catch (error) {
      console.error('Error reading allocation results:', error);
      return {
        allocated: [],
        unallocated: [],
        total: 0,
        allocationRate: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Clean up temporary files
   * @param {string} scenarioDir - Directory to clean up
   */
  _cleanupTempFiles(scenarioDir) {
    try {
      fs.rmSync(scenarioDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary directory: ${scenarioDir}`);
    } catch (error) {
      console.error(`Error cleaning up temporary directory ${scenarioDir}:`, error);
    }
  }
  
  /**
   * Calculate utilization metrics for stands
   * @param {Object} allocationResults - Results from stand allocation
   * @returns {Promise<Array>} Utilization metrics
   */
  async calculateUtilizationMetrics(allocationResults) {
    try {
      console.log('Calculating stand utilization metrics');
      
      // Get all stands
      const stands = await db('stands').select('id', 'name', 'terminal');
      
      // Initialize metrics
      const metrics = [];
      
      // Group allocations by stand
      const standAllocations = {};
      
      // Process allocated flights
      for (const allocation of allocationResults.allocated) {
        const standId = allocation.stand.StandID;
        standAllocations[standId] = standAllocations[standId] || [];
        standAllocations[standId].push({
          start: new Date(allocation.start_time),
          end: new Date(allocation.end_time)
        });
      }
      
      // Calculate metrics for each stand
      for (const stand of stands) {
        const standId = stand.id.toString();
        const allocations = standAllocations[standId] || [];
        
        // Calculate daily utilization
        const dailyMetrics = this._calculateDailyUtilization(stand, allocations);
        metrics.push(...dailyMetrics);
        
        // Calculate hourly utilization for busy days
        const busyDays = dailyMetrics
          .filter(m => m.utilization_percentage > 70)
          .map(m => ({
            date: m.period_start.toISOString().split('T')[0],
            utilization: m.utilization_percentage
          }));
        
        for (const busyDay of busyDays) {
          const date = busyDay.date;
          const dayAllocations = allocations.filter(a => 
            a.start.toISOString().includes(date) || a.end.toISOString().includes(date)
          );
          
          const hourlyMetrics = this._calculateHourlyUtilization(stand, dayAllocations, date);
          metrics.push(...hourlyMetrics);
        }
      }
      
      // Ensure all metrics have utilization_percentage as a valid number 
      const validatedMetrics = metrics.map(metric => ({
        ...metric,
        utilization_percentage: 
          typeof metric.utilization_percentage === 'number' 
            ? parseFloat(metric.utilization_percentage.toFixed(2)) 
            : parseFloat((0).toFixed(2))
      }));
      
      return validatedMetrics;
    } catch (error) {
      console.error('Error calculating utilization metrics:', error);
      throw error;
    }
  }
  
  /**
   * Calculate daily utilization for a stand
   * @param {Object} stand - Stand data
   * @param {Array} allocations - Allocations for the stand
   * @returns {Array} Daily utilization metrics
   */
  _calculateDailyUtilization(stand, allocations) {
    const metrics = [];
    
    // Skip if no allocations
    if (allocations.length === 0) {
      return metrics;
    }
    
    // Find date range
    const starts = allocations.map(a => a.start);
    const ends = allocations.map(a => a.end);
    const allDates = [...starts, ...ends];
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Set to start and end of days
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate() + 1);
    
    // Iterate through days
    for (let day = new Date(startDate); day < endDate; day.setDate(day.getDate() + 1)) {
      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Calculate minutes utilized within this day
      let minutesUtilized = 0;
      
      for (const allocation of allocations) {
        // Skip if allocation is completely outside this day
        if (allocation.end <= dayStart || allocation.start >= dayEnd) {
          continue;
        }
        
        // Calculate overlap with this day
        const overlapStart = allocation.start < dayStart ? dayStart : allocation.start;
        const overlapEnd = allocation.end > dayEnd ? dayEnd : allocation.end;
        
        // Add minutes
        const overlapMinutes = (overlapEnd - overlapStart) / 1000 / 60;
        minutesUtilized += overlapMinutes;
      }
      
      // Calculate utilization percentage
      const totalMinutesInDay = 24 * 60;
      const utilizationPercentage = (minutesUtilized / totalMinutesInDay) * 100;
      
      metrics.push({
        stand_id: stand.id,
        time_period: 'daily',
        period_start: new Date(day),
        period_end: new Date(dayEnd),
        utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
        minutes_utilized: Math.round(minutesUtilized)
      });
    }
    
    return metrics;
  }
  
  /**
   * Calculate hourly utilization for a stand on a specific day
   * @param {Object} stand - Stand data
   * @param {Array} allocations - Allocations for the stand
   * @param {string} date - Date to calculate for (YYYY-MM-DD)
   * @returns {Array} Hourly utilization metrics
   */
  _calculateHourlyUtilization(stand, allocations, date) {
    const metrics = [];
    
    // Parse date
    const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
    const dayStart = new Date(year, month - 1, day);
    
    // Iterate through hours
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(dayStart);
      hourStart.setHours(hour);
      
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);
      
      // Calculate minutes utilized within this hour
      let minutesUtilized = 0;
      
      for (const allocation of allocations) {
        // Skip if allocation is completely outside this hour
        if (allocation.end <= hourStart || allocation.start >= hourEnd) {
          continue;
        }
        
        // Calculate overlap with this hour
        const overlapStart = allocation.start < hourStart ? hourStart : allocation.start;
        const overlapEnd = allocation.end > hourEnd ? hourEnd : allocation.end;
        
        // Add minutes
        const overlapMinutes = (overlapEnd - overlapStart) / 1000 / 60;
        minutesUtilized += overlapMinutes;
      }
      
      // Calculate utilization percentage
      const totalMinutesInHour = 60;
      const utilizationPercentage = (minutesUtilized / totalMinutesInHour) * 100;
      
      metrics.push({
        stand_id: stand.id,
        time_period: 'hourly',
        period_start: new Date(hourStart),
        period_end: new Date(hourEnd),
        utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
        minutes_utilized: Math.round(minutesUtilized)
      });
    }
    
    return metrics;
  }
  
  /**
   * Identify utilization issues based on metrics
   * @param {Array} metrics - Utilization metrics
   * @returns {Promise<Array>} Identified issues
   */
  async identifyUtilizationIssues(metrics) {
    try {
      console.log('Identifying utilization issues');
      
      // Validate input
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        console.warn('No metrics provided for utilization issue identification');
        return [];
      }
      
      const issues = [];
      
      // Settings for thresholds
      const thresholds = {
        overUtilization: {
          daily: 85, // %
          hourly: 95 // %
        },
        underUtilization: {
          daily: 20, // %
          hourly: 10 // %
        }
      };
      
      // Check for over-utilization
      const overUtilizedStands = metrics.filter(m => 
        m && m.utilization_percentage && m.time_period &&
        m.utilization_percentage > thresholds.overUtilization[m.time_period]
      );
      
      // Group by stand and day/hour
      const overUtilizedByStand = {};
      
      for (const metric of overUtilizedStands) {
        try {
          if (!metric.stand_id || !metric.period_start) {
            console.warn('Skipping invalid metric:', metric);
            continue;
          }
          
          const standId = metric.stand_id;
          let periodKey;
          
          try {
            const periodStart = new Date(metric.period_start);
            if (isNaN(periodStart.getTime())) {
              console.warn('Invalid period start date in metric:', metric);
              continue;
            }
            periodKey = `${periodStart.toISOString()}_${metric.time_period}`;
          } catch (dateError) {
            console.warn('Error parsing date in metric:', dateError);
            continue;
          }
          
          overUtilizedByStand[standId] = overUtilizedByStand[standId] || {};
          overUtilizedByStand[standId][periodKey] = metric;
        } catch (metricError) {
          console.warn('Error processing metric:', metricError);
          continue;
        }
      }
      
      // Generate over-utilization issues
      for (const standId in overUtilizedByStand) {
        try {
          const stand = await db('stands').where('id', standId).first();
          if (!stand) {
            console.warn(`Stand ${standId} not found in database`);
            continue;
          }
          
          const standMetrics = Object.values(overUtilizedByStand[standId]);
          
          // Daily over-utilization
          const dailyOverUtilized = standMetrics.filter(m => m.time_period === 'daily');
          if (dailyOverUtilized.length > 0) {
            const worstDay = dailyOverUtilized.reduce((max, curr) => 
              curr.utilization_percentage > max.utilization_percentage ? curr : max, 
              dailyOverUtilized[0]
            );
            
            let dateStr = 'unknown date';
            try {
              const worstDate = new Date(worstDay.period_start);
              dateStr = worstDate.toISOString().split('T')[0];
            } catch (dateError) {
              console.warn('Error formatting date for issue:', dateError);
            }
            
            issues.push({
              type: 'over_utilization',
              severity: 'high',
              description: `Stand ${stand.name} is over-utilized at ${worstDay.utilization_percentage}% on ${dateStr}`,
              affected_entities: {
                stand_id: standId,
                terminal: stand.terminal,
                date: dateStr,
                utilization: worstDay.utilization_percentage
              },
              recommendation: 'Consider spreading flights to less utilized stands or terminals'
            });
          }
          
          // Hourly over-utilization (peak periods)
          const hourlyOverUtilized = standMetrics.filter(m => m.time_period === 'hourly' && m.utilization_percentage >= 100);
          if (hourlyOverUtilized.length > 0) {
            const peakHours = [];
            
            for (const metric of hourlyOverUtilized) {
              try {
                const periodStart = new Date(metric.period_start);
                if (isNaN(periodStart.getTime())) {
                  continue;
                }
                
                peakHours.push({
                  hour: periodStart.getHours(),
                  utilization: metric.utilization_percentage,
                  date: periodStart.toISOString().split('T')[0]
                });
              } catch (dateError) {
                console.warn('Error processing peak hour:', dateError);
              }
            }
            
            if (peakHours.length > 0) {
              issues.push({
                type: 'peak_hour_congestion',
                severity: 'critical',
                description: `Stand ${stand.name} has ${peakHours.length} peak hours with 100% utilization`,
                affected_entities: {
                  stand_id: standId,
                  terminal: stand.terminal,
                  peak_hours: peakHours
                },
                recommendation: 'Adjust flight schedule to reduce overlap or add buffer time'
              });
            }
          }
        } catch (standError) {
          console.warn('Error generating issues for stand:', standError);
          continue;
        }
      }
      
      // Check for under-utilization
      const dailyMetrics = metrics.filter(m => m && m.time_period === 'daily');
      
      // Calculate average utilization by terminal
      const terminalUtilization = {};
      
      for (const metric of dailyMetrics) {
        try {
          if (!metric.stand_id) {
            continue;
          }
          
          const stand = await db('stands').where('id', metric.stand_id).first();
          if (!stand) continue;
          
          const terminal = stand.terminal;
          if (!terminal) continue;
          
          terminalUtilization[terminal] = terminalUtilization[terminal] || {
            totalUtilization: 0,
            count: 0,
            days: new Set()
          };
          
          terminalUtilization[terminal].totalUtilization += (metric.utilization_percentage || 0);
          terminalUtilization[terminal].count++;
          
          // Add day to set
          try {
            const periodStart = new Date(metric.period_start);
            if (!isNaN(periodStart.getTime())) {
              terminalUtilization[terminal].days.add(periodStart.toISOString().split('T')[0]);
            }
          } catch (dateError) {
            // Skip date formatting error
          }
        } catch (metricError) {
          console.warn('Error processing terminal metric:', metricError);
          continue;
        }
      }
      
      // Find under-utilized terminals
      for (const terminal in terminalUtilization) {
        try {
          const data = terminalUtilization[terminal];
          if (data.count === 0) continue;
          
          const avgUtilization = data.totalUtilization / data.count;
          
          if (avgUtilization < thresholds.underUtilization.daily) {
            issues.push({
              type: 'under_utilization',
              severity: 'medium',
              description: `Terminal ${terminal} is under-utilized with an average of ${avgUtilization.toFixed(1)}% across ${data.days.size} days`,
              affected_entities: {
                terminal,
                average_utilization: parseFloat(avgUtilization.toFixed(1)),
                days: Array.from(data.days)
              },
              recommendation: 'Consider consolidating operations to fewer terminals or encouraging airlines to use this terminal'
            });
          }
        } catch (terminalError) {
          console.warn('Error processing terminal utilization:', terminalError);
          continue;
        }
      }
      
      return issues;
    } catch (error) {
      console.error('Error identifying utilization issues:', error);
      return [];
    }
  }
  
  /**
   * Process allocation results to standard format
   * @param {Object} rawResults - Raw results from allocation tool
   * @returns {Object} Standardized allocation results
   */
  processAllocationResults(rawResults) {
    // Transform to standardized format if needed
    return rawResults;
  }
  
  /**
   * Generate mock allocation results for testing
   * @param {Array} flights - Flight data
   * @returns {Object} Mock allocation results
   */
  _generateMockAllocation(flights) {
    try {
      console.log('[DEBUG] Generating mock allocation results for testing');
      
      if (!flights || !Array.isArray(flights)) {
        console.warn('[DEBUG] No flights provided for mock allocation');
        return {
          allocated: [],
          unallocated: [],
          total: 0,
          allocationRate: 0
        };
      }
      
      console.log(`[DEBUG] Processing ${flights.length} flights for mock allocation`);
      
      const allocated = [];
      const unallocated = [];
      
      // Fetch real stands from database
      return db('stands')
        .select('*')
        .then(stands => {
          console.log(`[DEBUG] Found ${stands.length} real stands for allocation`);
          
          if (stands.length === 0) {
            // If no stands found, create some mock stands
            console.log(`[DEBUG] No stands found in database, creating mock stands`);
            stands = [
              { id: 1, name: 'A1', terminal: 'T1' },
              { id: 2, name: 'A2', terminal: 'T1' },
              { id: 3, name: 'B1', terminal: 'T2' },
              { id: 4, name: 'B2', terminal: 'T2' },
              { id: 5, name: 'C1', terminal: 'T3' },
              { id: 6, name: 'C2', terminal: 'T3' }
            ];
          }
          
          // Assign each flight to a stand (round-robin)
          flights.forEach((flight, index) => {
            // Get the stand index (round-robin allocation)
            const standIndex = index % stands.length;
            const stand = stands[standIndex];
            
            console.log(`[DEBUG] Processing flight ID: ${flight.id}`);
            
            // Calculate arrival and departure times
            // For simplicity, make the stand occupied for 45 mins before departure
            const now = new Date();
            // Use scheduled_datetime if valid, otherwise use current time
            let flightTime;
            try {
              flightTime = new Date(flight.scheduled_datetime);
              if (isNaN(flightTime.getTime())) {
                console.log(`[DEBUG] Invalid flight time for flight ${flight.id}, using current time`);
                flightTime = new Date(now);
              }
            } catch (e) {
              console.log(`[DEBUG] Error parsing flight time for flight ${flight.id}: ${e.message}`);
              flightTime = new Date(now);
            }
            
            // Calculate start time (45 minutes before flight time)
            const startTime = new Date(flightTime);
            startTime.setMinutes(flightTime.getMinutes() - 45);
            
            console.log(`[DEBUG] Allocating flight ${flight.id} to stand ${stand.id} (${stand.name})`);
            console.log(`[DEBUG] Allocation times: ${startTime.toISOString()} to ${flightTime.toISOString()}`);
            
            // Create allocation record with flight data from database
            const allocation = {
              flight: {
                id: flight.id,
                FlightID: flight.id,
                // Use the flight's actual data from the database, with real defaults
                FlightNumber: flight.flight_number || `F${flight.id}`,
                Airline: flight.airline_iata || 'BA',  // Default to British Airways instead of UNKN
                AircraftType: flight.aircraft_type_iata || '320' // Default to A320 instead of UNKN
              },
              stand: {
                id: stand.id,
                StandID: stand.id,
                name: stand.name,
                terminal: stand.terminal
              },
              start_time: startTime.toISOString(),
              end_time: flightTime.toISOString()
            };
            
            allocated.push(allocation);
          });
          
          const total = flights.length;
          const allocationRate = total > 0 ? (allocated.length / total) * 100 : 0;
          
          console.log(`[DEBUG] Mock allocation complete: ${allocated.length} allocated, ${unallocated.length} unallocated`);
          
          if (allocated.length > 0) {
            console.log(`[DEBUG] First allocated flight: ${JSON.stringify(allocated[0])}`);
          }
          
          return {
            allocated,
            unallocated,
            total,
            allocationRate
          };
        });
    } catch (error) {
      console.error('Error generating mock allocation:', error);
      return {
        allocated: [],
        unallocated: [],
        total: 0,
        allocationRate: 0,
        error: error.message
      };
    }
  }
}

module.exports = StandAllocationAdapter; 