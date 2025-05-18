const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class AgentQuery extends Model {
  static get tableName() {
    return 'agent_queries';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['text', 'contextId'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        text: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        contextId: { type: 'string', format: 'uuid' },
        parsedIntent: { type: ['string', 'null'] },
        confidence: { type: ['number', 'null'] },
        entities: {
          type: 'object',
          additionalProperties: true
        },
        processing: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: ['string', 'null'], format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            error: { type: ['string', 'null'] }
          }
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.timestamp = new Date().toISOString();
    this.entities = this.entities || {};
    this.processing = this.processing || {
      startTime: new Date().toISOString(),
      status: 'pending',
      error: null
    };
  }

  static get relationMappings() {
    const ConversationContext = require('./ConversationContext');
    const AgentResponse = require('./AgentResponse');

    return {
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: ConversationContext,
        join: {
          from: 'agent_queries.contextId',
          to: 'conversation_contexts.id'
        }
      },
      response: {
        relation: Model.HasOneRelation,
        modelClass: AgentResponse,
        join: {
          from: 'agent_queries.id',
          to: 'agent_responses.queryId'
        }
      }
    };
  }

  async startProcessing() {
    this.processing.status = 'processing';
    return await this.$query().patch({
      processing: this.processing
    });
  }

  async completeProcessing(intent = null, confidence = null, entities = {}) {
    this.parsedIntent = intent;
    this.confidence = confidence;
    this.entities = { ...this.entities, ...entities };
    this.processing.status = 'completed';
    this.processing.endTime = new Date().toISOString();
    
    return await this.$query().patch({
      parsedIntent: this.parsedIntent,
      confidence: this.confidence,
      entities: this.entities,
      processing: this.processing
    });
  }

  async failProcessing(error) {
    this.processing.status = 'failed';
    this.processing.error = error;
    this.processing.endTime = new Date().toISOString();
    
    return await this.$query().patch({
      processing: this.processing
    });
  }
}

module.exports = AgentQuery; 