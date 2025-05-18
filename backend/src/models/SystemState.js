/**
 * SystemState Model
 * 
 * Represents the state of the autonomous system at a point in time,
 * including operating mode, autonomy levels, key metrics, and
 * situational assessment.
 */

const { Model } = require('objection');
const OperatingMode = require('./OperatingMode');

class SystemState extends Model {
  static get tableName() {
    return 'system_states';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['timestamp', 'autonomy_levels', 'key_metrics', 'situational_assessment'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        operating_mode_id: { type: ['string', 'null'], format: 'uuid' },
        autonomy_levels: {
          type: 'object',
          patternProperties: {
            "^[a-zA-Z0-9_-]+$": { 
              type: 'string',
              enum: [
                'FULLY_AUTONOMOUS', 
                'SUPERVISED_AUTONOMOUS', 
                'HUMAN_APPROVED', 
                'HUMAN_DIRECTED',
                'MANUAL'
              ]
            }
          }
        },
        key_metrics: {
          type: 'object',
          properties: {
            overallCapacityUtilization: { type: 'number' },
            passengerSatisfactionIndex: { type: 'number' },
            sustainabilityScore: { type: 'number' },
            commercialPerformance: { type: 'number' },
            safetyIndex: { type: 'number' }
          },
          additionalProperties: { type: 'number' }
        },
        active_processes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string' },
              completion: { type: 'number', minimum: 0, maximum: 100 },
              estimatedCompletion: { type: 'string', format: 'date-time' }
            }
          }
        },
        situational_assessment: {
          type: 'object',
          required: ['currentState', 'riskLevel'],
          properties: {
            currentState: { 
              type: 'string',
              enum: [
                'NORMAL_OPERATIONS', 
                'MINOR_DISRUPTION', 
                'MODERATE_DISRUPTION', 
                'MAJOR_DISRUPTION',
                'CRITICAL_SITUATION',
                'EMERGENCY'
              ]
            },
            riskLevel: { 
              type: 'string',
              enum: ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] 
            },
            activeChallenges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  affectedSystems: { 
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        resource_status: {
          type: 'object',
          patternProperties: {
            "^[a-zA-Z0-9_-]+$": { 
              type: 'object',
              properties: {
                availability: { type: 'number', minimum: 0, maximum: 1 },
                utilization: { type: 'number', minimum: 0, maximum: 1 },
                health: { type: 'number', minimum: 0, maximum: 1 }
              }
            }
          }
        },
        created_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      operatingMode: {
        relation: Model.BelongsToOneRelation,
        modelClass: OperatingMode,
        join: {
          from: 'system_states.operating_mode_id',
          to: 'operating_modes.id'
        }
      }
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.timestamp = this.timestamp || new Date().toISOString();
  }

  // Helper method to get the most recent system state
  static async getMostRecent() {
    return this.query()
      .orderBy('timestamp', 'desc')
      .first();
  }

  // Helper method to get system states within a time range
  static async getTimeRange(startTime, endTime) {
    return this.query()
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .orderBy('timestamp');
  }

  // Helper method to compute the delta between two system states
  static computeDelta(currentState, previousState) {
    if (!previousState) return { isInitial: true };

    const delta = {
      metrics: {},
      autonomyLevels: {},
      situationalChanges: {}
    };

    // Compare key metrics
    for (const [key, value] of Object.entries(currentState.key_metrics)) {
      if (previousState.key_metrics && previousState.key_metrics[key] !== undefined) {
        const change = value - previousState.key_metrics[key];
        delta.metrics[key] = {
          previous: previousState.key_metrics[key],
          current: value,
          change,
          percentChange: previousState.key_metrics[key] !== 0 
            ? (change / previousState.key_metrics[key]) * 100 
            : null
        };
      }
    }

    // Compare autonomy levels
    for (const [domain, level] of Object.entries(currentState.autonomy_levels)) {
      if (previousState.autonomy_levels && previousState.autonomy_levels[domain] !== level) {
        delta.autonomyLevels[domain] = {
          previous: previousState.autonomy_levels[domain],
          current: level
        };
      }
    }

    // Compare situational assessment
    if (currentState.situational_assessment.currentState !== previousState.situational_assessment.currentState) {
      delta.situationalChanges.stateChange = {
        previous: previousState.situational_assessment.currentState,
        current: currentState.situational_assessment.currentState
      };
    }

    if (currentState.situational_assessment.riskLevel !== previousState.situational_assessment.riskLevel) {
      delta.situationalChanges.riskChange = {
        previous: previousState.situational_assessment.riskLevel,
        current: currentState.situational_assessment.riskLevel
      };
    }

    return delta;
  }
}

module.exports = SystemState;