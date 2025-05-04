const { Model } = require('objection');

class TurnaroundRule extends Model {
  static get tableName() {
    return 'turnaround_rules';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['aircraft_type_id', 'min_turnaround_minutes'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        aircraft_type_id: { type: 'integer' },
        min_turnaround_minutes: { type: 'integer', minimum: 1 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    // Dynamically import to avoid circular dependencies
    const AircraftType = require('./AircraftType');
    
    return {
      aircraftType: {
        relation: Model.BelongsToOneRelation,
        modelClass: AircraftType,
        join: {
          from: 'turnaround_rules.aircraft_type_id',
          to: 'aircraft_types.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = TurnaroundRule; 