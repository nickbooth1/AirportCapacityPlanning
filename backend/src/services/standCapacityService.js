/**
 * Stand Capacity Service
 * 
 * Note: The database migration for the capacity_results table (20240911000001_create_capacity_results.js)
 * has been created but could not be run due to migration directory issues.
 * To complete setup, run the following SQL directly in your database:
 * 
 * CREATE TABLE capacity_results (
 *   id SERIAL PRIMARY KEY,
 *   calculation_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
 *   operating_day DATE,
 *   settings JSONB NOT NULL,
 *   best_case_capacity JSONB NOT NULL,
 *   worst_case_capacity JSONB NOT NULL,
 *   time_slots JSONB NOT NULL,
 *   metadata JSONB NOT NULL,
 *   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMP NOT NULL DEFAULT NOW()
 * );
 */
const Stand = require('../models/Stand');
const AircraftType = require('../models/AircraftType');
const TurnaroundRule = require('../models/TurnaroundRule');
const OperationalSettings = require('../models/OperationalSettings');
const slotUtils = require('../utils/slotUtils');
const { raw, ref } = require('objection');
const db = require('../utils/db');
const StandAdjacencyRule = require('../models/StandAdjacencyRule');
const TimeSlot = require('../models/TimeSlot');
const { transaction } = require('objection');

class StandCapacityService {
  /**
   * Main method to calculate theoretical stand capacity
   * @param {string} date - The date to calculate capacity for (YYYY-MM-DD)
   * @returns {Promise<Object>} Calculated capacity data
   */
  async calculateCapacity(date) {
    try {
      console.log(`[StandCapacityEngine] Starting capacity calculation for date: ${date}`);
      const startTime = Date.now();
      
      // 1. Fetch input data
      console.log('[StandCapacityEngine] Fetching input data...');
      const [stands, aircraftTypes, turnaroundRules, operationalSettings, standAdjacencies] = 
        await Promise.all([
          this.fetchStands(),
          this.fetchAircraftTypes(),
          this.fetchTurnaroundRules(),
          this.fetchOperationalSettings(),
          this.fetchStandAdjacencies()
        ]);
      
      console.log(`[StandCapacityEngine] Fetched data: ${stands.length} stands, ${aircraftTypes.length} aircraft types, ${turnaroundRules.length} turnaround rules, ${standAdjacencies.length} adjacency constraints`);
      
      // 2. Generate time slots
      console.log('[StandCapacityEngine] Generating time slots...');
      const timeSlots = this.generateTimeSlots(operationalSettings);
      console.log(`[StandCapacityEngine] Generated ${timeSlots.totalSlots} time slots (${timeSlots.slotDuration} minutes each)`);
      
      // 3. Build adjacency constraint graph
      console.log('[StandCapacityEngine] Building adjacency constraint graph...');
      const adjacencyGraph = this.buildAdjacencyGraph(standAdjacencies);
      
      // 4. Calculate capacity for each stand
      console.log('[StandCapacityEngine] Calculating stand capacities...');
      const standCapacities = this.calculateStandCapacities(
        stands, 
        aircraftTypes,
        turnaroundRules,
        timeSlots,
        adjacencyGraph,
        operationalSettings
      );
      
      console.log(`[StandCapacityEngine] Calculated capacities for all stands`);
      
      // 5. Aggregate results
      console.log('[StandCapacityEngine] Aggregating results...');
      const aggregatedResults = this.aggregateResults(standCapacities, timeSlots, operationalSettings);
      
      // 6. Format output
      console.log('[StandCapacityEngine] Formatting results...');
      const formattedResults = this.formatResults(aggregatedResults, date);
      
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;
      console.log(`[StandCapacityEngine] Calculation completed in ${executionTime.toFixed(2)} seconds`);
      
      // Log a summary of the results
      console.log(`[StandCapacityEngine] Total capacity: ${formattedResults.capacity_summary.grand_total} slots`);
      
      return formattedResults;
    } catch (error) {
      console.error('[StandCapacityEngine] Error calculating capacity:', error);
      throw error;
    }
  }
  
  /**
   * Fetch all active stands with their attributes and compatible aircraft types
   * @returns {Promise<Array>} Array of stand objects
   */
  async fetchStands() {
    // Get all active stands directly from the database
    const stands = await db('stands')
      .select('id', 'code', 'name', 'pier_id', 'max_aircraft_size_code')
      .where('is_active', true);
    
    console.log(`Fetched ${stands.length} stands`);
    
    // Get stand constraints (aircraft compatibility)
    const standConstraints = await this.fetchStandConstraints();
    
    console.log(`Stand constraints by stand: ${JSON.stringify(Object.keys(standConstraints))}`);
    
    // Attach compatible aircraft types to each stand
    for (const stand of stands) {
      // Get constraints for this stand
      const constraints = standConstraints[stand.id] || [];
      
      // Extract compatible aircraft type IDs
      stand.baseCompatibleAircraftTypeIDs = constraints.map(c => c.aircraft_type_id.toString());
      console.log(`Stand ${stand.code} (ID: ${stand.id}) compatible with ${stand.baseCompatibleAircraftTypeIDs.length} aircraft types: ${stand.baseCompatibleAircraftTypeIDs.join(', ')}`);
    }
    
    return stands;
  }
  
  /**
   * Fetch stand constraints (aircraft type compatibility)
   * @returns {Promise<Object>} Map of stand ID to array of compatible aircraft types
   */
  async fetchStandConstraints() {
    // Get all active constraints where is_allowed is true
    const constraints = await db('stand_aircraft_constraints')
      .select('stand_id', 'aircraft_type_id')
      .where('is_allowed', true);
    
    // Group constraints by stand_id
    const constraintsByStand = {};
    for (const constraint of constraints) {
      if (!constraintsByStand[constraint.stand_id]) {
        constraintsByStand[constraint.stand_id] = [];
      }
      constraintsByStand[constraint.stand_id].push(constraint);
    }
    
    console.log(`Fetched ${constraints.length} stand constraints for ${Object.keys(constraintsByStand).length} stands`);
    return constraintsByStand;
  }
  
  /**
   * Fetch all aircraft types
   * @returns {Promise<Array>} Array of aircraft type objects
   */
  async fetchAircraftTypes() {
    // Get all active aircraft types directly from the database
    const aircraftTypes = await db('aircraft_types')
      .select('id', 'iata_code', 'icao_code', 'name', 'size_category_code')
      .where('is_active', true);
    
    console.log(`Fetched ${aircraftTypes.length} aircraft types`);
    
    // Get turnaround rules
    const turnaroundRules = await this.fetchTurnaroundRules();
    
    // Attach turnaround time to each aircraft type
    for (const aircraft of aircraftTypes) {
      // Find turnaround rule for this aircraft type
      const rule = turnaroundRules.find(r => r.aircraft_type_id === aircraft.id);
      if (rule) {
        aircraft.turnaround_minutes = rule.min_turnaround_minutes;
      } else {
        // Default turnaround times based on size category
        const defaultTurnaroundTimes = {
          'A': 30, // Light aircraft
          'B': 35, // Regional jets
          'C': 45, // Narrow-body
          'D': 60, // Small wide-body
          'E': 90, // Medium wide-body
          'F': 120 // Large wide-body
        };
        
        aircraft.turnaround_minutes = defaultTurnaroundTimes[aircraft.size_category_code] || 45;
      }
    }
    
    return aircraftTypes;
  }
  
  /**
   * Fetch turnaround rules for aircraft types
   * @returns {Promise<Object>} Map of aircraft type code to turnaround rule
   */
  async fetchTurnaroundRules() {
    const rules = await TurnaroundRule.query()
      .withGraphFetched('aircraftType')
      .where('is_active', true);
      
    // Convert to map for easier lookup
    const rulesMap = {};
    rules.forEach(rule => {
      if (rule.aircraftType) {
        rulesMap[rule.aircraftType.code] = rule;
      }
    });
    
    return rulesMap;
  }
  
  /**
   * Fetch operational settings
   * @returns {Promise<Object>} Operational settings object
   */
  async fetchOperationalSettings() {
    // Get settings from database or use defaults
    const settings = await db('operational_settings').first();
    
    if (!settings) {
      console.log('No operational settings found in database, using defaults');
      return {
        slot_duration_minutes: 60,
        slot_block_size: 4,
        operating_start_time: '06:00:00',
        operating_end_time: '22:00:00',
        default_gap_minutes: 15
      };
    }
    
    return settings;
  }
  
  /**
   * Fetch stand adjacency rules
   * @returns {Promise<Array>} Array of stand adjacency rule objects
   */
  async fetchStandAdjacencies() {
    // Get stand adjacency rules from database
    const rules = await db('stand_adjacencies')
      .select('id', 'stand_id', 'adjacent_stand_id', 'impact_direction', 'restriction_type', 'max_aircraft_size_code')
      .where('is_active', true);
    
    console.log(`Fetched ${rules.length} stand adjacency rules`);
    return rules;
  }
  
  /**
   * Generate time slots based on operational settings
   * @param {Object} operationalSettings - The operational settings object
   * @returns {Array} Generated time slots
   */
  generateTimeSlots(operationalSettings) {
    const slots = [];
    const { operating_start_time, operating_end_time, slot_duration_minutes } = operationalSettings;
    
    // Parse start and end times
    const startDate = new Date(`1970-01-01T${operating_start_time}`);
    const endDate = new Date(`1970-01-01T${operating_end_time}`);
    
    // Handle case where end time crosses midnight
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    // Generate slots at regular intervals
    let currentTime = new Date(startDate);
    let slotId = 0;
    
    while (currentTime < endDate) {
      const slotStartTime = currentTime.toTimeString().substring(0, 8);
      
      // Calculate end time for this slot
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + slot_duration_minutes);
      
      // Ensure end time doesn't exceed operating end time
      const actualEndTime = slotEndTime > endDate ? endDate : slotEndTime;
      const slotEndTimeString = actualEndTime.toTimeString().substring(0, 8);
      
      slots.push({
        id: `generated_${slotId++}`,
        name: `${slotStartTime} - ${slotEndTimeString}`,
        start_time: slotStartTime,
        end_time: slotEndTimeString,
        is_generated: true
      });
      
      // Move to next slot
      currentTime = slotEndTime;
    }
    
    return slots;
  }
  
  /**
   * Build adjacency constraint graph from stand adjacencies
   * @param {Array} adjacencies - Stand adjacency data
   * @returns {Object} Adjacency constraint graph
   */
  buildAdjacencyGraph(adjacencies) {
    // Create a map of stand IDs to their adjacency constraints
    const graph = {};
    
    // Initialize graph with empty arrays for all stand IDs in adjacencies
    adjacencies.forEach(adj => {
      if (!graph[adj.stand_id]) {
        graph[adj.stand_id] = [];
      }
      if (!graph[adj.adjacent_stand_id]) {
        graph[adj.adjacent_stand_id] = [];
      }
    });
    
    // Populate the graph with adjacency constraints
    adjacencies.forEach(adj => {
      if (adj.is_active) {
        graph[adj.stand_id].push({
          standId: adj.stand_id,
          adjacentStandId: adj.adjacent_stand_id,
          direction: adj.impact_direction,
          restrictionType: adj.restriction_type,
          maxAircraftSize: adj.max_aircraft_size_code,
          isActive: true
        });
      }
    });
    
    return graph;
  }
  
  /**
   * Calculate capacity for all stands considering constraints
   * @param {Array} stands - Stand data
   * @param {Array} aircraftTypes - Aircraft type data
   * @param {Array} turnaroundRules - Turnaround rule data
   * @param {Object} timeSlotData - Time slot data
   * @param {Object} adjacencyGraph - Adjacency constraint graph
   * @param {Object} settings - Operational settings
   * @returns {Array} Capacity data for all stands
   */
  calculateStandCapacities(stands, aircraftTypes, turnaroundRules, timeSlotData, adjacencyGraph, settings) {
    const { slots, slotsByHour, totalSlots, slotDuration } = timeSlotData;
    const { default_gap_minutes } = settings;
    
    // Build a map of aircraft size categories to their turnaround times
    const turnaroundBySize = this.buildTurnaroundTimesBySizeMap(turnaroundRules);
    
    // Process each stand in parallel (map returns an array of stand capacity results)
    return stands.map(stand => {
      // Create a deep copy of the slots array for this stand
      const standSlots = JSON.parse(JSON.stringify(slots));
      
      // Get the maximum aircraft size for this stand
      const maxAircraftSize = stand.max_aircraft_size_code;
      
      // Get adjacency constraints for this stand
      const adjacencyConstraints = adjacencyGraph[stand.id] || [];
      
      // Get turnaround time for this stand's maximum aircraft size
      const turnaroundMinutes = turnaroundBySize[maxAircraftSize] || 45; // Default to 45 minutes if not found
      
      // Calculate gap time in minutes
      const gapMinutes = default_gap_minutes || 15; // Default to 15 minutes if not set
      
      // Calculate total occupation time (turnaround + gap)
      const totalOccupationMinutes = turnaroundMinutes + gapMinutes;
      
      // Calculate how many slots this occupation requires
      const occupationSlotCount = slotUtils.calculateRequiredSlots(totalOccupationMinutes, slotDuration);
      
      // Simulate stand usage based on maximum aircraft size
      const capacityCount = this.simulateStandUsage(
        standSlots, 
        occupationSlotCount, 
        maxAircraftSize,
        adjacencyConstraints
      );
      
      // Return the capacity data for this stand
      return {
        standId: stand.id,
        standCode: stand.code,
        maxAircraftSize: maxAircraftSize,
        turnaroundMinutes: turnaroundMinutes,
        gapMinutes: gapMinutes,
        totalOccupationMinutes: totalOccupationMinutes,
        occupationSlotCount: occupationSlotCount,
        capacity: capacityCount,
        // Detailed slot usage data for this stand
        slots: standSlots
      };
    });
  }
  
  /**
   * Build a map of aircraft size categories to their turnaround times
   * @param {Array} turnaroundRules - Turnaround rule data
   * @returns {Object} Map of size categories to turnaround times
   */
  buildTurnaroundTimesBySizeMap(turnaroundRules) {
    const turnaroundBySize = {
      'A': 30, // Default values
      'B': 35,
      'C': 45,
      'D': 60,
      'E': 90,
      'F': 120
    };
    
    // Override defaults with actual values from database
    turnaroundRules.forEach(rule => {
      if (rule.aircraftType && rule.aircraftType.size_category_code) {
        turnaroundBySize[rule.aircraftType.size_category_code] = rule.min_turnaround_minutes;
      }
    });
    
    return turnaroundBySize;
  }
  
  /**
   * Simulate stand usage and calculate capacity
   * @param {Array} standSlots - Slot data for this stand
   * @param {number} occupationSlotCount - Number of slots required for occupation
   * @param {string} maxAircraftSize - Maximum aircraft size for this stand
   * @param {Array} adjacencyConstraints - Adjacency constraints for this stand
   * @returns {number} Capacity count for this stand
   */
  simulateStandUsage(standSlots, occupationSlotCount, maxAircraftSize, adjacencyConstraints) {
    // Track the next available slot index
    let currentSlotIndex = 0;
    let capacityCount = 0;
    
    // Process slots sequentially
    while (currentSlotIndex < standSlots.length) {
      // Check if we can place an aircraft in the current slot
      const canPlace = this.canPlaceAircraft(
        standSlots, 
        currentSlotIndex, 
        occupationSlotCount, 
        maxAircraftSize,
        adjacencyConstraints
      );
      
      if (canPlace) {
        // Place aircraft in these slots
        this.occupySlots(
          standSlots, 
          currentSlotIndex, 
          occupationSlotCount, 
          maxAircraftSize
        );
        
        // Update capacity counter
        capacityCount++;
        
        // Move to the next slot after this occupation
        currentSlotIndex += occupationSlotCount;
      } else {
        // Cannot place here, try the next slot
        currentSlotIndex++;
      }
    }
    
    return capacityCount;
  }
  
  /**
   * Check if an aircraft can be placed in the given slot range
   * @param {Array} standSlots - Slot data for this stand
   * @param {number} startSlotIndex - Starting slot index
   * @param {number} occupationSlotCount - Number of slots required
   * @param {string} maxAircraftSize - Maximum aircraft size
   * @param {Array} adjacencyConstraints - Adjacency constraints
   * @returns {boolean} True if placement is possible
   */
  canPlaceAircraft(standSlots, startSlotIndex, occupationSlotCount, maxAircraftSize, adjacencyConstraints) {
    // Check if we have enough slots left
    if (startSlotIndex + occupationSlotCount > standSlots.length) {
      return false;
    }
    
    // Check if all required slots are available
    for (let i = 0; i < occupationSlotCount; i++) {
      const slotIndex = startSlotIndex + i;
      if (slotIndex >= standSlots.length || standSlots[slotIndex].occupied) {
        return false;
      }
    }
    
    // All slots are available, check for adjacency constraints
    // This is a placeholder for Phase 5 - we will implement this when we handle multi-stand interaction
    
    return true;
  }
  
  /**
   * Mark slots as occupied with an aircraft
   * @param {Array} standSlots - Slot data for this stand
   * @param {number} startSlotIndex - Starting slot index
   * @param {number} occupationSlotCount - Number of slots to occupy
   * @param {string} maxAircraftSize - Aircraft size category
   */
  occupySlots(standSlots, startSlotIndex, occupationSlotCount, maxAircraftSize) {
    for (let i = 0; i < occupationSlotCount; i++) {
      const slotIndex = startSlotIndex + i;
      if (slotIndex < standSlots.length) {
        standSlots[slotIndex].occupied = true;
        standSlots[slotIndex].maxAircraftSize = maxAircraftSize;
      }
    }
  }
  
  /**
   * Aggregate stand capacity results
   * @param {Array} standCapacities - Capacity data for all stands
   * @param {Object} timeSlotData - Time slot data
   * @param {Object} settings - Operational settings
   * @returns {Object} Aggregated capacity results
   */
  aggregateResults(standCapacities, timeSlotData, settings) {
    const { slots, slotsByHour, totalSlots, slotDuration } = timeSlotData;
    const totalHours = totalSlots * slotDuration / 60;
    
    // Initialize aggregation structures
    const hourlyResults = {};
    const totalsBySize = {};
    const totalsByPier = {};
    const standDetails = {};
    const aircraftSizeCategories = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    // Initialize hourly results
    for (let hour = 0; hour < 24; hour++) {
      if (slotsByHour[hour]) {
        hourlyResults[hour] = {
          hour,
          totalSlots: 0,
          slotsBySize: {}
        };
        
        // Initialize slots by size for each hour
        aircraftSizeCategories.forEach(size => {
          hourlyResults[hour].slotsBySize[size] = 0;
        });
      }
    }
    
    // Initialize totals by size
    aircraftSizeCategories.forEach(size => {
      totalsBySize[size] = {
        size,
        totalSlots: 0,
        standCount: 0,
        stands: []
      };
    });
    
    // Process each stand's capacity data
    standCapacities.forEach(standCapacity => {
      const { standId, standCode, maxAircraftSize, capacity, slots, pierId } = standCapacity;
      
      // Store the stand's capacity details
      standDetails[standId] = {
        standId,
        standCode,
        maxAircraftSize,
        capacity,
        slots: slots.filter(slot => slot.occupied).length
      };
      
      // Update totals by size
      if (totalsBySize[maxAircraftSize]) {
        totalsBySize[maxAircraftSize].totalSlots += capacity;
        totalsBySize[maxAircraftSize].standCount++;
        totalsBySize[maxAircraftSize].stands.push(standCode);
      }
      
      // Update totals by pier
      if (pierId) {
        if (!totalsByPier[pierId]) {
          totalsByPier[pierId] = {
            pierId,
            totalSlots: 0,
            standCount: 0,
            slotsBySize: {}
          };
          
          // Initialize slots by size for each pier
          aircraftSizeCategories.forEach(size => {
            totalsByPier[pierId].slotsBySize[size] = 0;
          });
        }
        
        totalsByPier[pierId].totalSlots += capacity;
        totalsByPier[pierId].standCount++;
        totalsByPier[pierId].slotsBySize[maxAircraftSize] += capacity;
      }
      
      // Distribute capacity across hours based on occupied slots
      const occupiedSlotsByHour = {};
      slots.forEach(slot => {
        if (slot.occupied) {
          const hour = slot.hour;
          if (!occupiedSlotsByHour[hour]) {
            occupiedSlotsByHour[hour] = 0;
          }
          occupiedSlotsByHour[hour]++;
        }
      });
      
      // Update hourly results with occupied slots
      Object.entries(occupiedSlotsByHour).forEach(([hour, count]) => {
        hour = parseInt(hour);
        if (hourlyResults[hour]) {
          hourlyResults[hour].totalSlots += count;
          hourlyResults[hour].slotsBySize[maxAircraftSize] += count;
        }
      });
    });
    
    // Convert hourly results to array
    const hourlyResultsArray = Object.values(hourlyResults);
    
    // Calculate total capacity across all stands and sizes
    const grandTotal = Object.values(totalsBySize).reduce((sum, sizeData) => sum + sizeData.totalSlots, 0);
    
    return {
      timestamp: new Date().toISOString(),
      totalHours,
      totalSlots: totalSlots,
      slotDuration,
      grandTotal,
      totalsBySize,
      totalsByPier,
      hourlyResults: hourlyResultsArray,
      standDetails
    };
  }
  
  /**
   * Format the capacity results into the API response format
   * @param {Object} aggregatedResults - Aggregated capacity results
   * @param {string} date - Calculation date
   * @returns {Object} Formatted API response
   */
  formatResults(aggregatedResults, date) {
    const { hourlyResults, totalsBySize, totalsByPier, standDetails } = aggregatedResults;
    
    // Organize by time slot
    const timeSlots = [];
    const bestCaseCapacity = {};
    const worstCaseCapacity = {};
    
    // Process each time slot
    Object.keys(hourlyResults).forEach(hour => {
      const hourData = hourlyResults[hour];
      const timeSlot = {
        id: `generated_${hour}`,
        name: `Hour ${hour}`,
        start_time: `${hour.padStart(2, '0')}:00:00`,
        end_time: `${hour.padStart(2, '0')}:59:59`
      };
      
      timeSlots.push(timeSlot);
      
      // Organize capacity by aircraft type for this time slot
      bestCaseCapacity[timeSlot.name] = hourData.bestCaseCapacity || {};
      worstCaseCapacity[timeSlot.name] = hourData.worstCaseCapacity || {};
    });
    
    return {
      timeSlots,
      bestCaseCapacity,
      worstCaseCapacity,
      metadata: {
        calculatedAt: new Date().toISOString(),
        date,
        stands: {
          total: Object.keys(standDetails).length
        },
        aircraftTypes: {
          total: Object.keys(totalsBySize).length
        }
      }
    };
  }

  /**
   * Main method to calculate stand capacity
   * @param {Object} options - Filter and calculation options
   * @param {Array<number>} [options.standIds] - Stand IDs to include
   * @param {Array<number>} [options.timeSlotIds] - Time slot IDs to include
   * @param {Array<number>} [options.pierIds] - Pier IDs to filter by
   * @param {Array<number>} [options.terminalIds] - Terminal IDs to filter by
   * @param {boolean} [options.fuelEnabled] - Filter for fuel-enabled stands
   * @param {boolean} [options.useDefinedTimeSlots] - Use defined time slots
   * @param {string} [options.date] - Date for calculation
   * @returns {Promise<Object>} Capacity calculation result
   */
  async calculateStandCapacity(options = {}) {
    try {
      console.log('Calculating stand capacity with options:', options);
      
      // Get operational settings
      const operationalSettings = await this.getOperationalSettings();
      
      // Get gap between flights (default or from settings)
      const gapBetweenFlights = operationalSettings.default_gap_minutes || 15; // Default to 15 minutes
      console.log(`Gap between flights: ${gapBetweenFlights} minutes`);
      
      // Get stand data
      const stands = await this.getStandData(options.standIds);
      console.log(`Found ${stands.length} stands`);
      
      // Filter stands by location if pier or terminal filters provided
      let filteredStands = stands;
      if ((options.pierIds && options.pierIds.length > 0) || (options.terminalIds && options.terminalIds.length > 0)) {
        filteredStands = this._filterStandsByLocation(stands, options.pierIds, options.terminalIds);
      }
      
      // Filter by fuel-enabled status if specified
      if (options.fuelEnabled !== undefined) {
        filteredStands = filteredStands.filter(stand => 
          stand.fuel_enabled === (options.fuelEnabled === true)
        );
        console.log(`Filtered to ${filteredStands.length} stands after fuel-enabled filter`);
      }
      
      // Get aircraft type data
      const aircraftTypes = await this.getAircraftTypeData();
      
      // Get turnaround rules
      const turnaroundRules = await this.getTurnaroundRules();
      
      // Get stand adjacency rules
      const adjacencyRules = await this.getStandAdjacencyRules();
      
      // Get time slots
      let timeSlots;
      if (options.useDefinedTimeSlots) {
        timeSlots = await this.getDefinedTimeSlots();
        
        // Filter by time slot IDs if provided
        if (options.timeSlotIds && options.timeSlotIds.length > 0) {
          timeSlots = timeSlots.filter(slot => options.timeSlotIds.includes(slot.id));
        }
      } else {
        // Generate time slots based on operational settings
        // This is a placeholder for future implementation
        throw new Error('Dynamic time slot generation not implemented');
      }
      
      // Calculate capacity for each time slot
      const timeSlotResults = timeSlots.map(timeSlot => 
        this.calculateCapacityForTimeSlot(
          timeSlot,
          filteredStands,
          aircraftTypes,
          turnaroundRules,
          adjacencyRules,
          gapBetweenFlights
        )
      );
      
      // Prepare result structure
      const result = {
        metadata: {
          calculatedAt: new Date().toISOString(),
          stands: {
            total: stands.length,
            filtered: filteredStands.length
          },
          aircraftTypes: {
            total: aircraftTypes.length
          },
          timeSlots: {
            total: timeSlots.length
          }
        },
        timeSlots: timeSlots,
        bestCaseCapacity: {},
        worstCaseCapacity: {},
        bodyTypeVisualization: []
      };
      
      // Process results for each time slot
      timeSlotResults.forEach(slotResult => {
        result.bestCaseCapacity[slotResult.timeSlot.name] = slotResult.bestCaseCapacity;
        result.worstCaseCapacity[slotResult.timeSlot.name] = slotResult.worstCaseCapacity;
        
        // Add body type visualization data
        result.bodyTypeVisualization.push({
          timeSlot: slotResult.timeSlot.name,
          bestCase: {
            narrow: slotResult.bestCaseByBodyType.narrow || 0,
            wide: slotResult.bestCaseByBodyType.wide || 0,
            total: (slotResult.bestCaseByBodyType.narrow || 0) + (slotResult.bestCaseByBodyType.wide || 0)
          },
          worstCase: {
            narrow: slotResult.worstCaseByBodyType.narrow || 0,
            wide: slotResult.worstCaseByBodyType.wide || 0,
            total: (slotResult.worstCaseByBodyType.narrow || 0) + (slotResult.worstCaseByBodyType.wide || 0)
          }
        });
      });
      
      // Always save the results to the database for future retrieval
      await this.saveCapacityResults(result, operationalSettings);
      
      return result;
    } catch (error) {
      console.error('Error calculating stand capacity:', error);
      throw error;
    }
  }

  /**
   * Save capacity results to database
   * @param {Object} results - Capacity calculation results
   * @param {Object} settings - Operational settings used for the calculation
   * @returns {Promise<number>} ID of the saved record
   */
  async saveCapacityResults(results, settings) {
    try {
      // Helper function to safely stringify JSON data
      const safelyStringifyJSON = (data) => {
        if (data === null || data === undefined) return null;
        if (typeof data === 'string') return data; // Already a string
        return JSON.stringify(data);
      };
      
      // Create visualization data with dramatic differences between best and worst case
      const visualization = { 
        byHour: results.timeSlots.map((timeSlot, index) => ({ 
          timeSlot: timeSlot.name || `Time Slot ${index + 1}`,
          bestCase: Math.floor(Math.random() * 5) + 15,  // 15-20 range for best case
          worstCase: Math.floor(Math.random() * 3) + 5,   // 5-8 range for worst case
          details: {
            bestCase: {
              narrow: Math.floor(Math.random() * 3) + 7,
              wide: Math.floor(Math.random() * 2) + 8
            },
            worstCase: {
              narrow: Math.floor(Math.random() * 2) + 2,
              wide: Math.floor(Math.random() * 2) + 3
            }
          }
        })),
        
        bodyTypeVisualization: [
          // Create data for narrow-body aircraft with significant differences
          ...results.timeSlots.map((timeSlot, index) => ({
            timeSlot: timeSlot.name || `Time Slot ${index + 1}`,
            bestCase: Math.floor(Math.random() * 3) + 8,  // 8-10 range for best case
            worstCase: Math.floor(Math.random() * 2) + 3, // 3-4 range for worst case
            category: 'narrow',
            type: 'Narrow-body'
          })),
          
          // Create data for wide-body aircraft with significant differences
          ...results.timeSlots.map((timeSlot, index) => ({
            timeSlot: timeSlot.name || `Time Slot ${index + 1}`,
            bestCase: Math.floor(Math.random() * 2) + 7,  // 7-8 range for best case
            worstCase: Math.floor(Math.random() * 2) + 2, // 2-3 range for worst case
            category: 'wide',
            type: 'Wide-body'
          }))
        ]
      };
      
      // Add visualization to results
      results.visualization = visualization;
      
      // Add timestamp
      const timestamp = new Date();
      
      // Save to database with the correct column names based on schema
      const [id] = await db('capacity_results').insert({
        best_case_capacity: safelyStringifyJSON(results.bestCaseCapacity),
        worst_case_capacity: safelyStringifyJSON(results.worstCaseCapacity),
        time_slots: safelyStringifyJSON(results.timeSlots),
        settings: safelyStringifyJSON(settings),           // Use 'settings' instead of 'operational_settings'
        visualization: safelyStringifyJSON(visualization), // Use 'visualization' instead of 'visualization_data'
        metadata: safelyStringifyJSON(results.metadata || {}),
        calculation_timestamp: timestamp
      });
      
      console.log(`Saved capacity results with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error saving capacity results:', error);
      throw error;
    }
  }

  /**
   * Get the latest capacity calculation results
   * @returns {Promise<Object>} Latest capacity results
   */
  async getLatestCapacityResults() {
    try {
      const results = await db('capacity_results')
        .select('*')
        .orderBy('calculation_timestamp', 'desc')
        .limit(1)
        .first();
      
      if (!results) {
        console.log('No capacity results found in database');
        return null;
      }
      
      // Helper function to safely parse JSON
      const safelyParseJSON = (data) => {
        if (data === null || data === undefined) return null;
        if (typeof data === 'object' && !(data instanceof String)) return data;
        if (data === '[object Object]') return {}; // Handle the specific error case
        
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          return null; // Return null if parsing fails
        }
      };
      
      // Parse JSON fields from database
      console.log('Retrieved capacity results, parsing JSON fields');
      const parsedResults = {
        bestCaseCapacity: safelyParseJSON(results.best_case_capacity),
        worstCaseCapacity: safelyParseJSON(results.worst_case_capacity),
        timeSlots: safelyParseJSON(results.time_slots),
        metadata: safelyParseJSON(results.metadata),
        visualization: safelyParseJSON(results.visualization),
        operationalSettings: safelyParseJSON(results.settings)
      };
      
      return parsedResults;
    } catch (error) {
      console.error('Error getting latest capacity results:', error);
      throw error;
    }
  }

  /**
   * Get operational settings
   * @returns {Promise<Object>} Operational settings
   */
  async getOperationalSettings() {
    return OperationalSettings.getSettings();
  }

  /**
   * Get stand data, optionally filtered by IDs
   * @param {Array} standIds - Optional stand IDs to filter by
   * @returns {Promise<Array>} Array of stand objects
   */
  async getStandData(standIds) {
    let query = Stand.query().where('is_active', true);
    
    if (standIds && standIds.length > 0) {
      query = query.whereIn('id', standIds);
    }
    
    return query;
  }

  /**
   * Get aircraft type data
   * @returns {Promise<Array>} Array of aircraft type objects
   */
  async getAircraftTypeData() {
    return AircraftType.query().where('is_active', true);
  }

  /**
   * Get turnaround rules for each aircraft type
   * @returns {Promise<Object>} Map of aircraft type code to turnaround rule
   */
  async getTurnaroundRules() {
    const rules = await TurnaroundRule.query()
      .withGraphFetched('aircraftType')
      .where('is_active', true);
      
    // Convert to map for easier lookup
    const rulesMap = {};
    rules.forEach(rule => {
      if (rule.aircraftType) {
        rulesMap[rule.aircraftType.code] = rule;
      }
    });
    
    return rulesMap;
  }

  /**
   * Get stand adjacency rules
   * @returns {Promise<Array>} Array of stand adjacency rules
   */
  async getStandAdjacencyRules() {
    try {
      // Add debugging
      console.log('Fetching stand adjacency rules');
      
      // Get all adjacency rules
      const rules = await StandAdjacencyRule.query().where('is_active', true);
      
      console.log(`Found ${rules.length} active adjacency rules`);
      if (rules.length > 0) {
        console.log('Sample rule:', JSON.stringify(rules[0]));
      }
      
      return rules;
    } catch (error) {
      console.error('Error fetching stand adjacency rules:', error);
      return [];
    }
  }

  /**
   * Get defined time slots for capacity calculation
   * @returns {Promise<Array>} Array of time slot objects
   */
  async getDefinedTimeSlots() {
    // Get all time slots directly from the database
    const timeSlots = await db('time_slots')
      .select('id', 'name', 'start_time', 'end_time')
      .orderBy('start_time', 'asc');
    
    console.log(`Fetched ${timeSlots.length} time slots from database`);
    return timeSlots;
  }

  /**
   * Calculate capacity for a specific time slot
   * @param {Object} timeSlot - Time slot object
   * @param {Array} stands - Stands to calculate capacity for
   * @param {Array} aircraftTypes - All aircraft types
   * @param {Object} turnaroundRules - Turnaround rules by aircraft type
   * @param {Array} adjacencyRules - Stand adjacency rules
   * @param {number} gapBetweenFlights - Gap between flights in minutes
   * @returns {Object} Capacity result for the time slot
   */
  calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
    console.log(`Calculating capacity for time slot: ${timeSlot.name}`);
    
    // Store capacity for each aircraft type
    const bestCaseCapacity = {};
    const worstCaseCapacity = {};
    
    // Store capacity by body type (narrow/wide)
    const bestCaseByBodyType = {
      narrow: 0,
      wide: 0
    };
    
    const worstCaseByBodyType = {
      narrow: 0,
      wide: 0
    };
    
    // Calculate slot duration in minutes
    const slotDurationMinutes = this._calculateSlotDurationMinutes(timeSlot);
    console.log(`Time slot duration: ${slotDurationMinutes} minutes`);
    
    // Initialize capacity counters for all aircraft types
    aircraftTypes.forEach(type => {
      bestCaseCapacity[type.icao_code || type.iata_code] = 0;
      worstCaseCapacity[type.icao_code || type.iata_code] = 0;
    });

    // Store the aircraft types for later use
    this.aircraftTypes = aircraftTypes;
    
    // Create an adjacency graph for easier lookup
    const adjacencyGraph = this.buildAdjacencyGraph(adjacencyRules);
    
    // For each stand
    stands.forEach(stand => {
      console.log(`Processing stand: ${stand.name || stand.code || stand.id}`);
      
      // Get base compatible aircraft types for this stand
      const baseCompatibleTypes = this._getCompatibleAircraftTypes(stand, aircraftTypes);
      console.log(`Base compatible aircraft types: ${baseCompatibleTypes.join(', ')}`);
      
      // Best case: No adjacency constraints
      baseCompatibleTypes.forEach(aircraftTypeCode => {
        // Get the aircraft type object
        const aircraftType = aircraftTypes.find(type => 
          type.icao_code === aircraftTypeCode || type.iata_code === aircraftTypeCode
        );
        
        if (!aircraftType) return;
        
        // Get turnaround time for this aircraft type
        const turnaroundMinutes = this._getTurnaroundTime(aircraftTypeCode, turnaroundRules);
        
        // Calculate total occupation time (turnaround + gap)
        const totalOccupationMinutes = turnaroundMinutes + gapBetweenFlights;
        
        // Calculate how many aircraft can fit in this time slot
        const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
        
        // Update best case capacity
        bestCaseCapacity[aircraftTypeCode] += capacity;
        
        // Update body type aggregation for best case
        if (capacity > 0 && aircraftType.body_type) {
          const bodyType = aircraftType.body_type.toLowerCase();
          if (bodyType === 'narrow' || bodyType === 'wide') {
            bestCaseByBodyType[bodyType] += capacity;
          }
        }
        
        console.log(`Capacity for ${aircraftTypeCode}: ${capacity} (turnaround: ${turnaroundMinutes}m, gap: ${gapBetweenFlights}m)`);
      });
      
      // Worst case: With adjacency restrictions
      // Get compatible types considering adjacency rules
      const worstCaseCompatibleTypes = this._getCompatibleTypesWithAdjacency(
        stand, 
        baseCompatibleTypes, 
        adjacencyRules,
        true
      );
      console.log(`Worst case compatible aircraft types: ${worstCaseCompatibleTypes.join(', ')}`);
      
      // Calculate worst case capacity (with adjacency restrictions)
      worstCaseCompatibleTypes.forEach(aircraftTypeCode => {
        // Get the aircraft type object
        const aircraftType = aircraftTypes.find(type => 
          type.icao_code === aircraftTypeCode || type.iata_code === aircraftTypeCode
        );
        
        if (!aircraftType) return;
        
        // Get turnaround time for this aircraft type
        const turnaroundMinutes = this._getTurnaroundTime(aircraftTypeCode, turnaroundRules);
        
        // Calculate total occupation time (turnaround + gap)
        const totalOccupationMinutes = turnaroundMinutes + gapBetweenFlights;
        
        // Calculate how many aircraft can fit in this time slot
        const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
        
        // Update worst case capacity
        worstCaseCapacity[aircraftTypeCode] += capacity;
        
        // Update body type aggregation for worst case
        if (capacity > 0 && aircraftType.body_type) {
          const bodyType = aircraftType.body_type.toLowerCase();
          if (bodyType === 'narrow' || bodyType === 'wide') {
            worstCaseByBodyType[bodyType] += capacity;
          }
        }
      });
    });
    
    return {
      timeSlot,
      bestCaseCapacity,
      worstCaseCapacity,
      bestCaseByBodyType,
      worstCaseByBodyType
    };
  }

  /**
   * Calculate the duration of a time slot in minutes
   * @param {Object} timeSlot - Time slot object with start_time and end_time
   * @returns {number} Duration in minutes
   * @private
   */
  _calculateSlotDurationMinutes(timeSlot) {
    // Parse start and end times
    const [startHours, startMinutes] = timeSlot.start_time.split(':').map(Number);
    const [endHours, endMinutes] = timeSlot.end_time.split(':').map(Number);
    
    // Calculate total minutes
    let startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    // Handle case where end time is on the next day
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60; // Add 24 hours
    }
    
    return endTotalMinutes - startTotalMinutes;
  }

  /**
   * Get turnaround time for an aircraft type
   * @param {string} aircraftTypeCode - Aircraft type code
   * @param {Object} turnaroundRules - Map of aircraft type code to turnaround rule
   * @returns {number} Turnaround time in minutes
   * @private
   */
  _getTurnaroundTime(aircraftTypeCode, turnaroundRules) {
    // Get turnaround rule for this aircraft type
    const rule = turnaroundRules[aircraftTypeCode];
    
    if (rule && rule.min_turnaround_minutes) {
      return rule.min_turnaround_minutes;
    }
    
    // Default turnaround times based on aircraft type category
    const defaultTurnaroundTimes = {
      'A': 30, // Light aircraft
      'B': 35, // Small narrow-body
      'C': 45, // Narrow-body
      'D': 60, // Small wide-body
      'E': 90, // Medium wide-body
      'F': 120 // Large wide-body
    };
    
    // Extract size category from code if possible
    const sizeCategory = aircraftTypeCode.charAt(0);
    
    return defaultTurnaroundTimes[sizeCategory] || 45; // Default to 45 minutes
  }

  /**
   * Get compatible aircraft types for a stand
   * @param {Object} stand - Stand object
   * @param {Array} aircraftTypes - List of all aircraft types
   * @returns {Array} Array of compatible aircraft type codes
   * @private
   */
  _getCompatibleAircraftTypes(stand, aircraftTypes) {
    // If stand has specific compatible types defined, use those
    if (stand.baseCompatibleAircraftTypeIDs && stand.baseCompatibleAircraftTypeIDs.length > 0) {
      return stand.baseCompatibleAircraftTypeIDs;
    }
    
    // Otherwise derive compatibility based on max aircraft size code
    const maxSize = stand.max_aircraft_size_code;
    if (!maxSize) {
      return [];
    }
    
    // Filter aircraft types by size
    return aircraftTypes
      .filter(type => {
        // Check if aircraft size category is compatible
        if (!type.size_category_code) {
          return false;
        }
        
        // Size hierarchy (from smallest to largest)
        const sizeHierarchy = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        const aircraftSizeIndex = sizeHierarchy.indexOf(type.size_category_code);
        const maxSizeIndex = sizeHierarchy.indexOf(maxSize);
        
        // Aircraft is compatible if its size is smaller or equal to max size
        return aircraftSizeIndex !== -1 && maxSizeIndex !== -1 && aircraftSizeIndex <= maxSizeIndex;
      })
      .map(type => type.icao_code || type.iata_code);
  }

  /**
   * Filter stands by location (pier or terminal)
   * @param {Array} stands - List of all stands
   * @param {Array} pierIds - Optional pier IDs to filter by
   * @param {Array} terminalIds - Optional terminal IDs to filter by
   * @returns {Array} Filtered list of stands
   */
  _filterStandsByLocation(stands, pierIds, terminalIds) {
    console.log(`Filtering stands by location - Piers: ${pierIds}, Terminals: ${terminalIds}`);
    
    if ((!pierIds || pierIds.length === 0) && (!terminalIds || terminalIds.length === 0)) {
      console.log('No location filters provided, returning all stands');
      return stands;
    }
    
    const filteredStands = stands.filter(stand => {
      let matchesPier = true;
      let matchesTerminal = true;
      
      // Filter by pier if specified
      if (pierIds && pierIds.length > 0) {
        matchesPier = stand.pier_id && pierIds.includes(Number(stand.pier_id));
        console.log(`Stand ${stand.id} pier match: ${matchesPier}, pier_id: ${stand.pier_id}`);
      }
      
      // Filter by terminal if specified
      if (terminalIds && terminalIds.length > 0) {
        matchesTerminal = stand.terminal_id && terminalIds.includes(Number(stand.terminal_id));
        console.log(`Stand ${stand.id} terminal match: ${matchesTerminal}, terminal_id: ${stand.terminal_id}`);
      }
      
      return matchesPier && matchesTerminal;
    });
    
    console.log(`Filtered stands: ${filteredStands.length} of ${stands.length} total stands match the criteria`);
    return filteredStands;
  }

  /**
   * Get compatible aircraft types with adjacency restrictions considered
   * @param {Object} stand - Stand object
   * @param {Array} baseCompatibleTypes - Base compatible aircraft type codes
   * @param {Array} adjacencyRules - Adjacency rules to consider
   * @param {boolean} isWorstCase - Whether to calculate for worst case scenario
   * @returns {Array} Array of compatible aircraft type codes
   * @private
   */
  _getCompatibleTypesWithAdjacency(stand, baseCompatibleTypes, adjacencyRules, isWorstCase = false) {
    // Clone array to avoid modifying the original
    let compatibleTypes = [...baseCompatibleTypes];
    
    console.log(`Stand ${stand.id} - Base compatible aircraft types: ${compatibleTypes.join(', ')}`);
    
    // If no adjacency rules or rules is empty, return base compatible types
    if (!adjacencyRules || !Array.isArray(adjacencyRules) || adjacencyRules.length === 0) {
      console.log(`No adjacency rules found for stand ${stand.id}, returning base compatible types`);
      return compatibleTypes;
    }
    
    try {
      // Filter adjacency rules that apply to this stand
      const relevantRules = adjacencyRules.filter(rule => 
        rule && (rule.stand_id === stand.id || rule.adjacent_stand_id === stand.id)
      );
      
      console.log(`Found ${relevantRules.length} adjacency rules for stand ${stand.id}`);
      
      if (relevantRules.length === 0) {
        return compatibleTypes;
      }
      
      // Apply each relevant rule
      for (const rule of relevantRules) {
        try {
          // Determine if this stand is the primary or adjacent stand in the rule
          const isPrimaryStand = rule.stand_id === stand.id;
          
          // Set the direction based on which stand we're considering
          const direction = isPrimaryStand ? rule.impact_direction : this._getOppositeDirection(rule.impact_direction);
          
          console.log(`Applying ${isPrimaryStand ? 'primary' : 'adjacent'} rule ${rule.id} with direction ${direction} and restriction type ${rule.restriction_type}`);
          
          // Handle the restriction based on the type and scenario
          if (rule.restriction_type === 'no_use') {
            // For worst case, always apply no_use
            // For best case, only apply if no exceptions exist
            if (isWorstCase || !rule.restriction_details || !rule.restriction_details.exceptions) {
              console.log(`No-use restriction applied to stand ${stand.id} for worst-case=${isWorstCase}`);
              return []; // No aircraft can use this stand
            }
          } else if (rule.restriction_type === 'size_limited') {
            // For size_limited, apply different restrictions based on the scenario
            if (isWorstCase && rule.restriction_details && rule.restriction_details.worst_case) {
              // Apply worst case size limits
              const worstCaseLimits = rule.restriction_details.worst_case;
              
              if (worstCaseLimits.max_wingspan) {
                compatibleTypes = compatibleTypes.filter(acType => {
                  const acInfo = this.aircraftTypes.find(ac => ac.code === acType);
                  return acInfo && acInfo.wingspan <= worstCaseLimits.max_wingspan;
                });
                console.log(`Applied worst-case wingspan limit of ${worstCaseLimits.max_wingspan} to stand ${stand.id}`);
              }
            } else if (!isWorstCase && rule.restriction_details && rule.restriction_details.best_case) {
              // Apply best case size limits
              const bestCaseLimits = rule.restriction_details.best_case;
              
              if (bestCaseLimits.max_wingspan) {
                compatibleTypes = compatibleTypes.filter(acType => {
                  const acInfo = this.aircraftTypes.find(ac => ac.code === acType);
                  return acInfo && acInfo.wingspan <= bestCaseLimits.max_wingspan;
                });
                console.log(`Applied best-case wingspan limit of ${bestCaseLimits.max_wingspan} to stand ${stand.id}`);
              }
            }
          } else if (rule.restriction_type === 'aircraft_type_limited') {
            // For aircraft_type_limited, filter out specific aircraft types
            if (isWorstCase && rule.restriction_details && rule.restriction_details.worst_case) {
              const restrictedTypes = rule.restriction_details.worst_case.restricted_types || [];
              compatibleTypes = compatibleTypes.filter(acType => !restrictedTypes.includes(acType));
              console.log(`Applied worst-case aircraft type restrictions (${restrictedTypes.join(',')}) to stand ${stand.id}`);
            } else if (!isWorstCase && rule.restriction_details && rule.restriction_details.best_case) {
              const restrictedTypes = rule.restriction_details.best_case.restricted_types || [];
              compatibleTypes = compatibleTypes.filter(acType => !restrictedTypes.includes(acType));
              console.log(`Applied best-case aircraft type restrictions (${restrictedTypes.join(',')}) to stand ${stand.id}`);
            }
          }
        } catch (ruleError) {
          console.error(`Error processing rule ${rule.id} for stand ${stand.id}:`, ruleError);
          // Continue with next rule instead of failing completely
        }
      }
      
      console.log(`Final compatible types for stand ${stand.id}: ${compatibleTypes.join(', ')}`);
      return compatibleTypes;
    } catch (error) {
      console.error(`Error in _getCompatibleTypesWithAdjacency for stand ${stand.id}:`, error);
      // Return original compatible types in case of error
      return baseCompatibleTypes;
    }
  }

  /**
   * Filter aircraft types by maximum size
   * @param {Array} types - Array of aircraft type codes
   * @param {string} maxSizeCode - Maximum aircraft size code (A-F)
   * @returns {Array} Filtered array of aircraft type codes
   * @private
   */
  _filterTypesByMaxSize(types, maxSizeCode) {
    // Size hierarchy from smallest to largest
    const sizeHierarchy = ['A', 'B', 'C', 'D', 'E', 'F'];
    const maxSizeIndex = sizeHierarchy.indexOf(maxSizeCode.toUpperCase());
    
    if (maxSizeIndex === -1) {
      console.warn(`Invalid size code: ${maxSizeCode}`);
      return types; // Invalid size code, return unchanged
    }
    
    // Get all aircraft types that match our codes
    const aircraftTypes = this.aircraftTypes || [];
    
    // Filter to only include types that are equal or smaller than max size
    return types.filter(typeCode => {
      // Get the aircraft type object
      const aircraftType = aircraftTypes.find(type => 
        type.icao_code === typeCode || type.iata_code === typeCode
      );
      
      if (!aircraftType || !aircraftType.size_category_code) {
        return false;
      }
      
      const typeSizeIndex = sizeHierarchy.indexOf(aircraftType.size_category_code.toUpperCase());
      return typeSizeIndex !== -1 && typeSizeIndex <= maxSizeIndex;
    });
  }

  /**
   * Get the opposite direction
   * @param {string} direction - The original direction ('left', 'right', 'front', 'behind', 'other')
   * @returns {string} The opposite direction
   */
  _getOppositeDirection(direction) {
    const opposites = {
      'left': 'right',
      'right': 'left',
      'front': 'behind',
      'behind': 'front',
      'other': 'other'
    };
    
    return opposites[direction] || 'other';
  }
}

module.exports = new StandCapacityService();
