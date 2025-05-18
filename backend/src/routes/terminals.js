const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// Get all terminals
router.get('/', async (req, res, next) => {
  try {
    const terminals = await db('terminals').select('*');
    res.json({ 
      success: true, 
      message: 'Terminals retrieved successfully', 
      data: terminals 
    });
  } catch (error) {
    next(error);
  }
});

// Get a terminal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const terminal = await db('terminals').where({ id }).first();
    
    if (!terminal) {
      return res.status(404).json({ error: true, message: 'Terminal not found' });
    }
    
    res.json(terminal);
  } catch (error) {
    next(error);
  }
});

// Create a new terminal
router.post('/', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: true, message: 'Name and code are required' });
    }
    
    const [insertedId] = await db('terminals').insert({
      name,
      code,
      description
    }).returning('id');
    
    // Make sure the ID is an integer
    const id = typeof insertedId === 'object' && insertedId.id ? parseInt(insertedId.id, 10) : insertedId;
    
    const newTerminal = await db('terminals').where({ id }).first();
    
    res.status(201).json(newTerminal);
  } catch (error) {
    next(error);
  }
});

// Update a terminal
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: true, message: 'Name and code are required' });
    }
    
    // Check if terminal exists
    const terminal = await db('terminals').where({ id }).first();
    if (!terminal) {
      return res.status(404).json({ error: true, message: 'Terminal not found' });
    }
    
    // Update the terminal
    await db('terminals').where({ id }).update({
      name,
      code,
      description,
      updated_at: db.fn.now()
    });
    
    // Return the updated terminal
    const updatedTerminal = await db('terminals').where({ id }).first();
    
    res.json(updatedTerminal);
  } catch (error) {
    next(error);
  }
});

// Delete a terminal
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if terminal exists
    const terminal = await db('terminals').where({ id }).first();
    if (!terminal) {
      return res.status(404).json({ error: true, message: 'Terminal not found' });
    }
    
    // Check if this terminal has any piers associated with it
    const piersCount = await db('piers').where({ terminal_id: id }).count().first();
    if (parseInt(piersCount.count, 10) > 0) {
      return res.status(409).json({ 
        error: true, 
        message: 'Cannot delete terminal with associated piers. Remove the piers first.' 
      });
    }
    
    // Delete the terminal
    await db('terminals').where({ id }).delete();
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 