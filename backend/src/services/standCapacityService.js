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
   * @param {Object} settings - Operational settings
   * @returns {Array} Array of time slot objects
   */
  generateTimeSlots(settings) {
    const { operating_start_time, operating_end_time, slot_duration_minutes } = settings;
    
    // Create a comprehensive slot map for the operating day
    const slots = slotUtils.createSlotMap(
      operating_start_time,
      operating_end_time,
      slot_duration_minutes
    );
    
    // Group slots by hour for reporting
    const slotsByHour = {};
    slots.forEach(slot => {
      if (!slotsByHour[slot.hour]) {
        slotsByHour[slot.hour] = [];
      }
      slotsByHour[slot.hour].push(slot);
    });
    
    return {
      slots,
      slotsByHour,
      totalSlots: slots.length,
      slotDuration: slot_duration_minutes
    };
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
}

module.exports = new StandCapacityService(); 