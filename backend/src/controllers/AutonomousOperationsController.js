/**
 * Autonomous Operations Controller
 * 
 * This controller handles the HTTP endpoints for managing and monitoring
 * autonomous operations within the AirportAI system.
 */

const autonomousOperationsService = require('../services/agent/AutonomousOperationsService');
const logger = require('../utils/logger');

/**
 * Get all policies
 */
exports.getPolicies = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      decisionType: req.query.decisionType
    };
    
    const policies = await autonomousOperationsService.getPolicies(filters);
    
    return res.status(200).json({
      policies,
      total: policies.length
    });
  } catch (error) {
    logger.error(`Error getting policies: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve policies',
      message: error.message
    });
  }
};

/**
 * Create a new policy
 */
exports.createPolicy = async (req, res) => {
  try {
    const policy = req.body;
    
    // Validate required fields
    if (!policy.policyName || !policy.decisionType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Policy must include policyName and decisionType'
      });
    }
    
    // Register the policy
    const createdPolicy = await autonomousOperationsService.registerPolicy(policy);
    
    return res.status(201).json(createdPolicy);
  } catch (error) {
    logger.error(`Error creating policy: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to create policy',
      message: error.message
    });
  }
};

/**
 * Update an existing policy
 */
exports.updatePolicy = async (req, res) => {
  try {
    const { policyId } = req.params;
    const updates = req.body;
    
    // Update the policy
    const updatedPolicy = await autonomousOperationsService.updatePolicy(policyId, updates);
    
    return res.status(200).json(updatedPolicy);
  } catch (error) {
    logger.error(`Error updating policy: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to update policy',
      message: error.message
    });
  }
};

/**
 * Get the decision queue
 */
exports.getDecisionQueue = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      decisionType: req.query.decisionType,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    const decisions = await autonomousOperationsService.getDecisionQueue(filters);
    
    // Count urgent decisions (pending approval with tight deadlines)
    const urgentCount = decisions.filter(d => {
      if (d.status !== 'pending_approval') return false;
      
      if (!d.deadline) return false;
      
      const deadline = new Date(d.deadline);
      const now = new Date();
      const timeLeft = deadline - now;
      
      // Consider urgent if less than 1 hour until deadline
      return timeLeft < 60 * 60 * 1000;
    }).length;
    
    return res.status(200).json({
      decisions,
      total: decisions.length,
      urgentCount
    });
  } catch (error) {
    logger.error(`Error getting decision queue: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve decision queue',
      message: error.message
    });
  }
};

/**
 * Get decision history
 */
exports.getDecisionHistory = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      decisionType: req.query.decisionType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    const decisions = await autonomousOperationsService.getDecisionHistory(filters);
    
    return res.status(200).json({
      decisions,
      total: decisions.length
    });
  } catch (error) {
    logger.error(`Error getting decision history: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve decision history',
      message: error.message
    });
  }
};

/**
 * Get a specific decision
 */
exports.getDecision = async (req, res) => {
  try {
    const { decisionId } = req.params;
    
    const decision = await autonomousOperationsService.getDecision(decisionId);
    
    return res.status(200).json(decision);
  } catch (error) {
    logger.error(`Error getting decision: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve decision',
      message: error.message
    });
  }
};

/**
 * Create a new decision
 */
exports.createDecision = async (req, res) => {
  try {
    const decisionData = req.body;
    
    // Validate required fields
    if (!decisionData.decisionType || !decisionData.policyName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Decision must include decisionType and policyName'
      });
    }
    
    // Create the decision
    const decision = await autonomousOperationsService.createDecision(decisionData);
    
    return res.status(201).json(decision);
  } catch (error) {
    logger.error(`Error creating decision: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to create decision',
      message: error.message
    });
  }
};

/**
 * Approve a decision
 */
exports.approveDecision = async (req, res) => {
  try {
    const { decisionId } = req.params;
    const approvalData = {
      ...req.body,
      approvedBy: req.user?.username || 'unknown'
    };
    
    // Approve the decision
    const decision = await autonomousOperationsService.approveDecision(decisionId, approvalData);
    
    return res.status(200).json({
      decisionId: decision.decisionId,
      status: decision.status,
      approvedAt: decision.approvedAt,
      approvedBy: decision.approvedBy,
      executionStatus: decision.executionResults?.success ? 'succeeded' : 'failed',
      executionDetails: decision.executionResults
    });
  } catch (error) {
    logger.error(`Error approving decision: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to approve decision',
      message: error.message
    });
  }
};

/**
 * Reject a decision
 */
exports.rejectDecision = async (req, res) => {
  try {
    const { decisionId } = req.params;
    const rejectionData = {
      ...req.body,
      rejectedBy: req.user?.username || 'unknown'
    };
    
    // Reject the decision
    const decision = await autonomousOperationsService.rejectDecision(decisionId, rejectionData);
    
    return res.status(200).json({
      decisionId: decision.decisionId,
      status: decision.status,
      rejectedAt: decision.rejectedAt,
      rejectedBy: decision.rejectedBy,
      rejectionReason: decision.rejectionReason
    });
  } catch (error) {
    logger.error(`Error rejecting decision: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to reject decision',
      message: error.message
    });
  }
};

/**
 * Get operational metrics
 */
exports.getOperationalMetrics = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const metrics = await autonomousOperationsService.getOperationalMetrics(filters);
    
    return res.status(200).json(metrics);
  } catch (error) {
    logger.error(`Error getting operational metrics: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve operational metrics',
      message: error.message
    });
  }
};