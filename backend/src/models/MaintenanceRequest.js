const { Model } = require('objection');
const path = require('path');

class MaintenanceRequest extends Model {
  static get tableName() {
    return 'maintenance_requests';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['stand_id', 'title', 'description', 'requestor_name', 
                 'requestor_email', 'requestor_department', 'start_datetime', 
                 'end_datetime', 'status_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        stand_id: { type: 'integer' },
        title: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', minLength: 1 },
        requestor_name: { type: 'string', minLength: 1, maxLength: 100 },
        requestor_email: { type: 'string', format: 'email', maxLength: 255 },
        requestor_department: { type: 'string', minLength: 1, maxLength: 100 },
        start_datetime: { type: ['string', 'object'], format: 'date-time' }, // Allow Date object or ISO string
        end_datetime: { type: ['string', 'object'], format: 'date-time' }, // Allow Date object or ISO string
        status_id: { type: 'integer' },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
        impact_description: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }
  
  // This object defines the relations to other models.
  static get relationMappings() {
    // Using path.resolve to avoid circular dependency issues
    return {
      stand: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, 'Stand'),
        join: {
          from: 'maintenance_requests.stand_id',
          to: 'stands.id'
        }
      },
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, 'MaintenanceStatusType'),
        join: {
          from: 'maintenance_requests.status_id',
          to: 'maintenance_status_types.id'
        }
      },
      approvals: {
        relation: Model.HasManyRelation,
        modelClass: path.resolve(__dirname, 'MaintenanceApproval'),
        join: {
          from: 'maintenance_requests.id',
          to: 'maintenance_approvals.maintenance_request_id'
        }
      }
    };
  }

  // Define modifiers inside the class
  static modifiers = {
    selectNameAndTerminal(builder) {
      builder.select('id', 'name', 'terminal_id');
    }
  };

  // Optional: Format dates before inserting/updating
  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = MaintenanceRequest; 