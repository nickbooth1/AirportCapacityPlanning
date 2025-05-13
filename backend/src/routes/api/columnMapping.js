const express = require('express');
const router = express.Router();
const ColumnMappingController = require('../../controllers/ColumnMappingController');
const { authenticateUser } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @route   POST /api/column-mapping/detect-columns
 * @desc    Detect columns from uploaded file
 * @access  Private
 */
router.post('/detect-columns', ColumnMappingController.detectColumns.bind(ColumnMappingController));

/**
 * @route   GET /api/column-mapping/uploads/:uploadId/columns
 * @desc    Detect columns from an existing upload
 * @access  Private
 */
router.get('/uploads/:uploadId/columns', ColumnMappingController.detectColumnsFromUpload.bind(ColumnMappingController));

/**
 * @route   GET /api/column-mapping/fields
 * @desc    Get required mapping fields
 * @access  Private
 */
router.get('/fields', ColumnMappingController.getMappingFields.bind(ColumnMappingController));

/**
 * @route   POST /api/column-mapping/suggest
 * @desc    Suggest mappings based on source columns
 * @access  Private
 */
router.post('/suggest', ColumnMappingController.suggestMappings.bind(ColumnMappingController));

/**
 * @route   POST /api/column-mapping/apply
 * @desc    Apply mapping to transform data
 * @access  Private
 */
router.post('/apply', ColumnMappingController.applyMapping.bind(ColumnMappingController));

/**
 * @route   GET /api/column-mapping/profiles
 * @desc    List mapping profiles
 * @access  Private
 */
router.get('/profiles', ColumnMappingController.listMappingProfiles.bind(ColumnMappingController));

/**
 * @route   POST /api/column-mapping/profiles
 * @desc    Create a mapping profile
 * @access  Private
 */
router.post('/profiles', ColumnMappingController.createMappingProfile.bind(ColumnMappingController));

/**
 * @route   GET /api/column-mapping/profiles/:id
 * @desc    Get a mapping profile
 * @access  Private
 */
router.get('/profiles/:id', ColumnMappingController.getMappingProfile.bind(ColumnMappingController));

/**
 * @route   PUT /api/column-mapping/profiles/:id
 * @desc    Update a mapping profile
 * @access  Private
 */
router.put('/profiles/:id', ColumnMappingController.updateMappingProfile.bind(ColumnMappingController));

/**
 * @route   DELETE /api/column-mapping/profiles/:id
 * @desc    Delete a mapping profile
 * @access  Private
 */
router.delete('/profiles/:id', ColumnMappingController.deleteMappingProfile.bind(ColumnMappingController));

module.exports = router; 