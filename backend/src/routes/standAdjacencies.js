const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { validateStandId } = require('../utils/validation');

/**
 * Get all adjacencies for a specific stand
 */
router.get('/stand/:standId', async (req, res) => {
  try {
    const { standId } = req.params;
    
    if (!validateStandId(standId)) {
      return res.status(400).json({ error: 'Invalid stand ID' });
    }

    // Get adjacencies where this stand is either the primary or adjacent stand
    const adjacencies = await db('stand_adjacencies as sa')
      .select(
        'sa.id',
        'sa.stand_id',
        'sa.adjacent_stand_id',
        'sa.impact_direction',
        'sa.restriction_type',
        'sa.max_aircraft_size_code',
        'sa.restriction_details',
        'sa.is_active',
        'sa.created_at',
        'sa.updated_at',
        's1.name as stand_name',
        's1.code as stand_code',
        's2.name as adjacent_stand_name',
        's2.code as adjacent_stand_code'
      )
      .join('stands as s1', 'sa.stand_id', 's1.id')
      .join('stands as s2', 'sa.adjacent_stand_id', 's2.id')
      .where('sa.stand_id', standId)
      .orWhere('sa.adjacent_stand_id', standId)
      .orderBy('sa.id');

    res.json(adjacencies);
  } catch (error) {
    console.error('Error fetching stand adjacencies:', error);
    res.status(500).json({ error: 'Failed to fetch stand adjacencies' });
  }
});

/**
 * Create a new stand adjacency
 */
router.post('/', async (req, res) => {
  try {
    const { 
      stand_id, 
      adjacent_stand_id, 
      impact_direction, 
      restriction_type, 
      max_aircraft_size_code, 
      restriction_details,
      is_active
    } = req.body;

    // Validate required fields
    if (!stand_id || !adjacent_stand_id || !impact_direction || !restriction_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: stand_id, adjacent_stand_id, impact_direction, and restriction_type are required' 
      });
    }

    // Check that stands exist
    const [standExists, adjacentStandExists] = await Promise.all([
      db('stands').where('id', stand_id).first(),
      db('stands').where('id', adjacent_stand_id).first()
    ]);

    if (!standExists) {
      return res.status(404).json({ error: `Stand with ID ${stand_id} not found` });
    }

    if (!adjacentStandExists) {
      return res.status(404).json({ error: `Adjacent stand with ID ${adjacent_stand_id} not found` });
    }

    // Check for duplicate
    const existingAdjacency = await db('stand_adjacencies')
      .where({
        stand_id,
        adjacent_stand_id,
        impact_direction
      })
      .first();

    if (existingAdjacency) {
      return res.status(409).json({ 
        error: 'An adjacency with this stand, adjacent stand, and impact direction already exists' 
      });
    }

    // Create new adjacency
    const insertResult = await db('stand_adjacencies').insert({
      stand_id,
      adjacent_stand_id,
      impact_direction,
      restriction_type,
      max_aircraft_size_code: max_aircraft_size_code || null,
      restriction_details: restriction_details || null,
      is_active: is_active !== undefined ? is_active : true
    }, 'id');
    
    // Extract the ID properly, handling different return formats from different DB engines
    let adjacencyId;
    if (Array.isArray(insertResult) && insertResult.length > 0) {
      adjacencyId = typeof insertResult[0] === 'object' ? insertResult[0].id : insertResult[0];
    } else {
      adjacencyId = insertResult;
    }

    const newAdjacency = await db('stand_adjacencies')
      .where('id', adjacencyId)
      .first();

    res.status(201).json(newAdjacency);
  } catch (error) {
    console.error('Error creating stand adjacency:', error);
    res.status(500).json({ error: 'Failed to create stand adjacency' });
  }
});

/**
 * Update a stand adjacency
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      stand_id, 
      adjacent_stand_id, 
      impact_direction, 
      restriction_type, 
      max_aircraft_size_code, 
      restriction_details,
      is_active
    } = req.body;

    // Check if adjacency exists
    const existingAdjacency = await db('stand_adjacencies')
      .where('id', id)
      .first();

    if (!existingAdjacency) {
      return res.status(404).json({ error: `Stand adjacency with ID ${id} not found` });
    }

    // If updating the stand, adjacent stand, or impact direction, check for duplicates
    if (
      (stand_id && stand_id !== existingAdjacency.stand_id) ||
      (adjacent_stand_id && adjacent_stand_id !== existingAdjacency.adjacent_stand_id) ||
      (impact_direction && impact_direction !== existingAdjacency.impact_direction)
    ) {
      const duplicateCheck = await db('stand_adjacencies')
        .where({
          stand_id: stand_id || existingAdjacency.stand_id,
          adjacent_stand_id: adjacent_stand_id || existingAdjacency.adjacent_stand_id,
          impact_direction: impact_direction || existingAdjacency.impact_direction
        })
        .whereNot('id', id)
        .first();

      if (duplicateCheck) {
        return res.status(409).json({ 
          error: 'An adjacency with this stand, adjacent stand, and impact direction already exists' 
        });
      }
    }

    // Update the adjacency
    const updateData = {};
    if (stand_id !== undefined) updateData.stand_id = stand_id;
    if (adjacent_stand_id !== undefined) updateData.adjacent_stand_id = adjacent_stand_id;
    if (impact_direction !== undefined) updateData.impact_direction = impact_direction;
    if (restriction_type !== undefined) updateData.restriction_type = restriction_type;
    if (max_aircraft_size_code !== undefined) updateData.max_aircraft_size_code = max_aircraft_size_code;
    if (restriction_details !== undefined) updateData.restriction_details = restriction_details;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db('stand_adjacencies')
      .where('id', id)
      .update({
        ...updateData,
        updated_at: db.fn.now()
      });

    const updatedAdjacency = await db('stand_adjacencies')
      .where('id', id)
      .first();

    res.json(updatedAdjacency);
  } catch (error) {
    console.error('Error updating stand adjacency:', error);
    res.status(500).json({ error: 'Failed to update stand adjacency' });
  }
});

/**
 * Delete a stand adjacency
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if adjacency exists
    const existingAdjacency = await db('stand_adjacencies')
      .where('id', id)
      .first();

    if (!existingAdjacency) {
      return res.status(404).json({ error: `Stand adjacency with ID ${id} not found` });
    }

    // Delete the adjacency
    await db('stand_adjacencies')
      .where('id', id)
      .del();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting stand adjacency:', error);
    res.status(500).json({ error: 'Failed to delete stand adjacency' });
  }
});

module.exports = router; 