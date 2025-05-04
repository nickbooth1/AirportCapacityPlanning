const MaintenanceApproval = require('../models/MaintenanceApproval');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { ValidationError, transaction } = require('objection');

class MaintenanceApprovalService {
  async getApprovalsByRequest(requestId) {
    return await MaintenanceApproval.query()
      .where('maintenance_request_id', requestId)
      .orderBy('approval_datetime', 'desc');
  }
  
  async createApproval(approvalData, updateStatus = true) {
    const { maintenance_request_id, is_approved } = approvalData;
    
    // Start a transaction to handle both the approval and status update
    const trx = await transaction.start(MaintenanceApproval.knex());
    
    try {
      // Create the approval record
      const approval = await MaintenanceApproval.query(trx).insert(approvalData);
      
      // Update the request status based on the approval if requested
      if (updateStatus) {
          const newStatusId = is_approved ? 2 : 3; // 2 = Approved, 3 = Rejected
          await this.updateRequestStatus(maintenance_request_id, newStatusId, trx);
      }
      
      await trx.commit();
      return approval;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateRequestStatus(requestId, newStatusId, trx = null) {
    const query = MaintenanceRequest.query(trx).findById(requestId);
    
    const request = await query.withGraphFetched('status');
    if (!request) {
        throw new ValidationError({ type: 'NotFound', message: 'Request not found' });
    }
    
    // Status transition validation rules
    const allowedTransitions = {
      1: [2, 3, 6],     // Requested -> Approved, Rejected, Cancelled
      2: [4, 6],        // Approved -> In Progress, Cancelled
      3: [1],           // Rejected -> Requested (resubmit)
      4: [5, 6],        // In Progress -> Completed, Cancelled
      5: [],            // Completed -> (no further transitions)
      6: [1]            // Cancelled -> Requested (resubmit)
    };
    
    if (!allowedTransitions[request.status_id] || !allowedTransitions[request.status_id].includes(Number(newStatusId))) {
      throw new ValidationError({
        message: `Invalid status transition from ${request.status.name} to status ID ${newStatusId}`,
        type: 'ValidationError'
      });
    }
    
    // Update the status
    return await MaintenanceRequest.query(trx)
      .findById(requestId)
      .patch({ 
        status_id: newStatusId,
        updated_at: new Date().toISOString()
      });
  }
}

module.exports = new MaintenanceApprovalService(); 