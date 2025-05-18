const { Model } = require('objection');
const { v4: uuidv4 } = require('uuid');
const Workspace = require('./Workspace');

class Comment extends Model {
  static get tableName() {
    return 'comments';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['workspaceId', 'targetType', 'targetId', 'author', 'text'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        workspaceId: { type: 'string', format: 'uuid' },
        targetType: { type: 'string' },
        targetId: { type: 'string' },
        author: { type: 'string' },
        text: { type: 'string' },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              url: { type: 'string' },
              name: { type: 'string' }
            }
          }
        },
        visibility: { type: 'string', enum: ['all_members', 'specific_users', 'private'] },
        isEdited: { type: 'boolean' },
        parentCommentId: { type: ['string', 'null'], format: 'uuid' },
        metadata: {
          type: 'object',
          additionalProperties: true
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      workspace: {
        relation: Model.BelongsToOneRelation,
        modelClass: Workspace,
        join: {
          from: 'comments.workspace_id',
          to: 'workspaces.id'
        }
      },
      parentComment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: 'comments.parent_comment_id',
          to: 'comments.id'
        }
      },
      replies: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: 'comments.id',
          to: 'comments.parent_comment_id'
        }
      },
      reactions: {
        relation: Model.HasManyRelation,
        modelClass: require('./CommentReaction'),
        join: {
          from: 'comments.id',
          to: 'comment_reactions.comment_id'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.isEdited = false;
    this.attachments = this.attachments || [];
    this.metadata = this.metadata || {};
    this.visibility = this.visibility || 'all_members';
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
    if (this.text !== this.$previous.text) {
      this.isEdited = true;
    }
  }

  async edit(newText) {
    return await this.$query().patch({
      text: newText,
      isEdited: true,
      updatedAt: new Date().toISOString()
    });
  }

  async addAttachment(attachment) {
    this.attachments.push(attachment);
    
    return await this.$query().patch({
      attachments: this.attachments,
      updatedAt: new Date().toISOString()
    });
  }

  static async getComments(workspaceId, targetType, targetId) {
    return await this.query()
      .where({ 
        workspaceId, 
        targetType, 
        targetId,
        parentCommentId: null // Only get top-level comments
      })
      .orderBy('createdAt')
      .withGraphFetched('[replies, reactions]');
  }

  static async getReplies(commentId) {
    return await this.query()
      .where({ parentCommentId: commentId })
      .orderBy('createdAt')
      .withGraphFetched('reactions');
  }
}

module.exports = Comment;