/**
 * Airport Configuration Controller
 * 
 * Handles HTTP requests related to airport configuration settings.
 */

const airportConfigService = require('../services/airportConfigService');

/**
 * Get the current airport configuration
 */
async function getAirportConfig(req, res, next) {
  try {
    const config = await airportConfigService.getConfig();
    res.json({
      status: 'success',
      data: config
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update the airport configuration
 */
async function updateAirportConfig(req, res, next) {
  try {
    const { baseAirportId } = req.body;
    
    if (baseAirportId === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Base airport ID is required'
      });
    }
    
    const updatedConfig = await airportConfigService.updateConfig({
      baseAirportId
    });
    
    res.json({
      status: 'success',
      data: updatedConfig
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all airline terminal allocations
 */
async function getAirlineTerminalAllocations(req, res, next) {
  try {
    const allocations = await airportConfigService.getAllocations();
    res.json({
      status: 'success',
      data: allocations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new airline terminal allocation
 */
async function addAirlineTerminalAllocation(req, res, next) {
  try {
    const { airlineId, terminalId, ghaId } = req.body;
    
    // Validate required fields
    if (!airlineId || !terminalId) {
      return res.status(400).json({
        status: 'error',
        message: 'Airline ID and terminal ID are required'
      });
    }
    
    const newAllocation = await airportConfigService.addAllocation({
      airlineId,
      terminalId,
      ghaId
    });
    
    res.status(201).json({
      status: 'success',
      data: newAllocation
    });
  } catch (error) {
    // Handle duplicate allocation error
    if (error.code === '23505') { // PostgreSQL unique violation code
      return res.status(409).json({
        status: 'error',
        message: 'This airline is already allocated to this terminal'
      });
    }
    next(error);
  }
}

/**
 * Update an existing airline terminal allocation
 */
async function updateAirlineTerminalAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const { airlineId, terminalId, ghaId } = req.body;
    
    // Validate required fields
    if (!airlineId || !terminalId) {
      return res.status(400).json({
        status: 'error',
        message: 'Airline ID and terminal ID are required'
      });
    }
    
    const updatedAllocation = await airportConfigService.updateAllocation(id, {
      airlineId,
      terminalId,
      ghaId
    });
    
    if (!updatedAllocation) {
      return res.status(404).json({
        status: 'error',
        message: 'Allocation not found'
      });
    }
    
    res.json({
      status: 'success',
      data: updatedAllocation
    });
  } catch (error) {
    // Handle duplicate allocation error
    if (error.code === '23505') { // PostgreSQL unique violation code
      return res.status(409).json({
        status: 'error',
        message: 'This airline is already allocated to this terminal'
      });
    }
    next(error);
  }
}

/**
 * Delete an airline terminal allocation
 */
async function deleteAirlineTerminalAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await airportConfigService.deleteAllocation(id);
    
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Allocation not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Allocation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAirportConfig,
  updateAirportConfig,
  getAirlineTerminalAllocations,
  addAirlineTerminalAllocation,
  updateAirlineTerminalAllocation,
  deleteAirlineTerminalAllocation
}; 