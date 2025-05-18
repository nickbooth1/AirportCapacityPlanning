const { Model } = require('objection');
const Comment = require('./Comment');

class CommentReaction extends Model {
  static get tableName() {
    return 'comment_reactions';
  }

  static get idColumn() {
    return ['comment_id', 'user_id', 'reaction'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['commentId', 'userId', 'reaction'],
      properties: {
        commentId: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        reaction: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      comment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: 'comment_reactions.comment_id',
          to: 'comments.id'
        }
      }
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
  }

  static async addReaction(commentId, userId, reaction) {
    try {
      await this.query().insert({
        commentId,
        userId,
        reaction,
        createdAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // If the reaction already exists, this will fail due to the primary key constraint
      // We'll just ignore that error
      if (error.code !== '23505') { // PostgreSQL duplicate key error code
        console.error(`Error adding reaction: ${error.message}`);
      }
      return false;
    }
  }

  static async removeReaction(commentId, userId, reaction) {
    try {
      await this.query()
        .delete()
        .where({ commentId, userId, reaction });
      return true;
    } catch (error) {
      console.error(`Error removing reaction: ${error.message}`);
      return false;
    }
  }

  static async getReactionsForComment(commentId) {
    return await this.query()
      .where({ commentId });
  }

  static async getReactionCounts(commentId) {
    return await this.query()
      .where({ commentId })
      .select('reaction')
      .count('* as count')
      .groupBy('reaction');
  }
}

module.exports = CommentReaction;