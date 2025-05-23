const express = require('express');
const router = express.Router();
const StandService = require('../services/StandService');
const CascadeDeleteService = require('../services/CascadeDeleteService');
const { ValidationError } = require('../middleware/errorHandler');
const { validateStandUpdate, validateETagForUpdate } = require('../middleware/updateValidationMiddleware');

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
      includeRelations = true,
      includePagination = true,
      includeDeleted = false,
      onlyDeleted = false
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
      if (includePagination === 'true') {
        // Get stands with pagination
        const stands = await StandService.getStandsByTerminalId(
          terminal_id,
          includeDeleted === 'true',
          onlyDeleted === 'true'
        );
        const count = await StandService.getStandCount({ 
          terminal_id: terminal_id,
          filter,
          includeDeleted: includeDeleted === 'true',
          onlyDeleted: onlyDeleted === 'true'
        });
        
        // Calculate pagination metadata
        const page = Math.floor(offset / limit) + 1;
        const totalPages = Math.ceil(count / limit);
        
        return res.json({
          data: stands,
          pagination: {
            total: count,
            page,
            limit: parseInt(limit, 10),
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });
      } else {
        // Just return the stands without pagination metadata
        const stands = await StandService.getStandsByTerminalId(
          terminal_id,
          includeDeleted === 'true',
          onlyDeleted === 'true'
        );
        return res.json(stands);
      }
    }
    
    // Get stands with filter options
    const stands = await StandService.getAllStands({
      includeRelations: includeRelations === 'true',
      filter,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc',
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });
    
    // Add pagination metadata if requested
    if (includePagination === 'true') {
      const count = await StandService.getStandCount({ 
        filter,
        includeDeleted: includeDeleted === 'true',
        onlyDeleted: onlyDeleted === 'true'
      });
      
      // Calculate pagination metadata
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(count / parseInt(limit, 10));
      
      res.json({
        data: stands,
        pagination: {
          total: count,
          page,
          limit: parseInt(limit, 10),
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } else {
      // Just return the stands without pagination metadata
      res.json(stands);
    }
  } catch (error) {
    next(error);
  }
});

// Get a stand by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeRelations = true, includeDeleted = false } = req.query;
    
    const stand = await StandService.getStandById(
      parseInt(id, 10),
      includeRelations === 'true',
      includeDeleted === 'true'
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
    const { 
      limit = 100,
      offset = 0,
      includePagination = true,
      includeDeleted = false,
      onlyDeleted = false
    } = req.query;
    
    const stands = await StandService.getStandsByPierId(
      parseInt(pierId, 10),
      includeDeleted === 'true',
      onlyDeleted === 'true'
    );
    
    // Add pagination metadata if requested
    if (includePagination === 'true') {
      const filter = { pier_id: parseInt(pierId, 10) };
      const count = await StandService.getStandCount({ 
        filter,
        includeDeleted: includeDeleted === 'true',
        onlyDeleted: onlyDeleted === 'true'
      });
      
      // Calculate pagination metadata
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(count / parseInt(limit, 10));
      
      res.json({
        data: stands,
        pagination: {
          total: count,
          page,
          limit: parseInt(limit, 10),
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } else {
      // Just return the stands without pagination metadata
      res.json(stands);
    }
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
      pier_id = null,
      includePagination = true,
      includeDeleted = false,
      onlyDeleted = false
    } = req.query;
    
    const searchOptions = {
      limit: parseInt(limit, 10),
      includeInactive: includeInactive === 'true',
      terminalId: terminal_id ? parseInt(terminal_id, 10) : null,
      pierId: pier_id ? parseInt(pier_id, 10) : null,
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    };
    
    const stands = await StandService.searchStands(term, searchOptions);
    
    // Add pagination metadata if requested
    if (includePagination === 'true') {
      const count = await StandService.getSearchResultCount(term, {
        includeInactive: includeInactive === 'true',
        terminalId: terminal_id ? parseInt(terminal_id, 10) : null,
        pierId: pier_id ? parseInt(pier_id, 10) : null,
        includeDeleted: includeDeleted === 'true',
        onlyDeleted: onlyDeleted === 'true'
      });
      
      // Calculate pagination metadata
      const page = 1; // Search doesn't use offset currently
      const totalPages = Math.ceil(count / parseInt(limit, 10));
      
      res.json({
        data: stands,
        pagination: {
          total: count,
          page,
          limit: parseInt(limit, 10),
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: false // First page has no previous page
        }
      });
    } else {
      // Just return the search results without pagination metadata
      res.json(stands);
    }
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
router.put('/:id', validateETagForUpdate, validateStandUpdate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const standData = req.body;
    const user = req.user || { id: 'system', name: 'System' };
    
    // Get ETag if provided for concurrency control
    const modifiedAt = req.headers['if-match'];
    
    // Update stand with service that includes conflict detection and audit logging
    const updatedStand = await StandService.updateStand(
      parseInt(id, 10), 
      standData,
      {
        user,
        request: req,
        modifiedAt
      }
    );
    
    // Set ETag header for next update
    res.set('ETag', new Date(updatedStand.updated_at).getTime().toString());
    res.json(updatedStand);
  } catch (error) {
    next(error);
  }
});

// Delete a stand
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      force = false,
      permanent = false,
      reason = null,
      cancelMaintenance = false
    } = req.query;
    const user = req.user || { id: 'system', name: 'System' };
    
    const result = await StandService.deleteStand(
      parseInt(id, 10), 
      force === 'true',
      {
        user,
        request: req,
        softDelete: permanent !== 'true', // Use soft delete unless permanent=true
        reason,
        cancelMaintenance: cancelMaintenance === 'true'
      }
    );
    
    // Return 200 with detailed information instead of 204 no content
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get stand dependencies
router.get('/:id/dependencies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dependencies = await CascadeDeleteService.getStandDependencies(parseInt(id, 10));
    res.json(dependencies);
  } catch (error) {
    next(error);
  }
});

// Restore a soft-deleted stand
router.post('/:id/restore', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user || { id: 'system', name: 'System' };
    
    const restoredStand = await StandService.undeleteStand(
      parseInt(id, 10),
      {
        user,
        request: req
      }
    );
    
    res.status(200).json(restoredStand);
  } catch (error) {
    next(error);
  }
});

module.exports = router;