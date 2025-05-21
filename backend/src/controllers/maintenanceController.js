const maintenanceRequestService = require('../services/maintenanceRequestService');
const maintenanceApprovalService = require('../services/maintenanceApprovalService');
const maintenanceCapacityService = require('../services/maintenanceCapacityIntegrationService');
const maintenanceService = require('../services/maintenanceService');
const notificationService = require('../services/notificationService');

// Maintenance Requests
exports.getAllRequests = async (req, res, next) => {
  try {
    // Extract pagination parameters
    const { 
      limit = 20, 
      offset = 0, 
      includePagination = true,
      ...filterParams 
    } = req.query;
    
    // Convert limit and offset to integers
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);
    
    // Process array parameters that might come as strings
    if (filterParams.status && typeof filterParams.status === 'string') {
      filterParams.status = filterParams.status.split(',').map(s => parseInt(s.trim(), 10));
    }
    
    if (filterParams.standIds && typeof filterParams.standIds === 'string') {
      filterParams.standIds = filterParams.standIds.split(',').map(s => s.trim());
    }
    
    if (filterParams.priority && typeof filterParams.priority === 'string') {
      filterParams.priority = filterParams.priority.split(',').map(s => s.trim());
    }
    
    // Add pagination params if pagination is enabled
    const filters = {
      ...filterParams,
      limit: includePagination === 'true' ? parsedLimit : undefined,
      offset: includePagination === 'true' ? parsedOffset : undefined
    };
    
    // Get requests with applied filters
    const requests = await maintenanceRequestService.getAllRequests(filters);
    
    // Add pagination metadata if requested
    if (includePagination === 'true') {
      // Get total count for pagination
      const count = await maintenanceRequestService.getRequestCount(filterParams);
      
      // Calculate pagination metadata
      const page = Math.floor(parsedOffset / parsedLimit) + 1;
      const totalPages = Math.ceil(count / parsedLimit);
      
      res.json({
        data: requests,
        pagination: {
          total: count,
          page,
          limit: parsedLimit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } else {
      // Just return the requests without pagination metadata
      res.json(requests);
    }
  } catch (error) {
    next(error);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const request = await maintenanceRequestService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    res.json(request);
  } catch (error) {
    next(error);
  }
};

exports.getRequestsByStand = async (req, res, next) => {
  try {
    const standId = req.params.standId;
    const { 
      limit = 20, 
      offset = 0, 
      includePagination = true,
      ...filterParams 
    } = req.query;
    
    // Combine stand ID with other filters
    const filters = {
      ...filterParams,
      standId,
      limit: includePagination === 'true' ? parseInt(limit, 10) : undefined,
      offset: includePagination === 'true' ? parseInt(offset, 10) : undefined
    };
    
    // Get requests with applied filters
    const requests = await maintenanceRequestService.getAllRequests(filters);
    
    // Add pagination metadata if requested
    if (includePagination === 'true') {
      // Get total count for pagination
      const count = await maintenanceRequestService.getRequestCount({ standId, ...filterParams });
      
      // Calculate pagination metadata
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);
      const page = Math.floor(parsedOffset / parsedLimit) + 1;
      const totalPages = Math.ceil(count / parsedLimit);
      
      res.json({
        data: requests,
        pagination: {
          total: count,
          page,
          limit: parsedLimit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } else {
      // Just return the requests without pagination metadata
      res.json(requests);
    }
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    // Get user info from auth or use default for now
    const user = req.user || { id: 'system', name: 'System' };
    
    // Pass request data, user, and request object
    const request = await maintenanceRequestService.createRequest(req.body, {
      user,
      request: req
    });
    
    // Send notification
    try {
      await notificationService.sendMaintenanceRequestNotification(request.id, 'created');
    } catch (notificationError) {
      console.error('Failed to send creation notification:', notificationError);
    }
    
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

exports.updateRequest = async (req, res, next) => {
  try {
    // Get user info from auth or use default for now
    const user = req.user || { id: 'system', name: 'System' };
    
    // Extract If-Match header for optimistic concurrency control
    const modifiedAt = req.headers['if-match'];
    
    // Pass request data, user, and request object
    const request = await maintenanceRequestService.updateRequest(
      req.params.id, 
      req.body,
      {
        user,
        request: req,
        modifiedAt
      }
    );
    
    // Send notification
    try {
      await notificationService.sendMaintenanceRequestNotification(request.id, 'updated');
    } catch (notificationError) {
      console.error('Failed to send update notification:', notificationError);
    }
    
    // Set ETag header for next update
    res.set('ETag', new Date(request.updated_at).getTime().toString());
    res.json(request);
  } catch (error) {
    next(error);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status_id, comment } = req.body;
    
    if (!status_id) {
      return res.status(400).json({ message: 'status_id is required' });
    }
    
    // Update the status using the approval service which handles validation
    await maintenanceApprovalService.updateRequestStatus(id, status_id);
    
    const updatedRequest = await maintenanceRequestService.getRequestById(id);

    // Add a system comment if provided
    if (comment) {
      await maintenanceApprovalService.createApproval({
        maintenance_request_id: id,
        approver_name: 'System',
        approver_email: 'system@airport.com',
        approver_department: 'Maintenance System',
        is_approved: updatedRequest.status_id === 2, // Match approval state
        comments: `Status changed to ${updatedRequest.status.name}: ${comment}`
      }, false); // Pass false to skip status update again
    }
    
    // Send notification
    try {
      let eventType = 'updated';
      if (updatedRequest.status_id === 5) { // Completed
        eventType = 'completed';
      } else if (updatedRequest.status_id === 6) { // Cancelled
        eventType = 'cancelled';
      }
      await notificationService.sendMaintenanceRequestNotification(id, eventType);
    } catch (notificationError) {
      console.error('Failed to send status update notification:', notificationError);
    }
    
    res.json(updatedRequest);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a maintenance request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.cancelRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Get user info from auth or use default
    const user = req.user || { id: 'system', name: 'System' };
    
    // Get the current request to check if it can be cancelled
    const request = await maintenanceRequestService.getRequestById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    
    // Check if request is already cancelled or completed
    if (request.status_id === 5) { // Completed
      return res.status(400).json({ 
        message: 'Cannot cancel a completed maintenance request',
        currentStatus: request.status.name
      });
    }
    
    if (request.status_id === 6) { // Already cancelled
      return res.status(400).json({ 
        message: 'Request is already cancelled',
        currentStatus: request.status.name
      });
    }
    
    // Update to cancelled status
    await maintenanceApprovalService.updateRequestStatus(id, 6);
    
    // Add cancellation reason as approval/comment
    await maintenanceApprovalService.createApproval({
      maintenance_request_id: id,
      approver_name: user.name,
      approver_email: user.email || 'user@airport.com',
      approver_department: user.department || 'Airport Operations',
      is_approved: false,
      comments: `Request cancelled: ${reason || 'No reason provided'}`
    }, false); // Pass false to skip status update again
    
    // Get the updated request
    const updatedRequest = await maintenanceRequestService.getRequestById(id);
    
    // Send cancellation notification
    try {
      await notificationService.sendMaintenanceRequestNotification(id, 'cancelled');
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
    }
    
    res.json({
      ...updatedRequest,
      message: 'Maintenance request cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Maintenance Status Types
exports.getAllStatusTypes = async (req, res, next) => {
  try {
    const statusTypes = await maintenanceRequestService.getAllStatusTypes();
    res.json(statusTypes);
  } catch (error) {
    next(error);
  }
};

// Maintenance Approvals
exports.getApprovalsByRequest = async (req, res, next) => {
  try {
    const approvals = await maintenanceApprovalService.getApprovalsByRequest(req.params.requestId);
    res.json(approvals);
  } catch (error) {
    next(error);
  }
};

exports.createApproval = async (req, res, next) => {
  try {
    const approval = await maintenanceApprovalService.createApproval(req.body);
    // Send notification based on approval status
    try {
      const eventType = req.body.is_approved ? 'approved' : 'rejected';
      await notificationService.sendMaintenanceRequestNotification(req.body.maintenance_request_id, eventType);
    } catch (notificationError) {
      console.error('Failed to send approval notification:', notificationError);
    }
    res.status(201).json(approval);
  } catch (error) {
    next(error);
  }
};

// Calendar & Impact
exports.getCalendarData = async (req, res, next) => {
  try {
    const calendarEvents = await maintenanceRequestService.getCalendarData(req.query);
    res.json(calendarEvents);
  } catch (error) {
    next(error);
  }
};

exports.getCapacityImpact = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both startDate and endDate are required' });
    }
    const impact = await maintenanceService.getAggregatedCapacityImpact({
      startDate,
      endDate
    });
    res.json(impact);
  } catch (error) {
    next(error);
  }
};

/**
 * Get capacity impact for a specific maintenance request
 * This endpoint calculates how a maintenance request affects stand capacity
 */
exports.getRequestCapacityImpact = async (req, res, next) => {
  try {
    let { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate UUID format if applicable
    // Note: Depends on your ID format, adjust as needed
    if (id.length === 36) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(id)) {
        // Try to format the ID if it doesn't have dashes but is the right length
        if (/^[0-9a-f]{32}$/i.test(id)) {
          id = `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
        } else {
          return res.status(400).json({ message: 'Invalid request ID format.' });
        }
      }
    }
    
    const impactAnalysis = await maintenanceService.getCapacityImpact(id, {
      startDate,
      endDate
    });
    
    res.json(impactAnalysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stands that are unavailable due to maintenance during a specific time period
 */
exports.getUnavailableStands = async (req, res, next) => {
  try {
    const { startDate, endDate, standIds } = req.query;
    
    // Parse standIds if provided
    let parsedStandIds = null;
    if (standIds) {
      parsedStandIds = standIds.split(',').map(id => id.trim());
    }
    
    const unavailableStands = await maintenanceService.getUnavailableStands({
      startDate,
      endDate,
      standIds: parsedStandIds
    });
    
    res.json(unavailableStands);
  } catch (error) {
    next(error);
  }
};

// Recurring Maintenance (Add later if needed)
/*
exports.getAllRecurringSchedules = async (req, res, next) => { ... };
exports.createRecurringSchedule = async (req, res, next) => { ... };
exports.getRecurringScheduleById = async (req, res, next) => { ... };
exports.updateRecurringSchedule = async (req, res, next) => { ... };
exports.deactivateRecurringSchedule = async (req, res, next) => { ... };
exports.triggerRecurringGeneration = async (req, res, next) => { ... };
*/ 