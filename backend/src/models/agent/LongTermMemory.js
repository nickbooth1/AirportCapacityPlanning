/**
 * LongTermMemory.js
 * 
 * Model for storing long-term memory items extracted from conversations
 */

const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');
const knex = require('../../db');

Model.knex(knex);

class LongTermMemory extends Model {
  static get tableName() {
    return 'agent_long_term_memories';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'content'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        contextId: { type: ['string', 'null'], format: 'uuid' },
        content: { type: 'string' },
        category: { type: 'string', enum: ['PREFERENCE', 'CONSTRAINT', 'ACTION', 'DATA', 'OTHER'] },
        importance: { type: 'integer', minimum: 1, maximum: 10 },
        timestamp: { type: 'string', format: 'date-time' },
        lastAccessedAt: { type: ['string', 'null'], format: 'date-time' },
        accessCount: { type: 'integer', minimum: 0 },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  static get relationMappings() {
    const ConversationContext = require('./ConversationContext');
    
    return {
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: ConversationContext,
        join: {
          from: 'agent_long_term_memories.contextId',
          to: 'conversation_contexts.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.timestamp = this.timestamp || new Date().toISOString();
    this.accessCount = 0;
    this.lastAccessedAt = null;
    this.tags = this.tags || [];
    
    // Default category if not provided
    this.category = this.category || 'OTHER';
    
    // Default importance if not provided or out of range
    if (!this.importance || this.importance < 1 || this.importance > 10) {
      this.importance = 5;
    }
  }

  async trackAccess() {
    this.accessCount += 1;
    this.lastAccessedAt = new Date().toISOString();
    
    return await this.$query().patch({
      accessCount: this.accessCount,
      lastAccessedAt: this.lastAccessedAt
    });
  }

  async addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      
      return await this.$query().patch({
        tags: this.tags
      });
    }
    return this;
  }

  async removeTag(tag) {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter(t => t !== tag);
      
      return await this.$query().patch({
        tags: this.tags
      });
    }
    return this;
  }
}

module.exports = LongTermMemory;