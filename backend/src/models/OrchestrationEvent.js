/**
 * OrchestrationEvent Model
 * 
 * Represents an event in the orchestration system, providing
 * a record of important activities and state changes.
 */

const { Model } = require('objection');

class OrchestrationEvent extends Model {
  static get tableName() {
    return 'orchestration_events';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['timestamp', 'event_type', 'source', 'payload'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        event_type: { type: 'string', maxLength: 50 },
        source: { type: 'string', maxLength: 100 },
        related_entity_id: { type: ['string', 'null'], format: 'uuid' },
        related_entity_type: { type: ['string', 'null'], maxLength: 50 },
        correlation_id: { type: ['string', 'null'], format: 'uuid' },
        payload: { type: 'object' },
        created_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      // Define relationships if needed
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.timestamp = this.timestamp || new Date().toISOString();
  }

  // Helper method to get events for a specific entity
  static async getForEntity(entityId, entityType) {
    return this.query()
      .where('related_entity_id', entityId)
      .where('related_entity_type', entityType)
      .orderBy('timestamp', 'desc');
  }

  // Helper method to get events for a specific correlation ID
  static async getForCorrelation(correlationId) {
    return this.query()
      .where('correlation_id', correlationId)
      .orderBy('timestamp', 'desc');
  }

  // Helper method to create a decision event
  static async createDecisionEvent(decisionId, eventType, payload, options = {}) {
    return this.query().insert({
      timestamp: options.timestamp || new Date().toISOString(),
      event_type: eventType,
      source: options.source || 'decision-manager',
      related_entity_id: decisionId,
      related_entity_type: 'DECISION',
      correlation_id: options.correlationId,
      payload
    });
  }

  // Helper method to create an action event
  static async createActionEvent(actionId, eventType, payload, options = {}) {
    return this.query().insert({
      timestamp: options.timestamp || new Date().toISOString(),
      event_type: eventType,
      source: options.source || 'action-manager',
      related_entity_id: actionId,
      related_entity_type: 'ACTION',
      correlation_id: options.correlationId,
      payload
    });
  }

  // Helper method to create a system state event
  static async createSystemStateEvent(eventType, payload, options = {}) {
    return this.query().insert({
      timestamp: options.timestamp || new Date().toISOString(),
      event_type: eventType,
      source: options.source || 'system-monitor',
      related_entity_id: options.stateId,
      related_entity_type: options.stateId ? 'SYSTEM_STATE' : null,
      correlation_id: options.correlationId,
      payload
    });
  }

  // Helper method to search events
  static async search(criteria) {
    const query = this.query().orderBy('timestamp', 'desc');
    
    if (criteria.eventType) {
      query.where('event_type', criteria.eventType);
    }
    
    if (criteria.source) {
      query.where('source', criteria.source);
    }
    
    if (criteria.entityId) {
      query.where('related_entity_id', criteria.entityId);
    }
    
    if (criteria.entityType) {
      query.where('related_entity_type', criteria.entityType);
    }
    
    if (criteria.correlationId) {
      query.where('correlation_id', criteria.correlationId);
    }
    
    if (criteria.fromTimestamp) {
      query.where('timestamp', '>=', criteria.fromTimestamp);
    }
    
    if (criteria.toTimestamp) {
      query.where('timestamp', '<=', criteria.toTimestamp);
    }
    
    if (criteria.limit) {
      query.limit(criteria.limit);
    }
    
    if (criteria.offset) {
      query.offset(criteria.offset);
    }
    
    return query;
  }
}

module.exports = OrchestrationEvent;