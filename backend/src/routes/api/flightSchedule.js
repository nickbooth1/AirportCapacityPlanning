const express = require('express');
const router = express.Router();
const FlightScheduleController = require('../../controllers/FlightScheduleController');
const scenarioRoutes = require('./scenarioRoutes');
const { authenticateUser } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Mount scenario routes
router.use('/scenarios', scenarioRoutes);

/**
 * @route   GET /api/flight-schedules/debug/tables
 * @desc    Check the existence of tables in the database
 * @access  Private
 */
router.get('/debug/tables', async (req, res) => {
  try {
    const db = require('../../utils/db');
    
    // Check if the flight_schedules table exists
    const flightSchedulesExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flight_schedules')");
    const hasFlightSchedules = flightSchedulesExists.rows[0].exists;
    
    // Check if the unallocated_flights table exists
    const unallocatedFlightsExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unallocated_flights')");
    const hasUnallocatedFlights = unallocatedFlightsExists.rows[0].exists;
    
    // Check if the stand_utilization_metrics table exists
    const standUtilizationMetricsExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stand_utilization_metrics')");
    const hasStandUtilizationMetrics = standUtilizationMetricsExists.rows[0].exists;
    
    // Check if the allocation_issues table exists
    const allocationIssuesExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'allocation_issues')");
    const hasAllocationIssues = allocationIssuesExists.rows[0].exists;
    
    // Check if the stand_allocations table has the required columns
    let standAllocationsColumns = [];
    const standAllocationsExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stand_allocations')");
    const hasStandAllocations = standAllocationsExists.rows[0].exists;
    
    if (hasStandAllocations) {
      const columns = await db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'stand_allocations'");
      standAllocationsColumns = columns.rows.map(row => row.column_name);
    }
    
    // Check if the allocation_scenarios table exists
    const allocationScenariosExists = await db.raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'allocation_scenarios')");
    const hasAllocationScenarios = allocationScenariosExists.rows[0].exists;
    
    res.status(200).json({
      success: true,
      tables: {
        flight_schedules: hasFlightSchedules,
        unallocated_flights: hasUnallocatedFlights,
        stand_utilization_metrics: hasStandUtilizationMetrics,
        allocation_issues: hasAllocationIssues,
        allocation_scenarios: hasAllocationScenarios,
        stand_allocations: {
          exists: hasStandAllocations,
          columns: standAllocationsColumns
        }
      }
    });
  } catch (error) {
    console.error('Error checking tables:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking tables',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/flight-schedules/process/:uploadId
 * @desc    Process a flight schedule from upload
 * @access  Private
 */
router.post('/process/:uploadId', FlightScheduleController.processFlightSchedule);

/**
 * @route   GET /api/flight-schedules
 * @desc    List all flight schedules
 * @access  Private
 */
router.get('/', FlightScheduleController.listFlightSchedules);

/**
 * @route   GET /api/flight-schedules/:id
 * @desc    Get a flight schedule by ID
 * @access  Private
 */
router.get('/:id', FlightScheduleController.getFlightSchedule);

/**
 * @route   GET /api/flight-schedules/:id/allocations
 * @desc    Get allocations for a flight schedule
 * @access  Private
 */
router.get('/:id/allocations', FlightScheduleController.getScheduleAllocations);

/**
 * @route   GET /api/flight-schedules/:id/unallocated
 * @desc    Get unallocated flights for a schedule
 * @access  Private
 */
router.get('/:id/unallocated', FlightScheduleController.getUnallocatedFlights);

/**
 * @route   GET /api/flight-schedules/:id/utilization
 * @desc    Get utilization metrics for a schedule
 * @access  Private
 */
router.get('/:id/utilization', FlightScheduleController.getUtilizationMetrics);

/**
 * @route   GET /api/flight-schedules/:id/issues
 * @desc    Get allocation issues for a schedule
 * @access  Private
 */
router.get('/:id/issues', FlightScheduleController.getAllocationIssues);

/**
 * @route   GET /api/flight-schedules/:id/report
 * @desc    Get comprehensive report for a schedule
 * @access  Private
 */
router.get('/:id/report', FlightScheduleController.getScheduleReport);

/**
 * @route   PUT /api/flight-schedules/:id/status
 * @desc    Update status of a flight schedule
 * @access  Private
 */
router.put('/:id/status', FlightScheduleController.updateScheduleStatus);

module.exports = router; 