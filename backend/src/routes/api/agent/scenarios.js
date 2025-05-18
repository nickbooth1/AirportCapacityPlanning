const express = require('express');
const router = express.Router();
const scenarioController = require('../../../controllers/agent/ScenarioController');
const auth = require('../../../middleware/auth');

/**
 * @swagger
 * /api/agent/scenarios:
 *   post:
 *     summary: Create a new scenario
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 example: What if we add 3 more wide-body stands at Terminal 2?
 *               parameters:
 *                 type: object
 *                 example: { "terminal": "Terminal 2", "standType": "wide-body", "count": 3 }
 *               baselineId:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               title:
 *                 type: string
 *                 example: Add wide-body stands to T2
 *     responses:
 *       201:
 *         description: Scenario created successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, (req, res) => {
  return scenarioController.createScenario(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/{scenarioId}:
 *   get:
 *     summary: Get scenario details
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario details
 *       404:
 *         description: Scenario not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:scenarioId', auth, (req, res) => {
  return scenarioController.getScenario(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/{scenarioId}:
 *   put:
 *     summary: Update scenario parameters
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: Updated scenario description
 *               parameters:
 *                 type: object
 *                 example: { "terminal": "Terminal 2", "standType": "wide-body", "count": 5 }
 *               title:
 *                 type: string
 *                 example: Updated title
 *     responses:
 *       200:
 *         description: Scenario updated successfully
 *       404:
 *         description: Scenario not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:scenarioId', auth, (req, res) => {
  return scenarioController.updateScenario(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios:
 *   get:
 *     summary: List saved scenarios
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by scenario type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Pagination start
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of scenarios
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, (req, res) => {
  return scenarioController.listScenarios(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/{scenarioId}/calculate:
 *   post:
 *     summary: Calculate the results for a scenario
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               options:
 *                 type: object
 *                 properties:
 *                   compareWith:
 *                     type: string
 *                     example: 123e4567-e89b-12d3-a456-426614174000
 *                   timeHorizon:
 *                     type: string
 *                     enum: [day, week, month]
 *     responses:
 *       202:
 *         description: Calculation started
 *       404:
 *         description: Scenario not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:scenarioId/calculate', auth, (req, res) => {
  return scenarioController.calculateScenario(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/{scenarioId}/calculations/{calculationId}:
 *   get:
 *     summary: Get the status and results of a scenario calculation
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: calculationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Calculation status and results
 *       404:
 *         description: Calculation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:scenarioId/calculations/:calculationId', auth, (req, res) => {
  return scenarioController.getCalculation(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/compare:
 *   post:
 *     summary: Compare multiple scenarios
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scenarioIds
 *             properties:
 *               scenarioIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["scenario-id-1", "scenario-id-2"]
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["capacity", "utilization", "conflicts"]
 *               timeRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     example: "06:00"
 *                   end:
 *                     type: string
 *                     example: "22:00"
 *     responses:
 *       202:
 *         description: Comparison started
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/compare', auth, (req, res) => {
  return scenarioController.compareScenarios(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/comparisons/{comparisonId}:
 *   get:
 *     summary: Get scenario comparison results
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comparisonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comparison results
 *       404:
 *         description: Comparison not found
 *       401:
 *         description: Unauthorized
 */
router.get('/comparisons/:comparisonId', auth, (req, res) => {
  return scenarioController.getComparison(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/templates:
 *   get:
 *     summary: List scenario templates
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by template category
 *     responses:
 *       200:
 *         description: List of templates
 *       401:
 *         description: Unauthorized
 */
router.get('/templates', auth, (req, res) => {
  return scenarioController.listTemplates(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/templates/{templateId}:
 *   get:
 *     summary: Get template details
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized
 */
router.get('/templates/:templateId', auth, (req, res) => {
  return scenarioController.getTemplate(req, res);
});

/**
 * @swagger
 * /api/agent/scenarios/templates/{templateId}/create:
 *   post:
 *     summary: Create a scenario from template
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 example: My new scenario
 *               description:
 *                 type: string
 *                 example: Testing a scenario from template
 *               parameters:
 *                 type: object
 *                 example: { "terminal": "Terminal 2", "standCount": 5 }
 *     responses:
 *       201:
 *         description: Scenario created successfully
 *       404:
 *         description: Template not found
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/templates/:templateId/create', auth, (req, res) => {
  return scenarioController.createFromTemplate(req, res);
});

module.exports = router;