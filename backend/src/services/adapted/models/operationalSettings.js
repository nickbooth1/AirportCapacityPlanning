/**
 * Operational settings model adapted from CLI tool
 * Contains airport-wide settings for operations
 */
class OperationalSettings {
  /**
   * Create operational settings
   * @param {Object} data - Settings data
   * @param {number} data.gapBetweenFlightsMinutes - Gap between consecutive flights in minutes
   * @param {number} data.slotDurationMinutes - Default duration of time slots in minutes
   * @param {string} data.operatingDayStartTime - Start time of operating day (HH:MM:SS)
   * @param {string} data.operatingDayEndTime - End time of operating day (HH:MM:SS)
   */
  constructor(data) {
    this.gapBetweenFlightsMinutes = data.gapBetweenFlightsMinutes || 15;
    this.slotDurationMinutes = data.slotDurationMinutes || 60;
    this.operatingDayStartTime = data.operatingDayStartTime || '06:00:00';
    this.operatingDayEndTime = data.operatingDayEndTime || '22:00:00';
    
    // Validate inputs
    this._validate();
  }
  
  /**
   * Get default operational settings
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
  
  /**
   * Validate the settings
   * @private
   */
  _validate() {
    if (this.gapBetweenFlightsMinutes < 0) {
      throw new Error('Gap between flights cannot be negative');
    }
    
    if (this.slotDurationMinutes <= 0) {
      throw new Error('Slot duration must be positive');
    }
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    
    if (!timeRegex.test(this.operatingDayStartTime)) {
      throw new Error(`Invalid start time format: ${this.operatingDayStartTime}`);
    }
    
    if (!timeRegex.test(this.operatingDayEndTime)) {
      throw new Error(`Invalid end time format: ${this.operatingDayEndTime}`);
    }
  }
}

module.exports = OperationalSettings; 