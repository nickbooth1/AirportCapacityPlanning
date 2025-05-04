const { Model } = require('objection');

class Pier extends Model {
  static get tableName() {
    return 'piers';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'code', 'terminal_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        code: { type: 'string', minLength: 1, maxLength: 20 },
        terminal_id: { type: 'string', format: 'uuid' },
        description: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Terminal = require('./Terminal');
    const Stand = require('./Stand');

    return {
      terminal: {
        relation: Model.BelongsToOneRelation,
        modelClass: Terminal,
        join: {
          from: 'piers.terminal_id',
          to: 'terminals.id'
        }
      },
      stands: {
        relation: Model.HasManyRelation,
        modelClass: Stand,
        join: {
          from: 'piers.id',
          to: 'stands.pier_id'
        }
      }
    };
  }

  // Define modifiers inside the class
  static modifiers = {
    selectName(builder) {
      builder.select('id', 'name');
    }
    // Add other modifiers for Pier if needed
  };

  $beforeInsert() {
    // Existing $beforeInsert logic if any, otherwise just the timestamp updates
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    // Existing $beforeUpdate logic if any, otherwise just the timestamp update
    this.updated_at = new Date().toISOString();
  }

  // ... other methods ...
}

module.exports = Pier; 