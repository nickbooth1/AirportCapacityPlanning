const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');

// Get all aircraft types
router.get('/', async (req, res, next) => {
  try {
    const aircraftTypes = await db('aircraft_types').select('*');
    res.json(aircraftTypes);
  } catch (error) {
    next(error);
  }
});

// Get an aircraft type by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const aircraftType = await db('aircraft_types').where({ id }).first();
    
    if (!aircraftType) {
      return res.status(404).json({ error: true, message: 'Aircraft type not found' });
    }
    
    res.json(aircraftType);
  } catch (error) {
    next(error);
  }
});

// Create a new aircraft type
router.post('/', async (req, res, next) => {
  try {
    const { 
      iata_code, 
      icao_code, 
      name, 
      manufacturer, 
      model, 
      wingspan_meters, 
      length_meters,
      size_category_code 
    } = req.body;
    
    // Validate required fields
    if (!iata_code || !icao_code || !name) {
      return res.status(400).json({ 
        error: true, 
        message: 'IATA code, ICAO code, and name are required' 
      });
    }
    
    const [id] = await db('aircraft_types').insert({
      iata_code,
      icao_code,
      name,
      manufacturer,
      model,
      wingspan_meters,
      length_meters,
      size_category_code
    }).returning('id');
    
    const newAircraftType = await db('aircraft_types').where({ id }).first();
    
    res.status(201).json(newAircraftType);
  } catch (error) {
    next(error);
  }
});

// Update an aircraft type
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      iata_code, 
      icao_code, 
      name, 
      manufacturer, 
      model, 
      wingspan_meters, 
      length_meters,
      size_category_code 
    } = req.body;
    
    // Check if aircraft type exists
    const aircraftType = await db('aircraft_types').where({ id }).first();
    if (!aircraftType) {
      return res.status(404).json({ error: true, message: 'Aircraft type not found' });
    }
    
    // Update the aircraft type
    await db('aircraft_types').where({ id }).update({
      iata_code,
      icao_code,
      name,
      manufacturer,
      model,
      wingspan_meters,
      length_meters,
      size_category_code,
      updated_at: new Date().toISOString()
    });
    
    const updatedAircraftType = await db('aircraft_types').where({ id }).first();
    
    res.json(updatedAircraftType);
  } catch (error) {
    next(error);
  }
});

// Delete an aircraft type
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if aircraft type exists
    const aircraftType = await db('aircraft_types').where({ id }).first();
    if (!aircraftType) {
      return res.status(404).json({ error: true, message: 'Aircraft type not found' });
    }
    
    // Delete the aircraft type
    await db('aircraft_types').where({ id }).del();
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 