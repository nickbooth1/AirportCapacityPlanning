/**
 * Autonomous Operations Routes
 * 
 * This file defines the routes for autonomous operations in the AirportAI system.
 */

const express = require('express');
const router = express.Router();
const autonomousOperationsController = require('../controllers/AutonomousOperationsController');
const auth = require('../middleware/auth');

// Policy routes
router.get('/policies', auth, (req, res) => autonomousOperationsController.getPolicies(req, res));
router.post('/policies', auth, (req, res) => autonomousOperationsController.createPolicy(req, res));
router.put('/policies/:policyId', auth, (req, res) => autonomousOperationsController.updatePolicy(req, res));

// Decision routes
router.get('/decisions/queue', auth, (req, res) => autonomousOperationsController.getDecisionQueue(req, res));
router.get('/decisions/history', auth, (req, res) => autonomousOperationsController.getDecisionHistory(req, res));
router.get('/decisions/:decisionId', auth, (req, res) => autonomousOperationsController.getDecision(req, res));
router.post('/decisions', auth, (req, res) => autonomousOperationsController.createDecision(req, res));
router.post('/decisions/:decisionId/approve', auth, (req, res) => autonomousOperationsController.approveDecision(req, res));
router.post('/decisions/:decisionId/reject', auth, (req, res) => autonomousOperationsController.rejectDecision(req, res));

// Metrics routes
router.get('/metrics', auth, (req, res) => autonomousOperationsController.getOperationalMetrics(req, res));

module.exports = router;