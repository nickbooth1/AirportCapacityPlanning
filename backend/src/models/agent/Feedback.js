const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class Feedback extends Model {
  static get tableName() {
    return 'feedback';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['targetType', 'targetId', 'userId', 'rating'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        receivedAt: { type: 'string', format: 'date-time' },
        targetType: { type: 'string' },
        targetId: { type: 'string' },
        userId: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        feedbackText: { type: 'string' },
        outcomeStatus: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'implemented'] },
        outcomeNotes: { type: 'string' },
        metadata: {
          type: 'object',
          additionalProperties: true
        },
        source: { type: 'string', enum: ['user_explicit', 'user_implicit', 'system_inferred'] },
        processed: { type: 'boolean' },
        processedAt: { type: 'string', format: 'date-time' },
        processingError: { type: 'string' }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.receivedAt = new Date().toISOString();
    this.source = this.source || 'user_explicit';
    this.processed = false;
    this.metadata = this.metadata || {};
  }

  async markAsProcessed(error = null) {
    const processedAt = new Date().toISOString();
    
    if (error) {
      return await this.$query().patch({
        processed: false,
        processedAt,
        processingError: error.toString()
      });
    } else {
      return await this.$query().patch({
        processed: true,
        processedAt,
        processingError: null
      });
    }
  }

  async updateOutcome(status, notes = '') {
    return await this.$query().patch({
      outcomeStatus: status,
      outcomeNotes: notes
    });
  }

  static async getFeedbackForTarget(targetType, targetId) {
    return await this.query()
      .where({ targetType, targetId })
      .orderBy('receivedAt', 'desc');
  }

  static async getUnprocessedFeedback(limit = 100) {
    return await this.query()
      .where({ processed: false })
      .orderBy('receivedAt')
      .limit(limit);
  }

  static async getAverageRating(targetType, targetId) {
    const result = await this.query()
      .where({ targetType, targetId })
      .avg('rating as averageRating')
      .first();
    
    return result ? parseFloat(result.averageRating) : null;
  }
}

module.exports = Feedback;