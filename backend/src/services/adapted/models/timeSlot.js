/**
 * Represents a time slot for capacity calculations
 */
class TimeSlot {
  /**
   * Create a time slot
   * @param {Object} data - Time slot data
   * @param {string} data.label - Display label for the time slot
   * @param {string} data.startTime - Start time in HH:MM:SS format
   * @param {string} data.endTime - End time in HH:MM:SS format
   */
  constructor(data) {
    this.label = data.label || 'Unknown';
    this.startTime = data.startTime || '00:00:00';
    this.endTime = data.endTime || '00:00:00';
    
    this.validate();
  }
  
  /**
   * Validates the time slot data
   * @throws {Error} If validation fails
   */
  validate() {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    
    if (!timeRegex.test(this.startTime)) {
      throw new Error(`Invalid start time format: ${this.startTime}`);
    }
    
    if (!timeRegex.test(this.endTime)) {
      throw new Error(`Invalid end time format: ${this.endTime}`);
    }
  }
  
  /**
   * Gets the duration of this time slot in minutes
   * @returns {number} Duration in minutes
   */
  getDurationMinutes() {
    const start = this._timeStringToMinutes(this.startTime);
    const end = this._timeStringToMinutes(this.endTime);
    
    // Handle case where end time is on the next day
    const duration = end >= start ? (end - start) : (end + 1440 - start);
    
    return duration;
  }
  
  /**
   * Converts a time string to minutes since midnight
   * @param {string} timeString - Time string in HH:MM:SS format
   * @returns {number} Minutes since midnight
   * @private
   */
  _timeStringToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Check if this time slot overlaps with another
   * @param {TimeSlot} otherSlot - The other time slot to check
   * @returns {boolean} True if the slots overlap
   */
  overlaps(otherSlot) {
    const thisStart = this._timeStringToMinutes(this.startTime);
    const thisEnd = this._timeStringToMinutes(this.endTime);
    const otherStart = this._timeStringToMinutes(otherSlot.startTime);
    const otherEnd = this._timeStringToMinutes(otherSlot.endTime);
    
    // Handle cases where time crosses midnight
    const thisEndAdjusted = thisEnd < thisStart ? thisEnd + 1440 : thisEnd;
    const otherEndAdjusted = otherEnd < otherStart ? otherEnd + 1440 : otherEnd;
    
    return (thisStart < otherEndAdjusted) && (thisEndAdjusted > otherStart);
  }
  
  /**
   * Creates a TimeSlot instance from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {TimeSlot} New instance
   */
  static fromJson(jsonData) {
    return new TimeSlot(jsonData);
  }
  
  /**
   * Generate time slots for a full day based on operational settings
   * @param {OperationalSettings} settings - Operational settings
   * @returns {TimeSlot[]} - Array of time slots
   */
  static generateForDay(settings) {
    const slots = [];
    const slotDurationMinutes = settings.slotDurationMinutes;
    
    // Convert start and end times to minutes for easier calculation
    const startDate = new Date(`1970-01-01T${settings.operatingDayStartTime}`);
    const endDate = new Date(`1970-01-01T${settings.operatingDayEndTime}`);
    
    // Handle case where end time is before or equal to start time (overnight)
    let endDateTime = new Date(endDate);
    if (endDate <= startDate) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    
    // Generate slots at regular intervals
    let currentDateTime = new Date(startDate);
    
    while (currentDateTime < endDateTime) {
      const startTime = currentDateTime.toTimeString().substring(0, 8);
      
      // Calculate end time for this slot
      const slotEndTime = new Date(currentDateTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDurationMinutes);
      
      // Ensure end time doesn't exceed operating end time
      const actualEndTime = slotEndTime > endDateTime ? endDateTime : slotEndTime;
      const endTime = actualEndTime.toTimeString().substring(0, 8);
      
      slots.push(new TimeSlot({
        startTime: startTime,
        endTime: endTime,
        label: `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`
      }));
      
      // Move to next slot
      currentDateTime = slotEndTime;
    }
    
    return slots;
  }
}

module.exports = TimeSlot; 