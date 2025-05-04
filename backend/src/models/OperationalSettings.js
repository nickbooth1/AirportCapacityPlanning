const { Model } = require('objection');

class OperationalSettings extends Model {
  static get tableName() {
    return 'operational_settings';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        default_gap_minutes: { type: 'integer', minimum: 1 },
        operating_start_time: { type: 'string', format: 'time' },
        operating_end_time: { type: 'string', format: 'time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static async getSettings() {
    // Always get the single settings row (id=1)
    const settings = await this.query().findById(1);
    if (!settings) {
      // If settings don't exist, create default settings
      return this.query().insert({
        id: 1,
        default_gap_minutes: 15,
        operating_start_time: '06:00:00',
        operating_end_time: '23:59:59'
      });
    }
    return settings;
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = OperationalSettings; 