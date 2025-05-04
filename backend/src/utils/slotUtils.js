/**
 * Utility functions for time slot operations
 */

/**
 * Parse time string in format "HH:MM:SS" to minutes past midnight
 * @param {string} timeString - Time in format "HH:MM:SS"
 * @returns {number} Minutes past midnight
 */
function parseTimeToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error('Invalid time string');
  }
  
  const timeParts = timeString.split(':');
  if (timeParts.length < 2) {
    throw new Error('Time string must be in format HH:MM or HH:MM:SS');
  }
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid hours or minutes in time string');
  }
  
  return hours * 60 + minutes;
}

/**
 * Convert minutes past midnight to time string
 * @param {number} minutes - Minutes past midnight
 * @returns {string} Time in format "HH:MM:SS"
 */
function minutesToTimeString(minutes) {
  if (typeof minutes !== 'number' || minutes < 0 || minutes > 24 * 60) {
    throw new Error('Invalid minutes value');
  }
  
  // Handle overnight case (minutes > 24 hours)
  const normalizedMinutes = minutes % (24 * 60);
  
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Convert a time string to a slot index
 * @param {string} timeString - Time in format "HH:MM:SS"
 * @param {string} startTimeString - Start time in format "HH:MM:SS"
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {number} Slot index
 */
function timeStringToSlotIndex(timeString, startTimeString, slotDurationMinutes) {
  const timeMinutes = parseTimeToMinutes(timeString);
  const startMinutes = parseTimeToMinutes(startTimeString);
  
  // Handle overnight case
  let adjustedTimeMinutes = timeMinutes;
  if (timeMinutes < startMinutes) {
    adjustedTimeMinutes += 24 * 60; // Add 24 hours
  }
  
  return Math.floor((adjustedTimeMinutes - startMinutes) / slotDurationMinutes);
}

/**
 * Calculate the end time of a slot
 * @param {string} startTimeString - Start time in format "HH:MM:SS"
 * @param {number} slotIndex - Slot index
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {string} End time in format "HH:MM:SS"
 */
function getSlotEndTime(startTimeString, slotIndex, slotDurationMinutes) {
  const startMinutes = parseTimeToMinutes(startTimeString);
  const endMinutes = startMinutes + ((slotIndex + 1) * slotDurationMinutes);
  return minutesToTimeString(endMinutes);
}

/**
 * Get the start time of a slot
 * @param {string} startTimeString - Start time in format "HH:MM:SS" 
 * @param {number} slotIndex - Slot index
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {string} Start time in format "HH:MM:SS"
 */
function getSlotStartTime(startTimeString, slotIndex, slotDurationMinutes) {
  const startMinutes = parseTimeToMinutes(startTimeString);
  const slotStartMinutes = startMinutes + (slotIndex * slotDurationMinutes);
  return minutesToTimeString(slotStartMinutes);
}

/**
 * Calculate the total number of slots in a time period
 * @param {string} startTimeString - Start time in format "HH:MM:SS"
 * @param {string} endTimeString - End time in format "HH:MM:SS"
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {number} Total number of slots
 */
function calculateTotalSlots(startTimeString, endTimeString, slotDurationMinutes) {
  let startMinutes = parseTimeToMinutes(startTimeString);
  let endMinutes = parseTimeToMinutes(endTimeString);
  
  // Handle overnight case (end time is earlier than start time)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }
  
  return Math.ceil((endMinutes - startMinutes) / slotDurationMinutes);
}

/**
 * Group slots into blocks (e.g., hourly blocks)
 * @param {Array} slots - Array of slot data
 * @param {number} blockSize - Number of slots per block
 * @returns {Array} Array of slot blocks
 */
function groupSlotsIntoBlocks(slots, blockSize) {
  if (!Array.isArray(slots) || !slots.length) {
    return [];
  }
  
  const blocks = [];
  for (let i = 0; i < slots.length; i += blockSize) {
    const block = slots.slice(i, i + blockSize);
    blocks.push(block);
  }
  return blocks;
}

/**
 * Check if a time is within operating hours
 * @param {string} timeString - Time to check in format "HH:MM:SS"
 * @param {string} startTimeString - Start of operating hours in format "HH:MM:SS"
 * @param {string} endTimeString - End of operating hours in format "HH:MM:SS"
 * @returns {boolean} True if time is within operating hours
 */
function isTimeWithinOperatingHours(timeString, startTimeString, endTimeString) {
  const timeMinutes = parseTimeToMinutes(timeString);
  const startMinutes = parseTimeToMinutes(startTimeString);
  const endMinutes = parseTimeToMinutes(endTimeString);
  
  // Regular case (start time is before end time)
  if (startMinutes < endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }
  
  // Overnight case (end time is earlier than start time)
  return timeMinutes >= startMinutes || timeMinutes < endMinutes;
}

/**
 * Calculate how many slots an operation will occupy
 * @param {number} operationMinutes - Duration of operation in minutes
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {number} Number of slots needed
 */
function calculateRequiredSlots(operationMinutes, slotDurationMinutes) {
  return Math.ceil(operationMinutes / slotDurationMinutes);
}

/**
 * Creates a slot map for the entire operating day
 * @param {string} startTimeString - Start of operating hours in format "HH:MM:SS"
 * @param {string} endTimeString - End of operating hours in format "HH:MM:SS"
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {Array} Array of slot objects with index, hour, and time information
 */
function createSlotMap(startTimeString, endTimeString, slotDurationMinutes) {
  const totalSlots = calculateTotalSlots(startTimeString, endTimeString, slotDurationMinutes);
  const slots = [];
  
  for (let i = 0; i < totalSlots; i++) {
    const startTime = getSlotStartTime(startTimeString, i, slotDurationMinutes);
    const endTime = getSlotEndTime(startTimeString, i, slotDurationMinutes);
    
    // Extract hour for easier grouping
    const hour = parseInt(startTime.split(':')[0], 10);
    
    slots.push({
      index: i,
      startTime,
      endTime,
      hour,
      occupied: false,
      maxAircraftSize: null
    });
  }
  
  return slots;
}

module.exports = {
  parseTimeToMinutes,
  minutesToTimeString,
  timeStringToSlotIndex,
  getSlotEndTime,
  getSlotStartTime,
  calculateTotalSlots,
  groupSlotsIntoBlocks,
  isTimeWithinOperatingHours,
  calculateRequiredSlots,
  createSlotMap
}; 