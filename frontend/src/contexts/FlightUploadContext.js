import React, { createContext, useState, useContext } from 'react';
import * as flightUploadApi from '../../api/flightUploadApi';

/**
 * Context for flight upload operations
 * @type {React.Context}
 */
const FlightUploadContext = createContext();

/**
 * Upload status enum
 * @type {Object}
 */
export const UploadStatus = {
  IDLE: 'idle',
  SELECTING: 'selecting',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  VALIDATING: 'validating',
  REVIEWING: 'reviewing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Flight Upload Provider Component
 * Provides state and methods for file upload and validation workflow
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const FlightUploadProvider = ({ children }) => {
  // Main workflow state
  const [status, setStatus] = useState(UploadStatus.IDLE);
  
  // File selection state
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState(null);
  
  // Validation state
  const [validationStats, setValidationStats] = useState(null);
  const [validationResults, setValidationResults] = useState({
    data: [],
    pagination: { total: 0, page: 1, limit: 100, totalPages: 0 }
  });
  
  // Common state
  const [error, setError] = useState(null);
  
  // Polling intervals
  const [statusInterval, setStatusInterval] = useState(null);
  const [validationInterval, setValidationInterval] = useState(null);
  
  /**
   * Reset the upload state to initial values
   */
  const resetUpload = () => {
    // Clear any running intervals
    if (statusInterval) clearInterval(statusInterval);
    if (validationInterval) clearInterval(validationInterval);
    
    setStatus(UploadStatus.IDLE);
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadId(null);
    setValidationStats(null);
    setValidationResults({
      data: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 0 }
    });
    setError(null);
    setStatusInterval(null);
    setValidationInterval(null);
  };
  
  /**
   * Handle file selection
   * @param {File} file - Selected file
   */
  const selectFile = (file) => {
    setSelectedFile(file);
    setStatus(UploadStatus.SELECTING);
    setError(null);
  };
  
  /**
   * Upload the selected file to the server
   * @param {string} displayName - Optional custom name for the upload
   * @returns {Promise<boolean>} Success indicator
   */
  const uploadFile = async (displayName) => {
    if (!selectedFile) {
      setError('No file selected');
      return false;
    }
    
    setStatus(UploadStatus.UPLOADING);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Use XMLHttpRequest for progress tracking
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (error) {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
        
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || ''}/flights/upload`, true);
        
        // Ensure credentials are included (cookies for auth)
        xhr.withCredentials = true;
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Add display name if provided
        if (displayName) {
          formData.append('displayName', displayName);
        }
        
        xhr.send(formData);
      });
      
      setUploadId(response.id);
      setStatus(UploadStatus.PROCESSING);
      
      // Start polling for status updates
      startStatusPolling(response.id);
      
      return true;
    } catch (error) {
      console.error('File upload error:', error);
      setError(error.message || 'Upload failed');
      setStatus(UploadStatus.FAILED);
      return false;
    }
  };
  
  /**
   * Start polling for upload status
   * @param {number} id - Upload ID
   */
  const startStatusPolling = (id) => {
    // Clear any existing interval
    if (statusInterval) {
      clearInterval(statusInterval);
    }
    
    // Poll every 2 seconds
    const interval = setInterval(async () => {
      try {
        const statusData = await flightUploadApi.getUploadStatus(id);
        
        if (statusData.status === 'completed') {
          clearInterval(interval);
          setStatusInterval(null);
          setStatus(UploadStatus.VALIDATING);
          
          // Start validation automatically
          validateFlights(id);
        } else if (statusData.status === 'failed') {
          clearInterval(interval);
          setStatusInterval(null);
          setStatus(UploadStatus.FAILED);
          setError('File processing failed');
        }
      } catch (error) {
        console.error('Error checking upload status:', error);
        // Don't stop polling on errors, retry next interval
      }
    }, 2000);
    
    setStatusInterval(interval);
  };
  
  /**
   * Start validation for an uploaded file
   * @param {number} id - Upload ID
   * @returns {Promise<boolean>} Success indicator
   */
  const validateFlights = async (id) => {
    try {
      setStatus(UploadStatus.VALIDATING);
      setError(null);
      
      // Start validation process
      await flightUploadApi.validateFlights(id || uploadId);
      
      // Start polling for validation results
      startValidationPolling(id || uploadId);
      
      return true;
    } catch (error) {
      console.error('Error starting validation:', error);
      setError(error.message || 'Validation failed to start');
      setStatus(UploadStatus.FAILED);
      return false;
    }
  };
  
  /**
   * Start polling for validation results
   * @param {number} id - Upload ID
   */
  const startValidationPolling = (id) => {
    // Clear any existing interval
    if (validationInterval) {
      clearInterval(validationInterval);
    }
    
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        // Get validation stats first
        const stats = await flightUploadApi.getValidationStats(id);
        setValidationStats(stats);
        
        // Check if validation is complete
        const hasInvalid = stats.invalid > 0;
        const isComplete = stats.total > 0;
        
        if (isComplete) {
          // Get first page of validation results
          const results = await flightUploadApi.getValidationResults(id, {
            page: 1,
            limit: 100,
            validationStatus: hasInvalid ? 'invalid' : null // Show invalid flights first if any
          });
          
          setValidationResults(results);
          
          // Stop polling once we have results
          clearInterval(interval);
          setValidationInterval(null);
          
          // Change status to reviewing
          setStatus(UploadStatus.REVIEWING);
        }
      } catch (error) {
        console.error('Error polling validation results:', error);
        // Don't stop polling on errors, retry next interval
      }
    }, 3000);
    
    setValidationInterval(interval);
  };
  
  /**
   * Fetch validation results with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Results per page
   * @param {string} options.flightNature - Filter by flight nature (A/D)
   * @param {string} options.validationStatus - Filter by validation status
   * @returns {Promise<boolean>} Success indicator
   */
  const fetchValidationResults = async (options = {}) => {
    try {
      if (!uploadId) {
        setError('No upload in progress');
        return false;
      }
      
      const results = await flightUploadApi.getValidationResults(uploadId, options);
      setValidationResults(results);
      return true;
    } catch (error) {
      console.error('Error fetching validation results:', error);
      setError(error.message || 'Failed to fetch validation results');
      return false;
    }
  };
  
  /**
   * Approve flights for import
   * @param {Object} options - Approval options
   * @param {Array<number>} options.flightIds - Array of flight IDs to approve
   * @param {boolean} options.approveAll - Whether to approve all flights
   * @param {boolean} options.excludeInvalid - Whether to exclude invalid flights
   * @returns {Promise<boolean>} Success indicator
   */
  const approveFlights = async (options) => {
    try {
      if (!uploadId) {
        setError('No upload in progress');
        return false;
      }
      
      await flightUploadApi.approveFlights(uploadId, options);
      setStatus(UploadStatus.COMPLETED);
      return true;
    } catch (error) {
      console.error('Error approving flights:', error);
      setError(error.message || 'Failed to approve flights');
      return false;
    }
  };
  
  /**
   * Export validation report
   * @param {Object} options - Export options
   * @param {string} options.format - Export format (csv, xlsx, json)
   * @param {string} options.flightNature - Filter by flight nature
   * @param {boolean} options.includeValid - Whether to include valid flights
   * @param {boolean} options.includeInvalid - Whether to include invalid flights
   * @returns {Promise<Blob|null>} Report file as Blob, or null on error
   */
  const exportValidationReport = async (options = {}) => {
    try {
      if (!uploadId) {
        setError('No upload in progress');
        return null;
      }
      
      const blob = await flightUploadApi.exportValidationReport(uploadId, options);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const format = options.format || 'csv';
      const filename = `validation_report_${timestamp}.${format}`;
      
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return blob;
    } catch (error) {
      console.error('Error exporting validation report:', error);
      setError(error.message || 'Failed to export validation report');
      return null;
    }
  };
  
  /**
   * Context value that will be provided to consumers
   * @type {Object}
   */
  const contextValue = {
    // State
    status,
    selectedFile,
    uploadProgress,
    uploadId,
    validationStats,
    validationResults,
    error,
    
    // Methods
    resetUpload,
    selectFile,
    uploadFile,
    validateFlights,
    fetchValidationResults,
    approveFlights,
    exportValidationReport
  };
  
  return (
    <FlightUploadContext.Provider value={contextValue}>
      {children}
    </FlightUploadContext.Provider>
  );
};

/**
 * Custom hook for using the flight upload context
 * @returns {Object} Flight upload context value
 * @throws {Error} If used outside of FlightUploadProvider
 */
export const useFlightUpload = () => {
  const context = useContext(FlightUploadContext);
  
  if (!context) {
    throw new Error('useFlightUpload must be used within a FlightUploadProvider');
  }
  
  return context;
}; 