const express = require('express');
const router = express.Router();
const configService = require('../services/configService');

// --- Operational Settings Endpoints ---

// Get operational settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await configService.getOperationalSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update operational settings
router.put('/settings', async (req, res, next) => {
  try {
    const updatedSettings = await configService.updateOperationalSettings(req.body);
    res.json(updatedSettings);
  } catch (error) {
    next(error);
  }
});

// --- Turnaround Rules Endpoints ---

// Get all turnaround rules
router.get('/turnaround-rules', async (req, res, next) => {
  try {
    const rules = await configService.getTurnaroundRules();
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

// Get a turnaround rule by aircraft type ID
router.get('/turnaround-rules/:aircraftTypeId', async (req, res, next) => {
  try {
    const { aircraftTypeId } = req.params;
    const rule = await configService.getTurnaroundRuleByAircraftTypeId(parseInt(aircraftTypeId, 10));
    
    if (!rule) {
      return res.status(404).json({ message: 'Turnaround rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Create a new turnaround rule
router.post('/turnaround-rules', async (req, res, next) => {
  try {
    const newRule = await configService.createTurnaroundRule(req.body);
    res.status(201).json(newRule);
  } catch (error) {
    next(error);
  }
});

// Update a turnaround rule
router.put('/turnaround-rules/:aircraftTypeId', async (req, res, next) => {
  try {
    const { aircraftTypeId } = req.params;
    const updatedRule = await configService.updateTurnaroundRule(parseInt(aircraftTypeId, 10), req.body);
    res.json(updatedRule);
  } catch (error) {
    next(error);
  }
});

// Delete a turnaround rule
router.delete('/turnaround-rules/:aircraftTypeId', async (req, res, next) => {
  try {
    const { aircraftTypeId } = req.params;
    await configService.deleteTurnaroundRule(parseInt(aircraftTypeId, 10));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// --- Time Slots Endpoints ---

// Get all time slots
router.get('/time-slots', async (req, res, next) => {
  try {
    const timeSlots = await configService.getTimeSlots();
    res.json(timeSlots);
  } catch (error) {
    next(error);
  }
});

// Get active time slots only
router.get('/time-slots/active', async (req, res, next) => {
  try {
    const timeSlots = await configService.getActiveTimeSlots();
    res.json(timeSlots);
  } catch (error) {
    next(error);
  }
});

// Get a specific time slot by ID
router.get('/time-slots/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const timeSlot = await configService.getTimeSlotById(parseInt(id, 10));
    res.json(timeSlot);
  } catch (error) {
    if (error.message === 'Time slot not found') {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    next(error);
  }
});

// Create a new time slot
router.post('/time-slots', async (req, res, next) => {
  try {
    const newTimeSlot = await configService.createTimeSlot(req.body);
    res.status(201).json(newTimeSlot);
  } catch (error) {
    if (error.message === 'A time slot with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'End time must be after start time') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Update a time slot
router.put('/time-slots/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedTimeSlot = await configService.updateTimeSlot(parseInt(id, 10), req.body);
    res.json(updatedTimeSlot);
  } catch (error) {
    if (error.message === 'Time slot not found') {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    if (error.message === 'A time slot with this name already exists') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'End time must be after start time') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Delete a time slot
router.delete('/time-slots/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await configService.deleteTimeSlot(parseInt(id, 10));
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Time slot not found') {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    next(error);
  }
});

module.exports = router; 