const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001/api/flights/upload';
const FILE_PATH = path.join(__dirname, '..', 'docs', 'Dummy Upload.csv');
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

// Function to initialize upload
async function initializeUpload(fileName, fileSize, totalChunks) {
  try {
    const chunkSize = Math.ceil(fileSize / totalChunks);
    const response = await axios.post(`${API_URL}/initialize`, {
      fileName,
      fileSize,
      chunkSize,
      totalChunks
    });
    return response.data;
  } catch (error) {
    console.error('Error initializing upload:', error.response?.data || error.message);
    throw error;
  }
}

// Function to upload a single chunk
async function uploadChunk(uploadId, chunkIndex, chunkData, totalChunks) {
  try {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('chunkTotal', totalChunks);
    formData.append('chunkData', chunkData, { filename: 'blob' });

    const response = await axios.post(`${API_URL}/chunk`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error uploading chunk ${chunkIndex}:`, error.response?.data || error.message);
    throw error;
  }
}

// Function to finalize upload
async function finalizeUpload(uploadId) {
  try {
    const response = await axios.post(`${API_URL}/finalize`, { uploadId });
    return response.data;
  } catch (error) {
    console.error('Error finalizing upload:', error.response?.data || error.message);
    throw error;
  }
}

// Main upload function
async function uploadFile() {
  try {
    console.log(`Reading file: ${FILE_PATH}`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(FILE_PATH);
    const fileName = path.basename(FILE_PATH);
    const fileSize = fileBuffer.length;
    
    console.log(`File size: ${fileSize} bytes`);
    
    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    console.log(`Will upload in ${totalChunks} chunks (each ~${CHUNK_SIZE} bytes)`);
    
    // Initialize upload
    const { id: uploadId } = await initializeUpload(fileName, fileSize, totalChunks);
    console.log(`Upload initialized with ID: ${uploadId}`);
    
    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkBuffer = fileBuffer.slice(start, end);
      
      console.log(`Uploading chunk ${i} (${start}-${end}, ${chunkBuffer.length} bytes)`);
      await uploadChunk(uploadId, i, chunkBuffer, totalChunks);
      console.log(`Chunk ${i} uploaded successfully`);
    }
    
    // Finalize upload
    console.log('Finalizing upload...');
    const result = await finalizeUpload(uploadId);
    console.log('Upload finalized successfully:', result);
    
    console.log('File uploaded successfully!');
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Run the upload
uploadFile(); 