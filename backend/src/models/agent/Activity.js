const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');
const Workspace = require('./Workspace');

class Activity extends Model {
  static get tableName() {
    return 'activities';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['workspaceId', 'userId', 'activityType'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        workspaceId: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        userId: { type: 'string' },
        activityType: { type: 'string' },
        targetType: { type: 'string' },
        targetId: { type: 'string' },
        summary: { type: 'string' },
        referenceId: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    return {
      workspace: {
        relation: Model.BelongsToOneRelation,
        modelClass: Workspace,
        join: {
          from: 'activities.workspace_id',
          to: 'workspaces.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.timestamp = new Date().toISOString();
  }

  static async logActivity(data) {
    try {
      return await this.query().insert({
        id: uuidv4(),
        workspaceId: data.workspaceId,
        userId: data.userId,
        activityType: data.activityType,
        targetType: data.targetType,
        targetId: data.targetId,
        summary: data.summary,
        referenceId: data.referenceId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error logging activity: ${error.message}`);
      return null;
    }
  }

  static async getActivitiesForWorkspace(workspaceId, limit = 50) {
    return await this.query()
      .where({ workspaceId })
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }

  static async getActivitiesForUser(userId, limit = 50) {
    return await this.query()
      .where({ userId })
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }

  static async getActivitiesForTarget(targetType, targetId, limit = 50) {
    return await this.query()
      .where({ targetType, targetId })
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }
}

module.exports = Activity;