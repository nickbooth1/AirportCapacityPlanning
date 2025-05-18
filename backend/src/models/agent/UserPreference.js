const { Model } = require('objection');

class UserPreference extends Model {
  static get tableName() {
    return 'user_preferences';
  }

  static get idColumn() {
    return 'user_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'preferences'],
      properties: {
        userId: { type: 'string' },
        preferences: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'] },
            notificationEnabled: { type: 'boolean' },
            defaultAirport: { type: 'string' },
            defaultTimeHorizon: { type: 'string' },
            dashboardLayout: { type: 'object', additionalProperties: true },
            autoRefreshInterval: { type: 'integer' },
            dataPresentation: { type: 'string', enum: ['table', 'chart', 'map'] },
            advancedMode: { type: 'boolean' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.preferences = this.preferences || {
      theme: 'system',
      notificationEnabled: true,
      autoRefreshInterval: 60,
      dataPresentation: 'chart',
      advancedMode: false
    };
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  async updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.updatedAt = new Date().toISOString();
    
    return await this.$query().patch({
      preferences: this.preferences,
      updatedAt: this.updatedAt
    });
  }
}

module.exports = UserPreference;