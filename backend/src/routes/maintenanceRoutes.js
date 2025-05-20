const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { validateMaintenanceRequestUpdate, validateETagForUpdate } = require('../middleware/updateValidationMiddleware');

// Maintenance requests routes
router.get('/requests', maintenanceController.getAllRequests);
router.post('/requests', maintenanceController.createRequest);

// Specific routes must come before wildcard routes
router.get('/requests/stand/:standId', maintenanceController.getRequestsByStand);

// Request-specific capacity impact route
router.get('/requests/:id/capacity-impact', maintenanceController.getRequestCapacityImpact);

// Request-specific routes with ID
router.get('/requests/:id', maintenanceController.getRequestById);
router.put('/requests/:id', validateETagForUpdate, validateMaintenanceRequestUpdate, maintenanceController.updateRequest);
router.put('/requests/:id/status', validateETagForUpdate, maintenanceController.updateRequestStatus);
router.post('/requests/:id/cancel', maintenanceController.cancelRequest);

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