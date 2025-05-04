const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');

// Get all stand constraints
router.get('/', async (req, res, next) => {
  try {
    const constraints = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.name as stand_name',
        'stands.code as stand_code',
        'aircraft_types.name as aircraft_name',
        'aircraft_types.iata_code as aircraft_iata_code',
        'aircraft_types.icao_code as aircraft_icao_code'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id');
      
    res.json(constraints);
  } catch (error) {
    next(error);
  }
});

// Get constraints by stand ID
router.get('/by-stand/:standId', async (req, res, next) => {
  try {
    const { standId } = req.params;
    
    // Verify stand exists
    const stand = await db('stands').where({ id: standId }).first();
    if (!stand) {
      return res.status(404).json({ error: true, message: 'Stand not found' });
    }
    
    const constraints = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'aircraft_types.name as aircraft_name',
        'aircraft_types.iata_code as aircraft_iata_code',
        'aircraft_types.icao_code as aircraft_icao_code'
      )
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id')
      .where('stand_aircraft_constraints.stand_id', standId);
      
    res.json(constraints);
  } catch (error) {
    next(error);
  }
});

// Get constraints by aircraft type ID
router.get('/by-aircraft/:aircraftTypeId', async (req, res, next) => {
  try {
    const { aircraftTypeId } = req.params;
    
    // Verify aircraft type exists
    const aircraftType = await db('aircraft_types').where({ id: aircraftTypeId }).first();
    if (!aircraftType) {
      return res.status(404).json({ error: true, message: 'Aircraft type not found' });
    }
    
    const constraints = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.name as stand_name',
        'stands.code as stand_code'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .where('stand_aircraft_constraints.aircraft_type_id', aircraftTypeId);
      
    res.json(constraints);
  } catch (error) {
    next(error);
  }
});

// Create a new constraint
router.post('/', async (req, res, next) => {
  try {
    const { stand_id, aircraft_type_id, is_allowed, constraint_reason } = req.body;
    
    // Validate required fields
    if (!stand_id || !aircraft_type_id) {
      return res.status(400).json({ 
        error: true, 
        message: 'Stand ID and Aircraft Type ID are required' 
      });
    }
    
    // Verify stand exists
    const stand = await db('stands').where({ id: stand_id }).first();
    if (!stand) {
      return res.status(400).json({ error: true, message: 'Invalid stand ID' });
    }
    
    // Verify aircraft type exists
    const aircraftType = await db('aircraft_types').where({ id: aircraft_type_id }).first();
    if (!aircraftType) {
      return res.status(400).json({ error: true, message: 'Invalid aircraft type ID' });
    }
    
    // Check for existing constraint
    const existingConstraint = await db('stand_aircraft_constraints')
      .where({ stand_id, aircraft_type_id })
      .first();
      
    if (existingConstraint) {
      return res.status(409).json({ 
        error: true, 
        message: 'A constraint for this stand and aircraft type already exists' 
      });
    }
    
    const [id] = await db('stand_aircraft_constraints').insert({
      stand_id,
      aircraft_type_id,
      is_allowed: is_allowed !== undefined ? is_allowed : true,
      constraint_reason
    }).returning('id');
    
    const newConstraint = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.name as stand_name',
        'stands.code as stand_code',
        'aircraft_types.name as aircraft_name',
        'aircraft_types.iata_code as aircraft_iata_code',
        'aircraft_types.icao_code as aircraft_icao_code'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id')
      .where('stand_aircraft_constraints.id', id)
      .first();
    
    res.status(201).json(newConstraint);
  } catch (error) {
    next(error);
  }
});

// Update a constraint
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stand_id, aircraft_type_id, is_allowed, constraint_reason } = req.body;
    
    // Check if constraint exists
    const constraint = await db('stand_aircraft_constraints').where({ id }).first();
    if (!constraint) {
      return res.status(404).json({ error: true, message: 'Constraint not found' });
    }
    
    // If stand_id or aircraft_type_id is being updated, verify they exist and are unique
    if ((stand_id && stand_id !== constraint.stand_id) || 
        (aircraft_type_id && aircraft_type_id !== constraint.aircraft_type_id)) {
      
      // Verify stand exists if being updated
      if (stand_id && stand_id !== constraint.stand_id) {
        const stand = await db('stands').where({ id: stand_id }).first();
        if (!stand) {
          return res.status(400).json({ error: true, message: 'Invalid stand ID' });
        }
      }
      
      // Verify aircraft type exists if being updated
      if (aircraft_type_id && aircraft_type_id !== constraint.aircraft_type_id) {
        const aircraftType = await db('aircraft_types').where({ id: aircraft_type_id }).first();
        if (!aircraftType) {
          return res.status(400).json({ error: true, message: 'Invalid aircraft type ID' });
        }
      }
      
      // Check for uniqueness if either ID is being updated
      const existingConstraint = await db('stand_aircraft_constraints')
        .where({ 
          stand_id: stand_id || constraint.stand_id, 
          aircraft_type_id: aircraft_type_id || constraint.aircraft_type_id 
        })
        .whereNot({ id })
        .first();
        
      if (existingConstraint) {
        return res.status(409).json({ 
          error: true, 
          message: 'A constraint for this stand and aircraft type already exists' 
        });
      }
    }
    
    // Update the constraint
    await db('stand_aircraft_constraints').where({ id }).update({
      stand_id: stand_id || constraint.stand_id,
      aircraft_type_id: aircraft_type_id || constraint.aircraft_type_id,
      is_allowed: is_allowed !== undefined ? is_allowed : constraint.is_allowed,
      constraint_reason: constraint_reason !== undefined ? constraint_reason : constraint.constraint_reason,
      updated_at: db.fn.now()
    });
    
    const updatedConstraint = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.name as stand_name',
        'stands.code as stand_code',
        'aircraft_types.name as aircraft_name',
        'aircraft_types.iata_code as aircraft_iata_code',
        'aircraft_types.icao_code as aircraft_icao_code'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id')
      .where('stand_aircraft_constraints.id', id)
      .first();
    
    res.json(updatedConstraint);
  } catch (error) {
    next(error);
  }
});

// Delete a constraint
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if constraint exists
    const constraint = await db('stand_aircraft_constraints').where({ id }).first();
    if (!constraint) {
      return res.status(404).json({ error: true, message: 'Constraint not found' });
    }
    
    // Delete the constraint
    await db('stand_aircraft_constraints').where({ id }).del();
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 