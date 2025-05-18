const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// Get all stands
router.get('/', async (req, res, next) => {
  try {
    const stands = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id');
      
    res.json(stands);
  } catch (error) {
    next(error);
  }
});

// Get a stand by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const stand = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('stands.id', id)
      .first();
    
    if (!stand) {
      return res.status(404).json({ error: true, message: 'Stand not found' });
    }
    
    res.json(stand);
  } catch (error) {
    next(error);
  }
});

// Get stands by pier ID
router.get('/by-pier/:pierId', async (req, res, next) => {
  try {
    const { pierId } = req.params;
    
    // Verify pier exists
    const pier = await db('piers').where({ id: pierId }).first();
    if (!pier) {
      return res.status(404).json({ error: true, message: 'Pier not found' });
    }
    
    const stands = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('stands.pier_id', pierId);
      
    res.json(stands);
  } catch (error) {
    next(error);
  }
});

// Create a new stand
router.post('/', async (req, res, next) => {
  try {
    const { 
      name, 
      code, 
      pier_id, 
      is_active, 
      stand_type, 
      has_jetbridge, 
      max_wingspan_meters, 
      max_length_meters,
      max_aircraft_size_code,
      description,
      latitude,
      longitude
    } = req.body;
    
    // Validate required fields
    if (!name || !code || !pier_id) {
      return res.status(400).json({ 
        error: true, 
        message: 'Name, code, and pier_id are required' 
      });
    }
    
    // Verify pier exists
    const pier = await db('piers').where({ id: pier_id }).first();
    if (!pier) {
      return res.status(400).json({ error: true, message: 'Invalid pier ID' });
    }
    
    // Check for unique code within pier
    const existingStand = await db('stands')
      .where({ code, pier_id })
      .first();
      
    if (existingStand) {
      return res.status(409).json({ 
        error: true, 
        message: 'A stand with this code already exists for this pier' 
      });
    }
    
    const [id] = await db('stands').insert({
      name,
      code,
      pier_id,
      is_active,
      stand_type,
      has_jetbridge,
      max_wingspan_meters,
      max_length_meters,
      max_aircraft_size_code,
      description,
      latitude,
      longitude
    }).returning('id');
    
    const newStand = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('stands.id', id)
      .first();
    
    res.status(201).json(newStand);
  } catch (error) {
    next(error);
  }
});

// Update a stand
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      code, 
      pier_id, 
      is_active, 
      stand_type, 
      has_jetbridge, 
      max_wingspan_meters, 
      max_length_meters,
      max_aircraft_size_code,
      description,
      latitude,
      longitude
    } = req.body;
    
    // Check if stand exists
    const stand = await db('stands').where({ id }).first();
    if (!stand) {
      return res.status(404).json({ error: true, message: 'Stand not found' });
    }
    
    // If pier_id is being updated, verify pier exists
    if (pier_id && pier_id !== stand.pier_id) {
      const pier = await db('piers').where({ id: pier_id }).first();
      if (!pier) {
        return res.status(400).json({ error: true, message: 'Invalid pier ID' });
      }
      
      // Check for unique code within pier if code is being updated
      if (code !== stand.code || pier_id !== stand.pier_id) {
        const existingStand = await db('stands')
          .where({ code, pier_id })
          .whereNot({ id })
          .first();
          
        if (existingStand) {
          return res.status(409).json({ 
            error: true, 
            message: 'A stand with this code already exists for this pier' 
          });
        }
      }
    }
    
    // Update the stand
    await db('stands').where({ id }).update({
      name,
      code,
      pier_id,
      is_active,
      stand_type,
      has_jetbridge,
      max_wingspan_meters,
      max_length_meters,
      max_aircraft_size_code,
      description,
      latitude,
      longitude,
      updated_at: db.fn.now()
    });
    
    const updatedStand = await db('stands')
      .select(
        'stands.*',
        'piers.name as pier_name',
        'terminals.name as terminal_name'
      )
      .leftJoin('piers', 'stands.pier_id', 'piers.id')
      .leftJoin('terminals', 'piers.terminal_id', 'terminals.id')
      .where('stands.id', id)
      .first();
    
    res.json(updatedStand);
  } catch (error) {
    next(error);
  }
});

// Delete a stand
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if stand exists
    const stand = await db('stands').where({ id }).first();
    if (!stand) {
      return res.status(404).json({ error: true, message: 'Stand not found' });
    }
    
    // Delete the stand
    await db('stands').where({ id }).del();
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 