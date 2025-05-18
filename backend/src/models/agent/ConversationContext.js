const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class ConversationContext extends Model {
  static get tableName() {
    return 'conversation_contexts';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        startTime: { type: 'string', format: 'date-time' },
        lastUpdateTime: { type: 'string', format: 'date-time' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              role: { type: 'string', enum: ['user', 'agent', 'system'] },
              content: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              responseId: { type: ['string', 'null'], format: 'uuid' }
            }
          }
        },
        entities: {
          type: 'object',
          additionalProperties: true
        },
        intents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              confidence: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        },
        summary: { type: ['string', 'null'] },
        contextQuality: { type: ['number', 'null'], minimum: 0, maximum: 1 },
        topicTags: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.startTime = new Date().toISOString();
    this.lastUpdateTime = new Date().toISOString();
    this.messages = this.messages || [];
    this.entities = this.entities || {};
    this.intents = this.intents || [];
    this.summary = this.summary || null;
    this.contextQuality = this.contextQuality || 1.0;
    this.topicTags = this.topicTags || [];
  }

  $beforeUpdate() {
    this.lastUpdateTime = new Date().toISOString();
  }

  async addMessage(role, content, responseId = null) {
    const message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      responseId
    };
    
    this.messages.push(message);
    this.lastUpdateTime = new Date().toISOString();
    
    return await this.$query().patch({
      messages: this.messages,
      lastUpdateTime: this.lastUpdateTime
    });
  }

  async updateEntities(entities) {
    this.entities = { ...this.entities, ...entities };
    this.lastUpdateTime = new Date().toISOString();
    
    return await this.$query().patch({
      entities: this.entities,
      lastUpdateTime: this.lastUpdateTime
    });
  }

  async addIntent(type, confidence) {
    const intent = {
      type,
      confidence,
      timestamp: new Date().toISOString()
    };
    
    this.intents.push(intent);
    this.lastUpdateTime = new Date().toISOString();
    
    return await this.$query().patch({
      intents: this.intents,
      lastUpdateTime: this.lastUpdateTime
    });
  }
}

module.exports = ConversationContext; 