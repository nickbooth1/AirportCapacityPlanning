const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

// Maintenance requests routes
router.get('/requests', maintenanceController.getAllRequests);
router.post('/requests', maintenanceController.createRequest);
router.get('/requests/:id', maintenanceController.getRequestById);
router.put('/requests/:id', maintenanceController.updateRequest);
router.put('/requests/:id/status', maintenanceController.updateRequestStatus); // Added for status update
router.get('/requests/stand/:standId', maintenanceController.getRequestsByStand);

// Maintenance approvals routes
router.post('/approvals', maintenanceController.createApproval);
router.get('/approvals/request/:requestId', maintenanceController.getApprovalsByRequest);

// Status types routes
router.get('/status-types', maintenanceController.getAllStatusTypes);

// Calendar & Impact routes
router.get('/calendar', maintenanceController.getCalendarData);
router.get('/impact', maintenanceController.getCapacityImpact);

// Recurring Schedules routes (Add these later if needed)
// router.get('/recurring', maintenanceController.getAllRecurringSchedules);
// router.post('/recurring', maintenanceController.createRecurringSchedule);
// router.get('/recurring/:id', maintenanceController.getRecurringScheduleById);
// router.put('/recurring/:id', maintenanceController.updateRecurringSchedule);
// router.delete('/recurring/:id', maintenanceController.deactivateRecurringSchedule); // Using DELETE for deactivate
// router.post('/recurring/generate', maintenanceController.triggerRecurringGeneration); // Endpoint to manually trigger generation

module.exports = router; 