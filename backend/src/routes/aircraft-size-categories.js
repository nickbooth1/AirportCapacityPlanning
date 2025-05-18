const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// Get all aircraft size categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await db('aircraft_size_categories').select('*');
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Get an aircraft size category by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a proper integer
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: true, message: 'Invalid category ID format' });
    }
    
    const category = await db('aircraft_size_categories').where({ id: categoryId }).first();
    
    if (!category) {
      return res.status(404).json({ error: true, message: 'Size category not found' });
    }
    
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create a new aircraft size category
router.post('/', async (req, res, next) => {
  try {
    const { 
      code, 
      name, 
      description, 
      wingspan_min_meters, 
      wingspan_max_meters, 
      length_min_meters, 
      length_max_meters 
    } = req.body;
    
    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ 
        error: true, 
        message: 'Code and name are required' 
      });
    }
    
    // Check if code already exists
    const existingCategory = await db('aircraft_size_categories').where({ code }).first();
    if (existingCategory) {
      return res.status(409).json({ 
        error: true, 
        message: 'A size category with this code already exists' 
      });
    }
    
    const [insertedId] = await db('aircraft_size_categories').insert({
      code,
      name,
      description,
      wingspan_min_meters,
      wingspan_max_meters,
      length_min_meters,
      length_max_meters
    }).returning('id');
    
    // Make sure the ID is an integer
    const id = typeof insertedId === 'object' && insertedId.id ? parseInt(insertedId.id, 10) : insertedId;
    
    const newCategory = await db('aircraft_size_categories').where({ id }).first();
    
    res.status(201).json(newCategory);
  } catch (error) {
    next(error);
  }
});

// Update an aircraft size category
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      code, 
      name, 
      description, 
      wingspan_min_meters, 
      wingspan_max_meters, 
      length_min_meters, 
      length_max_meters 
    } = req.body;
    
    // Make sure id is a proper integer
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: true, message: 'Invalid category ID format' });
    }
    
    // Check if category exists
    const category = await db('aircraft_size_categories').where({ id: categoryId }).first();
    if (!category) {
      return res.status(404).json({ error: true, message: 'Size category not found' });
    }
    
    // Check if updated code already exists (if code is being changed)
    if (code !== category.code) {
      const existingCategory = await db('aircraft_size_categories')
        .where({ code })
        .whereNot({ id: categoryId })
        .first();
        
      if (existingCategory) {
        return res.status(409).json({ 
          error: true, 
          message: 'A size category with this code already exists' 
        });
      }
    }
    
    // Update the category
    await db('aircraft_size_categories').where({ id: categoryId }).update({
      code,
      name,
      description,
      wingspan_min_meters,
      wingspan_max_meters,
      length_min_meters,
      length_max_meters,
      updated_at: db.fn.now()
    });
    
    const updatedCategory = await db('aircraft_size_categories').where({ id: categoryId }).first();
    
    res.json(updatedCategory);
  } catch (error) {
    next(error);
  }
});

// Delete an aircraft size category
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Make sure id is a proper integer
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: true, message: 'Invalid category ID format' });
    }
    
    // Check if category exists
    const category = await db('aircraft_size_categories').where({ id: categoryId }).first();
    if (!category) {
      return res.status(404).json({ error: true, message: 'Size category not found' });
    }
    
    // Check if category is in use in aircraft_types
    const aircraftTypesCount = await db('aircraft_types')
      .where({ size_category_code: category.code })
      .count()
      .first();
      
    if (parseInt(aircraftTypesCount.count, 10) > 0) {
      return res.status(409).json({ 
        error: true, 
        message: 'Cannot delete size category that is used by aircraft types' 
      });
    }
    
    // Check if category is in use in stands
    const standsCount = await db('stands')
      .where({ max_aircraft_size_code: category.code })
      .count()
      .first();
      
    if (parseInt(standsCount.count, 10) > 0) {
      return res.status(409).json({ 
        error: true, 
        message: 'Cannot delete size category that is used by stands' 
      });
    }
    
    // Delete the category
    await db('aircraft_size_categories').where({ id: categoryId }).del();
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router; 