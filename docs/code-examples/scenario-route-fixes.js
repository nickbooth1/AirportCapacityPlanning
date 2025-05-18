/**
 * Example of fixed route handler implementation for scenarios.js
 * 
 * This demonstrates how to properly wrap class methods when using with Express
 */

const express = require('express');
const router = express.Router();
const scenarioController = require('../../../controllers/agent/ScenarioController');
const auth = require('../../../middleware/auth');

/**
 * Create a new scenario
 * @swagger
 * /api/agent/scenarios:
 *   post:
 *     summary: Create a new scenario
 */
router.post('/', auth, (req, res) => {
  return scenarioController.createScenario(req, res);
});

/**
 * Get scenario details
 * @swagger
 * /api/agent/scenarios/{scenarioId}:
 *   get:
 *     summary: Get scenario details
 */
router.get('/:scenarioId', auth, (req, res) => {
  return scenarioController.getScenario(req, res);
});

/**
 * Update scenario parameters
 * @swagger
 * /api/agent/scenarios/{scenarioId}:
 *   put:
 *     summary: Update scenario parameters
 */
router.put('/:scenarioId', auth, (req, res) => {
  return scenarioController.updateScenario(req, res);
});

/**
 * List saved scenarios
 * @swagger
 * /api/agent/scenarios:
 *   get:
 *     summary: List saved scenarios
 */
router.get('/', auth, (req, res) => {
  return scenarioController.listScenarios(req, res);
});

/**
 * Calculate the results for a scenario
 * @swagger
 * /api/agent/scenarios/{scenarioId}/calculate:
 *   post:
 *     summary: Calculate the results for a scenario
 */
router.post('/:scenarioId/calculate', auth, (req, res) => {
  return scenarioController.calculateScenario(req, res);
});

/**
 * Get the status and results of a scenario calculation
 * @swagger
 * /api/agent/scenarios/{scenarioId}/calculations/{calculationId}:
 *   get:
 *     summary: Get the status and results of a scenario calculation
 */
router.get('/:scenarioId/calculations/:calculationId', auth, (req, res) => {
  return scenarioController.getCalculation(req, res);
});

/**
 * Compare multiple scenarios
 * @swagger
 * /api/agent/scenarios/compare:
 *   post:
 *     summary: Compare multiple scenarios
 */
router.post('/compare', auth, (req, res) => {
  return scenarioController.compareScenarios(req, res);
});

/**
 * Get scenario comparison results
 * @swagger
 * /api/agent/scenarios/comparisons/{comparisonId}:
 *   get:
 *     summary: Get scenario comparison results
 */
router.get('/comparisons/:comparisonId', auth, (req, res) => {
  return scenarioController.getComparison(req, res);
});

/**
 * List scenario templates
 * @swagger
 * /api/agent/scenarios/templates:
 *   get:
 *     summary: List scenario templates
 */
router.get('/templates', auth, (req, res) => {
  return scenarioController.listTemplates(req, res);
});

/**
 * Get template details
 * @swagger
 * /api/agent/scenarios/templates/{templateId}:
 *   get:
 *     summary: Get template details
 */
router.get('/templates/:templateId', auth, (req, res) => {
  return scenarioController.getTemplate(req, res);
});

/**
 * Create a scenario from template
 * @swagger
 * /api/agent/scenarios/templates/{templateId}/create:
 *   post:
 *     summary: Create a scenario from template
 */
router.post('/templates/:templateId/create', auth, (req, res) => {
  return scenarioController.createFromTemplate(req, res);
});

module.exports = router;