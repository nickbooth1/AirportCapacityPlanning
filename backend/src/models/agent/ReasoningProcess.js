/**
 * ReasoningProcess.js
 * 
 * Model for storing multi-step reasoning processes
 */

const { Model } = require('objection');
const knex = require('../../db');

Model.knex(knex);

class ReasoningProcess extends Model {
  static get tableName() {
    return 'agent_reasoning_processes';
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'originalQuery'],
      
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        contextId: { type: ['string', 'null'] },
        originalQuery: { type: 'string' },
        queryTitle: { type: 'string' },
        steps: { type: 'array' },
        explanations: { type: 'array' },
        approach: { type: ['string', 'null'] },
        insights: { type: 'array' },
        limitations: { type: 'array' },
        confidence: { type: 'number' },
        tags: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }
  
  static get relationMappings() {
    const User = require('../User');
    const ReasoningFeedback = require('./ReasoningFeedback');
    
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'agent_reasoning_processes.userId',
          to: 'users.id'
        }
      },
      
      feedback: {
        relation: Model.HasManyRelation,
        modelClass: ReasoningFeedback,
        join: {
          from: 'agent_reasoning_processes.id',
          to: 'agent_reasoning_feedback.reasoningId'
        }
      }
    };
  }
  
  $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
  
  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }
}

module.exports = ReasoningProcess;