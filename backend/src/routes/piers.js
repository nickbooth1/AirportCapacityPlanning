const express = require('express');
const router = express.Router();
const TerminalService = require('../services/TerminalService');
const { ValidationError } = require('../middleware/errorHandler');

// Get all piers
router.get('/', async (req, res, next) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      sortBy = 'name',
      sortOrder = 'asc',
      includeRelations = true,
      includeStandCount = true,
      terminalId = null
    } = req.query;

    const piers = await TerminalService.getAllPiers({
      includeRelations: includeRelations === 'true',
      includeStandCount: includeStandCount === 'true',
      terminalId: terminalId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc'
    });
    
    res.json(piers);
  } catch (error) {
    next(error);
  }
});

// Get a pier by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeRelations = true } = req.query;
    
    const pier = await TerminalService.getPierById(
      id,
      includeRelations === 'true'
    );
    
    res.json(pier);
  } catch (error) {
    next(error);
  }
});

// Get piers by terminal ID
router.get('/by-terminal/:terminalId', async (req, res, next) => {
  try {
    const { terminalId } = req.params;
    const { 
      includeRelations = true, 
      includeStandCount = true 
    } = req.query;
    
    const piers = await TerminalService.getAllPiers({
      terminalId,
      includeRelations: includeRelations === 'true',
      includeStandCount: includeStandCount === 'true'
    });
    
    res.json(piers);
  } catch (error) {
    next(error);
  }
});

// Create a new pier
router.post('/', async (req, res, next) => {
  try {
    const pierData = req.body;
    
    // Validate required fields
    if (!pierData.name || !pierData.code || !pierData.terminal_id) {
      throw new ValidationError('Name, code, and terminal_id are required');
    }
    
    const newPier = await TerminalService.createPier(pierData);
    
    res.status(201).json(newPier);
  } catch (error) {
    next(error);
  }
});

// Update a pier
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pierData = req.body;
    
    const updatedPier = await TerminalService.updatePier(id, pierData);
    
    res.json(updatedPier);
  } catch (error) {
    next(error);
  }
});

// Delete a pier
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;
    
    await TerminalService.deletePier(id, force === 'true');
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;