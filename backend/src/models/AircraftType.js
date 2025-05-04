const { Model } = require('objection');

class AircraftType extends Model {
  static get tableName() {
    return 'aircraft_types';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['iata_code', 'icao_code', 'name'],
      properties: {
        id: { type: 'integer' },
        iata_code: { type: 'string', minLength: 1, maxLength: 10 },
        icao_code: { type: 'string', minLength: 1, maxLength: 10 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        manufacturer: { type: 'string', maxLength: 100 },
        model: { type: 'string', maxLength: 100 },
        wingspan_meters: { type: 'integer' },
        length_meters: { type: 'integer' },
        size_category_code: { type: 'string', maxLength: 10 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const TurnaroundRule = require('./TurnaroundRule');
    
    return {
      turnaroundRule: {
        relation: Model.HasOneRelation,
        modelClass: TurnaroundRule,
        join: {
          from: 'aircraft_types.id',
          to: 'turnaround_rules.aircraft_type_id'
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

module.exports = AircraftType; 