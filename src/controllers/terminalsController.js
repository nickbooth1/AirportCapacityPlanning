const { db } = require('../utils/db');

/**
 * Get all terminals
 */
const getAllTerminals = async (req, res, next) => {
  try {
    const terminals = await db('terminals').select('*');
    res.status(200).json({
      status: 'success',
      results: terminals.length,
      data: terminals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a terminal by ID
 */
const getTerminalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const terminal = await db('terminals').where({ id }).first();
    
    if (!terminal) {
      return res.status(404).json({
        status: 'error',
        message: `Terminal with ID ${id} not found`,
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: terminal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new terminal
 */
const createTerminal = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    
    // Basic validation
    if (!name || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and code are required fields',
      });
    }
    
    // Insert into database
    const [newTerminalId] = await db('terminals').insert({
      name,
      code,
      description,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('id');
    
    // Fetch the newly created terminal
    const newTerminal = await db('terminals').where({ id: newTerminalId }).first();
    
    res.status(201).json({
      status: 'success',
      data: newTerminal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a terminal
 */
const updateTerminal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    // Check if terminal exists
    const terminal = await db('terminals').where({ id }).first();
    if (!terminal) {
      return res.status(404).json({
        status: 'error',
        message: `Terminal with ID ${id} not found`,
      });
    }
    
    // Update the terminal
    await db('terminals')
      .where({ id })
      .update({
        name: name || terminal.name,
        code: code || terminal.code,
        description: description !== undefined ? description : terminal.description,
        updated_at: new Date(),
      });
    
    // Fetch the updated terminal
    const updatedTerminal = await db('terminals').where({ id }).first();
    
    res.status(200).json({
      status: 'success',
      data: updatedTerminal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a terminal
 */
const deleteTerminal = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if terminal exists
    const terminal = await db('terminals').where({ id }).first();
    if (!terminal) {
      return res.status(404).json({
        status: 'error',
        message: `Terminal with ID ${id} not found`,
      });
    }
    
    // Check for related piers before deletion
    const relatedPiers = await db('piers').where({ terminal_id: id }).first();
    if (relatedPiers) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete terminal with associated piers. Remove the piers first.',
      });
    }
    
    // Delete the terminal
    await db('terminals').where({ id }).delete();
    
    res.status(200).json({
      status: 'success',
      message: `Terminal with ID ${id} successfully deleted`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all piers for a terminal
 */
const getTerminalPiers = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if terminal exists
    const terminal = await db('terminals').where({ id }).first();
    if (!terminal) {
      return res.status(404).json({
        status: 'error',
        message: `Terminal with ID ${id} not found`,
      });
    }
    
    // Get all piers for the terminal
    const piers = await db('piers').where({ terminal_id: id });
    
    res.status(200).json({
      status: 'success',
      results: piers.length,
      data: piers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTerminals,
  getTerminalById,
  createTerminal,
  updateTerminal,
  deleteTerminal,
  getTerminalPiers,
}; 