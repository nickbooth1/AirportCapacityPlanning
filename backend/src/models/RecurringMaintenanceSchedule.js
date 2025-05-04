const { Model } = require('objection');

class RecurringMaintenanceSchedule extends Model {
  static get tableName() {
    return 'recurring_maintenance_schedules';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'stand_id', 'title', 'description', 'requestor_name', 
        'requestor_email', 'requestor_department', 'recurrence_pattern',
        'start_time', 'duration_hours', 'start_date'
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        stand_id: { type: 'string', format: 'uuid' },
        title: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', minLength: 1 },
        requestor_name: { type: 'string', minLength: 1, maxLength: 100 },
        requestor_email: { type: 'string', format: 'email', maxLength: 255 },
        requestor_department: { type: 'string', minLength: 1, maxLength: 100 },
        recurrence_pattern: { 
          type: 'string', 
          enum: ['daily', 'weekly', 'monthly', 'yearly'] 
        },
        day_of_week: { type: ['integer', 'null'], minimum: 0, maximum: 6 },
        day_of_month: { type: ['integer', 'null'], minimum: 1, maximum: 31 },
        month_of_year: { type: ['integer', 'null'], minimum: 1, maximum: 12 },
        start_time: { type: 'string', format: 'time' }, // Should be in HH:MM:SS format
        duration_hours: { type: 'integer', minimum: 1 },
        start_date: { type: ['string', 'object'], format: 'date' }, // Allow Date object or YYYY-MM-DD string
        end_date: { type: ['string', 'object', 'null'], format: 'date' }, // Allow Date object or YYYY-MM-DD string
        is_active: { type: 'boolean' },
        status_id: { type: 'integer' },
        priority: { 
          type: 'string', 
          enum: ['Low', 'Medium', 'High', 'Critical']
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Stand = require('./Stand');
    const MaintenanceStatusType = require('./MaintenanceStatusType');
    
    return {
      stand: {
        relation: Model.BelongsToOneRelation,
        modelClass: Stand,
        join: {
          from: 'recurring_maintenance_schedules.stand_id',
          to: 'stands.id'
        }
      },
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: MaintenanceStatusType,
        join: {
          from: 'recurring_maintenance_schedules.status_id',
          to: 'maintenance_status_types.id'
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

module.exports = RecurringMaintenanceSchedule; 