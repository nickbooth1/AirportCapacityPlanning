const { Model } = require('objection');

class StandAdjacencyRule extends Model {
  static get tableName() {
    return 'stand_adjacencies';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['stand_id', 'adjacent_stand_id'],
      properties: {
        id: { type: 'integer' },
        stand_id: { type: 'integer' },
        adjacent_stand_id: { type: 'integer' },
        impact_direction: { type: 'string' },
        restriction_type: { type: 'string' },
        max_aircraft_size_code: { type: 'string' },
        notes: { type: 'string' },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Stand = require('./Stand');
    
    return {
      stand: {
        relation: Model.BelongsToOneRelation,
        modelClass: Stand,
        join: {
          from: 'stand_adjacencies.stand_id',
          to: 'stands.id'
        }
      },
      adjacentStand: {
        relation: Model.BelongsToOneRelation,
        modelClass: Stand,
        join: {
          from: 'stand_adjacencies.adjacent_stand_id',
          to: 'stands.id'
        }
      }
    };
  }
}

module.exports = StandAdjacencyRule; 