const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class AgentInsight extends Model {
  static get tableName() {
    return 'agent_insights';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['responseId', 'userId', 'title'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        responseId: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string', enum: ['capacity', 'maintenance', 'infrastructure', 'other'] },
        createdAt: { type: 'string', format: 'date-time' },
        notes: { type: ['string', 'null'] },
        tags: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.category = this.category || 'other';
    this.notes = this.notes || null;
    this.tags = this.tags || [];
  }

  static get relationMappings() {
    const AgentResponse = require('./AgentResponse');

    return {
      response: {
        relation: Model.BelongsToOneRelation,
        modelClass: AgentResponse,
        join: {
          from: 'agent_insights.responseId',
          to: 'agent_responses.id'
        }
      }
    };
  }

  async updateMetadata(title, category, notes = null, tags = []) {
    this.title = title;
    this.category = category;
    this.notes = notes;
    this.tags = tags;
    
    return await this.$query().patch({
      title: this.title,
      category: this.category,
      notes: this.notes,
      tags: this.tags
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
    this.tags = this.tags.filter(t => t !== tag);
    
    return await this.$query().patch({
      tags: this.tags
    });
  }
}

module.exports = AgentInsight; 