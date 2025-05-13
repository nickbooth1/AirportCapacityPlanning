/**
   * Record a file upload in the database
   * @param {Object} uploadInfo - Upload information
   * @param {string} uploadInfo.filename - Original filename
   * @param {string} uploadInfo.displayName - Custom display name for the upload
   * @param {string} uploadInfo.filePath - Path to uploaded file
   * @param {number} uploadInfo.fileSize - File size in bytes
   * @param {string|number} uploadInfo.userId - User ID (not used in current schema)
   * @returns {Promise<number>} Upload ID
   */
  async recordUpload(uploadInfo) {
    const { filename, displayName, filePath, fileSize } = uploadInfo;
    
    try {
      console.log('Recording upload with info:', { filename, displayName, fileSize });
      
      const [id] = await db('flight_uploads').insert({
        filename,
        display_name: displayName, // Store the custom display name
        file_path: filePath,
        file_size: fileSize,
        upload_status: 'pending',
        created_at: new Date()
      });
      
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
   * @param {string|number} uploadInfo.userId - User ID (not used in current schema)
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
      
      const [id] = await db('flight_uploads').insert({
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
      });
      
      console.log(`Chunked upload recorded with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error recording chunked upload:', error);
      throw error;
    }
  } 