const ColumnMappingService = require('../services/ColumnMappingService');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Controller for column mapping operations
 */
class ColumnMappingController {
  constructor() {
    this.mappingService = new ColumnMappingService();
  }
  
  /**
   * Detect columns from an uploaded file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async detectColumns(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      const file = req.files.file;
      
      // Check file type (must be CSV)
      if (!file.name.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are supported' });
      }
      
      // Detect columns from the file data
      const columns = await this.mappingService.detectColumnsFromData(file.data.toString('utf8'));
      
      return res.json({
        success: true,
        columns
      });
    } catch (error) {
      console.error('Error detecting columns:', error);
      return res.status(500).json({ error: 'Failed to detect columns: ' + error.message });
    }
  }
  
  /**
   * Detect columns from an already uploaded file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async detectColumnsFromUpload(req, res) {
    try {
      const { uploadId } = req.params;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      // Get the upload record from database to find the file path
      const db = require('../db');
      const upload = await db('flight_uploads')
        .where({ id: uploadId })
        .first();
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      // Check if file exists
      if (!fs.existsSync(upload.file_path)) {
        return res.status(404).json({ error: 'Upload file not found on server' });
      }
      
      // Detect columns from the file
      const columns = await this.mappingService.detectColumns(upload.file_path);
      
      return res.json({
        success: true,
        columns
      });
    } catch (error) {
      console.error('Error detecting columns:', error);
      return res.status(500).json({ error: 'Failed to detect columns: ' + error.message });
    }
  }
  
  /**
   * Get required mapping fields
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMappingFields(req, res) {
    try {
      const fields = this.mappingService.getMappingFields();
      
      return res.json({
        success: true,
        fields
      });
    } catch (error) {
      console.error('Error getting mapping fields:', error);
      return res.status(500).json({ error: 'Failed to get mapping fields: ' + error.message });
    }
  }
  
  /**
   * Suggest mappings based on source columns
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async suggestMappings(req, res) {
    try {
      const { sourceColumns } = req.body;
      
      if (!sourceColumns || !Array.isArray(sourceColumns)) {
        return res.status(400).json({ error: 'Source columns are required as an array' });
      }
      
      const suggestions = this.mappingService.suggestMappings(sourceColumns);
      
      return res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      console.error('Error suggesting mappings:', error);
      return res.status(500).json({ error: 'Failed to suggest mappings: ' + error.message });
    }
  }
  
  /**
   * Apply mapping to transform data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async applyMapping(req, res) {
    try {
      const { uploadId, mappingProfile } = req.body;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      if (!mappingProfile || !mappingProfile.mappings) {
        return res.status(400).json({ error: 'Valid mapping profile is required' });
      }
      
      // Validate the mapping profile
      const validationResult = this.mappingService.validateMapping(mappingProfile);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          errors: validationResult.errors,
          message: 'Invalid mapping profile'
        });
      }
      
      // Get the upload record from database to find the file path
      const db = require('../db');
      const upload = await db('flight_uploads')
        .where({ id: uploadId })
        .first();
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      // Check if file exists
      if (!fs.existsSync(upload.file_path)) {
        return res.status(404).json({ error: 'Upload file not found on server' });
      }
      
      // Read and parse the CSV file
      const fileContent = fs.readFileSync(upload.file_path, 'utf8');
      const data = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Apply the mapping to transform the data
      const transformedData = this.mappingService.applyMapping(data, mappingProfile);
      
      // Save the transformed data to a new file
      const uploadsDir = path.dirname(upload.file_path);
      const mappedFilename = `mapped_${path.basename(upload.file_path)}`;
      const mappedFilePath = path.join(uploadsDir, mappedFilename);
      
      // Convert transformed data back to CSV
      const { stringify } = require('csv-stringify/sync');
      const csvContent = stringify(transformedData, {
        header: true,
        columns: Object.keys(transformedData[0] || {})
      });
      
      fs.writeFileSync(mappedFilePath, csvContent);
      
      // Update the upload record with the mapped file path
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({ 
          mapped_file_path: mappedFilePath,
          mapping_profile_id: mappingProfile.id || null,
          updated_at: new Date()
        });
      
      // If this is a saved profile, update its last used timestamp
      if (mappingProfile.id) {
        this.mappingService.updateLastUsed(mappingProfile.id).catch(error => {
          console.error('Error updating last used timestamp:', error);
        });
      }
      
      return res.json({
        success: true,
        message: 'Mapping applied successfully',
        rowCount: transformedData.length,
        mappedFilePath: mappedFilePath
      });
    } catch (error) {
      console.error('Error applying mapping:', error);
      return res.status(500).json({ error: 'Failed to apply mapping: ' + error.message });
    }
  }
  
  /**
   * Create a new mapping profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createMappingProfile(req, res) {
    try {
      const { name, description, mappings, transformations, isDefault } = req.body;
      
      if (!name || !mappings) {
        return res.status(400).json({ error: 'Name and mappings are required' });
      }
      
      // Create the profile
      const profileId = await this.mappingService.createMappingProfile({
        name,
        description,
        userId: req.user?.id,
        mappings,
        transformations,
        isDefault
      });
      
      return res.status(201).json({
        success: true,
        id: profileId,
        message: 'Mapping profile created successfully'
      });
    } catch (error) {
      console.error('Error creating mapping profile:', error);
      return res.status(500).json({ error: 'Failed to create mapping profile: ' + error.message });
    }
  }
  
  /**
   * Get a mapping profile by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMappingProfile(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      
      const profile = await this.mappingService.getMappingProfile(id);
      
      if (!profile) {
        return res.status(404).json({ error: 'Mapping profile not found' });
      }
      
      return res.json({
        success: true,
        profile
      });
    } catch (error) {
      console.error('Error getting mapping profile:', error);
      return res.status(500).json({ error: 'Failed to get mapping profile: ' + error.message });
    }
  }
  
  /**
   * Update a mapping profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateMappingProfile(req, res) {
    try {
      const { id } = req.params;
      const { name, description, mappings, transformations, isDefault } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      
      if (!name || !mappings) {
        return res.status(400).json({ error: 'Name and mappings are required' });
      }
      
      // Check if profile exists
      const existingProfile = await this.mappingService.getMappingProfile(id);
      
      if (!existingProfile) {
        return res.status(404).json({ error: 'Mapping profile not found' });
      }
      
      // Update the profile
      const success = await this.mappingService.updateMappingProfile(id, {
        name,
        description,
        mappings,
        transformations,
        isDefault
      });
      
      return res.json({
        success,
        message: success ? 'Mapping profile updated successfully' : 'Failed to update mapping profile'
      });
    } catch (error) {
      console.error('Error updating mapping profile:', error);
      return res.status(500).json({ error: 'Failed to update mapping profile: ' + error.message });
    }
  }
  
  /**
   * Delete a mapping profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteMappingProfile(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      
      // Check if profile exists
      const existingProfile = await this.mappingService.getMappingProfile(id);
      
      if (!existingProfile) {
        return res.status(404).json({ error: 'Mapping profile not found' });
      }
      
      // Delete the profile
      const success = await this.mappingService.deleteMappingProfile(id);
      
      return res.json({
        success,
        message: success ? 'Mapping profile deleted successfully' : 'Failed to delete mapping profile'
      });
    } catch (error) {
      console.error('Error deleting mapping profile:', error);
      return res.status(500).json({ error: 'Failed to delete mapping profile: ' + error.message });
    }
  }
  
  /**
   * List all mapping profiles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async listMappingProfiles(req, res) {
    try {
      const userId = req.user?.id;
      const profiles = await this.mappingService.listMappingProfiles(userId);
      
      return res.json({
        success: true,
        profiles
      });
    } catch (error) {
      console.error('Error listing mapping profiles:', error);
      return res.status(500).json({ error: 'Failed to list mapping profiles: ' + error.message });
    }
  }
}

module.exports = new ColumnMappingController(); 