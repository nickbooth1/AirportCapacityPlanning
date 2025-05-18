const { Model } = require('objection');
const Workspace = require('./Workspace');

class WorkspaceMember extends Model {
  static get tableName() {
    return 'workspace_members';
  }

  static get idColumn() {
    return ['workspace_id', 'user_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['workspaceId', 'userId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'editor', 'viewer', 'member'] },
        joinedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      workspace: {
        relation: Model.BelongsToOneRelation,
        modelClass: Workspace,
        join: {
          from: 'workspace_members.workspace_id',
          to: 'workspaces.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.joinedAt = new Date().toISOString();
    this.role = this.role || 'member';
  }

  static async addMember(workspaceId, userId, role = 'member') {
    try {
      await this.query().insert({
        workspaceId,
        userId,
        role,
        joinedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error(`Error adding member to workspace: ${error.message}`);
      return false;
    }
  }

  static async updateRole(workspaceId, userId, newRole) {
    try {
      await this.query()
        .where({ workspaceId, userId })
        .patch({ role: newRole });
      return true;
    } catch (error) {
      console.error(`Error updating member role: ${error.message}`);
      return false;
    }
  }

  static async removeMember(workspaceId, userId) {
    try {
      await this.query()
        .delete()
        .where({ workspaceId, userId });
      return true;
    } catch (error) {
      console.error(`Error removing member from workspace: ${error.message}`);
      return false;
    }
  }

  static async getWorkspaceMembers(workspaceId) {
    return await this.query()
      .where({ workspaceId })
      .orderBy('role')
      .orderBy('joinedAt');
  }

  static async getUserRole(workspaceId, userId) {
    const member = await this.query()
      .where({ workspaceId, userId })
      .first();
    
    return member ? member.role : null;
  }
}

module.exports = WorkspaceMember;