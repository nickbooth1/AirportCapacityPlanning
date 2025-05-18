/**
 * Scenario Controller
 * Handles API requests related to flight schedule scenarios and allocations
 */

const db = require('../db');
const FlightProcessorService = require('../services/FlightProcessorService');

// Create an instance of the service
const flightProcessorService = new FlightProcessorService();

class ScenarioController {
  /**
   * Create a new scenario
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createScenario(req, res) {
    try {
      const { name, description, uploadId } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Scenario name is required'
        });
      }
      
      if (!uploadId) {
        return res.status(400).json({
          success: false,
          message: 'Upload ID is required'
        });
      }
      
      // Check if the upload exists
      const upload = await db('flight_uploads').where('id', uploadId).first();
      
      if (!upload) {
        return res.status(404).json({
          success: false,
          message: `Upload with ID ${uploadId} not found`
        });
      }
      
      // Create the scenario record
      const result = await db('allocation_scenarios').insert({
        name,
        description: description || '',
        upload_id: uploadId,
        status: 'created',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      
      // Handle different database return formats (PostgreSQL vs SQLite)
      let scenarioId;
      if (Array.isArray(result) && result.length > 0) {
        // PostgreSQL returns array of objects or array of values
        scenarioId = typeof result[0] === 'object' ? result[0].id : result[0];
      } else {
        // For other databases that don't support returning
        scenarioId = result;
      }
      
      console.log(`Created scenario ${scenarioId} for upload ${uploadId}`);
      
      // Get the complete scenario
      const scenario = await db('allocation_scenarios').where('id', scenarioId).first();
      
      res.status(201).json({
        success: true,
        message: 'Scenario created successfully',
        id: scenarioId,
        data: scenario
      });
    } catch (error) {
      console.error('Error creating scenario:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating scenario',
        error: error.message
      });
    }
  }
  
  /**
   * List all scenarios
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async listScenarios(req, res) {
    try {
      const { uploadId, status } = req.query;
      
      // Build query
      let query = db('allocation_scenarios')
        .select('*')
        .orderBy('created_at', 'desc');
      
      // Apply filters if provided
      if (uploadId) {
        query = query.where('upload_id', uploadId);
      }
      
      if (status) {
        query = query.where('status', status);
      }
      
      // Execute query
      const scenarios = await query;
      
      res.status(200).json({
        success: true,
        data: scenarios
      });
    } catch (error) {
      console.error('Error listing scenarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing scenarios',
        error: error.message
      });
    }
  }
  
  /**
   * Get a scenario by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScenario(req, res) {
    try {
      const { id } = req.params;
      
      // Get scenario from database
      const scenario = await db('allocation_scenarios').where('id', id).first();
      
      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: `Scenario with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: scenario
      });
    } catch (error) {
      console.error('Error getting scenario:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting scenario',
        error: error.message
      });
    }
  }
  
  /**
   * Run allocation for a scenario
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async runAllocation(req, res) {
    try {
      const { id } = req.params;
      const { allocationSettings } = req.body;
      
      // Get scenario from database
      const scenario = await db('allocation_scenarios').where('id', id).first();
      
      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: `Scenario with ID ${id} not found`
        });
      }
      
      // Start the allocation in background
      // Update scenario status
      await db('allocation_scenarios')
        .where('id', id)
        .update({
          status: 'processing',
          updated_at: new Date()
        });
      
      // Create a flight schedule from the upload if it doesn't exist
      let scheduleId = scenario.schedule_id;
      
      if (!scheduleId) {
        // Start creating a flight schedule and allocating flights
        console.log(`Creating flight schedule from upload ${scenario.upload_id} for scenario ${id}`);
        
        try {
          // Process the flight schedule in the background
          // This is a non-blocking call
          flightProcessorService.processFlightSchedule(
            scenario.upload_id,
            {
              skipValidation: false,
              skipAllocation: false,
              allocationSettings: allocationSettings || {},
              scenarioId: id
            }
          ).then(async (result) => {
            console.log(`Allocation completed for scenario ${id} with result:`, result);
            
            // Update scenario with schedule ID and status
            await db('allocation_scenarios')
              .where('id', id)
              .update({
                schedule_id: result.scheduleId,
                status: 'completed',
                completion_time: new Date(),
                updated_at: new Date()
              });
          }).catch(async (error) => {
            console.error(`Allocation failed for scenario ${id}:`, error);
            
            // Update scenario with error status
            await db('allocation_scenarios')
              .where('id', id)
              .update({
                status: 'failed',
                error_message: error.message.substring(0, 255),
                updated_at: new Date()
              });
          });
          
          // Return immediately since processing is async
          res.status(202).json({
            success: true,
            message: 'Allocation started',
            id,
            status: 'processing'
          });
        } catch (processingError) {
          console.error(`Error starting allocation process for scenario ${id}:`, processingError);
          
          // Update scenario with error status
          await db('allocation_scenarios')
            .where('id', id)
            .update({
              status: 'failed',
              error_message: processingError.message.substring(0, 255),
              updated_at: new Date()
            });
          
          throw processingError;
        }
      } else {
        // Schedule already exists, return it
        res.status(200).json({
          success: true,
          message: 'Flight schedule already created',
          id,
          scheduleId
        });
      }
    } catch (error) {
      console.error('Error running allocation:', error);
      res.status(500).json({
        success: false,
        message: 'Error running allocation',
        error: error.message
      });
    }
  }
  
  /**
   * Get the status of a scenario
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScenarioStatus(req, res) {
    try {
      const { id } = req.params;
      
      // Get scenario from database
      const scenario = await db('allocation_scenarios').where('id', id).first();
      
      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: `Scenario with ID ${id} not found`
        });
      }
      
      // If scenario has a schedule ID, get more details about the schedule
      let additionalData = {};
      
      if (scenario.schedule_id) {
        const schedule = await db('flight_schedules')
          .where('id', scenario.schedule_id)
          .first();
          
        if (schedule) {
          // Get allocation stats
          const [allocatedCount] = await db('stand_allocations')
            .where('schedule_id', schedule.id)
            .count('* as count');
            
          const [unallocatedCount] = await db('unallocated_flights')
            .where('schedule_id', schedule.id)
            .count('* as count');
          
          additionalData = {
            schedule,
            stats: {
              allocatedCount: parseInt(allocatedCount.count, 10),
              unallocatedCount: parseInt(unallocatedCount.count, 10),
              allocationRate: allocatedCount.count > 0 || unallocatedCount.count > 0
                ? parseFloat((allocatedCount.count / (allocatedCount.count + unallocatedCount.count) * 100).toFixed(2))
                : 0
            }
          };
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          ...scenario,
          ...additionalData
        }
      });
    } catch (error) {
      console.error('Error getting scenario status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting scenario status',
        error: error.message
      });
    }
  }
}

module.exports = new ScenarioController(); 