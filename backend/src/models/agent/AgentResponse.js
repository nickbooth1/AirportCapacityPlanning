const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class AgentResponse extends Model {
  static get tableName() {
    return 'agent_responses';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['queryId', 'contextId', 'text'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        queryId: { type: 'string', format: 'uuid' },
        contextId: { type: 'string', format: 'uuid' },
        text: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        visualizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              format: { type: 'string' },
              data: { type: 'string' },
              title: { type: 'string' },
              metadata: {
                type: 'object',
                additionalProperties: true
              }
            }
          }
        },
        rawData: {
          type: 'object',
          additionalProperties: true
        },
        feedbackRating: { type: ['number', 'null'], minimum: 0, maximum: 5 },
        feedbackComment: { type: ['string', 'null'] }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.timestamp = new Date().toISOString();
    this.visualizations = this.visualizations || [];
    this.rawData = this.rawData || {};
    this.feedbackRating = null;
    this.feedbackComment = null;
  }

  static get relationMappings() {
    const ConversationContext = require('./ConversationContext');
    const AgentQuery = require('./AgentQuery');
    const AgentInsight = require('./AgentInsight');

    return {
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: ConversationContext,
        join: {
          from: 'agent_responses.contextId',
          to: 'conversation_contexts.id'
        }
      },
      query: {
        relation: Model.BelongsToOneRelation,
        modelClass: AgentQuery,
        join: {
          from: 'agent_responses.queryId',
          to: 'agent_queries.id'
        }
      },
      insights: {
        relation: Model.HasManyRelation,
        modelClass: AgentInsight,
        join: {
          from: 'agent_responses.id',
          to: 'agent_insights.responseId'
        }
      }
    };
  }

  async addVisualization(type, format, data, title, metadata = {}) {
    const visualization = {
      id: uuidv4(),
      type,
      format,
      data,
      title,
      metadata
    };
    
    this.visualizations.push(visualization);
    
    return await this.$query().patch({
      visualizations: this.visualizations
    });
  }

  async setRawData(data) {
    this.rawData = data;
    
    return await this.$query().patch({
      rawData: this.rawData
    });
  }

  async addFeedback(rating, comment = null) {
    this.feedbackRating = rating;
    this.feedbackComment = comment;
    
    return await this.$query().patch({
      feedbackRating: this.feedbackRating,
      feedbackComment: this.feedbackComment
    });
  }
}

module.exports = AgentResponse; 