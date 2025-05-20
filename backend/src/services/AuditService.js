/**
 * AuditService.js
 * 
 * Service for tracking entity changes for audit purposes.
 * This service handles the creation of change log entries whenever
 * entities are created, updated, or deleted in the system.
 */

const EntityChangeLog = require('../models/EntityChangeLog');
const logger = require('../utils/logger');
const _ = require('lodash');

class AuditService {
  /**
   * Log a change to an entity
   * @param {Object} options - Options for the change log
   * @param {string} options.entityType - Type of entity (e.g., 'stand', 'maintenance_request')
   * @param {string|number} options.entityId - ID of the entity
   * @param {string} options.action - Action performed ('create', 'update', 'delete')
   * @param {Object} options.previousState - State before the change (for updates/deletes)
   * @param {Object} options.newState - State after the change (for creates/updates)
   * @param {Object} options.user - User who made the change
   * @param {Object} options.request - Express request object for IP/agent info
   * @param {string} options.notes - Any additional notes about the change
   * @param {Object} options.transaction - Transaction object for Knex transactions
   * @returns {Promise<EntityChangeLog>} The created log entry
   */
  async logChange({ 
    entityType, 
    entityId, 
    action, 
    previousState = null, 
    newState = null,
    user = null,
    request = null,
    notes = null,
    transaction = null
  }) {
    try {
      // Calculate changed fields for update actions
      let changedFields = null;
      if (action === 'update' && previousState && newState) {
        changedFields = this.getChangedFields(previousState, newState);
      }
      
      // Build the log entry
      const logEntry = {
        entity_type: entityType,
        entity_id: entityId,
        action,
        previous_state: previousState,
        new_state: newState,
        changed_fields: changedFields,
        user_id: user?.id || null,
        user_name: user?.name || user?.email || null,
        ip_address: request?.ip || null,
        user_agent: request?.headers?.['user-agent'] || null,
        timestamp: new Date().toISOString(),
        notes
      };
      
      // Create the log entry
      const query = EntityChangeLog.query(transaction);
      const createdLog = await query.insert(logEntry);
      
      logger.info(`Audit log created for ${action} on ${entityType} ${entityId}`, {
        entity_type: entityType,
        entity_id: entityId,
        action,
        user_id: logEntry.user_id
      });
      
      return createdLog;
    } catch (error) {
      // Only log the error - don't fail the main operation if audit logging fails
      logger.error(`Failed to create audit log for ${action} on ${entityType} ${entityId}: ${error.message}`, { 
        error,
        entity_type: entityType,
        entity_id: entityId
      });
      
      // Return null instead of throwing to allow the main operation to continue
      return null;
    }
  }
  
  /**
   * Get a list of changed fields between two states
   * @param {Object} previousState - State before the change
   * @param {Object} newState - State after the change
   * @returns {Array} Array of changed field names
   */
  getChangedFields(previousState, newState) {
    if (!previousState || !newState) {
      return [];
    }
    
    const changedFields = [];
    
    // Get all keys from both objects
    const allKeys = [...new Set([...Object.keys(previousState), ...Object.keys(newState)])];
    
    for (const key of allKeys) {
      // Skip timestamp-related fields often updated automatically
      if (key === 'updated_at' || key === 'created_at') continue;
      
      const previousValue = previousState[key];
      const newValue = newState[key];
      
      // Check if value is present in one object but not the other
      if (
        (previousValue === undefined && newValue !== undefined) || 
        (previousValue !== undefined && newValue === undefined)
      ) {
        changedFields.push(key);
        continue;
      }
      
      // Compare values, handling special case for nested objects
      if (typeof previousValue === 'object' && typeof newValue === 'object') {
        // Check if they're different by doing a deep comparison
        if (!_.isEqual(previousValue, newValue)) {
          changedFields.push(key);
        }
      } else if (previousValue !== newValue) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }
  
  /**
   * Get audit logs for an entity
   * @param {string} entityType - Type of entity
   * @param {string|number} entityId - ID of the entity
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<EntityChangeLog>>} Array of log entries
   */
  async getEntityChangeLogs(entityType, entityId, options = {}) {
    try {
      return await EntityChangeLog.getChangesByEntityId(entityType, entityId, options);
    } catch (error) {
      logger.error(`Failed to get audit logs for ${entityType} ${entityId}: ${error.message}`, {
        error,
        entity_type: entityType,
        entity_id: entityId
      });
      throw error;
    }
  }
  
  /**
   * Get latest change log for an entity
   * @param {string} entityType - Type of entity
   * @param {string|number} entityId - ID of the entity
   * @returns {Promise<EntityChangeLog|null>} The latest log entry or null
   */
  async getLatestChangeLog(entityType, entityId) {
    try {
      return await EntityChangeLog.getLatestChange(entityType, entityId);
    } catch (error) {
      logger.error(`Failed to get latest audit log for ${entityType} ${entityId}: ${error.message}`, {
        error,
        entity_type: entityType,
        entity_id: entityId
      });
      throw error;
    }
  }
  
  /**
   * Get summary of changes for reporting purposes
   * @param {Object} filters - Filter criteria for logs
   * @returns {Promise<Object>} Summary statistics
   */
  async getChangeSummary(filters = {}) {
    try {
      let query = EntityChangeLog.query();
      
      // Apply filters if provided
      if (filters.entityType) {
        query = query.where('entity_type', filters.entityType);
      }
      
      if (filters.action) {
        query = query.where('action', filters.action);
      }
      
      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }
      
      if (filters.startDate && filters.endDate) {
        query = query.whereBetween('timestamp', [filters.startDate, filters.endDate]);
      }
      
      // Group by entity_type and action, and count
      const results = await query
        .select('entity_type', 'action')
        .count('* as count')
        .groupBy('entity_type', 'action');
      
      // Transform into a more usable structure
      const summary = {
        totalChanges: 0,
        byEntityType: {},
        byAction: {
          create: 0,
          update: 0,
          delete: 0
        }
      };
      
      for (const result of results) {
        const count = parseInt(result.count, 10);
        summary.totalChanges += count;
        
        // Add to entity type summary
        if (!summary.byEntityType[result.entity_type]) {
          summary.byEntityType[result.entity_type] = {
            total: 0,
            create: 0,
            update: 0,
            delete: 0
          };
        }
        
        summary.byEntityType[result.entity_type].total += count;
        summary.byEntityType[result.entity_type][result.action] += count;
        
        // Add to action summary
        summary.byAction[result.action] += count;
      }
      
      return summary;
    } catch (error) {
      logger.error(`Failed to get change summary: ${error.message}`, { error });
      throw error;
    }
  }
}

module.exports = new AuditService();