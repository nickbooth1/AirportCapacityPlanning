const { Model } = require('objection');

class TimeSlot extends Model {
  static get tableName() {
    return 'time_slots';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'start_time', 'end_time'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        start_time: { type: 'string', format: 'time' },
        end_time: { type: 'string', format: 'time' },
        description: { type: 'string' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Get all active time slots
   * @returns {Promise<Array>} List of active time slots
   */
  static async getActiveSlots() {
    return this.query().where('is_active', true).orderBy('start_time');
  }

  /**
   * Validate that end_time is after start_time
   */
  async $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
    
    this._validateTimes();
  }

  /**
   * Update timestamps and validate time values
   */
  async $beforeUpdate() {
    this.updated_at = new Date().toISOString();
    
    this._validateTimes();
  }

  /**
   * Private method to validate that end_time is after start_time
   * @private
   */
  _validateTimes() {
    if (this.start_time && this.end_time) {
      const start = new Date(`1970-01-01T${this.start_time}`);
      const end = new Date(`1970-01-01T${this.end_time}`);
      
      if (end <= start) {
        throw new Error('End time must be after start time');
      }
    }
  }
}

module.exports = TimeSlot; 