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
    const { default_gap_minutes, operating_start_time, operating_end_time } = req.body;
    
    // Validate required fields
    if (default_gap_minutes === undefined) {
      return res.status(400).json({ 
        error: true, 
        message: 'default_gap_minutes is required' 
      });
    }
    
    if (!operating_start_time || !operating_end_time) {
      return res.status(400).json({ 
        error: true, 
        message: 'operating_start_time and operating_end_time are required' 
      });
    }
    
    // Validate that default_gap_minutes is a positive integer
    if (default_gap_minutes <= 0 || !Number.isInteger(default_gap_minutes)) {
      return res.status(400).json({ 
        error: true, 
        message: 'default_gap_minutes must be a positive integer' 
      });
    }
    
    // Validate time format (HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(operating_start_time) || !timeRegex.test(operating_end_time)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Time values must be in HH:MM:SS format' 
      });
    }
    
    const updatedSettings = await configService.updateOperationalSettings({
      default_gap_minutes,
      operating_start_time,
      operating_end_time
    });
    
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

// Get turnaround rule by aircraft type ID
router.get('/turnaround-rules/aircraft-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await configService.getTurnaroundRuleByAircraftType(id);
    
    if (!rule) {
      return res.status(404).json({ 
        error: true, 
        message: 'Turnaround rule not found for this aircraft type' 
      });
    }
    
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Create a new turnaround rule
router.post('/turnaround-rules', async (req, res, next) => {
  try {
    const { aircraft_type_id, min_turnaround_minutes } = req.body;
    
    // Validate required fields
    if (!aircraft_type_id || min_turnaround_minutes === undefined) {
      return res.status(400).json({ 
        error: true, 
        message: 'aircraft_type_id and min_turnaround_minutes are required' 
      });
    }
    
    // Validate that min_turnaround_minutes is a positive integer
    if (min_turnaround_minutes <= 0 || !Number.isInteger(min_turnaround_minutes)) {
      return res.status(400).json({ 
        error: true, 
        message: 'min_turnaround_minutes must be a positive integer' 
      });
    }
    
    try {
      const newRule = await configService.createTurnaroundRule({
        aircraft_type_id,
        min_turnaround_minutes
      });
      
      res.status(201).json(newRule);
    } catch (error) {
      if (error.message.includes('exists for this aircraft type')) {
        return res.status(409).json({ error: true, message: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: true, message: error.message });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Update a turnaround rule
router.put('/turnaround-rules/aircraft-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { min_turnaround_minutes } = req.body;
    
    // Validate required fields
    if (min_turnaround_minutes === undefined) {
      return res.status(400).json({ 
        error: true, 
        message: 'min_turnaround_minutes is required' 
      });
    }
    
    // Validate that min_turnaround_minutes is a positive integer
    if (min_turnaround_minutes <= 0 || !Number.isInteger(min_turnaround_minutes)) {
      return res.status(400).json({ 
        error: true, 
        message: 'min_turnaround_minutes must be a positive integer' 
      });
    }
    
    try {
      const updatedRule = await configService.updateTurnaroundRule(id, {
        min_turnaround_minutes
      });
      
      res.json(updatedRule);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: true, message: error.message });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Delete a turnaround rule
router.delete('/turnaround-rules/aircraft-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deletedCount = await configService.deleteTurnaroundRule(id);
    
    if (deletedCount === 0) {
      return res.status(404).json({ 
        error: true, 
        message: 'Turnaround rule not found for this aircraft type' 
      });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 