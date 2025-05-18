const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');
const WorkspaceMember = require('./WorkspaceMember');
const Comment = require('./Comment');
const Activity = require('./Activity');

class Workspace extends Model {
  static get tableName() {
    return 'workspaces';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'createdBy'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        content: {
          type: 'object',
          properties: {
            scenarios: { type: 'array', items: { type: 'string' } },
            insights: { type: 'array', items: { type: 'string' } }
          }
        },
        status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
        visibility: { type: 'string', enum: ['private', 'team', 'public'] },
        settings: {
          type: 'object',
          properties: {
            commentNotifications: { type: 'boolean' },
            activityTracking: { type: 'boolean' },
            contentLocking: { type: 'boolean' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        createdBy: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
        updatedBy: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    return {
      members: {
        relation: Model.HasManyRelation,
        modelClass: WorkspaceMember,
        join: {
          from: 'workspaces.id',
          to: 'workspace_members.workspace_id'
        }
      },
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: 'workspaces.id',
          to: 'comments.workspace_id'
        }
      },
      activities: {
        relation: Model.HasManyRelation,
        modelClass: Activity,
        join: {
          from: 'workspaces.id',
          to: 'activities.workspace_id'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.status = this.status || 'active';
    this.visibility = this.visibility || 'private';
    this.content = this.content || {
      scenarios: [],
      insights: []
    };
    this.settings = this.settings || {
      commentNotifications: true,
      activityTracking: true,
      contentLocking: false
    };
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  async addScenario(scenarioId, updatedBy) {
    if (!this.content.scenarios.includes(scenarioId)) {
      this.content.scenarios.push(scenarioId);
      this.updatedAt = new Date().toISOString();
      this.updatedBy = updatedBy;
      
      return await this.$query().patch({
        content: this.content,
        updatedAt: this.updatedAt,
        updatedBy: this.updatedBy
      });
    }
    return this;
  }

  async addInsight(insightId, updatedBy) {
    if (!this.content.insights.includes(insightId)) {
      this.content.insights.push(insightId);
      this.updatedAt = new Date().toISOString();
      this.updatedBy = updatedBy;
      
      return await this.$query().patch({
        content: this.content,
        updatedAt: this.updatedAt,
        updatedBy: this.updatedBy
      });
    }
    return this;
  }

  async updateSettings(newSettings, updatedBy) {
    this.settings = { ...this.settings, ...newSettings };
    this.updatedAt = new Date().toISOString();
    this.updatedBy = updatedBy;
    
    return await this.$query().patch({
      settings: this.settings,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy
    });
  }

  static async findForUser(userId, status = 'active') {
    // Find all workspaces where the user is a member
    return await this.query()
      .select('workspaces.*')
      .join('workspace_members', 'workspaces.id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', userId)
      .where('workspaces.status', status);
  }
}

module.exports = Workspace;