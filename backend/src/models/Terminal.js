const { Model } = require('objection');

class Terminal extends Model {
  static get tableName() {
    return 'terminals';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'code'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        code: { type: 'string', minLength: 1, maxLength: 10 },
        description: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Pier = require('./Pier');

    return {
      piers: {
        relation: Model.HasManyRelation,
        modelClass: Pier,
        join: {
          from: 'terminals.id',
          to: 'piers.terminal_id'
        }
      }
    };
  }

  // Define modifiers inside the class
  static modifiers = {
    selectName(builder) {
      builder.select('id', 'name');
    }
    // Add other modifiers for Terminal if needed
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

module.exports = Terminal; 