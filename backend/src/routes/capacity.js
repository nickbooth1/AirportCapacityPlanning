/**
 * Capacity Routes
 * Defines API endpoints for stand capacity calculations
 */
const express = require('express');
const router = express.Router();
const capacityController = require('../controllers/capacityController');
const standCapacityService = require('../services/standCapacityService');
const configService = require('../services/configService');

/**
 * @swagger
 * /api/capacity/calculate:
 *   get:
 *     summary: Calculate theoretical maximum stand capacity
 *     description: Returns the theoretical maximum capacity of stands based on turnaround times, aircraft size constraints, and operational settings
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for calculation (YYYY-MM-DD). Defaults to current date if not provided.
 *     responses:
 *       200:
 *         description: Capacity calculation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calculation_timestamp:
 *                   type: string
 *                   format: date-time
 *                 operating_day:
 *                   type: string
 *                   format: date
 *                 capacity_summary:
 *                   type: object
 *                 capacity_by_hour:
 *                   type: array
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
router.get('/calculate', capacityController.calculateCapacity);

/**
 * @swagger
 * /api/capacity/settings:
 *   get:
 *     summary: Get capacity calculation settings
 *     description: Returns the operational settings used for capacity calculations
 *     responses:
 *       200:
 *         description: Capacity settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slot_duration_minutes:
 *                   type: integer
 *                 slot_block_size:
 *                   type: integer
 *                 operating_start_time:
 *                   type: string
 *                 operating_end_time:
 *                   type: string
 *                 default_gap_minutes:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/settings', async (req, res, next) => {
  try {
    const configData = await configService.getCapacityConfigData();
    res.json(configData);
  } catch (error) {
    next(error);
  }
});

// Calculate stand capacity
router.get('/stand-capacity', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get capacity by time slot
router.get('/stand-capacity/by-time-slot', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date,
      organizationType: 'timeSlot'
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get capacity by aircraft type
router.get('/stand-capacity/by-aircraft-type', async (req, res, next) => {
  try {
    const options = {
      standIds: req.query.standIds ? req.query.standIds.split(',').map(id => parseInt(id, 10)) : undefined,
      timeSlotIds: req.query.timeSlotIds ? req.query.timeSlotIds.split(',').map(id => parseInt(id, 10)) : undefined,
      useDefinedTimeSlots: req.query.useDefinedTimeSlots === 'true',
      date: req.query.date,
      organizationType: 'aircraftType'
    };
    
    const result = await standCapacityService.calculateStandCapacity(options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 