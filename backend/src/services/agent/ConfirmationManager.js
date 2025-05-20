/**
 * ConfirmationManager.js
 * 
 * Service for managing confirmation flows for data modification operations
 * Tracks pending operations that require user confirmation and handles
 * the confirmation/rejection process.
 */

const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ConfirmationManager {
  constructor() {
    // Store pending operations awaiting confirmation
    this.pendingOperations = new Map();
    
    // TTL for pending operations (5 minutes)
    this.operationTTL = 5 * 60 * 1000;
    
    // Set up periodic cleanup of expired operations
    this.cleanupInterval = setInterval(() => this.cleanupExpiredOperations(), 60 * 1000);
  }

  /**
   * Create a new pending operation requiring confirmation
   * @param {Object} operation - Operation details
   * @param {string} sessionId - User session ID
   * @returns {Object} - Operation with confirmation details
   */
  createPendingOperation(operation, sessionId) {
    try {
      // Generate a unique operation ID
      const operationId = uuidv4();
      
      // Create confirmation details
      const confirmationDetails = {
        operationId,
        operation,
        sessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.operationTTL,
        status: 'pending'
      };
      
      // Store the pending operation
      this.pendingOperations.set(operationId, confirmationDetails);
      
      logger.info(`Created pending operation ${operationId} of type ${operation.operationType}`);
      
      return {
        ...confirmationDetails,
        message: this.generateConfirmationMessage(operation, operationId)
      };
    } catch (error) {
      logger.error(`Error creating pending operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Confirm a pending operation
   * @param {string} operationId - Operation ID
   * @param {string} sessionId - User session ID for verification
   * @returns {Object} - Confirmed operation
   */
  confirmOperation(operationId, sessionId) {
    try {
      const pendingOp = this.pendingOperations.get(operationId);
      
      if (!pendingOp) {
        throw new Error(`Operation ${operationId} not found or expired`);
      }
      
      if (pendingOp.sessionId !== sessionId) {
        throw new Error('Session ID mismatch. Operation not authorized.');
      }
      
      if (pendingOp.status !== 'pending') {
        throw new Error(`Operation ${operationId} is already ${pendingOp.status}`);
      }
      
      // Update the operation status
      pendingOp.status = 'confirmed';
      pendingOp.confirmedAt = Date.now();
      this.pendingOperations.set(operationId, pendingOp);
      
      logger.info(`Confirmed operation ${operationId}`);
      
      return {
        ...pendingOp,
        message: `Operation ${operationId} confirmed. Executing ${pendingOp.operation.operationType}...`
      };
    } catch (error) {
      logger.error(`Error confirming operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a pending operation
   * @param {string} operationId - Operation ID
   * @param {string} sessionId - User session ID for verification
   * @param {string} reason - Optional reason for rejection
   * @returns {Object} - Rejected operation
   */
  rejectOperation(operationId, sessionId, reason = 'User rejected') {
    try {
      const pendingOp = this.pendingOperations.get(operationId);
      
      if (!pendingOp) {
        throw new Error(`Operation ${operationId} not found or expired`);
      }
      
      if (pendingOp.sessionId !== sessionId) {
        throw new Error('Session ID mismatch. Operation not authorized.');
      }
      
      if (pendingOp.status !== 'pending') {
        throw new Error(`Operation ${operationId} is already ${pendingOp.status}`);
      }
      
      // Update the operation status
      pendingOp.status = 'rejected';
      pendingOp.rejectedAt = Date.now();
      pendingOp.rejectionReason = reason;
      this.pendingOperations.set(operationId, pendingOp);
      
      logger.info(`Rejected operation ${operationId}: ${reason}`);
      
      return {
        ...pendingOp,
        message: `Operation ${operationId} rejected. ${reason}`
      };
    } catch (error) {
      logger.error(`Error rejecting operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get details of a pending operation
   * @param {string} operationId - Operation ID
   * @returns {Object} - Operation details
   */
  getOperation(operationId) {
    const operation = this.pendingOperations.get(operationId);
    
    if (!operation) {
      throw new Error(`Operation ${operationId} not found or expired`);
    }
    
    return operation;
  }

  /**
   * Get all pending operations for a session
   * @param {string} sessionId - User session ID
   * @returns {Array} - Pending operations for the session
   */
  getPendingOperationsForSession(sessionId) {
    const sessionOperations = [];
    
    for (const [id, op] of this.pendingOperations.entries()) {
      if (op.sessionId === sessionId && op.status === 'pending') {
        sessionOperations.push({
          operationId: id,
          operationType: op.operation.operationType,
          createdAt: op.createdAt,
          expiresAt: op.expiresAt
        });
      }
    }
    
    return sessionOperations;
  }

  /**
   * Clean up expired operations
   * @private
   */
  cleanupExpiredOperations() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [id, op] of this.pendingOperations.entries()) {
      if (op.expiresAt < now) {
        this.pendingOperations.delete(id);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired operations`);
    }
  }

  /**
   * Generate confirmation message with instructions
   * @param {Object} operation - Operation details
   * @param {string} operationId - Operation ID
   * @returns {string} - Confirmation message
   */
  generateConfirmationMessage(operation, operationId) {
    const { operationType, parameters } = operation;
    
    // Basic message with operation details
    let baseMessage = '';
    
    switch (operationType) {
      case 'create_stand':
        baseMessage = `Create a new stand named "${parameters.name}" in terminal "${parameters.terminal}"?`;
        break;
      case 'create_terminal':
        baseMessage = `Create a new terminal named "${parameters.name}"${parameters.code ? ` with code "${parameters.code}"` : ''}?`;
        break;
      case 'create_maintenance':
        baseMessage = `Create a maintenance request for stand "${parameters.stand}" from ${parameters.startDate} to ${parameters.endDate}?`;
        break;
      case 'update_stand':
        baseMessage = `Update stand "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`;
        break;
      case 'update_terminal':
        baseMessage = `Update terminal "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`;
        break;
      case 'update_maintenance':
        baseMessage = `Update maintenance request "${parameters.identifier}" with the following changes: ${this.formatChanges(parameters, ['identifier'])}?`;
        break;
      case 'delete_stand':
        baseMessage = `Delete stand "${parameters.identifier}"${parameters.force ? ' (forced deletion)' : ''}?`;
        break;
      case 'delete_terminal':
        baseMessage = `Delete terminal "${parameters.identifier}"${parameters.force ? ' (forced deletion)' : ''}?`;
        break;
      case 'delete_maintenance':
        baseMessage = `Delete maintenance request "${parameters.identifier}"?`;
        break;
      default:
        baseMessage = `Confirm ${operationType.replace('_', ' ')} operation with parameters: ${JSON.stringify(parameters)}?`;
    }
    
    // Add confirmation instructions
    const confirmationInstructions = `
Please confirm or reject this operation:
- To confirm: "confirm operation ${operationId}"
- To reject: "reject operation ${operationId}"

This confirmation will expire in 5 minutes.
`;
    
    return `${baseMessage}\n${confirmationInstructions}`;
  }

  /**
   * Format parameter changes for confirmation message
   * @param {Object} parameters - Operation parameters
   * @param {Array} exclude - Parameters to exclude
   * @returns {string} - Formatted changes
   */
  formatChanges(parameters, exclude = []) {
    const changes = Object.entries(parameters)
      .filter(([key]) => !exclude.includes(key))
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
    
    return changes.length > 0 ? changes : 'no changes specified';
  }

  /**
   * Shutdown the confirmation manager and clean up resources
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
    this.pendingOperations.clear();
  }
}

module.exports = new ConfirmationManager();