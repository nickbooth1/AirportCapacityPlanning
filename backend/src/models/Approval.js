/**
 * Approval Model
 * 
 * Represents an approval for a decision that requires human authorization.
 */

const { Model } = require('objection');
const Decision = require('./Decision');

class Approval extends Model {
  static get tableName() {
    return 'approvals';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['decision_id', 'status'],
      
      properties: {
        id: { type: 'string', format: 'uuid' },
        decision_id: { type: 'string', format: 'uuid' },
        status: { 
          type: 'string', 
          enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] 
        },
        approved_by: { type: ['string', 'null'], maxLength: 100 },
        approved_at: { type: ['string', 'null'], format: 'date-time' },
        notes: { type: 'string' },
        expires_at: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      decision: {
        relation: Model.BelongsToOneRelation,
        modelClass: Decision,
        join: {
          from: 'approvals.decision_id',
          to: 'decisions.id'
        }
      }
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    
    // Set default expiration if not provided
    if (!this.expires_at) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24); // Default 24-hour expiry
      this.expires_at = expiryDate.toISOString();
    }
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    this.updated_at = new Date().toISOString();
    
    // When setting to approved, update the approval details
    if (opt.old && opt.old.status !== 'APPROVED' && this.status === 'APPROVED') {
      this.approved_at = new Date().toISOString();
    }
  }

  // Helper method to check if approval is expired
  isExpired() {
    if (!this.expires_at) return false;
    return new Date(this.expires_at) < new Date();
  }

  // Helper method to approve a decision
  async approve(approver, notes = null) {
    if (this.isExpired()) {
      throw new Error('Cannot approve an expired approval request');
    }
    
    return this.$query().patch({
      status: 'APPROVED',
      approved_by: approver,
      approved_at: new Date().toISOString(),
      notes: notes || this.notes
    });
  }

  // Helper method to reject a decision
  async reject(rejecter, notes = null) {
    if (this.isExpired()) {
      throw new Error('Cannot reject an expired approval request');
    }
    
    return this.$query().patch({
      status: 'REJECTED',
      approved_by: rejecter, // Reusing the approved_by field
      notes: notes || this.notes
    });
  }

  // Helper method to mark approval as expired
  static async expireStaleApprovals() {
    const now = new Date().toISOString();
    
    return Approval.query()
      .patch({ status: 'EXPIRED' })
      .where('status', 'PENDING')
      .where('expires_at', '<', now);
  }
}

module.exports = Approval;