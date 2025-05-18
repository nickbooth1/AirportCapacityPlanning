const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class DecisionHistory extends Model {
  static get tableName() {
    return 'decision_history';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'decisionType', 'description', 'retentionPeriod'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        decisionType: { type: 'string' },
        description: { type: 'string' },
        context: {
          type: 'object',
          additionalProperties: true
        },
        parameters: {
          type: 'object',
          additionalProperties: true
        },
        expectedOutcome: {
          type: 'object',
          additionalProperties: true
        },
        actualOutcome: {
          type: 'object',
          additionalProperties: true
        },
        outcomeNotes: { type: 'string' },
        outcomeTimestamp: { type: 'string', format: 'date-time' },
        retentionPeriod: { type: 'integer' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.timestamp = new Date().toISOString();
    
    // Default retention period is 90 days if not specified
    this.retentionPeriod = this.retentionPeriod || 90;
    
    // Calculate expiration date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.retentionPeriod);
    this.expiresAt = expiryDate.toISOString();
    
    this.context = this.context || {};
    this.parameters = this.parameters || {};
    this.expectedOutcome = this.expectedOutcome || {};
  }

  async recordOutcome(actualOutcome, outcomeNotes = '') {
    this.actualOutcome = actualOutcome;
    this.outcomeNotes = outcomeNotes;
    this.outcomeTimestamp = new Date().toISOString();
    
    return await this.$query().patch({
      actualOutcome: this.actualOutcome,
      outcomeNotes: this.outcomeNotes,
      outcomeTimestamp: this.outcomeTimestamp
    });
  }

  static async findSimilarDecisions(userId, decisionType, parameters, limit = 5) {
    // This is a simple implementation that matches on user and type
    // In a real system, you might use a more sophisticated similarity algorithm
    return await this.query()
      .where('userId', userId)
      .where('decisionType', decisionType)
      .where('expiresAt', '>', new Date().toISOString())
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }
}

module.exports = DecisionHistory;