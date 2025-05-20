const express = require('express');
const router = express.Router();
const StandService = require('../services/StandService');
const { ValidationError } = require('../middleware/errorHandler');

// Get all stands with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      active, 
      pier_id,
      terminal_id,
      sortBy = 'name',
      sortOrder = 'asc',
      includeRelations = true
    } = req.query;
    
    // Build filter object
    const filter = {};
    if (active !== undefined) {
      filter.is_active = active === 'true';
    }
    if (pier_id) {
      filter.pier_id = parseInt(pier_id, 10);
    }
    
    // Handle special case for terminal_id filter
    if (terminal_id) {
      const stands = await StandService.getStandsByTerminalId(terminal_id);
      return res.json(stands);
    }
    
    // Get stands with filter options
    const stands = await StandService.getAllStands({
      includeRelations: includeRelations === 'true',
      filter,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc'
    });
    
    res.json(stands);
  } catch (error) {
    next(error);
  }
});

// Get a stand by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeRelations = true } = req.query;
    
    const stand = await StandService.getStandById(
      parseInt(id, 10),
      includeRelations === 'true'
    );
    
    res.json(stand);
  } catch (error) {
    next(error);
  }
});

// Get stands by pier ID
router.get('/by-pier/:pierId', async (req, res, next) => {
  try {
    const { pierId } = req.params;
    
    const stands = await StandService.getStandsByPierId(parseInt(pierId, 10));
    
    res.json(stands);
  } catch (error) {
    next(error);
  }
});

// Search stands by term
router.get('/search/:term', async (req, res, next) => {
  try {
    const { term } = req.params;
    const { 
      limit = 20, 
      includeInactive = false,
      terminal_id = null,
      pier_id = null
    } = req.query;
    
    const stands = await StandService.searchStands(term, {
      limit: parseInt(limit, 10),
      includeInactive: includeInactive === 'true',
      terminalId: terminal_id ? parseInt(terminal_id, 10) : null,
      pierId: pier_id ? parseInt(pier_id, 10) : null
    });
    
    res.json(stands);
  } catch (error) {
    next(error);
  }
});

// Create a new stand
router.post('/', async (req, res, next) => {
  try {
    const standData = req.body;
    
    // Convert string values to appropriate types
    if (standData.pier_id) standData.pier_id = parseInt(standData.pier_id, 10);
    if (standData.is_active !== undefined) {
      standData.is_active = standData.is_active === true || standData.is_active === 'true';
    }
    if (standData.has_jetbridge !== undefined) {
      standData.has_jetbridge = standData.has_jetbridge === true || standData.has_jetbridge === 'true';
    }
    if (standData.max_wingspan_meters) {
      standData.max_wingspan_meters = parseInt(standData.max_wingspan_meters, 10);
    }
    if (standData.max_length_meters) {
      standData.max_length_meters = parseInt(standData.max_length_meters, 10);
    }
    
    const newStand = await StandService.createStand(standData);
    
    res.status(201).json(newStand);
  } catch (error) {
    next(error);
  }
});

// Bulk create stands
router.post('/bulk', async (req, res, next) => {
  try {
    const { stands } = req.body;
    
    if (!Array.isArray(stands) || stands.length === 0) {
      throw new ValidationError('Request must include an array of stands');
    }
    
    // Process each stand to ensure types are correct
    const processedStands = stands.map(stand => ({
      ...stand,
      pier_id: parseInt(stand.pier_id, 10),
      is_active: stand.is_active === true || stand.is_active === 'true',
      has_jetbridge: stand.has_jetbridge === true || stand.has_jetbridge === 'true',
      max_wingspan_meters: stand.max_wingspan_meters ? parseInt(stand.max_wingspan_meters, 10) : null,
      max_length_meters: stand.max_length_meters ? parseInt(stand.max_length_meters, 10) : null
    }));
    
    const createdStands = await StandService.bulkCreateStands(processedStands);
    
    res.status(201).json({
      success: true,
      count: createdStands.length,
      stands: createdStands
    });
  } catch (error) {
    next(error);
  }
});

// Update a stand
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const standData = req.body;
    
    // Convert string values to appropriate types
    if (standData.pier_id) standData.pier_id = parseInt(standData.pier_id, 10);
    if (standData.is_active !== undefined) {
      standData.is_active = standData.is_active === true || standData.is_active === 'true';
    }
    if (standData.has_jetbridge !== undefined) {
      standData.has_jetbridge = standData.has_jetbridge === true || standData.has_jetbridge === 'true';
    }
    if (standData.max_wingspan_meters) {
      standData.max_wingspan_meters = parseInt(standData.max_wingspan_meters, 10);
    }
    if (standData.max_length_meters) {
      standData.max_length_meters = parseInt(standData.max_length_meters, 10);
    }
    
    const updatedStand = await StandService.updateStand(parseInt(id, 10), standData);
    
    res.json(updatedStand);
  } catch (error) {
    next(error);
  }
});

// Delete a stand
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;
    
    await StandService.deleteStand(parseInt(id, 10), force === 'true');
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;