/**
 * CascadeDeleteService.js
 * 
 * Service to handle cascading rules for entity deletions and relationships
 * Provides utilities for safely managing entity dependencies
 */

const MaintenanceRequest = require('../models/MaintenanceRequest');
const MaintenanceApproval = require('../models/MaintenanceApproval');
const Stand = require('../models/Stand');
const StandAdjacencyRule = require('../models/StandAdjacencyRule');
const logger = require('../utils/logger');
const { transaction } = require('objection');
const AuditService = require('./AuditService');

class CascadeDeleteService {
  /**
   * Get all dependencies for a stand
   * @param {number} standId - Stand ID
   * @returns {Promise<Object>} - Dependencies object with counts and details
   */
  async getStandDependencies(standId) {
    try {
      // Get all maintenance requests for this stand
      const maintenanceRequests = await MaintenanceRequest.query()
        .where('stand_id', standId)
        .withGraphFetched('status');

      // Get all stand adjacency rules involving this stand
      const adjacencyRules = await StandAdjacencyRule.query()
        .where('primary_stand_id', standId)
        .orWhere('adjacent_stand_id', standId);

      // Group maintenance requests by status
      const maintenanceByStatus = {};
      maintenanceRequests.forEach(req => {
        const statusName = req.status ? req.status.name : 'Unknown';
        if (!maintenanceByStatus[statusName]) {
          maintenanceByStatus[statusName] = [];
        }
        maintenanceByStatus[statusName].push({
          id: req.id,
          title: req.title,
          start_datetime: req.start_datetime,
          end_datetime: req.end_datetime
        });
      });

      // Check for active maintenance
      const now = new Date();
      const activeMaintenanceRequests = maintenanceRequests.filter(req => {
        const startDate = new Date(req.start_datetime);
        const endDate = new Date(req.end_datetime);
        return startDate <= now && endDate >= now && [2, 4].includes(req.status_id); // Approved or In Progress
      });

      return {
        dependencies: {
          maintenance: {
            total: maintenanceRequests.length,
            active: activeMaintenanceRequests.length,
            byStatus: maintenanceByStatus
          },
          adjacencyRules: {
            total: adjacencyRules.length,
            rules: adjacencyRules.map(rule => ({
              id: rule.id,
              primary_stand_id: rule.primary_stand_id,
              adjacent_stand_id: rule.adjacent_stand_id,
              rule_type: rule.rule_type
            }))
          }
        },
        hasActiveDependencies: activeMaintenanceRequests.length > 0,
        hasAnyDependencies: maintenanceRequests.length > 0 || adjacencyRules.length > 0
      };
    } catch (error) {
      logger.error(`Error getting stand dependencies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel maintenance requests for a stand
   * @param {number} standId - Stand ID
   * @param {Object} options - Options for the operation
   * @param {Object} options.user - User performing the cancellation
   * @param {Object} options.request - HTTP request object
   * @param {string} options.reason - Reason for cancellation
   * @param {boolean} options.skipActive - Whether to skip active maintenance
   * @returns {Promise<Object>} - Result with cancelled counts
   */
  async cancelMaintenanceForStand(standId, options = {}) {
    const trx = await transaction.start(MaintenanceRequest.knex());
    
    try {
      // Get all maintenance requests for this stand
      let query = MaintenanceRequest.query(trx)
        .where('stand_id', standId)
        .whereNotIn('status_id', [5, 6]); // Exclude already completed or cancelled

      // If skipActive is true, also exclude active maintenance
      if (options.skipActive) {
        // Get current datetime
        const now = new Date().toISOString();
        
        // Exclude maintenance that is currently active (in progress or approved and within the time window)
        query = query.where(builder => {
          builder.whereNot('status_id', 4) // Not in progress
            .andWhere(subBuilder => {
              subBuilder.whereNot('status_id', 2) // Not approved
                .orWhere(timeBuilder => {
                  // Or approved but not within the active time window
                  timeBuilder.where('status_id', 2)
                    .andWhere(dateBuilder => {
                      dateBuilder.where('end_datetime', '<', now)
                        .orWhere('start_datetime', '>', now);
                    });
                });
            });
        });
      }

      // Get the requests that will be cancelled
      const requestsToCancel = await query;
      
      if (requestsToCancel.length === 0) {
        await trx.commit();
        return { cancelled: 0, message: 'No eligible maintenance requests found' };
      }

      // Create cancellation reason
      const cancellationReason = options.reason || 
        `Stand ${standId} ${options.softDelete ? 'soft-deleted' : 'deleted'}`;
      
      // Log all cancelled requests for the audit trail
      const requestIds = requestsToCancel.map(req => req.id);
      
      // Update status to Cancelled (6) for all matched requests
      await MaintenanceRequest.query(trx)
        .whereIn('id', requestIds)
        .patch({
          status_id: 6, // Cancelled
          updated_at: new Date().toISOString()
        });
      
      // Add a system comment for each cancellation
      for (const request of requestsToCancel) {
        // Save previous state for audit
        const previousState = { ...request };
        
        // Create a system approval (comment) for each cancellation
        await MaintenanceApproval.query(trx).insert({
          maintenance_request_id: request.id,
          approver_name: options.user?.name || 'System',
          approver_email: options.user?.email || 'system@airport.com',
          approver_department: options.user?.department || 'Maintenance System',
          is_approved: false,
          comments: `Automatically cancelled: ${cancellationReason}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Create audit log
        await AuditService.logChange({
          entityType: 'maintenance_request',
          entityId: request.id,
          action: 'cancel',
          previousState,
          newState: { ...request, status_id: 6 },
          user: options.user,
          request: options.request,
          notes: cancellationReason,
          transaction: trx
        });
      }
      
      await trx.commit();
      
      return { 
        cancelled: requestsToCancel.length,
        requests: requestsToCancel.map(req => ({
          id: req.id,
          title: req.title
        })),
        message: `Successfully cancelled ${requestsToCancel.length} maintenance requests`
      };
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
      logger.error(`Error cancelling maintenance for stand ${standId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove adjacency rules involving a stand
   * @param {number} standId - Stand ID
   * @param {Object} options - Options for the operation
   * @param {Object} options.user - User performing the operation
   * @param {Object} options.request - HTTP request object
   * @returns {Promise<Object>} - Result with removed counts
   */
  async removeAdjacencyRulesForStand(standId, options = {}) {
    const trx = await transaction.start(StandAdjacencyRule.knex());
    
    try {
      // Get all adjacency rules involving this stand
      const rules = await StandAdjacencyRule.query(trx)
        .where('primary_stand_id', standId)
        .orWhere('adjacent_stand_id', standId);
      
      if (rules.length === 0) {
        await trx.commit();
        return { removed: 0, message: 'No adjacency rules found' };
      }
      
      // Create copies for audit trail
      const removedRules = [...rules];
      
      // Delete the rules
      const deleteResult = await StandAdjacencyRule.query(trx)
        .where('primary_stand_id', standId)
        .orWhere('adjacent_stand_id', standId)
        .delete();
      
      // Create audit log entries for each rule
      for (const rule of removedRules) {
        await AuditService.logChange({
          entityType: 'stand_adjacency_rule',
          entityId: rule.id,
          action: 'delete',
          previousState: rule,
          newState: null,
          user: options.user,
          request: options.request,
          notes: `Automatically removed due to stand ${standId} deletion`,
          transaction: trx
        });
      }
      
      await trx.commit();
      
      return { 
        removed: rules.length,
        rules: removedRules.map(rule => ({
          id: rule.id,
          primary_stand_id: rule.primary_stand_id,
          adjacent_stand_id: rule.adjacent_stand_id
        })),
        message: `Successfully removed ${rules.length} adjacency rules`
      };
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
      logger.error(`Error removing adjacency rules for stand ${standId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle all cascade operations for stand deletion
   * @param {number} standId - Stand ID
   * @param {Object} options - Options for the operation
   * @param {Object} options.user - User performing the operation
   * @param {Object} options.request - HTTP request object
   * @param {boolean} options.softDelete - Whether this is a soft delete
   * @param {boolean} options.cancelActiveMaintenanceOrFail - Whether to attempt to cancel active maintenance or fail
   * @param {string} options.reason - Reason for cancellation/deletion
   * @returns {Promise<Object>} - Result with operation details
   */
  async handleStandDeletionCascade(standId, options = {}) {
    // First get all dependencies to check if cascade is possible
    const dependencies = await this.getStandDependencies(standId);
    
    // If there's active maintenance and we shouldn't cancel it, fail
    if (dependencies.hasActiveDependencies && !options.cancelActiveMaintenanceOrFail) {
      throw new Error(`Cannot delete stand ${standId} with active maintenance. Cancel the maintenance first or use cancelActiveMaintenanceOrFail=true.`);
    }
    
    // Begin cascade operations
    const result = {
      maintenance: null,
      adjacencyRules: null
    };
    
    // Cancel maintenance requests
    result.maintenance = await this.cancelMaintenanceForStand(standId, {
      ...options,
      skipActive: !options.cancelActiveMaintenanceOrFail
    });
    
    // Remove adjacency rules
    result.adjacencyRules = await this.removeAdjacencyRulesForStand(standId, options);
    
    return {
      result,
      message: `Successfully handled cascade operations for stand ${standId}`
    };
  }
}

module.exports = new CascadeDeleteService();