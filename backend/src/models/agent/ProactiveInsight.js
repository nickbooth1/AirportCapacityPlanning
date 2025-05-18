const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class ProactiveInsight extends Model {
  static get tableName() {
    return 'proactive_insights';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'description', 'category', 'priority'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: [
          'capacity_constraint', 
          'optimization_opportunity', 
          'maintenance_impact', 
          'unusual_pattern', 
          'forecast_deviation',
          'operational_alert'
        ]},
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        status: { type: 'string', enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'] },
        createdAt: { type: 'string', format: 'date-time' },
        affectedAssets: {
          type: 'object',
          properties: {
            stands: { type: 'array', items: { type: 'string' } },
            terminals: { type: 'array', items: { type: 'string' } },
            piers: { type: 'array', items: { type: 'string' } },
            airlines: { type: 'array', items: { type: 'string' } },
            flights: { type: 'array', items: { type: 'string' } }
          }
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          }
        },
        metrics: {
          type: 'object',
          additionalProperties: true
        },
        recommendedActions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              impact: { type: 'string' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
            }
          }
        },
        visualizationOptions: {
          type: 'object',
          additionalProperties: true
        },
        updatedBy: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
        assignedTo: { type: 'string' },
        comment: { type: 'string' }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.status = this.status || 'new';
    this.affectedAssets = this.affectedAssets || {
      stands: [],
      terminals: [],
      piers: [],
      airlines: [],
      flights: []
    };
    this.recommendedActions = this.recommendedActions || [];
    this.metrics = this.metrics || {};
    this.visualizationOptions = this.visualizationOptions || {};
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  async updateStatus(newStatus, updatedBy, comment = '') {
    return await this.$query().patch({
      status: newStatus,
      updatedBy,
      updatedAt: new Date().toISOString(),
      comment: comment || this.comment
    });
  }

  async assignTo(userId, updatedBy) {
    return await this.$query().patch({
      assignedTo: userId,
      updatedBy,
      updatedAt: new Date().toISOString()
    });
  }

  static async getInsights(filters = {}, limit = 50, offset = 0) {
    let query = this.query();
    
    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status', filters.status);
      } else {
        query = query.where('status', filters.status);
      }
    }
    
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        query = query.whereIn('category', filters.category);
      } else {
        query = query.where('category', filters.category);
      }
    }
    
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.whereIn('priority', filters.priority);
      } else {
        query = query.where('priority', filters.priority);
      }
    }
    
    if (filters.assignedTo) {
      query = query.where('assignedTo', filters.assignedTo);
    }
    
    if (filters.minConfidence) {
      query = query.where('confidence', '>=', filters.minConfidence);
    }
    
    // Apply pagination and sorting
    return await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);
  }
}

module.exports = ProactiveInsight;