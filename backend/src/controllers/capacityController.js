/**
 * Capacity Controller
 * Handles API requests related to stand capacity calculations
 */
const standCapacityService = require('../services/standCapacityService');
const CapacityCalculator = require('../services/adapted/calculator/capacityCalculator');
const TimeSlot = require('../services/adapted/models/timeSlot');

/**
 * Calculate airport stand capacity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function calculateCapacity(req, res) {
  try {
    console.log('Starting capacity calculation...');
    
    // Get date parameter from query, default to today
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format', 
        message: 'Date must be in YYYY-MM-DD format'
      });
    }
    
    // Fetch required data
    const [stands, aircraftTypes, operationalSettings, standAdjacencyRules] = await Promise.all([
      standCapacityService.fetchStands(),
      standCapacityService.fetchAircraftTypes(),
      standCapacityService.fetchOperationalSettings(),
      standCapacityService.fetchStandAdjacencies()
    ]);
    
    console.log(`Fetched data: ${stands.length} stands, ${aircraftTypes.length} aircraft types, ${standAdjacencyRules.length} adjacency rules`);
    
    // Look for stands with compatible aircraft types
    const standsWithCompatibleTypes = stands.filter(stand => 
      stand.baseCompatibleAircraftTypeIDs && stand.baseCompatibleAircraftTypeIDs.length > 0
    );
    console.log(`Stands with compatible aircraft types: ${standsWithCompatibleTypes.length} out of ${stands.length}`);
    
    // Adapt the models for the calculator
    const adaptedModels = standCapacityService.adaptForCalculation(
      stands, 
      aircraftTypes, 
      operationalSettings
    );
    
    // Debugging - check adapted models
    console.log('Adapted models:');
    console.log(`- Stands: ${adaptedModels.stands.length}`);
    console.log(`- Aircraft Types: ${adaptedModels.aircraftTypes.length}`);
    console.log(`- Operational Settings: gap=${adaptedModels.settings.gapBetweenFlightsMinutes}, slotDuration=${adaptedModels.settings.slotDurationMinutes}`);
    
    // Count stands with compatible aircraft types
    const adaptedStandsWithCompatibleTypes = adaptedModels.stands.filter(stand => 
      stand.baseCompatibleAircraftTypeIDs && stand.baseCompatibleAircraftTypeIDs.length > 0
    );
    console.log(`Adapted stands with compatible aircraft types: ${adaptedStandsWithCompatibleTypes.length} out of ${adaptedModels.stands.length}`);
    
    // Check for a few specific stands
    const sampleStands = adaptedModels.stands.slice(0, 3);
    for (const stand of sampleStands) {
      console.log(`Sample stand ${stand.standID}: ${stand.baseCompatibleAircraftTypeIDs.length} compatible aircraft types`);
    }
    
    // Get the time slots
    const dbTimeSlots = await standCapacityService.getDefinedTimeSlots();
    const adaptedTimeSlots = dbTimeSlots.map(slot => new TimeSlot({
      label: slot.name,
      startTime: slot.start_time,
      endTime: slot.end_time
    }));
    
    console.log(`Adapted ${adaptedTimeSlots.length} time slots`);
    
    // Check time slot durations
    for (const slot of adaptedTimeSlots.slice(0, 3)) {
      const durationMinutes = slot.getDurationMinutes();
      console.log(`Time slot ${slot.label}: ${slot.startTime} to ${slot.endTime} (${durationMinutes} minutes)`);
    }
    
    // Create the calculator with adapted models
    const calculator = new CapacityCalculator({
      settings: adaptedModels.settings,
      aircraftTypes: adaptedModels.aircraftTypes,
      stands: adaptedModels.stands,
      adjacencyRules: standAdjacencyRules
    });
    
    // Set time slots and calculate
    calculator.setTimeSlots(adaptedTimeSlots);
    const calculationResult = calculator.calculate();
    
    // Format and return the result
    const capacityData = calculationResult.toJson();
    
    // Debug the capacity results
    let totalCapacity = 0;
    Object.values(capacityData.bestCaseCapacity).forEach(slotCapacities => {
      Object.values(slotCapacities).forEach(capacity => {
        totalCapacity += capacity;
      });
    });
    console.log(`Total capacity calculated: ${totalCapacity} aircraft movements`);
    
    // If total capacity is 0, log more details to help troubleshoot
    if (totalCapacity === 0) {
      console.warn('ZERO TOTAL CAPACITY! This indicates a problem with the calculation.');
      console.warn('Possible issues:');
      console.warn('1. No stands have compatible aircraft types');
      console.warn('2. Time slot durations may be too short for aircraft turnaround times');
      console.warn('3. There may be a bug in the capacity calculation logic');
    }
    
    return res.status(200).json({
      calculatedAt: new Date().toISOString(),
      date: date,
      ...capacityData
    });
  } catch (error) {
    console.error('Error in capacityController.calculateCapacity:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate capacity', 
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get capacity calculation settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCapacitySettings(req, res) {
  try {
    // Get operational settings related to capacity calculation
    const settings = await standCapacityService.fetchOperationalSettings();
    
    // Format the settings for the API response
    const capacitySettings = {
      slot_duration_minutes: settings.slot_duration_minutes,
      slot_block_size: settings.slot_block_size,
      operating_start_time: settings.operating_start_time,
      operating_end_time: settings.operating_end_time,
      default_gap_minutes: settings.default_gap_minutes
    };
    
    return res.status(200).json(capacitySettings);
  } catch (error) {
    console.error('Error in capacityController.getCapacitySettings:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve capacity settings', 
      message: error.message || 'An unexpected error occurred'
    });
  }
}

module.exports = {
  calculateCapacity,
  getCapacitySettings
}; 