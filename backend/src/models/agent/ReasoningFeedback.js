/**
 * ReasoningFeedback.js
 * 
 * Model for storing feedback on reasoning processes
 */

const { Model } = require('objection');
const knex = require('../../db');

Model.knex(knex);

class ReasoningFeedback extends Model {
  static get tableName() {
    return 'agent_reasoning_feedback';
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['reasoningId', 'userId', 'rating'],
      
      properties: {
        id: { type: 'string' },
        reasoningId: { type: 'string' },
        userId: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: ['string', 'null'] },
        improvements: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    };
  }
  
  static get relationMappings() {
    const User = require('../User');
    const ReasoningProcess = require('./ReasoningProcess');
    
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'agent_reasoning_feedback.userId',
          to: 'users.id'
        }
      },
      
      reasoningProcess: {
        relation: Model.BelongsToOneRelation,
        modelClass: ReasoningProcess,
        join: {
          from: 'agent_reasoning_feedback.reasoningId',
          to: 'agent_reasoning_processes.id'
        }
      }
    };
  }
  
  $beforeInsert() {
    this.createdAt = new Date().toISOString();
  }
}

module.exports = ReasoningFeedback;