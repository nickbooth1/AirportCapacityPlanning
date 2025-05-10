/**
 * Represents a time slot for capacity calculations
 */
class TimeSlot {
  /**
   * Create a time slot
   * @param {Object} data - Time slot data
   * @param {string} data.startTime - Start time (HH:MM:SS)
   * @param {string} data.endTime - End time (HH:MM:SS)
   * @param {string} [data.label] - Optional human-readable label
   */
  constructor(data) {
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.label = data.label || this._generateLabel();
    
    this.validate();
  }

  /**
   * Generates a label for the time slot based on start and end times
   * @returns {string} Generated label
   * @private
   */
  _generateLabel() {
    // Extract hours and minutes for a simpler format
    const startParts = this.startTime.split(':');
    const endParts = this.endTime.split(':');
    return `${startParts[0]}:${startParts[1]}-${endParts[0]}:${endParts[1]}`;
  }

  /**
   * Validates the time slot data
   * @throws {Error} If validation fails
   */
  validate() {
    // Validate time format (HH:MM:SS)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(this.startTime) || !timeRegex.test(this.endTime)) {
      throw new Error('Time format must be HH:MM:SS');
    }

    // Ensure start time is before end time
    if (this.startTime >= this.endTime) {
      throw new Error('Start time must be before end time');
    }
  }

  /**
   * Gets the duration of the slot in minutes
   * @returns {number} Duration in minutes
   */
  getDurationMinutes() {
    const startDate = new Date(`2000-01-01T${this.startTime}`);
    const endDate = new Date(`2000-01-01T${this.endTime}`);
    return (endDate - startDate) / (1000 * 60); // Convert milliseconds to minutes
  }

  /**
   * Checks if this time slot overlaps with another
   * @param {TimeSlot} otherSlot - Another time slot
   * @returns {boolean} True if the slots overlap
   */
  overlaps(otherSlot) {
    return this.startTime < otherSlot.endTime && this.endTime > otherSlot.startTime;
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
   * Generates time slots for a day based on operational settings
   * @param {OperationalSettings} settings - Operational settings
   * @returns {TimeSlot[]} Array of time slots
   */
  static generateForDay(settings) {
    const slots = [];
    const slotDurationMinutes = settings.slotDurationMinutes;
    
    // Convert start and end times to minutes since midnight for easier calculation
    const startDate = new Date(`2000-01-01T${settings.operatingDayStartTime}`);
    const endDate = new Date(`2000-01-01T${settings.operatingDayEndTime}`);
    let currentMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    
    // Generate slots
    while (currentMinutes < endMinutes) {
      const nextMinutes = Math.min(currentMinutes + slotDurationMinutes, endMinutes);
      
      // Convert minutes back to time strings
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}:00`;
      const endTime = `${Math.floor(nextMinutes / 60).toString().padStart(2, '0')}:${(nextMinutes % 60).toString().padStart(2, '0')}:00`;
      
      slots.push(new TimeSlot({ startTime, endTime }));
      
      currentMinutes = nextMinutes;
    }
    
    return slots;
  }
}

module.exports = TimeSlot; 