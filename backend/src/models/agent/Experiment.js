const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');

class Experiment extends Model {
  static get tableName() {
    return 'experiments';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'targetType', 'variants'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
        createdAt: { type: 'string', format: 'date-time' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        targetType: { type: 'string' },
        variants: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              parameters: { type: 'object', additionalProperties: true },
              metrics: { type: 'object', additionalProperties: true }
            }
          }
        },
        trafficAllocation: {
          type: 'object',
          additionalProperties: {
            type: 'number',
            minimum: 0,
            maximum: 1
          }
        },
        successMetric: { type: 'string' }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.startDate = this.startDate || new Date().toISOString();
    this.status = this.status || 'draft';
    
    // Set default traffic allocation to equal distribution if not provided
    if (!this.trafficAllocation && this.variants && this.variants.length > 0) {
      const equalShare = 1 / this.variants.length;
      this.trafficAllocation = {};
      this.variants.forEach(variant => {
        this.trafficAllocation[variant.id] = equalShare;
      });
    }
    
    this.successMetric = this.successMetric || 'avgRating';
  }

  $beforeUpdate() {
    if (this.status === 'completed' && !this.endDate) {
      this.endDate = new Date().toISOString();
    }
  }

  async activate() {
    if (this.status === 'draft' || this.status === 'paused') {
      return await this.$query().patch({
        status: 'active',
        startDate: new Date().toISOString()
      });
    }
    return this;
  }

  async pause() {
    if (this.status === 'active') {
      return await this.$query().patch({
        status: 'paused'
      });
    }
    return this;
  }

  async complete() {
    if (this.status === 'active' || this.status === 'paused') {
      return await this.$query().patch({
        status: 'completed',
        endDate: new Date().toISOString()
      });
    }
    return this;
  }

  async updateTrafficAllocation(newAllocation) {
    // Validate the allocation adds up to 1.0
    const total = Object.values(newAllocation).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error('Traffic allocation must sum to 1.0');
    }
    
    return await this.$query().patch({
      trafficAllocation: newAllocation
    });
  }

  async updateVariantMetrics(variantId, metrics) {
    const variantIndex = this.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw new Error(`Variant with ID ${variantId} not found`);
    }
    
    const updatedVariants = [...this.variants];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      metrics: {
        ...updatedVariants[variantIndex].metrics,
        ...metrics
      }
    };
    
    return await this.$query().patch({
      variants: updatedVariants
    });
  }

  static async getActiveExperiments() {
    return await this.query()
      .where({ status: 'active' });
  }

  static async getExperimentByTargetType(targetType) {
    return await this.query()
      .where({ targetType, status: 'active' })
      .first();
  }
}

module.exports = Experiment;