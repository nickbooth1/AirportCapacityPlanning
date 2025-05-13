const path = require('path');
const fs = require('fs');
const FlightUploadService = require('../services/FlightUploadService');
const FlightValidationService = require('../services/FlightValidationService');

class FlightUploadController {
  /**
   * Handle file upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadFile(req, res) {
    try {
      console.log('Upload request received:', {
        hasFiles: !!req.files,
        filesKeys: req.files ? Object.keys(req.files) : 'none',
        body: req.body
      });
      
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No file was uploaded' });
      }

      const file = req.files.file;
      const displayName = req.body.displayName; // Get custom display name if provided
      
      console.log('Received file upload request:', {
        filename: file.name,
        size: file.size, 
        displayName: displayName || file.name,
        mimetype: file.mimetype
      });
      
      // Check file type (must be CSV)
      if (!file.name.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }
      
      // Check file size (max 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File size exceeds the 50MB limit' });
      }
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../data/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${file.name}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      console.log('Moving file to:', filePath);
      
      try {
        // Save file to server
        await file.mv(filePath);
        console.log('File moved successfully');
      } catch (mvError) {
        console.error('Error moving file:', mvError);
        return res.status(500).json({ error: `Error saving file: ${mvError.message}` });
      }
      
      try {
        // Record upload in database (removing user_id reference)
        const uploadService = new FlightUploadService();
        const uploadId = await uploadService.recordUpload({
          filename: file.name,
          displayName: displayName || file.name, // Use custom display name if provided
          filePath: filePath,
          fileSize: file.size
        });
        
        console.log(`File uploaded with ID: ${uploadId}, starting processing`);
        
        // Start processing the file in the background
        uploadService.processUpload(uploadId, filePath).catch(error => {
          console.error(`Error processing upload ${uploadId}:`, error);
        });
        
        return res.status(201).json({ 
          id: uploadId,
          status: 'pending',
          message: 'File uploaded successfully and is being processed' 
        });
      } catch (dbError) {
        console.error('Database error during upload:', dbError);
        return res.status(500).json({ error: `Database error: ${dbError.message}` });
      }
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ error: `File upload failed: ${error.message}` });
    }
  }
  
  /**
   * Initialize a chunked upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initializeChunkedUpload(req, res) {
    try {
      console.log('Initialize chunked upload request:', {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'No files',
        user: req.user
      });
      
      const { fileName, fileSize, chunkSize, totalChunks, displayName } = req.body;
      
      if (!fileName || !fileSize || !chunkSize || !totalChunks) {
        console.log('Missing required parameters:', { fileName, fileSize, chunkSize, totalChunks });
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Check file name (must be CSV)
      if (!fileName.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }
      
      // Check file size (max 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      if (parseInt(fileSize, 10) > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File size exceeds the 50MB limit' });
      }
      
      try {
        // Create uploads directory and chunks subdirectory if they don't exist
        const uploadsDir = path.join(__dirname, '../../data/uploads');
        const chunksDir = path.join(uploadsDir, 'chunks');
        
        console.log('Creating upload directories:', { uploadsDir, chunksDir });
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        if (!fs.existsSync(chunksDir)) {
          fs.mkdirSync(chunksDir, { recursive: true });
        }
        
        // Generate a unique ID for this upload
        const timestamp = Date.now();
        const uploadId = `${timestamp}_${req.user ? req.user.id : 'anonymous'}`;
        
        // Create directory for this upload's chunks
        const uploadChunksDir = path.join(chunksDir, uploadId);
        console.log('Creating upload chunks directory:', { uploadChunksDir });
        fs.mkdirSync(uploadChunksDir, { recursive: true });
        
        // Record upload in database - pass display name if provided
        console.log('Recording chunked upload in database');
        const uploadService = new FlightUploadService();
        const dbUploadId = await uploadService.recordChunkedUpload({
          uploadId,
          filename: fileName,
          displayName: displayName || fileName, // Use displayName if provided, otherwise fileName
          fileSize: parseInt(fileSize, 10),
          chunkSize: parseInt(chunkSize, 10),
          totalChunks: parseInt(totalChunks, 10),
          userId: req.user ? req.user.id : 'anonymous',
          chunksPath: uploadChunksDir
        });
        
        console.log('Chunked upload initialized successfully:', { uploadId, dbUploadId });
        return res.status(201).json({
          id: uploadId,
          dbId: dbUploadId,
          chunkSize: parseInt(chunkSize, 10),
          message: 'Chunked upload initialized'
        });
      } catch (err) {
        console.error('Error during directory or database operations:', err);
        throw err;
      }
    } catch (error) {
      console.error('Error initializing chunked upload:', error);
      console.error(error.stack);
      return res.status(500).json({ error: 'Failed to initialize chunked upload: ' + error.message });
    }
  }
  
  /**
   * Upload a chunk of a file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadChunk(req, res) {
    try {
      if (!req.files || !req.files.chunkData) {
        return res.status(400).json({ error: 'No chunk data provided' });
      }
      
      const { uploadId, chunkIndex, chunkTotal } = req.body;
      
      if (!uploadId || chunkIndex === undefined || !chunkTotal) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const chunkIndexNumber = parseInt(chunkIndex, 10);
      const chunkFile = req.files.chunkData;
      
      // Validate upload exists
      const uploadService = new FlightUploadService();
      const upload = await uploadService.getChunkedUploadByExternalId(uploadId);
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      // Ensure the chunks directory exists
      const chunksDir = path.join(__dirname, '../../data/uploads/chunks', uploadId);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }
      
      // Save the chunk
      const chunkPath = path.join(chunksDir, `chunk_${chunkIndexNumber}`);
      await chunkFile.mv(chunkPath);
      
      // Update chunk status in database
      await uploadService.updateChunkStatus(uploadId, chunkIndexNumber);
      
      return res.status(200).json({
        success: true,
        chunkIndex: chunkIndexNumber,
        message: `Chunk ${chunkIndexNumber} uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading chunk:', error);
      return res.status(500).json({ error: 'Failed to upload chunk' });
    }
  }
  
  /**
   * Finalize a chunked upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async finalizeChunkedUpload(req, res) {
    try {
      const { uploadId } = req.body;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      console.log(`Finalizing upload for ID: ${uploadId}`);
      
      // Validate upload exists
      const uploadService = new FlightUploadService();
      const upload = await uploadService.getChunkedUploadByExternalId(uploadId);
      
      if (!upload) {
        console.error(`Upload not found: ${uploadId}`);
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      console.log(`Found upload record:`, {
        id: upload.id,
        filename: upload.filename,
        chunksPath: upload.chunks_path,
        totalChunks: upload.total_chunks,
        uploadedChunks: upload.uploaded_chunks
      });
      
      // Check if all chunks have been uploaded before finalizing
      if (upload.uploaded_chunks < upload.total_chunks) {
        console.error(`Not all chunks uploaded: ${upload.uploaded_chunks}/${upload.total_chunks}`);
        return res.status(400).json({ 
          error: `Not all chunks have been uploaded (${upload.uploaded_chunks}/${upload.total_chunks})` 
        });
      }
      
      try {
        // Combine chunks and process the file
        const result = await uploadService.finalizeChunkedUpload(uploadId);
        console.log(`Successfully finalized upload: ${uploadId}`, result);
        
        // Start processing the file in the background
        uploadService.processUpload(upload.id, result).catch(error => {
          console.error(`Error processing upload ${upload.id}:`, error);
        });
        
        return res.status(200).json({
          success: true,
          id: upload.id,
          status: 'processing',
          message: 'Upload finalized, processing started'
        });
      } catch (finalizeError) {
        console.error(`Error in finalization process:`, finalizeError);
        return res.status(500).json({ error: 'Failed to finalize chunked upload: ' + finalizeError.message });
      }
    } catch (error) {
      console.error('Error finalizing chunked upload:', error);
      return res.status(500).json({ error: 'Failed to finalize chunked upload: ' + error.message });
    }
  }
  
  /**
   * Abort a chunked upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async abortChunkedUpload(req, res) {
    try {
      const { uploadId } = req.body;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      // Validate upload exists
      const uploadService = new FlightUploadService();
      const upload = await uploadService.getChunkedUploadByExternalId(uploadId);
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      // Delete chunks and update database
      await uploadService.abortChunkedUpload(uploadId);
      
      return res.status(200).json({
        success: true,
        message: 'Upload aborted'
      });
    } catch (error) {
      console.error('Error aborting chunked upload:', error);
      return res.status(500).json({ error: 'Failed to abort chunked upload' });
    }
  }
  
  /**
   * Get status of a chunked upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChunkedUploadStatus(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      // Get upload status
      const uploadService = new FlightUploadService();
      const status = await uploadService.getChunkedUploadStatus(id);
      
      if (!status) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      return res.json(status);
    } catch (error) {
      console.error('Error getting chunked upload status:', error);
      return res.status(500).json({ error: 'Failed to get upload status' });
    }
  }
  
  /**
   * Check processing status of an upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUploadStatus(req, res) {
    try {
      const { id } = req.params;
      
      const uploadService = new FlightUploadService();
      const status = await uploadService.getUploadStatus(id);
      
      if (!status) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      return res.json(status);
    } catch (error) {
      console.error('Error getting upload status:', error);
      return res.status(500).json({ error: 'Failed to get upload status' });
    }
  }
  
  /**
   * Get validation results for an upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getValidationResults(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100, flightNature, validationStatus, sort, direction } = req.query;
      
      const validationService = new FlightValidationService();
      const results = await validationService.getValidationResults(id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        flightNature,
        validationStatus,
        sort,
        direction
      });
      
      if (!results) {
        return res.status(404).json({ error: 'Upload not found or validation results not available' });
      }
      
      return res.json(results);
    } catch (error) {
      console.error('Error getting validation results:', error);
      return res.status(500).json({ error: 'Failed to get validation results' });
    }
  }
  
  /**
   * Approve flights for import
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async approveFlights(req, res) {
    try {
      const { id } = req.params;
      const { flightIds, approveAll, excludeInvalid } = req.body;
      
      if (!approveAll && (!flightIds || !Array.isArray(flightIds) || flightIds.length === 0)) {
        return res.status(400).json({ error: 'No flights specified for approval' });
      }
      
      const uploadService = new FlightUploadService();
      const result = await uploadService.approveFlights(id, {
        flightIds,
        approveAll: Boolean(approveAll),
        excludeInvalid: Boolean(excludeInvalid)
      });
      
      return res.json(result);
    } catch (error) {
      console.error('Error approving flights:', error);
      return res.status(500).json({ error: 'Failed to approve flights' });
    }
  }
  
  /**
   * Get list of all uploads
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object 
   */
  async getUploadsList(req, res) {
    try {
      const uploadService = new FlightUploadService();
      const uploads = await uploadService.getAllUploads();
      
      return res.json({
        success: true,
        data: uploads
      });
    } catch (error) {
      console.error('Error getting uploads list:', error);
      return res.status(500).json({ error: 'Failed to get uploads list' });
    }
  }

  /**
   * Delete a flight upload and all associated data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteFlightUpload(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }
      
      const uploadService = new FlightUploadService();
      const result = await uploadService.deleteFlightUpload(parseInt(id, 10));
      
      return res.json({
        success: true,
        message: `Upload ID ${id} and ${result.deletedFlights} associated flights deleted successfully`,
        ...result
      });
    } catch (error) {
      console.error('Error deleting flight upload:', error);
      return res.status(500).json({ error: 'Failed to delete flight upload: ' + error.message });
    }
  }
}

module.exports = new FlightUploadController(); 