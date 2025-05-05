const express = require('express');
const router = express.Router();
const FlightUploadController = require('../../controllers/FlightUploadController');
const FlightValidationController = require('../../controllers/FlightValidationController');
const { authenticateUser } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @route   GET /api/flights/upload
 * @desc    Get list of all uploaded flight schedules
 * @access  Private
 */
router.get('/', FlightUploadController.getUploadsList);

/**
 * @route   POST /api/flights/upload
 * @desc    Upload a flight data file
 * @access  Private
 */
router.post('/', FlightUploadController.uploadFile);

/**
 * @route   POST /api/flights/upload/initialize
 * @desc    Initialize a chunked upload
 * @access  Private
 */
router.post('/initialize', FlightUploadController.initializeChunkedUpload);

/**
 * @route   POST /api/flights/upload/chunk
 * @desc    Upload a chunk of a file
 * @access  Private
 */
router.post('/chunk', FlightUploadController.uploadChunk);

/**
 * @route   POST /api/flights/upload/finalize
 * @desc    Finalize a chunked upload
 * @access  Private
 */
router.post('/finalize', FlightUploadController.finalizeChunkedUpload);

/**
 * @route   POST /api/flights/upload/abort
 * @desc    Abort a chunked upload
 * @access  Private
 */
router.post('/abort', FlightUploadController.abortChunkedUpload);

/**
 * @route   GET /api/flights/upload/status/:id
 * @desc    Get status of a chunked upload
 * @access  Private
 */
router.get('/status/:id', FlightUploadController.getChunkedUploadStatus);

/**
 * @route   GET /api/flights/upload/status/:id
 * @desc    Check the status of an upload
 * @access  Private
 */
router.get('/status/:id', FlightUploadController.getUploadStatus);

/**
 * @route   GET /api/flights/upload/:id/validation
 * @desc    Get validation results for an upload
 * @access  Private
 */
router.get('/:id/validation', FlightUploadController.getValidationResults);

/**
 * @route   GET /api/flights/upload/:id/validation/arrivals
 * @desc    Get validated arrival flights
 * @access  Private
 */
router.get('/:id/validation/arrivals', FlightValidationController.getArrivalFlights);

/**
 * @route   GET /api/flights/upload/:id/validation/departures
 * @desc    Get validated departure flights
 * @access  Private
 */
router.get('/:id/validation/departures', FlightValidationController.getDepartureFlights);

/**
 * @route   POST /api/flights/upload/:id/validate
 * @desc    Validate flights in an upload
 * @access  Private
 */
router.post('/:id/validate', FlightValidationController.validateFlights);

/**
 * @route   GET /api/flights/upload/:id/validation/stats
 * @desc    Get validation statistics for an upload
 * @access  Private
 */
router.get('/:id/validation/stats', FlightValidationController.getValidationStats);

/**
 * @route   GET /api/flights/upload/:id/validation/export
 * @desc    Export validation report
 * @access  Private
 */
router.get('/:id/validation/export', FlightValidationController.exportValidationReport);

/**
 * @route   POST /api/flights/upload/:id/approve
 * @desc    Approve flights for import
 * @access  Private
 */
router.post('/:id/approve', FlightUploadController.approveFlights);

/**
 * @route   GET /api/flights/upload/:id/export
 * @desc    Export validation report
 * @access  Private
 */
router.get('/:id/export', FlightValidationController.exportValidationReport);

/**
 * @route   DELETE /api/flights/upload/:id
 * @desc    Delete a flight upload and all associated flights
 * @access  Private
 */
router.delete('/:id', FlightUploadController.deleteFlightUpload);

module.exports = router; 