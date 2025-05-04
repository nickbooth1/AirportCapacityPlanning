const { Model } = require('objection');
const path = require('path');

class MaintenanceApproval extends Model {
  static get tableName() {
    return 'maintenance_approvals';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['maintenance_request_id', 'approver_name', 'approver_email', 
                 'approver_department', 'is_approved'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        maintenance_request_id: { type: 'string', format: 'uuid' },
        approver_name: { type: 'string', minLength: 1, maxLength: 100 },
        approver_email: { type: 'string', format: 'email', maxLength: 255 },
        approver_department: { type: 'string', minLength: 1, maxLength: 100 },
        is_approved: { type: 'boolean' },
        approval_datetime: { type: ['string', 'object'], format: 'date-time' },
        comments: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      maintenanceRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, 'MaintenanceRequest'),
        join: {
          from: 'maintenance_approvals.maintenance_request_id',
          to: 'maintenance_requests.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.approval_datetime = new Date().toISOString();
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = MaintenanceApproval; 