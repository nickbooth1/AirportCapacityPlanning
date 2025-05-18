const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class ActionProposal extends Model {
  static get tableName() {
    return 'action_proposals';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['contextId', 'userId', 'actionType', 'description'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        contextId: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        actionType: { type: 'string' },
        description: { type: 'string' },
        parameters: {
          type: 'object',
          additionalProperties: true
        },
        impact: { type: ['string', 'null'] },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'executed', 'failed'] },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        approvedAt: { type: ['string', 'null'], format: 'date-time' },
        rejectedAt: { type: ['string', 'null'], format: 'date-time' },
        executedAt: { type: ['string', 'null'], format: 'date-time' },
        reason: { type: ['string', 'null'] },
        result: {
          type: ['object', 'null'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    
    // Set expiration time to 24 hours from now by default
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    this.expiresAt = this.expiresAt || expiry.toISOString();
    
    this.status = 'pending';
    this.parameters = this.parameters || {};
    this.approvedAt = null;
    this.rejectedAt = null;
    this.executedAt = null;
    this.reason = null;
    this.result = null;
  }

  static get relationMappings() {
    const ConversationContext = require('./ConversationContext');

    return {
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: ConversationContext,
        join: {
          from: 'action_proposals.contextId',
          to: 'conversation_contexts.id'
        }
      }
    };
  }

  async approve() {
    this.status = 'approved';
    this.approvedAt = new Date().toISOString();
    
    return await this.$query().patch({
      status: this.status,
      approvedAt: this.approvedAt
    });
  }

  async reject(reason = null) {
    this.status = 'rejected';
    this.rejectedAt = new Date().toISOString();
    this.reason = reason;
    
    return await this.$query().patch({
      status: this.status,
      rejectedAt: this.rejectedAt,
      reason: this.reason
    });
  }

  async setExecuted(success, message, data = {}) {
    this.status = success ? 'executed' : 'failed';
    this.executedAt = new Date().toISOString();
    this.result = {
      success,
      message,
      data
    };
    
    return await this.$query().patch({
      status: this.status,
      executedAt: this.executedAt,
      result: this.result
    });
  }

  isExpired() {
    return new Date(this.expiresAt) < new Date();
  }
}

module.exports = ActionProposal; 