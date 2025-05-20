const { Model } = require('objection');

/**
 * EntityChangeLog Model
 * 
 * This model tracks changes to entities in the system for audit purposes.
 * It records the entity type, ID, action performed, previous state, and who made the change.
 */
class EntityChangeLog extends Model {
  static get tableName() {
    return 'entity_change_logs';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['entity_type', 'entity_id', 'action', 'user_id'],
      properties: {
        id: { type: 'integer' },
        entity_type: { type: 'string', minLength: 1, maxLength: 50 },
        entity_id: { type: ['string', 'integer'] }, // Can be UUID or integer depending on entity
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        previous_state: { type: ['object', 'null'] },
        new_state: { type: ['object', 'null'] },
        changed_fields: { type: ['array', 'null'] },
        user_id: { type: ['string', 'null'] }, // User ID who made the change
        user_name: { type: ['string', 'null'] }, // Display name of user 
        ip_address: { type: ['string', 'null'] },
        user_agent: { type: ['string', 'null'] },
        timestamp: { type: 'string', format: 'date-time' },
        notes: { type: ['string', 'null'] }
      }
    };
  }

  // Define relations to other models dynamically based on entity_type
  static get relationMappings() {
    const Stand = require('./Stand');
    const MaintenanceRequest = require('./MaintenanceRequest');
    const MaintenanceApproval = require('./MaintenanceApproval');
    
    return {
      stand: {
        relation: Model.BelongsToOneRelation,
        modelClass: Stand,
        filter: { entity_type: 'stand' },
        join: {
          from: 'entity_change_logs.entity_id',
          to: 'stands.id'
        }
      },
      maintenanceRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: MaintenanceRequest,
        filter: { entity_type: 'maintenance_request' },
        join: {
          from: 'entity_change_logs.entity_id',
          to: 'maintenance_requests.id'
        }
      },
      maintenanceApproval: {
        relation: Model.BelongsToOneRelation,
        modelClass: MaintenanceApproval,
        filter: { entity_type: 'maintenance_approval' },
        join: {
          from: 'entity_change_logs.entity_id',
          to: 'maintenance_approvals.id'
        }
      }
    };
  }

  // Helpers for finding changes by entity
  static async getChangesByEntityId(entityType, entityId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    return this.query()
      .where({ 
        entity_type: entityType,
        entity_id: entityId 
      })
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getLatestChange(entityType, entityId) {
    return this.query()
      .where({ 
        entity_type: entityType,
        entity_id: entityId 
      })
      .orderBy('timestamp', 'desc')
      .first();
  }
}

module.exports = EntityChangeLog;