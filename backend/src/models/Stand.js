const { Model } = require('objection');

class Stand extends Model {
  static get tableName() {
    return 'stands';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'code', 'pier_id'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        code: { type: 'string', minLength: 1, maxLength: 10 },
        pier_id: { type: 'integer' },
        is_active: { type: 'boolean', default: true },
        stand_type: { type: 'string', enum: ['contact', 'remote', 'cargo'] },
        has_jetbridge: { type: 'boolean', default: false },
        max_wingspan_meters: { type: 'integer' },
        max_length_meters: { type: 'integer' },
        max_aircraft_size_code: { type: 'string' },
        description: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Pier = require('./Pier');
    const MaintenanceRequest = require('./MaintenanceRequest');
    
    return {
      pier: {
        relation: Model.BelongsToOneRelation,
        modelClass: Pier,
        join: {
          from: 'stands.pier_id',
          to: 'piers.id'
        }
      },
      maintenanceRequests: {
        relation: Model.HasManyRelation,
        modelClass: MaintenanceRequest,
        join: {
          from: 'stands.id',
          to: 'maintenance_requests.stand_id'
        }
      }
    };
  }

  // Define modifiers inside the class
  static modifiers = {
    selectName(builder) {
      builder.select('id', 'name', 'code');
    }
    // Add other modifiers for Pier if needed
  };

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = Stand; 