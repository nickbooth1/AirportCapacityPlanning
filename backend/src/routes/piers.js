const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');

// Get all piers
router.get('/', async (req, res, next) => {
  try {
    const piers = await db('piers')
      .select(
        'piers.*',
        'terminals.name as terminal_name'
      )
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id');
      
    res.json(piers);
  } catch (error) {
    next(error);
  }
});

// Get a pier by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a proper integer
    const pierId = parseInt(id, 10);
    if (isNaN(pierId)) {
      return res.status(400).json({ error: true, message: 'Invalid pier ID format' });
    }
    
    const pier = await db('piers')
      .select(
        'piers.*',
        'terminals.name as terminal_name'
      )
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('piers.id', pierId)
      .first();
    
    if (!pier) {
      return res.status(404).json({ error: true, message: 'Pier not found' });
    }
    
    res.json(pier);
  } catch (error) {
    next(error);
  }
});

// Get piers by terminal ID
router.get('/by-terminal/:terminalId', async (req, res, next) => {
  try {
    const { terminalId } = req.params;
    
    // Make sure terminalId is a proper integer
    const parsedTerminalId = parseInt(terminalId, 10);
    if (isNaN(parsedTerminalId)) {
      return res.status(400).json({ error: true, message: 'Invalid terminal ID format' });
    }
    
    // Verify terminal exists
    const terminal = await db('terminals').where({ id: parsedTerminalId }).first();
    if (!terminal) {
      return res.status(404).json({ error: true, message: 'Terminal not found' });
    }
    
    const piers = await db('piers')
      .select(
        'piers.*',
        'terminals.name as terminal_name'
      )
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('piers.terminal_id', parsedTerminalId);
      
    res.json(piers);
  } catch (error) {
    next(error);
  }
});

// Create a new pier
router.post('/', async (req, res, next) => {
  try {
    const { name, code, terminal_id, description } = req.body;
    
    // Validate required fields
    if (!name || !code || !terminal_id) {
      return res.status(400).json({ 
        error: true, 
        message: 'Name, code, and terminal_id are required' 
      });
    }
    
    // Verify terminal exists
    const terminal = await db('terminals').where({ id: terminal_id }).first();
    if (!terminal) {
      return res.status(400).json({ error: true, message: 'Invalid terminal ID' });
    }
    
    // Check for unique code within terminal
    const existingPier = await db('piers')
      .where({ code, terminal_id })
      .first();
      
    if (existingPier) {
      return res.status(409).json({ 
        error: true, 
        message: 'A pier with this code already exists for this terminal' 
      });
    }
    
    const [insertedId] = await db('piers').insert({
      name,
      code,
      terminal_id,
      description
    }).returning('id');
    
    // Make sure the ID is an integer
    const id = typeof insertedId === 'object' && insertedId.id ? parseInt(insertedId.id, 10) : insertedId;
    
    const newPier = await db('piers')
      .select(
        'piers.*',
        'terminals.name as terminal_name'
      )
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('piers.id', id)
      .first();
    
    res.status(201).json(newPier);
  } catch (error) {
    next(error);
  }
});

// Update a pier
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, terminal_id, description } = req.body;
    
    // Make sure id is a proper integer
    const pierId = parseInt(id, 10);
    if (isNaN(pierId)) {
      return res.status(400).json({ error: true, message: 'Invalid pier ID format' });
    }
    
    // Check if pier exists
    const pier = await db('piers').where({ id: pierId }).first();
    if (!pier) {
      return res.status(404).json({ error: true, message: 'Pier not found' });
    }
    
    // If terminal_id is being updated, verify terminal exists
    if (terminal_id && terminal_id !== pier.terminal_id) {
      const terminal = await db('terminals').where({ id: terminal_id }).first();
      if (!terminal) {
        return res.status(400).json({ error: true, message: 'Invalid terminal ID' });
      }
      
      // Check for unique code within terminal if code is being updated
      if (code !== pier.code || terminal_id !== pier.terminal_id) {
        const existingPier = await db('piers')
          .where({ code, terminal_id })
          .whereNot({ id: pierId })
          .first();
          
        if (existingPier) {
          return res.status(409).json({ 
            error: true, 
            message: 'A pier with this code already exists for this terminal' 
          });
        }
      }
    }
    
    // Update the pier
    await db('piers').where({ id: pierId }).update({
      name,
      code,
      terminal_id,
      description,
      updated_at: db.fn.now()
    });
    
    const updatedPier = await db('piers')
      .select(
        'piers.*',
        'terminals.name as terminal_name'
      )
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('piers.id', pierId)
      .first();
    
    res.json(updatedPier);
  } catch (error) {
    next(error);
  }
});

// Delete a pier
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a proper integer
    const pierId = parseInt(id, 10);
    if (isNaN(pierId)) {
      return res.status(400).json({ error: true, message: 'Invalid pier ID format' });
    }
    
    // Check if pier exists
    const pier = await db('piers').where({ id: pierId }).first();
    if (!pier) {
      return res.status(404).json({ error: true, message: 'Pier not found' });
    }
    
    // Check if pier has associated stands
    const standsCount = await db('stands').where({ pier_id: pierId }).count().first();
    if (standsCount.count > 0) {
      return res.status(409).json({ 
        error: true, 
        message: 'Cannot delete pier with associated stands. Remove the stands first.' 
      });
    }
    
    // Delete the pier
    await db('piers').where({ id: pierId }).del();
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 