const maintenanceRequestService = require('../services/maintenanceRequestService');
const maintenanceApprovalService = require('../services/maintenanceApprovalService');
const maintenanceCapacityService = require('../services/maintenanceCapacityIntegrationService');
const notificationService = require('../services/notificationService');

// Maintenance Requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const requests = await maintenanceRequestService.getAllRequests(req.query);
    res.json(requests);
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
    const requests = await maintenanceRequestService.getRequestsByStand(req.params.standId);
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const request = await maintenanceRequestService.createRequest(req.body);
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
    const request = await maintenanceRequestService.updateRequest(req.params.id, req.body);
    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }
    // Send notification
    try {
      await notificationService.sendMaintenanceRequestNotification(request.id, 'updated');
    } catch (notificationError) {
      console.error('Failed to send update notification:', notificationError);
    }
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
    const impact = await maintenanceCapacityService.calculateCapacityImpact(startDate, endDate);
    res.json(impact);
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