/**
 * File Handler Module
 * Handles file format detection and parsing for different file types
 */
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

/**
 * Detect file format based on extension and content
 * @param {string} filePath - Path to the file
 * @returns {string} - Detected format (csv, json)
 */
function detectFileFormat(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.csv':
      return 'csv';
    case '.json':
      return 'json';
    case '.xlsx':
    case '.xls':
      return 'excel';
    default:
      // If extension isn't recognizable, try to infer from content
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8').trim();
        if (fileContent.startsWith('[') || fileContent.startsWith('{')) {
          return 'json';
        } else if (fileContent.includes(',') && fileContent.includes('\n')) {
          return 'csv';
        }
      } catch (error) {
        console.error('Error reading file content:', error);
      }
      
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

/**
 * Parse file contents into JSON objects
 * @param {string} filePath - Path to the file
 * @param {string} format - File format (csv, json, excel)
 * @returns {Promise<Array>} - Array of parsed data records
 */
async function parseFile(filePath, format) {
  if (!format) {
    format = detectFileFormat(filePath);
  }

  switch (format) {
    case 'csv':
      return parseCSV(filePath);
    case 'json':
      return parseJSON(filePath);
    case 'excel':
      return parseExcel(filePath);
    default:
      throw new Error(`Unsupported format for parsing: ${format}`);
  }
}

/**
 * Parse CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of parsed records
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Array>} - Array of parsed records
 */
async function parseJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Handle both array and object formats
    if (Array.isArray(parsedData)) {
      return parsedData;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      // If it's an object with a data property that's an array, return that
      if (Array.isArray(parsedData.data)) {
        return parsedData.data;
      }
      // Otherwise wrap the object in an array
      return [parsedData];
    }
    
    throw new Error('Invalid JSON format. Expected array or object.');
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error.message}`);
  }
}

/**
 * Parse Excel file (placeholder - will be implemented with xlsx library)
 * @param {string} filePath - Path to Excel file
 * @returns {Promise<Array>} - Array of parsed records
 */
async function parseExcel(filePath) {
  throw new Error('Excel parsing not yet implemented. Please install xlsx library first.');
}

/**
 * Get file statistics
 * @param {string} filePath - Path to the file
 * @returns {Object} - File statistics including size, etc.
 */
function getFileStats(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileExtension = path.extname(filePath);
  const fileName = path.basename(filePath);
  
  return {
    name: fileName,
    extension: fileExtension,
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    created: stats.birthtime,
    modified: stats.mtime,
    path: filePath
  };
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "1.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

/**
 * Get sample records for mapping preview
 * @param {Array} data - Array of data records
 * @param {number} count - Number of records to sample (default: 5)
 * @returns {Array} - Array of sample records
 */
function getSampleRecords(data, count = 5) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  return data.slice(0, Math.min(count, data.length));
}

module.exports = {
  detectFileFormat,
  parseFile,
  getFileStats,
  getSampleRecords
}; 