/**
 * Validation Module for Test Results
 * 
 * This module validates the results of the allocation process against expected outcomes.
 * It provides functions to check if allocation rates, stand utilization, and reasons for
 * unallocated flights match expectations.
 */

const knex = require('../src/db');

/**
 * Validate allocation results for a specific schedule
 * @param {number} scheduleId - ID of the flight schedule
 * @param {Object} expectedResults - Expected results for validation
 * @returns {Object} Validation results
 */
async function validateResults(scheduleId, expectedResults) {
  try {
    // Get the schedule details
    const schedule = await knex('flight_schedules').where('id', scheduleId).first();
    
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }
    
    // Get allocation and utilization data
    const allocatedFlights = await getAllocatedFlights(scheduleId);
    const unallocatedFlights = await getUnallocatedFlights(scheduleId);
    const standUtilization = await getStandUtilization(scheduleId);
    
    // Calculate the allocation rate
    const totalFlights = allocatedFlights.length + unallocatedFlights.length;
    const actualAllocationRate = totalFlights > 0 ? allocatedFlights.length / totalFlights : 0;
    
    // Extract unallocation reasons
    const unallocationReasons = [...new Set(unallocatedFlights.map(f => f.reason))];
    
    // Compare with expected results
    const isFlightCountValid = !expectedResults.totalFlights || 
      Math.abs(totalFlights - expectedResults.totalFlights) / expectedResults.totalFlights < 0.1; // Within 10%
      
    const isAllocationRateValid = !expectedResults.expectedAllocationRate ||
      Math.abs(actualAllocationRate - expectedResults.expectedAllocationRate) < 0.1; // Within 10%
      
    // Check terminal utilization
    const terminalUtilizationValid = validateTerminalUtilization(
      standUtilization,
      expectedResults.standUtilization || {}
    );
    
    // Check unallocation reasons if expected
    const reasonsValid = validateUnallocationReasons(
      unallocationReasons,
      expectedResults.expectedUnallocatedReasons || []
    );
    
    // Compile all validation results
    const validationResults = {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        uploadId: schedule.upload_id,
        status: schedule.status
      },
      metrics: {
        totalFlights,
        allocatedCount: allocatedFlights.length,
        unallocatedCount: unallocatedFlights.length,
        actualAllocationRate,
        expectedAllocationRate: expectedResults.expectedAllocationRate || null
      },
      terminalUtilization: summarizeTerminalUtilization(standUtilization),
      unallocationReasons,
      validations: {
        flightCountValid: isFlightCountValid,
        allocationRateValid: isAllocationRateValid,
        terminalUtilizationValid,
        reasonsValid
      },
      allValidationsPass: isFlightCountValid && isAllocationRateValid && 
        terminalUtilizationValid && reasonsValid
    };
    
    return validationResults;
  } catch (error) {
    console.error('Error validating results:', error);
    throw error;
  }
}

/**
 * Get allocated flights for a specific schedule
 * @param {number} scheduleId - ID of the flight schedule
 * @returns {Array} Allocated flights
 */
async function getAllocatedFlights(scheduleId) {
  return knex('stand_allocations')
    .where('schedule_id', scheduleId)
    .join('flights', 'stand_allocations.flight_id', 'flights.id')
    .join('stands', 'stand_allocations.stand_id', 'stands.id')
    .select(
      'stand_allocations.*',
      'flights.flight_number',
      'flights.airline_iata',
      'flights.flight_nature',
      'flights.aircraft_type_iata',
      'stands.terminal',
      'stands.code as stand_code'
    );
}

/**
 * Get unallocated flights for a specific schedule
 * @param {number} scheduleId - ID of the flight schedule
 * @returns {Array} Unallocated flights
 */
async function getUnallocatedFlights(scheduleId) {
  return knex('unallocated_flights')
    .where('schedule_id', scheduleId)
    .join('flights', 'unallocated_flights.flight_id', 'flights.id')
    .select(
      'unallocated_flights.*',
      'flights.flight_number',
      'flights.airline_iata',
      'flights.flight_nature',
      'flights.aircraft_type_iata'
    );
}

/**
 * Get stand utilization metrics for a specific schedule
 * @param {number} scheduleId - ID of the flight schedule
 * @returns {Array} Stand utilization metrics
 */
async function getStandUtilization(scheduleId) {
  return knex('stand_utilization_metrics')
    .where('schedule_id', scheduleId)
    .join('stands', 'stand_utilization_metrics.stand_id', 'stands.id')
    .select(
      'stand_utilization_metrics.*',
      'stands.terminal',
      'stands.code as stand_code'
    );
}

/**
 * Validate terminal utilization against expected values
 * @param {Array} actualUtilization - Actual utilization metrics
 * @param {Object} expectedUtilization - Expected utilization rates by terminal
 * @returns {boolean} Whether terminal utilization meets expectations
 */
function validateTerminalUtilization(actualUtilization, expectedUtilization) {
  // If no expectations provided, pass validation
  if (Object.keys(expectedUtilization).length === 0) {
    return true;
  }
  
  // Group utilization by terminal
  const terminalUtil = {};
  
  actualUtilization.forEach(metric => {
    if (!terminalUtil[metric.terminal]) {
      terminalUtil[metric.terminal] = [];
    }
    terminalUtil[metric.terminal].push(metric.utilization_percentage / 100); // Convert from percent to decimal
  });
  
  // Calculate average utilization by terminal
  const terminalAvgUtil = {};
  Object.keys(terminalUtil).forEach(terminal => {
    const values = terminalUtil[terminal];
    terminalAvgUtil[terminal] = values.length > 0 ? 
      values.reduce((a, b) => a + b, 0) / values.length : 0;
  });
  
  // Check if terminals meet the expected utilization with 15% tolerance
  for (const terminal in expectedUtilization) {
    const expected = expectedUtilization[terminal];
    const actual = terminalAvgUtil[terminal] || 0;
    
    // If any terminal doesn't meet expectations, fail validation
    if (Math.abs(actual - expected) > 0.15) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate that expected unallocation reasons are present in actual reasons
 * @param {Array} actualReasons - Actual unallocation reasons
 * @param {Array} expectedReasons - Expected unallocation reasons
 * @returns {boolean} Whether all expected reasons are present
 */
function validateUnallocationReasons(actualReasons, expectedReasons) {
  // If no expected reasons, pass validation
  if (expectedReasons.length === 0) {
    return true;
  }
  
  // Check if all expected reasons are present in actual reasons
  return expectedReasons.every(reason => 
    actualReasons.some(actualReason => 
      actualReason.toLowerCase().includes(reason.toLowerCase())
    )
  );
}

/**
 * Summarize terminal utilization for reporting
 * @param {Array} utilizationMetrics - Stand utilization metrics
 * @returns {Object} Summary of terminal utilization
 */
function summarizeTerminalUtilization(utilizationMetrics) {
  // Group utilization by terminal
  const terminalUtil = {};
  
  utilizationMetrics.forEach(metric => {
    if (!terminalUtil[metric.terminal]) {
      terminalUtil[metric.terminal] = [];
    }
    terminalUtil[metric.terminal].push(metric.utilization_percentage / 100);
  });
  
  // Calculate average, min, and max utilization by terminal
  const terminalSummary = {};
  Object.keys(terminalUtil).forEach(terminal => {
    const values = terminalUtil[terminal];
    if (values.length > 0) {
      terminalSummary[terminal] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        standCount: values.length
      };
    }
  });
  
  return terminalSummary;
}

module.exports = {
  validateResults,
  getAllocatedFlights,
  getUnallocatedFlights,
  getStandUtilization
}; 