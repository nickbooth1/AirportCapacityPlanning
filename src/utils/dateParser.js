/**
 * Enhanced date parser utility
 * Handles various date formats commonly found in flight schedules
 */

// List of supported date formats in order of priority
const DATE_FORMATS = [
  // ISO formats
  'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO with milliseconds and timezone
  'YYYY-MM-DDTHH:mm:ssZ',     // ISO with timezone
  'YYYY-MM-DDTHH:mm:ss',      // ISO without timezone
  'YYYY-MM-DD HH:mm:ss',      // ISO-like with space
  'YYYY-MM-DD HH:mm',         // ISO-like without seconds
  'YYYY-MM-DD',               // ISO date only
  
  // Common US formats
  'MM/DD/YYYY HH:mm:ss',      // US format with time
  'MM/DD/YYYY HH:mm',         // US format without seconds
  'MM/DD/YYYY',               // US format date only
  
  // Common European formats
  'DD/MM/YYYY HH:mm:ss',      // European format with time
  'DD/MM/YYYY HH:mm',         // European format without seconds
  'DD/MM/YYYY',               // European format date only
  
  // Other common formats
  'DD-MMM-YYYY HH:mm:ss',     // Example: 01-JAN-2023 14:30:00
  'DD-MMM-YYYY HH:mm',        // Example: 01-JAN-2023 14:30
  'DD-MMM-YYYY',              // Example: 01-JAN-2023
  'MMM DD YYYY HH:mm:ss',     // Example: JAN 01 2023 14:30:00
  'MMM DD YYYY'               // Example: JAN 01 2023
];

// Default timezone - UTC
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Attempts to parse a date string using various common formats
 * @param {string} dateString - The date string to parse
 * @param {string} [preferredFormat] - Optional preferred format to try first
 * @param {string} [timezone] - Optional timezone to use if not present in the date string
 * @returns {Object} - Result with parsed date and status information
 */
function parseDate(dateString, preferredFormat = null, timezone = DEFAULT_TIMEZONE) {
  if (!dateString) {
    return {
      valid: false,
      date: null, 
      error: 'Date string is empty or null',
      originalString: dateString
    };
  }
  
  // Trim the string to remove any whitespace
  dateString = dateString.trim();
  
  // Try preferred format first if provided
  if (preferredFormat) {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return {
          valid: true,
          date,
          format: preferredFormat,
          originalString: dateString,
          isoString: date.toISOString()
        };
      }
    } catch (e) {
      // Fall through to try other formats
    }
  }
  
  // Try standard built-in Date parsing first
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return {
        valid: true,
        date,
        format: 'native',
        originalString: dateString,
        isoString: date.toISOString()
      };
    }
  } catch (e) {
    // Fall through to manual parsing
  }
  
  // Manual parsing for various formats
  for (const format of DATE_FORMATS) {
    const result = tryParseWithFormat(dateString, format, timezone);
    if (result.valid) {
      return result;
    }
  }
  
  // If we get here, none of our formats worked
  return {
    valid: false,
    date: null,
    error: 'Could not parse date with any known format',
    originalString: dateString,
    suggestedFormat: 'YYYY-MM-DDTHH:mm:ss'
  };
}

/**
 * Attempts to parse a date string using a specific format
 * @private
 * @param {string} dateString - The date string to parse
 * @param {string} format - The format to try
 * @param {string} timezone - The timezone to use if not in the string
 * @returns {Object} - Result object with status and parsed date
 */
function tryParseWithFormat(dateString, format, timezone) {
  // This function would normally use a library like moment.js, luxon, or date-fns
  // For this implementation, we'll use a simplified approach
  
  // Handle ISO format specifically
  if (format.startsWith('YYYY-MM-DD')) {
    // Check if it matches the pattern generally
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T| )\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
    if (isoRegex.test(dateString)) {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return {
            valid: true,
            date,
            format,
            originalString: dateString,
            isoString: date.toISOString()
          };
        }
      } catch (e) {
        // Continue to other formats
      }
    }
  }
  
  // Handle MM/DD/YYYY format
  if (format.startsWith('MM/DD/YYYY')) {
    const mmddRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(\s(\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
    const match = dateString.match(mmddRegex);
    if (match) {
      const month = parseInt(match[1], 10) - 1; // 0-based months
      const day = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      const hour = match[5] ? parseInt(match[5], 10) : 0;
      const minute = match[6] ? parseInt(match[6], 10) : 0;
      const second = match[8] ? parseInt(match[8], 10) : 0;
      
      try {
        const date = new Date(year, month, day, hour, minute, second);
        if (!isNaN(date.getTime())) {
          return {
            valid: true,
            date,
            format,
            originalString: dateString,
            isoString: date.toISOString()
          };
        }
      } catch (e) {
        // Continue to other formats
      }
    }
  }
  
  // Handle DD/MM/YYYY format
  if (format.startsWith('DD/MM/YYYY')) {
    const ddmmRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(\s(\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
    const match = dateString.match(ddmmRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-based months
      const year = parseInt(match[3], 10);
      const hour = match[5] ? parseInt(match[5], 10) : 0;
      const minute = match[6] ? parseInt(match[6], 10) : 0;
      const second = match[8] ? parseInt(match[8], 10) : 0;
      
      try {
        const date = new Date(year, month, day, hour, minute, second);
        if (!isNaN(date.getTime())) {
          return {
            valid: true,
            date,
            format,
            originalString: dateString,
            isoString: date.toISOString()
          };
        }
      } catch (e) {
        // Continue to other formats
      }
    }
  }
  
  // Handle DD-MMM-YYYY format with month abbreviation
  if (format.startsWith('DD-MMM-YYYY')) {
    const ddmmmRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(\s(\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
    const match = dateString.match(ddmmmRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toUpperCase();
      const year = parseInt(match[3], 10);
      const hour = match[5] ? parseInt(match[5], 10) : 0;
      const minute = match[6] ? parseInt(match[6], 10) : 0;
      const second = match[8] ? parseInt(match[8], 10) : 0;
      
      // Convert month abbreviation to number
      const months = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      
      const month = months[monthStr];
      
      if (month !== undefined) {
        try {
          const date = new Date(year, month, day, hour, minute, second);
          if (!isNaN(date.getTime())) {
            return {
              valid: true,
              date,
              format,
              originalString: dateString,
              isoString: date.toISOString()
            };
          }
        } catch (e) {
          // Continue to other formats
        }
      }
    }
  }
  
  // Handle MMM DD YYYY format
  if (format.startsWith('MMM DD YYYY')) {
    const mmmddRegex = /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})(\s+(\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
    const match = dateString.match(mmmddRegex);
    if (match) {
      const monthStr = match[1].toUpperCase();
      const day = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      const hour = match[5] ? parseInt(match[5], 10) : 0;
      const minute = match[6] ? parseInt(match[6], 10) : 0;
      const second = match[8] ? parseInt(match[8], 10) : 0;
      
      // Convert month abbreviation to number
      const months = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      
      const month = months[monthStr];
      
      if (month !== undefined) {
        try {
          const date = new Date(year, month, day, hour, minute, second);
          if (!isNaN(date.getTime())) {
            return {
              valid: true,
              date,
              format,
              originalString: dateString,
              isoString: date.toISOString()
            };
          }
        } catch (e) {
          // Continue to other formats
        }
      }
    }
  }
  
  return {
    valid: false,
    date: null,
    format,
    error: `Failed to parse with format ${format}`,
    originalString: dateString
  };
}

/**
 * Formats a date object to ISO string
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatToISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Formats a date object to a specified format
 * @param {Date} date - The date to format
 * @param {string} format - The format to use
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DDTHH:mm:ss') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  
  // Very simple format implementation for a few common formats
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'YYYY-MM-DDTHH:mm:ss':
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return date.toISOString();
  }
}

/**
 * Determines if a string is a valid date
 * @param {string} dateString - The date string to check
 * @returns {boolean} - True if valid date
 */
function isValidDate(dateString) {
  return parseDate(dateString).valid;
}

/**
 * Gets the recommended format for a date string
 * @param {string} dateString - The date string to analyze
 * @returns {string} - Recommended format
 */
function getRecommendedFormat(dateString) {
  const result = parseDate(dateString);
  if (result.valid) {
    return result.format;
  }
  return result.suggestedFormat || 'YYYY-MM-DDTHH:mm:ss';
}

module.exports = {
  parseDate,
  formatToISO,
  formatDate,
  isValidDate,
  getRecommendedFormat,
  DATE_FORMATS
}; 