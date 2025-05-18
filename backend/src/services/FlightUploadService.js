const db = require('../db');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { performance } = require('perf_hooks');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);
const os = require('os');

/**
 * Memory usage monitoring
 * @returns {Object} Current memory usage metrics
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // RSS in MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // Total heap in MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // Used heap in MB
    external: Math.round(usage.external / 1024 / 1024) // External memory in MB
  };
}

class FlightUploadService {
  /**
   * Record a file upload in the database
   * @param {Object} uploadInfo - Upload information
   * @param {string} uploadInfo.filename - Original filename
   * @param {string} uploadInfo.displayName - Custom display name for the upload
   * @param {string} uploadInfo.filePath - Path to uploaded file
   * @param {number} uploadInfo.fileSize - File size in bytes
   * @returns {Promise<number>} Upload ID
   */
  async recordUpload(uploadInfo) {
    const { filename, displayName, filePath, fileSize } = uploadInfo;
    
    try {
      console.log('Recording upload with info:', { filename, displayName, fileSize });
      
      // Using returning to explicitly get the ID back
      const result = await db('flight_uploads').insert({
        filename,
        display_name: displayName, // Store the custom display name
        file_path: filePath,
        file_size: fileSize,
        upload_status: 'pending',
        created_at: new Date()
      }).returning('id');
      
      // Handle different database return formats (PostgreSQL vs SQLite)
      let id;
      if (Array.isArray(result) && result.length > 0) {
        // PostgreSQL returns array of objects
        id = result[0].id || result[0];
      } else if (typeof result === 'number') {
        // SQLite might return just the number
        id = result;
      } else {
        // Fallback - get the last inserted ID
        const lastInsertResult = await db('flight_uploads')
          .select('id')
          .orderBy('id', 'desc')
          .first();
        id = lastInsertResult.id;
      }
      
      console.log(`Upload recorded with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error recording upload:', error);
      throw error;
    }
  }
  
  /**
   * Record a chunked upload in the database
   * @param {Object} uploadInfo - Upload information
   * @param {string} uploadInfo.uploadId - External upload ID
   * @param {string} uploadInfo.filename - Original filename
   * @param {string} uploadInfo.displayName - Custom display name for the upload
   * @param {number} uploadInfo.fileSize - File size in bytes
   * @param {number} uploadInfo.chunkSize - Chunk size in bytes
   * @param {number} uploadInfo.totalChunks - Total number of chunks
   * @param {string} uploadInfo.chunksPath - Path to chunks directory
   * @returns {Promise<number>} Upload ID
   */
  async recordChunkedUpload(uploadInfo) {
    const { 
      uploadId, 
      filename, 
      displayName,
      fileSize, 
      chunkSize, 
      totalChunks,
      chunksPath 
    } = uploadInfo;
    
    try {
      console.log('Recording chunked upload with info:', { 
        uploadId, 
        filename, 
        displayName,
        fileSize, 
        chunkSize, 
        totalChunks,
        chunksPath 
      });
      
      // Using returning to explicitly get the ID back
      const result = await db('flight_uploads').insert({
        external_id: uploadId,
        filename,
        display_name: displayName, // Store the custom display name
        file_size: fileSize,
        upload_status: 'uploading',
        upload_type: 'chunked',
        total_chunks: totalChunks,
        uploaded_chunks: 0,
        chunks_path: chunksPath,
        created_at: new Date()
      }).returning('id');
      
      // Handle different database return formats (PostgreSQL vs SQLite)
      let id;
      if (Array.isArray(result) && result.length > 0) {
        // PostgreSQL returns array of objects
        id = result[0].id || result[0];
      } else if (typeof result === 'number') {
        // SQLite might return just the number
        id = result;
      } else {
        // Fallback - get the last inserted ID
        const lastInsertResult = await db('flight_uploads')
          .select('id')
          .orderBy('id', 'desc')
          .first();
        id = lastInsertResult.id;
      }
      
      console.log(`Chunked upload recorded with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error recording chunked upload:', error);
      throw error;
    }
  }
  
  /**
   * Get upload by external ID (used for chunked uploads)
   * @param {string} externalId - External upload ID
   * @returns {Promise<Object>} - Upload record
   */
  async getChunkedUploadByExternalId(externalId) {
    return db('flight_uploads')
      .where({ external_id: externalId })
      .first();
  }
  
  /**
   * Update chunk status in the database
   * @param {string} uploadId - External upload ID
   * @param {number} chunkIndex - Index of the uploaded chunk
   * @returns {Promise<void>}
   */
  async updateChunkStatus(uploadId, chunkIndex) {
    // Get current upload record
    const upload = await this.getChunkedUploadByExternalId(uploadId);
    
    if (!upload) {
      throw new Error(`Upload with ID ${uploadId} not found`);
    }
    
    // Update uploaded chunks count
    await db('flight_uploads')
      .where({ id: upload.id })
      .increment('uploaded_chunks', 1);
      
    return;
  }
  
  /**
   * Get status of a chunked upload
   * @param {string} uploadId - External upload ID
   * @returns {Promise<Object>} - Status object
   */
  async getChunkedUploadStatus(uploadId) {
    const upload = await this.getChunkedUploadByExternalId(uploadId);
    
    if (!upload) {
      return null;
    }
    
    // Check which chunks are uploaded by listing the files in the chunks directory
    const chunksDir = upload.chunks_path;
    const uploadedChunks = [];
    
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      for (const file of files) {
        if (file.startsWith('chunk_')) {
          const chunkIndex = parseInt(file.replace('chunk_', ''), 10);
          uploadedChunks.push(chunkIndex);
        }
      }
    }
    
    return {
      uploadId,
      filename: upload.filename,
      status: upload.upload_status,
      fileSize: upload.file_size,
      chunkSize: upload.chunk_size,
      totalChunks: upload.total_chunks,
      uploadedChunks: uploadedChunks,
      uploadedChunksCount: upload.uploaded_chunks,
      progress: Math.round((upload.uploaded_chunks / upload.total_chunks) * 100)
    };
  }
  
  /**
   * Finalize a chunked upload by combining chunks into a single file
   * @param {string} uploadId - External upload ID
   * @returns {Promise<string>} - Path to the combined file
   */
  async finalizeChunkedUpload(uploadId) {
    try {
      // Get upload record
      const upload = await db('flight_uploads')
        .where({ external_id: uploadId })
        .first();
      
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }
      
      // Check if all chunks have been uploaded
      if (upload.uploaded_chunks !== upload.total_chunks) {
        throw new Error(`Not all chunks uploaded (${upload.uploaded_chunks}/${upload.total_chunks})`);
      }
      
      // Define paths - use the chunks_path from the database record
      const chunksDir = upload.chunks_path;
      const uploadsDir = path.join(__dirname, '../../data/uploads');
      
      console.log(`Finalizing chunked upload: ${uploadId}`, {
        chunksDir,
        uploadsDir,
        totalChunks: upload.total_chunks,
        uploadedChunks: upload.uploaded_chunks
      });
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Define output path
      const outputPath = path.join(uploadsDir, `${uploadId}_${upload.filename}`);
      
      // Create write stream for combined file
      const outputStream = fs.createWriteStream(outputPath);
      
      // Check if chunks directory exists
      if (!fs.existsSync(chunksDir)) {
        throw new Error(`Chunks directory ${chunksDir} not found`);
      }
      
      // List all chunks to ensure they're all there
      const chunkFiles = fs.readdirSync(chunksDir);
      console.log(`Found ${chunkFiles.length} chunk files in ${chunksDir}:`, chunkFiles);
      
      // Sort chunk files numerically to ensure proper order
      const sortedChunks = chunkFiles
        .filter(name => name.startsWith('chunk_'))
        .map(name => {
          const chunkNumber = parseInt(name.replace('chunk_', ''), 10);
          return { name, number: chunkNumber };
        })
        .sort((a, b) => a.number - b.number);
      
      console.log(`Sorted chunks for processing:`, sortedChunks.map(c => c.name));
      
      // Verify that all expected chunks exist before starting to combine them
      const missingChunks = [];
      for (let i = 0; i < upload.total_chunks; i++) {
        if (!sortedChunks.some(chunk => chunk.number === i)) {
          missingChunks.push(i);
        }
      }
      
      if (missingChunks.length > 0) {
        throw new Error(`Missing chunks: ${missingChunks.join(', ')}`);
      }
      
      // Combine chunks in order with streaming for memory efficiency
      for (const chunk of sortedChunks) {
        const chunkPath = path.join(chunksDir, `chunk_${chunk.number}`);
        console.log(`Processing chunk ${chunk.number} from ${chunkPath}`);
        
        try {
          const chunkData = await fs.promises.readFile(chunkPath);
          outputStream.write(chunkData);
        } catch (err) {
          console.error(`Error processing chunk ${chunk.number}:`, err);
          throw new Error(`Failed to process chunk ${chunk.number}: ${err.message}`);
        }
      }
      
      // Close the output stream
      outputStream.end();
      
      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
      });
      
      console.log(`Finished writing combined file to ${outputPath}`);
      
      // Update file path in database
      await db('flight_uploads')
        .where({ id: upload.id })
        .update({
          file_path: outputPath,
          upload_status: 'processing',
          updated_at: new Date()
        });
      
      return outputPath;
    } catch (error) {
      console.error(`Error finalizing chunked upload ${uploadId}:`, error);
      throw error;
    }
  }
  
  /**
   * Abort a chunked upload
   * @param {string} uploadId - External upload ID
   * @returns {Promise<void>}
   */
  async abortChunkedUpload(uploadId) {
    const upload = await this.getChunkedUploadByExternalId(uploadId);
    
    if (!upload) {
      throw new Error(`Upload with ID ${uploadId} not found`);
    }
    
    // Delete chunks directory
    if (fs.existsSync(upload.chunks_path)) {
      fs.rmSync(upload.chunks_path, { recursive: true, force: true });
    }
    
    // Update upload status
    await db('flight_uploads')
      .where({ id: upload.id })
      .update({
        upload_status: 'failed'
      });
      
    return;
  }
  
  /**
   * Get upload by ID
   * @param {number} id - Upload ID
   * @returns {Promise<Object>} - Upload record
   */
  async getUploadById(id) {
    return db('flight_uploads').where({ id }).first();
  }
  
  /**
   * Process a flight upload by parsing and saving flight data to the database
   * @param {number} uploadId - Upload ID
   * @param {string} filePath - Path to mapped CSV file (already column-mapped)
   * @returns {Promise<Object>} Processing result
   */
  async processUpload(uploadId, filePath) {
    const self = this;
    const db = require('../db');
    const BATCH_SIZE = 1000;
    
    try {
      console.log(`[DEBUG] Starting to process upload ${uploadId} with file: ${filePath}`);
      
      // Validate parameters
      if (!uploadId) {
        throw new Error('Upload ID is required');
      }
      
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`File path is invalid or file doesn't exist: ${filePath}`);
      }
      
      // Update upload status to processing
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({
          upload_status: 'processing',
          updated_at: new Date()
        });
      
      // Memory usage tracking
      const startTime = Date.now();
      const startMemory = getMemoryUsage();
      
      console.log(`Starting upload processing for ID: ${uploadId}`);
      console.log(`Initial memory usage: ${startMemory.heapUsed}MB`);
      
      // Read the mapped CSV file
      console.log(`Reading mapped CSV file: ${filePath}`);
      
      // Debugging: Get first 5 rows of file to check content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n').slice(0, 5);
      console.log(`[DEBUG] First 5 lines of mapped file:\n${lines.join('\n')}`);
      
      // Stream and parse the CSV file to avoid loading everything into memory
      let totalProcessed = 0;
      let batch = [];
      let lastReportTime = Date.now();
      
      // Bind method to avoid context issues in the stream processing
      const boundSaveFlightBatch = this.saveFlightBatch.bind(this);
      
      // Process file in streaming mode
      await new Promise((resolve, reject) => {
        const parser = csv({
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        // Handle parsing errors
        parser.on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        });
        
        const pipeline = fs.createReadStream(filePath)
          .pipe(parser)
          .pipe(
            new stream.Transform({
              objectMode: true,
              async transform(chunk, encoding, callback) {
                try {
                  // Log the incoming data for debugging
                  if (totalProcessed < 5) {
                    console.log(`[DEBUG] Processing row ${totalProcessed}:`, JSON.stringify(chunk));
                  }
                  
                  // Handle different field naming conventions (camelCase or snake_case)
                  // This is a flexible field mapper that tries various formats
                  const getFieldValue = (camelCaseKey, snakeCaseKey) => {
                    // Try the camelCase key directly
                    if (chunk[camelCaseKey] !== undefined) return chunk[camelCaseKey];
                    
                    // Try the snake_case key
                    if (chunk[snakeCaseKey] !== undefined) return chunk[snakeCaseKey];
                    
                    // Try lowercase version of camelCase key
                    if (chunk[camelCaseKey.toLowerCase()] !== undefined) return chunk[camelCaseKey.toLowerCase()];
                    
                    // Try uppercase version of keys
                    if (chunk[camelCaseKey.toUpperCase()] !== undefined) return chunk[camelCaseKey.toUpperCase()];
                    if (chunk[snakeCaseKey.toUpperCase()] !== undefined) return chunk[snakeCaseKey.toUpperCase()];
                    
                    // Not found in any format
                    return null;
                  };
                  
                  // Handle date/time fields
                  let scheduledTime = null;
                  let estimatedTime = null;
                  
                  // Parse scheduled time (using ISO format directly if available)
                  const scheduledTimeValue = getFieldValue('ScheduledTime', 'scheduled_datetime');
                  if (scheduledTimeValue) {
                    try {
                      if (scheduledTimeValue.includes('T')) {
                        // Already in ISO format - parse directly
                        scheduledTime = new Date(scheduledTimeValue);
                        if (isNaN(scheduledTime.getTime())) {
                          throw new Error('Invalid date format');
                        }
                        console.log(`[DEBUG] Parsed ISO date: ${scheduledTime.toISOString()} from ${scheduledTimeValue}`);
                      } else {
                        throw new Error('Non-ISO format needs additional handling');
                      }
                    } catch (error) {
                      console.log(`[DEBUG] Failed to parse scheduled time: ${scheduledTimeValue}`);
                      scheduledTime = new Date(); // Default to current time
                    }
                  }
                  
                  // Parse estimated time
                  const estimatedTimeValue = getFieldValue('EstimatedTime', 'estimated_datetime');
                  if (estimatedTimeValue) {
                    try {
                      if (estimatedTimeValue.includes('T')) {
                        // Already in ISO format - parse directly
                        estimatedTime = new Date(estimatedTimeValue);
                        if (isNaN(estimatedTime.getTime())) {
                          throw new Error('Invalid date format');
                        }
                        console.log(`[DEBUG] Parsed ISO date: ${estimatedTime.toISOString()} from ${estimatedTimeValue}`);
                      } else {
                        throw new Error('Non-ISO format needs additional handling');
                      }
                    } catch (error) {
                      console.log(`[DEBUG] Failed to parse estimated time: ${estimatedTimeValue}`);
                      estimatedTime = null;
                    }
                  }
                  
                  // If no scheduled time was found, set a default to avoid database errors
                  if (!scheduledTime) {
                    scheduledTime = new Date();
                    console.log(`[DEBUG] No scheduled time found for a row, using current time as default: ${scheduledTime}`);
                  }
                  
                  // Get field values using our flexible getter
                  const airlineIATA = getFieldValue('AirlineIATA', 'airline_iata');
                  const flightNumber = getFieldValue('FlightNumber', 'flight_number');
                  const flightNature = getFieldValue('FlightNature', 'flight_nature');
                  const destinationIATA = getFieldValue('DestinationIATA', 'origin_destination_iata');
                  const aircraftTypeIATA = getFieldValue('AircraftTypeIATA', 'aircraft_type_iata');
                  const terminal = getFieldValue('Terminal', 'terminal');
                  const seatCapacity = getFieldValue('SeatCapacity', 'seat_capacity');
                  
                  // Debug the mapped fields
                  console.log(`[DEBUG] Airline: ${airlineIATA}, FlightNumber: ${flightNumber}, AircraftType: ${aircraftTypeIATA}`);
                  
                  // Map the CSV columns to database fields
                  const flightRecord = {
                    upload_id: uploadId,
                    airline_iata: (airlineIATA && airlineIATA.trim()) || 'UNKN',
                    flight_number: (flightNumber && flightNumber.trim()) || 'UNKN',
                    scheduled_datetime: scheduledTime,
                    estimated_datetime: estimatedTime,
                    flight_nature: (flightNature && flightNature.trim().toUpperCase() === 'A') ? 'A' : 'D',
                    origin_destination_iata: (destinationIATA && destinationIATA.trim()) || 'UNKN',
                    aircraft_type_iata: self._mapAircraftTypeCode((aircraftTypeIATA && aircraftTypeIATA.trim()) || 'UNKN'),
                    terminal: (terminal && terminal.trim()) || null,
                    seat_capacity: seatCapacity ? parseInt(seatCapacity, 10) : null,
                    validation_status: 'new', // Always use 'new' for initial status
                    is_approved: false
                  };
                  
                  // Debug the flightRecord
                  if (totalProcessed < 5) {
                    console.log(`[DEBUG] Flight record for database:`, JSON.stringify(flightRecord));
                  }
                  
                  // Add to batch
                  batch.push(flightRecord);
                  
                  // Process batch when it reaches the specified size
                  if (batch.length >= BATCH_SIZE) {
                    await boundSaveFlightBatch(batch);
                    totalProcessed += batch.length;
                    batch = [];
                    
                    // Release event loop to prevent blocking
                    setImmediate(() => callback());
                    
                    // Log progress periodically (every 5 seconds or 10,000 records)
                    const currentTime = Date.now();
                    if (currentTime - lastReportTime > 5000 || totalProcessed % 10000 === 0) {
                      const currentMemory = getMemoryUsage();
                      console.log(`Processed ${totalProcessed} records. Memory usage: ${currentMemory.heapUsed}MB`);
                      lastReportTime = currentTime;
                      
                      // Force garbage collection if memory usage is high (Node with --expose-gc flag)
                      if (global.gc && currentMemory.heapUsed > 500) {
                        global.gc();
                      }
                    }
                  } else {
                    callback();
                  }
                } catch (error) {
                  console.error('[DEBUG] Error processing row:', error, chunk);
                  callback(error);
                }
              },
              flush: async function(callback) {
                try {
                  // Process remaining batch
                  if (batch.length > 0) {
                    await boundSaveFlightBatch(batch);
                    totalProcessed += batch.length;
                    batch = [];
                  }
                  callback();
                } catch (error) {
                  callback(error);
                }
              }
            })
          );
        
        pipeline.on('finish', resolve);
        pipeline.on('error', reject);
      });
      
      // Process any remaining batch
      if (batch.length > 0) {
        await boundSaveFlightBatch(batch);
        totalProcessed += batch.length;
      }
      
      // Update upload status to completed
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({ 
          upload_status: 'completed',
          total_records: totalProcessed,
          imported_records: totalProcessed,
          completed_at: new Date(),
          updated_at: new Date()
        });
      
      const endTime = Date.now();
      const endMemory = getMemoryUsage();
      
      console.log(`Upload ${uploadId} processed successfully in ${(endTime - startTime) / 1000} seconds`);
      console.log(`Total records processed: ${totalProcessed}`);
      console.log(`Memory usage delta: ${endMemory.heapUsed - startMemory.heapUsed}MB`);
      
      // Clean up temporary resources
      this.cleanupResources();
      
      return {
        id: uploadId,
        recordsProcessed: totalProcessed,
        duration: (endTime - startTime) / 1000
      };
    } catch (error) {
      console.error(`Error processing upload ${uploadId}:`, error);
      
      // Update upload status to failed - truncate error message to avoid DB error
      const errorMessage = error.message && error.message.length > 250 ? 
        error.message.substring(0, 250) + '...' : error.message;
        
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({ 
          upload_status: 'failed',
          error_message: errorMessage,
          updated_at: new Date()
        });
      
      throw error;
    }
  }
  
  /**
   * Save a batch of flight records efficiently
   * @param {Array<Object>} batch - Batch of flight records
   * @returns {Promise<void>}
   */
  async saveFlightBatch(batch) {
    if (!batch || batch.length === 0) return;
    
    try {
      // Use chunk sizes to prevent query size limits
      const chunkSize = 500;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        await db('flights').insert(chunk);
      }
    } catch (error) {
      console.error('Error saving flight batch:', error);
      throw error;
    }
  }
  
  /**
   * Clean up temporary resources to reduce memory usage
   * Call after large operations complete
   */
  cleanupResources() {
    // Clear any internal caches
    this._cache = {};
    
    // Force garbage collection if available (Node with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }
    
    // Log current memory state
    const memoryUsage = getMemoryUsage();
    console.log('Cleaned up resources. Current memory usage:', memoryUsage);
  }
  
  /**
   * Handle chunked uploads more efficiently
   * @param {string} uploadId - External upload ID
   * @param {number} chunkIndex - Chunk index
   * @param {number} totalChunks - Total number of chunks
   * @param {Buffer} chunkData - Chunk data
   * @returns {Promise<Object>} - Chunk status
   */
  async saveChunk(uploadId, chunkIndex, totalChunks, chunkData) {
    try {
      // Get upload record
      const upload = await db('flight_uploads')
        .where({ external_id: uploadId })
        .first();
      
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }
      
      // Use the chunks_path from the database record instead of creating a new path
      const chunksDir = upload.chunks_path;
      
      // Ensure the directory exists
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }
      
      // Save chunk to file in the chunks directory
      const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
      await fs.promises.writeFile(chunkPath, chunkData);
      
      // Update uploaded chunks counter in database
      await db('flight_uploads')
        .where({ id: upload.id })
        .update({
          uploaded_chunks: db.raw('uploaded_chunks + 1'),
          updated_at: new Date()
        });
      
      console.log(`Saved chunk ${chunkIndex} to ${chunkPath}`);
      
      return {
        uploadId,
        chunkIndex,
        totalChunks,
        status: 'success'
      };
    } catch (error) {
      console.error(`Error saving chunk ${chunkIndex} for upload ${uploadId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get upload processing status
   * @param {number} id - Upload ID
   * @returns {Promise<Object>} - Status object
   */
  async getUploadStatus(id) {
    const upload = await db('flight_uploads').where({ id }).first();
    
    if (!upload) return null;
    
    // Count total flights
    const totalFlights = await db('flights')
      .where({ upload_id: id })
      .count('id as count')
      .first();
    
    // Count arrivals and departures
    const arrivalCount = await db('flights')
      .where({ upload_id: id, flight_nature: 'A' })
      .count('id as count')
      .first();
      
    const departureCount = await db('flights')
      .where({ upload_id: id, flight_nature: 'D' })
      .count('id as count')
      .first();
    
    return {
      id: upload.id,
      filename: upload.filename,
      status: upload.upload_status,
      created_at: upload.created_at,
      updated_at: upload.updated_at,
      flightCount: parseInt(totalFlights.count, 10),
      arrivalCount: parseInt(arrivalCount.count, 10),
      departureCount: parseInt(departureCount.count, 10)
    };
  }
  
  /**
   * Approve flights for import
   * @param {number} uploadId - Upload ID
   * @param {Object} options - Approval options
   * @param {Array} options.flightIds - Array of flight IDs to approve
   * @param {boolean} options.approveAll - Whether to approve all flights
   * @param {boolean} options.excludeInvalid - Whether to exclude invalid flights
   * @returns {Promise<Object>} - Result object
   */
  async approveFlights(uploadId, { flightIds, approveAll, excludeInvalid }) {
    try {
      console.log(`Starting flight approval for upload ${uploadId}`, {
        approveAll,
        excludeInvalid,
        flightIdsCount: flightIds?.length
      });
      
      // Check for existing flights with this upload ID
      const flightCount = await db('flights')
        .where({ upload_id: uploadId })
        .count('id as count')
        .first();
        
      const count = parseInt(flightCount.count, 10);
      console.log(`Found ${count} flights for upload ${uploadId}`);
      
      if (count === 0) {
        return {
          success: false,
          count: 0,
          message: 'No flights found for this upload'
        };
      }
      
      // Check validation statuses to understand what we're working with
      const statusCounts = await db('flights')
        .where({ upload_id: uploadId })
        .select('validation_status')
        .count('id as count')
        .groupBy('validation_status');
        
      console.log('Validation status counts:', statusCounts);
      
      // Use Knex transaction for atomic operations
      return await db.transaction(async (trx) => {
        // Setup base query
        let query = trx('flights').where({ upload_id: uploadId });
        
        // Apply filters based on options
        if (!approveAll) {
          // Only approve specified flights
          query = query.whereIn('id', flightIds);
        }
        
        // Check if we need to modify the validation status filter
        const hasNewStatus = statusCounts.some(s => s.validation_status === 'new');
        const hasValidStatus = statusCounts.some(s => s.validation_status === 'valid');
        
        if (excludeInvalid) {
          if (hasValidStatus) {
            // Prefer 'valid' status if present
            query = query.where({ validation_status: 'valid' });
          } else if (hasNewStatus) {
            // Fall back to 'new' status if 'valid' not present (weekly test files)
            console.log('Using "new" validation status as fallback');
            query = query.where({ validation_status: 'new' });
          } else {
            // Exclude only explicitly invalid flights
            query = query.where('validation_status', '!=', 'invalid');
          }
        }
        
        console.log('Approving flights with query:', query.toString());
        
        // Update flights to approved status
        const result = await query.update({ import_status: 'imported' });
        
        console.log(`Updated ${result} flights to "imported" status`);
        
        // Update upload status
        await trx('flight_uploads')
          .where({ id: uploadId })
          .update({ 
            upload_status: 'approved',
            updated_at: new Date()
          });
        
        return {
          success: true,
          count: result,
          message: `${result} flights approved for import`
        };
      });
    } catch (error) {
      console.error('Error approving flights:', error);
      throw error;
    }
  }

  /**
   * Get all flight uploads
   * @returns {Promise<Array>} Array of upload records
   */
  async getAllUploads() {
    try {
      const uploads = await db('flight_uploads')
        .select([
          'id',
          'filename', 
          'file_size',
          'upload_status',
          'created_at',
          'updated_at',
          'total_records',
          'imported_records'
        ])
        .orderBy('created_at', 'desc');
      
      // For each upload, get the flight count
      const uploadsWithStats = await Promise.all(
        uploads.map(async (upload) => {
          const flightCount = await db('flights')
            .where({ upload_id: upload.id })
            .count('id as count')
            .first();
            
          return {
            ...upload,
            flightCount: parseInt(flightCount?.count || 0, 10),
            formattedSize: this._formatFileSize(upload.file_size)
          };
        })
      );
      
      return uploadsWithStats;
    } catch (error) {
      console.error('Error getting all uploads:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   * @private
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Delete a flight upload and all associated flights
   * @param {number} uploadId - Upload ID to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFlightUpload(uploadId) {
    try {
      // Start a transaction to ensure all database operations succeed or fail together
      return db.transaction(async (trx) => {
        // Get the upload record first to verify it exists and get file path
        const upload = await trx('flight_uploads').where({ id: uploadId }).first();
        
        if (!upload) {
          throw new Error(`Upload with ID ${uploadId} not found`);
        }
        
        // Delete associated flights first (maintain referential integrity)
        const deletedFlightsCount = await trx('flights').where({ upload_id: uploadId }).delete();
        
        // Delete the upload record
        await trx('flight_uploads').where({ id: uploadId }).delete();
        
        // Delete the physical file if it exists
        if (upload.file_path && fs.existsSync(upload.file_path)) {
          fs.unlinkSync(upload.file_path);
        }
        
        // Delete chunks directory if it exists
        if (upload.chunks_path && fs.existsSync(upload.chunks_path)) {
          fs.rmSync(upload.chunks_path, { recursive: true, force: true });
        }
        
        return {
          success: true,
          id: uploadId,
          deletedFlights: deletedFlightsCount,
          filename: upload.filename
        };
      });
    } catch (error) {
      console.error(`Error deleting upload ${uploadId}:`, error);
      throw error;
    }
  }

  /**
   * Map aircraft type code to a format that matches the database
   * @private
   * @param {string} code - Original aircraft code
   * @returns {string} Mapped aircraft code
   */
  _mapAircraftTypeCode(code) {
    if (!code) return 'UNKN';
    
    // Clean and uppercase the code
    code = code.trim().toUpperCase();
    
    // Map known codes
    const aircraftMap = {
      '777': 'B777',
      '787': 'B787',
      '380': 'A380',
      '330': 'A330',
      '321': 'A321',
      '320': '320',  // Already matches
      '350': '350',  // Already matches
    };
    
    return aircraftMap[code] || code;
  }

  /**
   * Update the mapped file path for an upload
   * @param {number} uploadId - Upload ID
   * @param {string} mappedFilePath - Path to the mapped file
   * @returns {Promise<boolean>} Success status
   */
  async updateMappedFilePath(uploadId, mappedFilePath) {
    try {
      // Validate parameters
      if (!uploadId) {
        throw new Error('Upload ID is required');
      }
      
      if (!mappedFilePath) {
        throw new Error('Mapped file path is required');
      }
      
      // Update the upload record - use 'processing' status since 'mapped' is not in the allowed values
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({
          mapped_file_path: mappedFilePath,
          has_been_mapped: true,
          upload_status: 'processing', // Changed from 'mapped' to 'processing'
          updated_at: new Date()
        });
      
      console.log(`Updated mapped file path for upload ${uploadId}: ${mappedFilePath}`);
      return true;
    } catch (error) {
      console.error('Error updating mapped file path:', error);
      throw error;
    }
  }
}

module.exports = FlightUploadService; 