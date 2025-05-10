/**
 * Represents operational settings for stand capacity calculations
 */
class OperationalSettings {
  /**
   * Create operational settings
   * @param {Object} data - Operational settings data
   * @param {number} data.gapBetweenFlightsMinutes - Required gap between flights in minutes
   * @param {number} data.slotDurationMinutes - Duration of a time slot in minutes
   * @param {string} data.operatingDayStartTime - Start time of the operating day (HH:MM:SS)
   * @param {string} data.operatingDayEndTime - End time of the operating day (HH:MM:SS)
   */
  constructor(data) {
    this.gapBetweenFlightsMinutes = data.gapBetweenFlightsMinutes;
    this.slotDurationMinutes = data.slotDurationMinutes;
    this.operatingDayStartTime = data.operatingDayStartTime;
    this.operatingDayEndTime = data.operatingDayEndTime;
    
    this.validate();
  }

  /**
   * Validates the operational settings
   * @throws {Error} If validation fails
   */
  validate() {
    if (!Number.isInteger(this.gapBetweenFlightsMinutes) || this.gapBetweenFlightsMinutes < 0) {
      throw new Error('gapBetweenFlightsMinutes must be a non-negative integer');
    }

    if (!Number.isInteger(this.slotDurationMinutes) || this.slotDurationMinutes <= 0) {
      throw new Error('slotDurationMinutes must be a positive integer');
    }

    if (!this.operatingDayStartTime || !this.operatingDayEndTime) {
      throw new Error('Operating day start and end times are required');
    }

    // Validate time format (HH:MM:SS)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(this.operatingDayStartTime) || !timeRegex.test(this.operatingDayEndTime)) {
      throw new Error('Time format must be HH:MM:SS');
    }

    // Ensure start time is before end time
    if (this.operatingDayStartTime >= this.operatingDayEndTime) {
      throw new Error('Operating day start time must be before end time');
    }
  }

  /**
   * Creates an OperationalSettings instance from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {OperationalSettings} New instance
   */
  static fromJson(jsonData) {
    return new OperationalSettings(jsonData);
  }

  /**
   * Returns default operational settings
   * @returns {OperationalSettings} Default settings
   */
  static getDefaults() {
    return new OperationalSettings({
      gapBetweenFlightsMinutes: 15,
      slotDurationMinutes: 60,
      operatingDayStartTime: '06:00:00',
      operatingDayEndTime: '22:00:00'
    });
  }
}

module.exports = OperationalSettings; 