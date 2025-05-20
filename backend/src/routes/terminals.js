const express = require('express');
const router = express.Router();
const TerminalService = require('../services/TerminalService');
const { ValidationError } = require('../middleware/errorHandler');

// Get all terminals
router.get('/', async (req, res, next) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      sortBy = 'name',
      sortOrder = 'asc',
      includeRelations = true,
      includePierCount = true,
      includeStandCount = true
    } = req.query;

    const terminals = await TerminalService.getAllTerminals({
      includeRelations: includeRelations === 'true',
      includePierCount: includePierCount === 'true',
      includeStandCount: includeStandCount === 'true',
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc'
    });
    
    res.json(terminals);
  } catch (error) {
    next(error);
  }
});

// Search terminals and piers
router.get('/search/:term', async (req, res, next) => {
  try {
    const { term } = req.params;
    const { limit = 20 } = req.query;
    
    const results = await TerminalService.search(term, {
      limit: parseInt(limit, 10)
    });
    
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Get a terminal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeRelations = true } = req.query;
    
    const terminal = await TerminalService.getTerminalById(
      id,
      includeRelations === 'true'
    );
    
    res.json(terminal);
  } catch (error) {
    next(error);
  }
});

// Create a new terminal
router.post('/', async (req, res, next) => {
  try {
    const terminalData = req.body;
    
    // Validate data
    if (!terminalData.name || !terminalData.code) {
      throw new ValidationError('Name and code are required');
    }
    
    const newTerminal = await TerminalService.createTerminal(terminalData);
    
    res.status(201).json(newTerminal);
  } catch (error) {
    next(error);
  }
});

// Update a terminal
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const terminalData = req.body;
    
    const updatedTerminal = await TerminalService.updateTerminal(id, terminalData);
    
    res.json(updatedTerminal);
  } catch (error) {
    next(error);
  }
});

// Delete a terminal
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;
    
    await TerminalService.deleteTerminal(id, force === 'true');
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// -- Pier Routes --

// Get all piers
router.get('/piers/all', async (req, res, next) => {
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

// Get piers by terminal ID
router.get('/:terminalId/piers', async (req, res, next) => {
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

// Get a pier by ID
router.get('/piers/:id', async (req, res, next) => {
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

// Create a new pier
router.post('/piers', async (req, res, next) => {
  try {
    const pierData = req.body;
    
    // Validate data
    if (!pierData.name || !pierData.code || !pierData.terminal_id) {
      throw new ValidationError('Name, code, and terminal_id are required');
    }
    
    const newPier = await TerminalService.createPier(pierData);
    
    res.status(201).json(newPier);
  } catch (error) {
    next(error);
  }
});

// Create a pier within a specific terminal
router.post('/:terminalId/piers', async (req, res, next) => {
  try {
    const { terminalId } = req.params;
    const pierData = req.body;
    
    // Add terminal ID to pier data
    pierData.terminal_id = terminalId;
    
    // Validate data
    if (!pierData.name || !pierData.code) {
      throw new ValidationError('Name and code are required');
    }
    
    const newPier = await TerminalService.createPier(pierData);
    
    res.status(201).json(newPier);
  } catch (error) {
    next(error);
  }
});

// Update a pier
router.put('/piers/:id', async (req, res, next) => {
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
router.delete('/piers/:id', async (req, res, next) => {
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