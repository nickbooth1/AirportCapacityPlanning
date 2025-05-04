const { Model } = require('objection');
const path = require('path');

class MaintenanceStatusType extends Model {
  static get tableName() {
    return 'maintenance_status_types';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 50 },
        description: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      requests: {
        relation: Model.HasManyRelation,
        modelClass: path.resolve(__dirname, 'MaintenanceRequest'),
        join: {
          from: 'maintenance_status_types.id',
          to: 'maintenance_requests.status_id'
        }
      }
    };
  }

  // Define modifiers inside the class
  static modifiers = {
    selectName(builder) {
      builder.select('id', 'name');
    }
  };

   $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = MaintenanceStatusType; 