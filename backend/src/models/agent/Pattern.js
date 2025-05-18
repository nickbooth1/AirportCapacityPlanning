const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class Pattern extends Model {
  static get tableName() {
    return 'patterns';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'patternType', 'confidence', 'retentionPeriod'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        patternType: { type: 'string' },
        identifiedAt: { type: 'string', format: 'date-time' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        supportingEvidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              source: { type: 'string' },
              details: { type: 'object', additionalProperties: true }
            }
          }
        },
        relevantEntities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        },
        retentionPeriod: { type: 'integer' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.identifiedAt = new Date().toISOString();
    
    // Default retention period is 180 days if not specified
    this.retentionPeriod = this.retentionPeriod || 180;
    
    // Calculate expiration date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.retentionPeriod);
    this.expiresAt = expiryDate.toISOString();
    
    this.supportingEvidence = this.supportingEvidence || [];
    this.relevantEntities = this.relevantEntities || [];
  }

  async addEvidence(evidence) {
    this.supportingEvidence.push(evidence);
    
    // Recalculate confidence based on new evidence
    this.confidence = this.calculateConfidence();
    
    return await this.$query().patch({
      supportingEvidence: this.supportingEvidence,
      confidence: this.confidence
    });
  }

  calculateConfidence() {
    // Simple confidence calculation based on number of evidence items
    // A real implementation would be more sophisticated
    const baseConfidence = 0.5;
    const evidenceBoost = Math.min(0.4, this.supportingEvidence.length * 0.05);
    return Math.min(0.95, baseConfidence + evidenceBoost);
  }

  static async findRelevantPatterns(context, threshold = 0.6, limit = 10) {
    // In a real implementation, this would use more sophisticated matching
    // Here we're just looking for patterns that are still valid and have 
    // confidence above the threshold
    const patternTypes = context.patternTypes || ['capacity_constraint', 'airline_preference', 'maintenance_impact'];
    
    return await this.query()
      .whereIn('patternType', patternTypes)
      .where('confidence', '>=', threshold)
      .where('expiresAt', '>', new Date().toISOString())
      .orderBy('confidence', 'desc')
      .limit(limit);
  }
}

module.exports = Pattern;