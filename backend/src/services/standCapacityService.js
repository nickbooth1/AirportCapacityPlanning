/**
 * Stand Capacity Engine Service
 * Calculates the theoretical maximum stand capacity based on various parameters
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
   * Fetch all active stands with their attributes
   * @returns {Promise<Array>} Array of stand objects
   */
  async fetchStands() {
    return Stand.query()
      .select('id', 'code', 'name', 'pier_id', 'max_aircraft_size_code')
      .where('is_active', true);
  }
  
  /**
   * Fetch all aircraft types with size information
   * @returns {Promise<Array>} Array of aircraft type objects
   */
  async fetchAircraftTypes() {
    return AircraftType.query()
      .select('id', 'iata_code', 'icao_code', 'name', 'size_category_code');
  }
  
  /**
   * Fetch turnaround rules with related aircraft types
   * @returns {Promise<Array>} Array of turnaround rule objects
   */
  async fetchTurnaroundRules() {
    return TurnaroundRule.query()
      .select('id', 'aircraft_type_id', 'min_turnaround_minutes')
      .withGraphFetched('aircraftType(selectSize)')
      .modifiers({
        selectSize(builder) {
          builder.select('id', 'size_category_code');
        }
      });
  }
  
  /**
   * Fetch operational settings
   * @returns {Promise<Object>} Operational settings object
   */
  async fetchOperationalSettings() {
    return OperationalSettings.getSettings();
  }
  
  /**
   * Fetch stand adjacencies with constraint information
   * @returns {Promise<Array>} Array of stand adjacency objects
   */
  async fetchStandAdjacencies() {
    // Assuming the schema has a stand_adjacencies table
    return db('stand_adjacencies')
      .select(
        'id',
        'stand_id',
        'adjacent_stand_id',
        'impact_direction',
        'restriction_type',
        'max_aircraft_size_code',
        'is_active'
      )
      .where('is_active', true);
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
   * Format the final results
   * @param {Object} aggregatedResults - Aggregated capacity results
   * @param {string} date - The date of calculation
   * @returns {Object} Formatted capacity results
   */
  formatResults(aggregatedResults, date) {
    const { 
      timestamp, 
      totalHours, 
      totalSlots,
      slotDuration,
      grandTotal, 
      totalsBySize, 
      totalsByPier, 
      hourlyResults, 
      standDetails 
    } = aggregatedResults;
    
    // Format total available stand hours by size category
    const totalAvailableStandHours = {};
    Object.entries(totalsBySize).forEach(([size, data]) => {
      totalAvailableStandHours[size] = data.totalSlots;
    });
    
    // Format capacity by hour
    const capacityByHour = hourlyResults.map(hourData => {
      return {
        hour: hourData.hour,
        available_slots: hourData.slotsBySize
      };
    });
    
    // Format pier data
    const capacityByPier = Object.values(totalsByPier).map(pierData => {
      return {
        pier_id: pierData.pierId,
        total_slots: pierData.totalSlots,
        stand_count: pierData.standCount,
        slots_by_size: pierData.slotsBySize
      };
    });
    
    // Build the detailed response object
    return {
      calculation_timestamp: timestamp,
      operating_day: date,
      settings: {
        total_hours: totalHours,
        total_slots: totalSlots,
        slot_duration_minutes: slotDuration
      },
      capacity_summary: {
        grand_total: grandTotal,
        total_available_stand_hours: totalAvailableStandHours
      },
      capacity_by_hour: capacityByHour,
      capacity_by_pier: capacityByPier,
      stand_details: Object.values(standDetails)
    };
  }

  /**
   * Calculate stand capacity based on various parameters
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Capacity calculation results
   */
  async calculateStandCapacity(options = {}) {
    try {
      // Get all required data
      const [
        operationalSettings,
        stands,
        aircraftTypes,
        turnaroundRules,
        adjacencyRules,
        timeSlots
      ] = await Promise.all([
        this.getOperationalSettings(),
        this.getStandData(options.standIds),
        this.getAircraftTypeData(),
        this.getTurnaroundRules(),
        this.getStandAdjacencyRules(),
        options.useDefinedTimeSlots 
          ? this.getDefinedTimeSlots(options.timeSlotIds) 
          : Promise.resolve([])
      ]);

      // If using operational settings to generate time slots
      const actualTimeSlots = options.useDefinedTimeSlots
        ? timeSlots
        : this.generateTimeSlots(operationalSettings);

      // Calculate capacity for each time slot
      const bestCaseCapacity = {};
      const worstCaseCapacity = {};

      actualTimeSlots.forEach(timeSlot => {
        const { bestCaseCapacity: bestCase, worstCaseCapacity: worstCase } = 
          this.calculateCapacityForTimeSlot(
            timeSlot, 
            stands, 
            aircraftTypes, 
            turnaroundRules, 
            adjacencyRules, 
            operationalSettings.default_gap_minutes
          );

        bestCaseCapacity[timeSlot.name] = bestCase;
        worstCaseCapacity[timeSlot.name] = worstCase;
      });

      // Return results with metadata
      return {
        bestCaseCapacity,
        worstCaseCapacity,
        timeSlots: actualTimeSlots,
        metadata: {
          calculatedAt: new Date().toISOString(),
          operationalSettings: {
            default_gap_minutes: operationalSettings.default_gap_minutes,
            operating_start_time: operationalSettings.operating_start_time,
            operating_end_time: operationalSettings.operating_end_time,
            slot_duration_minutes: operationalSettings.slot_duration_minutes
          },
          stands: {
            total: stands.length,
            filtered: options.standIds ? stands.length : undefined
          },
          aircraftTypes: {
            total: aircraftTypes.length
          }
        }
      };
    } catch (error) {
      console.error('Error calculating stand capacity:', error);
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
   * @returns {Promise<Array>} Array of stand adjacency rule objects
   */
  async getStandAdjacencyRules() {
    return StandAdjacencyRule.query().where('is_active', true);
  }

  /**
   * Get defined time slots, optionally filtered by IDs
   * @param {Array} timeSlotIds - Optional time slot IDs to filter by
   * @returns {Promise<Array>} Array of time slot objects
   */
  async getDefinedTimeSlots(timeSlotIds) {
    let query = TimeSlot.query().where('is_active', true);
    
    if (timeSlotIds && timeSlotIds.length > 0) {
      query = query.whereIn('id', timeSlotIds);
    }
    
    return query.orderBy('start_time');
  }

  /**
   * Calculate capacity for a specific time slot
   * @param {Object} timeSlot - The time slot
   * @param {Array} stands - The stands data
   * @param {Array} aircraftTypes - The aircraft types data
   * @param {Object} turnaroundRules - Map of aircraft type to turnaround rule
   * @param {Array} adjacencyRules - The stand adjacency rules
   * @param {Number} gapBetweenFlights - Gap between flights in minutes
   * @returns {Object} Capacity for the time slot
   */
  calculateCapacityForTimeSlot(timeSlot, stands, aircraftTypes, turnaroundRules, adjacencyRules, gapBetweenFlights) {
    const bestCaseCapacity = {};
    const worstCaseCapacity = {};
    
    // Initialize capacity counters for each aircraft type
    aircraftTypes.forEach(aircraftType => {
      bestCaseCapacity[aircraftType.code] = 0;
      worstCaseCapacity[aircraftType.code] = 0;
    });
    
    // Calculate slot duration in minutes
    const slotStart = new Date(`1970-01-01T${timeSlot.start_time}`);
    const slotEnd = new Date(`1970-01-01T${timeSlot.end_time}`);
    const slotDurationMinutes = (slotEnd - slotStart) / (1000 * 60);
    
    // For each stand
    stands.forEach(stand => {
      // Get base compatible aircraft types for this stand
      const baseCompatibleTypes = stand.compatible_aircraft_types || [];
      
      // Best case: Just use base compatibility
      baseCompatibleTypes.forEach(aircraftTypeCode => {
        const turnaroundRule = turnaroundRules[aircraftTypeCode];
        if (!turnaroundRule) return;
        
        // Calculate how many aircraft of this type can be processed in this time slot
        const totalOccupationTime = turnaroundRule.min_turnaround_minutes + gapBetweenFlights;
        const capacity = Math.floor(slotDurationMinutes / totalOccupationTime);
        
        // Update best case capacity
        bestCaseCapacity[aircraftTypeCode] += capacity;
      });
      
      // Worst case: Consider adjacency restrictions
      let worstCaseCompatibleTypes = [...baseCompatibleTypes];
      
      // Apply most restrictive adjacency rules
      adjacencyRules.forEach(rule => {
        if (rule.affected_stand_id === stand.id) {
          // Apply the most restrictive possible limitation
          if (rule.restriction_type === 'NO_USE_AFFECTED_STAND') {
            worstCaseCompatibleTypes = [];
          } else if (rule.restriction_type === 'MAX_AIRCRAFT_SIZE_REDUCED_TO') {
            // Filter to keep only smaller aircraft
            // This requires knowing size hierarchy of aircraft types
            // Get aircraft types that match the size category or smaller
            const restrictedSizeCategory = rule.restricted_to_aircraft_type_or_size;
            const allowedTypes = aircraftTypes
              .filter(type => this.isAircraftSizeSmallEnough(type.size_category, restrictedSizeCategory))
              .map(type => type.code);
              
            worstCaseCompatibleTypes = worstCaseCompatibleTypes.filter(
              type => allowedTypes.includes(type)
            );
          } else if (rule.restriction_type === 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND') {
            worstCaseCompatibleTypes = worstCaseCompatibleTypes.filter(
              type => type !== rule.restricted_to_aircraft_type_or_size
            );
          }
        }
      });
      
      // Calculate worst case capacity
      worstCaseCompatibleTypes.forEach(aircraftTypeCode => {
        const turnaroundRule = turnaroundRules[aircraftTypeCode];
        if (!turnaroundRule) return;
        
        // Calculate how many aircraft of this type can be processed in this time slot
        const totalOccupationTime = turnaroundRule.min_turnaround_minutes + gapBetweenFlights;
        const capacity = Math.floor(slotDurationMinutes / totalOccupationTime);
        
        // Update worst case capacity
        worstCaseCapacity[aircraftTypeCode] += capacity;
      });
    });
    
    return {
      bestCaseCapacity,
      worstCaseCapacity
    };
  }

  /**
   * Helper method to check if an aircraft size is small enough to fit the restriction
   * @param {String} aircraftSize - The aircraft size category
   * @param {String} maxSize - The maximum allowed size category 
   * @returns {Boolean} Whether the aircraft is small enough
   */
  isAircraftSizeSmallEnough(aircraftSize, maxSize) {
    // Size hierarchy (from smallest to largest)
    const sizeHierarchy = ['Code A', 'Code B', 'Code C', 'Code D', 'Code E', 'Code F'];
    
    const aircraftSizeIndex = sizeHierarchy.indexOf(aircraftSize);
    const maxSizeIndex = sizeHierarchy.indexOf(maxSize);
    
    // If either size is not found in the hierarchy, return false
    if (aircraftSizeIndex === -1 || maxSizeIndex === -1) {
      return false;
    }
    
    // Return true if aircraft size is smaller or equal to max size
    return aircraftSizeIndex <= maxSizeIndex;
  }
}

module.exports = new StandCapacityService(); 