/**
 * ChunkedUploader
 * 
 * A utility class for handling large file uploads by breaking them
 * into smaller chunks, with support for progress tracking and resumption.
 */
class ChunkedUploader {
  /**
   * Create a new chunked uploader instance
   * 
   * @param {Object} options - Configuration options
   * @param {File} options.file - The file to upload
   * @param {string} options.endpoint - API endpoint URL
   * @param {number} options.chunkSize - Size of each chunk in bytes (default: 1MB)
   * @param {number} options.maxRetries - Maximum number of retries per chunk (default: 3)
   * @param {string} options.uploadName - Optional custom name for the upload
   * @param {Object} options.headers - Additional headers to include with requests
   * @param {Function} options.onProgress - Progress callback (receives percentage)
   * @param {Function} options.onChunkSuccess - Callback when a chunk uploads successfully
   * @param {Function} options.onComplete - Callback when the entire upload completes
   * @param {Function} options.onError - Error callback
   */
  constructor(options) {
    this.file = options.file;
    this.endpoint = options.endpoint;
    this.chunkSize = options.chunkSize || 1024 * 1024; // Default: 1MB
    this.maxRetries = options.maxRetries || 3;
    this.uploadName = options.uploadName;
    this.headers = options.headers || {};
    this.onProgress = options.onProgress || (() => {});
    this.onChunkSuccess = options.onChunkSuccess || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    
    // Internal state
    this.chunks = [];
    this.totalChunks = 0;
    this.uploadedChunks = 0;
    this.bytesUploaded = 0;
    this.uploadId = null;
    this.aborted = false;
    this.retries = {};
    
    // Initialize chunks
    this._initChunks();
  }
  
  /**
   * Initialize the chunks based on file size and chunk size
   * @private
   */
  _initChunks() {
    const file = this.file;
    const totalSize = file.size;
    
    this.totalChunks = Math.ceil(totalSize / this.chunkSize);
    this.chunks = Array.from({ length: this.totalChunks }, (_, index) => {
      const start = index * this.chunkSize;
      const end = Math.min(start + this.chunkSize, totalSize);
      
      return {
        index,
        start,
        end,
        size: end - start,
        status: 'pending', // pending, uploading, success, error
        retries: 0,
        blob: file.slice(start, end)
      };
    });
  }
  
  /**
   * Start the upload process
   * @returns {Promise} Resolves when all chunks have been uploaded
   */
  async start() {
    if (this.aborted) {
      this.aborted = false;
    }
    
    try {
      // Initialize upload session
      await this._initializeUpload();
      
      // Upload all chunks in parallel (with concurrency limit)
      await this._uploadChunks();
      
      // Finalize the upload
      await this._finalizeUpload();
      
      return true;
    } catch (error) {
      if (!this.aborted) {
        this.onError(error);
      }
      return false;
    }
  }
  
  /**
   * Initialize the upload session with the server
   * @private
   * @returns {Promise}
   */
  async _initializeUpload() {
    try {
      const formData = new FormData();
      formData.append('fileName', this.file.name);
      formData.append('displayName', this.uploadName);
      formData.append('fileSize', this.file.size);
      formData.append('chunkSize', this.chunkSize);
      formData.append('totalChunks', this.totalChunks);
      
      const response = await fetch(`${this.endpoint}/initialize`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize upload: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.uploadId = data.id;
      
      return data;
    } catch (error) {
      throw new Error(`Upload initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Upload all chunks with concurrency control
   * @private
   * @returns {Promise}
   */
  async _uploadChunks() {
    const MAX_CONCURRENT_UPLOADS = 3;
    let activeUploads = 0;
    let nextChunkIndex = 0;
    
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        console.log(`Upload progress: ${this.uploadedChunks}/${this.totalChunks} chunks uploaded`);
        
        if (this.uploadedChunks === this.totalChunks) {
          resolve();
        } else if (nextChunkIndex >= this.totalChunks && activeUploads === 0) {
          // Check if some chunks are still in 'pending' or 'error' state and retry them
          const pendingOrErrorChunks = this.chunks.filter(chunk => 
            chunk.status === 'pending' || chunk.status === 'error'
          );
          
          if (pendingOrErrorChunks.length > 0) {
            console.log(`Retrying ${pendingOrErrorChunks.length} pending/error chunks`);
            
            // Reset next chunk index to first pending/error chunk
            nextChunkIndex = pendingOrErrorChunks[0].index;
            processNextChunk();
          } else {
            reject(new Error('Upload failed: Not all chunks were uploaded successfully'));
          }
        } else {
          processNextChunk();
        }
      };
      
      const processNextChunk = () => {
        if (this.aborted) {
          return reject(new Error('Upload aborted'));
        }
        
        // If we've hit our concurrency limit or have no more chunks to process
        if (activeUploads >= MAX_CONCURRENT_UPLOADS || nextChunkIndex >= this.totalChunks) {
          return;
        }
        
        // Get the next chunk to upload
        let chunkIndex = nextChunkIndex++;
        let chunk = this.chunks[chunkIndex];
        
        console.log(`Processing chunk ${chunk.index}/${this.totalChunks - 1}`);
        
        activeUploads++;
        
        this._uploadChunk(chunk)
          .then(() => {
            activeUploads--;
            checkCompletion();
          })
          .catch(error => {
            console.error(`Error uploading chunk ${chunk.index}:`, error);
            activeUploads--;
            
            if (chunk.retries < this.maxRetries) {
              // Retry this chunk
              chunk.retries++;
              chunk.status = 'pending';
              console.log(`Retrying chunk ${chunk.index} (attempt ${chunk.retries}/${this.maxRetries})`);
              nextChunkIndex = chunk.index; // Re-add to queue
              setTimeout(() => processNextChunk(), 1000); // Wait 1 second before retrying
            } else {
              if (!this.aborted) {
                reject(new Error(`Failed to upload chunk ${chunk.index} after ${this.maxRetries} attempts`));
              }
            }
          });
        
        // Try to process more chunks if we haven't hit our limit
        if (activeUploads < MAX_CONCURRENT_UPLOADS) {
          processNextChunk();
        }
      };
      
      // Start by uploading chunks in sequence for the first 3 chunks to ensure
      // that chunk 0 gets processed first
      const processSequentially = async (startIndex, count) => {
        for (let i = startIndex; i < Math.min(startIndex + count, this.totalChunks); i++) {
          if (this.aborted) break;
          
          const chunk = this.chunks[i];
          console.log(`Sequential upload: Processing chunk ${chunk.index}/${this.totalChunks - 1}`);
          
          try {
            await this._uploadChunk(chunk);
            this.onProgress(Math.round((this.uploadedChunks / this.totalChunks) * 100));
          } catch (error) {
            console.error(`Error in sequential upload of chunk ${chunk.index}:`, error);
            
            if (chunk.retries < this.maxRetries) {
              // Retry immediately
              chunk.retries++;
              chunk.status = 'pending';
              console.log(`Retrying chunk ${chunk.index} immediately (attempt ${chunk.retries}/${this.maxRetries})`);
              i--; // Retry same chunk
            } else {
              throw new Error(`Failed to upload chunk ${chunk.index} after ${this.maxRetries} attempts`);
            }
          }
        }
        
        // Move to concurrent uploads for remaining chunks
        nextChunkIndex = startIndex + count;
        
        // Start concurrent processing for remaining chunks
        for (let i = 0; i < MAX_CONCURRENT_UPLOADS && nextChunkIndex < this.totalChunks; i++) {
          processNextChunk();
        }
      };
      
      // Start with sequential upload for first 3 chunks to ensure order
      processSequentially(0, 3).catch(error => {
        reject(error);
      });
    });
  }
  
  /**
   * Upload a single chunk
   * @private
   * @param {Object} chunk - The chunk to upload
   * @returns {Promise}
   */
  async _uploadChunk(chunk) {
    chunk.status = 'uploading';
    
    try {
      const formData = new FormData();
      formData.append('uploadId', this.uploadId);
      formData.append('chunkIndex', chunk.index);
      formData.append('chunkTotal', this.totalChunks);
      formData.append('chunkData', chunk.blob);
      
      const response = await fetch(`${this.endpoint}/chunk`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        chunk.status = 'error';
        throw new Error(`Failed to upload chunk ${chunk.index}: ${response.status} ${response.statusText}`);
      }
      
      // Mark as successful
      chunk.status = 'success';
      this.uploadedChunks++;
      this.bytesUploaded += chunk.size;
      
      // Calculate and report progress
      const progress = Math.round((this.bytesUploaded / this.file.size) * 100);
      this.onProgress(progress);
      this.onChunkSuccess(chunk.index, this.totalChunks);
      
      return response.json();
    } catch (error) {
      chunk.status = 'error';
      throw error;
    }
  }
  
  /**
   * Finalize the upload once all chunks are complete
   * @private
   * @returns {Promise}
   */
  async _finalizeUpload() {
    const MAX_FINALIZE_RETRIES = 3;
    let retryCount = 0;
    
    while (retryCount <= MAX_FINALIZE_RETRIES) {
      try {
        console.log(`Finalizing upload ${this.uploadId} with ${this.uploadedChunks}/${this.totalChunks} chunks (attempt ${retryCount + 1})`);
        
        // Double-check that all chunks were uploaded
        if (this.uploadedChunks < this.totalChunks) {
          throw new Error(`Cannot finalize upload: Only ${this.uploadedChunks}/${this.totalChunks} chunks were uploaded`);
        }
        
        const formData = new FormData();
        formData.append('uploadId', this.uploadId);
        
        const response = await fetch(`${this.endpoint}/finalize`, {
          method: 'POST',
          headers: this.headers,
          credentials: 'include',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error during finalization (${response.status}):`, errorText);
          throw new Error(`Failed to finalize upload: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Finalization successful:', data);
        this.onComplete(data);
        
        return data;
      } catch (error) {
        console.error(`Finalization attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount <= MAX_FINALIZE_RETRIES) {
          console.log(`Retrying finalization in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retrying
        } else {
          console.error('Max finalization retries reached, giving up.');
          throw new Error(`Upload finalization failed: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Abort the upload process
   */
  abort() {
    this.aborted = true;
    
    // Attempt to notify the server that the upload was aborted
    if (this.uploadId) {
      fetch(`${this.endpoint}/abort`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: JSON.stringify({ uploadId: this.uploadId })
      }).catch(error => {
        console.error('Error aborting upload:', error);
      });
    }
  }
  
  /**
   * Resume a previously interrupted upload
   * @param {string} uploadId - The ID of the upload to resume
   * @returns {Promise}
   */
  async resume(uploadId) {
    if (!uploadId) {
      throw new Error('Upload ID is required to resume upload');
    }
    
    this.uploadId = uploadId;
    
    try {
      // Get status of existing chunks
      const response = await fetch(`${this.endpoint}/status/${uploadId}`, {
        method: 'GET',
        headers: this.headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get upload status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const { uploadedChunks, chunkSize } = data;
      
      // Update internal state
      this.chunkSize = chunkSize || this.chunkSize;
      this._initChunks(); // Re-init chunks with new chunk size
      
      // Mark chunks as uploaded
      uploadedChunks.forEach(index => {
        if (index < this.chunks.length) {
          const chunk = this.chunks[index];
          chunk.status = 'success';
          this.uploadedChunks++;
          this.bytesUploaded += chunk.size;
        }
      });
      
      // Calculate and report current progress
      const progress = Math.round((this.bytesUploaded / this.file.size) * 100);
      this.onProgress(progress);
      
      // Resume uploading remaining chunks
      await this._uploadChunks();
      
      // Finalize the upload
      await this._finalizeUpload();
      
      return true;
    } catch (error) {
      this.onError(error);
      return false;
    }
  }
}

export default ChunkedUploader; 