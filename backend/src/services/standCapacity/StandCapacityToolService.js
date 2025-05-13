/**
 * StandCapacityToolService
 * Service to interface with the Stand Capacity Tool
 */

const db = require('../../utils/db');
const { getBodyType } = require('../../cli/capacityImpactAnalyzer/analyzer');

class StandCapacityToolService {
  /**
   * Calculate stand capacity for a given set of parameters
   * @param {Object} options - Options for calculation
   * @param {boolean} options.useDefinedTimeSlots - Whether to use predefined time slots
   * @param {string} options.date - Date for calculation (YYYY-MM-DD)
   * @returns {Promise<Object>} Capacity calculation results
   */
  async calculateCapacity({ useDefinedTimeSlots = true, date = null }) {
    try {
      // Get time slots (either from database or generate default ones)
      const timeSlots = useDefinedTimeSlots 
        ? await this.getTimeSlots() 
        : this.generateDefaultTimeSlots();
      
      // Calculate capacity for each time slot
      const capacityPromises = timeSlots.map(slot => this.calculateSlotCapacity(slot));
      const slotsWithCapacity = await Promise.all(capacityPromises);
      
      return {
        date: date || new Date().toISOString().split('T')[0],
        timeSlots: slotsWithCapacity
      };
    } catch (error) {
      console.error('Error calculating stand capacity:', error);
      throw error;
    }
  }
  
  /**
   * Get time slots from database
   * @returns {Promise<Array>} Array of time slots
   */
  async getTimeSlots() {
    try {
      const slots = await db.select('*').from('time_slots').orderBy('start_time');
      
      return slots.map(slot => ({
        id: slot.id,
        label: `${slot.start_time.substring(0, 5)}-${slot.end_time.substring(0, 5)}`,
        startTime: slot.start_time,
        endTime: slot.end_time
      }));
    } catch (error) {
      console.error('Error fetching time slots:', error);
      return this.generateDefaultTimeSlots(); // Fallback to default
    }
  }
  
  /**
   * Generate default time slots if none are available in database
   * @returns {Array} Array of default time slots
   */
  generateDefaultTimeSlots() {
    const slots = [];
    const startHour = 6; // 06:00
    const endHour = 22;  // 22:00
    
    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endTime = `${hour.toString().padStart(2, '0')}:59:00`;
      
      slots.push({
        label: `${startTime.substring(0, 5)}-${endTime.substring(0, 5)}`,
        startTime,
        endTime
      });
    }
    
    return slots;
  }
  
  /**
   * Calculate capacity for a specific time slot
   * @param {Object} slot - Time slot object
   * @returns {Promise<Object>} Slot with calculated capacities
   */
  async calculateSlotCapacity(slot) {
    try {
      // Get all aircraft types
      const aircraftTypes = await db.select('*').from('aircraft_types').where('is_active', true);
      
      // Get stands with their constraints
      const stands = await db.select('s.*')
        .from('stands as s')
        .where('s.is_active', true);
      
      // Get stand-aircraft compatibilities
      const standConstraints = await db.select('*').from('stand_aircraft_constraints');
      
      // Build a map of stand ID to compatible aircraft types
      const standCompatibilityMap = new Map();
      standConstraints.forEach(constraint => {
        if (!standCompatibilityMap.has(constraint.stand_id)) {
          standCompatibilityMap.set(constraint.stand_id, new Set());
        }
        standCompatibilityMap.get(constraint.stand_id).add(constraint.aircraft_type_icao);
      });
      
      // For each aircraft type, determine how many stands can accommodate it
      const capacities = aircraftTypes.map(aircraft => {
        // Count stands compatible with this aircraft type
        let compatibleStandCount = 0;
        stands.forEach(stand => {
          const compatibility = standCompatibilityMap.get(stand.id);
          if (compatibility && compatibility.has(aircraft.icao_code)) {
            compatibleStandCount++;
          } else if (stand.max_aircraft_size_code && 
                     this.isAircraftCompatibleWithSizeCode(aircraft.size_category_code, stand.max_aircraft_size_code)) {
            // Fallback to size category compatibility if no specific constraint
            compatibleStandCount++;
          }
        });
        
        // Determine how many operations can be handled in this slot
        const avgTurnaroundMinutes = aircraft.average_turnaround_minutes || 45;
        const defaultGapMinutes = 15;
        const slotDurationMinutes = 60; // Assuming 1-hour slots
        
        // Calculate how many operations each stand can handle
        const operationsPerStand = Math.floor(slotDurationMinutes / (avgTurnaroundMinutes + defaultGapMinutes)) || 1;
        
        return {
          aircraftTypeICAO: aircraft.icao_code,
          bodyType: aircraft.body_type || getBodyType(aircraft.size_category_code),
          count: compatibleStandCount * operationsPerStand
        };
      });
      
      return {
        ...slot,
        capacities
      };
    } catch (error) {
      console.error(`Error calculating capacity for slot ${slot.label}:`, error);
      return {
        ...slot,
        capacities: [],
        error: error.message
      };
    }
  }
  
  /**
   * Check if an aircraft size category is compatible with a stand's max size
   * @param {string} aircraftSize - Aircraft size category code
   * @param {string} standMaxSize - Stand's maximum aircraft size code
   * @returns {boolean} Whether the aircraft is compatible
   */
  isAircraftCompatibleWithSizeCode(aircraftSize, standMaxSize) {
    const sizeOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    // Get the indices in the size order array
    const aircraftSizeIndex = sizeOrder.indexOf(aircraftSize.toUpperCase());
    const standMaxSizeIndex = sizeOrder.indexOf(standMaxSize.toUpperCase());
    
    // Aircraft can use the stand if its size is less than or equal to the stand's max size
    return aircraftSizeIndex !== -1 && standMaxSizeIndex !== -1 && aircraftSizeIndex <= standMaxSizeIndex;
  }
}

module.exports = StandCapacityToolService; 