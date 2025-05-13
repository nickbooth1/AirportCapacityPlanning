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
   * Process a CSV file upload with optimized memory usage
   * Uses streaming for efficient processing of large files
   * @param {number} uploadId - Upload ID
   * @param {string} filePath - Path to uploaded file
   * @returns {Promise<void>}
   */
  async processUpload(uploadId, filePath) {
    console.log(`Processing upload ${uploadId} at ${filePath}`);
    const startTime = Date.now();
    const startMemory = getMemoryUsage();
    
    try {
      // Check if this upload has been mapped, and use the mapped file if available
      const upload = await this.getUploadById(uploadId);
      
      if (upload.has_been_mapped && upload.mapped_file_path && fs.existsSync(upload.mapped_file_path)) {
        console.log(`Using mapped file for upload ${uploadId}: ${upload.mapped_file_path}`);
        filePath = upload.mapped_file_path;
      }
      
      // Update status to processing
      await db('flight_uploads')
        .where({ id: uploadId })
        .update({ upload_status: 'processing' });
      
      // Track total processed rows and batch size
      let totalProcessed = 0;
      const BATCH_SIZE = 2000; // Batch size for DB operations
      let batch = [];
      let lastReportTime = Date.now();
      
      // Create a reference to this for use in the transform function
      const self = this;
      
      // Bind saveFlightBatch to this instance to ensure proper context
      const boundSaveFlightBatch = this.saveFlightBatch.bind(this);
      
      // Use streaming to process the file with minimal memory usage
      await pipeline(
        fs.createReadStream(filePath),
        csv({
          strict: false,
          headers: true,
          skipLines: 0,
          relax_column_count: true
        }),
        new stream.Transform({
          objectMode: true,
          transform: async function(chunk, encoding, callback) {
            try {
              // Convert date strings to Date objects
              let scheduledTime = null;
              let estimatedTime = null;
              
              // Parse date format DD/MM/YYYY HH:MM
              if (chunk.ScheduleTime) {
                const [datePart, timePart] = chunk.ScheduleTime.split(' ');
                if (datePart && timePart) {
                  const [day, month, year] = datePart.split('/');
                  const dateStr = `${year}-${month}-${day}T${timePart}:00`;
                  scheduledTime = new Date(dateStr);
                }
              }
              
              if (chunk.EstimatedTime) {
                const [datePart, timePart] = chunk.EstimatedTime.split(' ');
                if (datePart && timePart) {
                  const [day, month, year] = datePart.split('/');
                  const dateStr = `${year}-${month}-${day}T${timePart}:00`;
                  estimatedTime = new Date(dateStr);
                }
              }
              
              // If no scheduled time was found, set a default to avoid database errors
              if (!scheduledTime) {
                scheduledTime = new Date();
                console.log(`No scheduled time found for a row, using current time as default: ${scheduledTime}`);
              }
              
              // Map the CSV columns to database fields based on actual table structure
              const flightRecord = {
                upload_id: uploadId,
                airline_iata: chunk.AirlineIATA?.trim() || 'UNKN',
                flight_number: chunk.FlightNumber?.trim() || 'UNKN',
                scheduled_datetime: scheduledTime,
                estimated_datetime: estimatedTime,
                flight_nature: (chunk.FlightNature?.trim()?.toUpperCase() === 'A' || chunk.FlightNature?.trim()?.toUpperCase() === 'D') 
                  ? chunk.FlightNature.trim().toUpperCase() 
                  : 'D',
                origin_destination_iata: chunk.DestinationIATA?.trim() || 'UNKN',
                aircraft_type_iata: chunk.AircraftTypeIATA?.trim() || 'UNKN',
                terminal: chunk.Terminal?.trim() || null,
                seat_capacity: chunk.SeatCapacity ? parseInt(chunk.SeatCapacity, 10) : null,
                validation_status: 'valid',
                is_approved: false
              };
              
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
              console.error('Error processing row:', error, chunk);
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
      // Use Knex transaction for atomic operations
      return await db.transaction(async (trx) => {
        // Setup base query
        let query = trx('flights').where({ upload_id: uploadId });
        
        // Apply filters based on options
        if (!approveAll) {
          query = query.whereIn('id', flightIds);
        }
        
        if (excludeInvalid) {
          query = query.where({ validation_status: 'valid' });
        }
        
        // Update flights to approved status
        const result = await query.update({ import_status: 'imported' });
        
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
}

module.exports = FlightUploadService; 