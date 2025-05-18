/**
 * Simple logging utility
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'application.log');
    this.logLevel = process.env.LOG_LEVEL || 'info';
    
    // Log levels by priority
    this.LOG_LEVELS = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Check if the given log level should be logged based on current log level setting
   * @param {string} level - The log level to check
   * @returns {boolean} - Whether the log level should be logged
   */
  shouldLog(level) {
    return this.LOG_LEVELS[level] <= this.LOG_LEVELS[this.logLevel];
  }

  /**
   * Format a log message
   * @param {string} level - The log level
   * @param {string} message - The message to log
   * @returns {string} - Formatted log message
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Write a log message to console and file
   * @param {string} level - The log level
   * @param {string} message - The message to log
   */
  log(level, message) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message);
    
    // Log to console
    if (level === 'error') {
      console.error(formattedMessage);
    } else if (level === 'warn') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
    
    // Log to file
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   */
  debug(message) {
    this.log('debug', message);
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   */
  info(message) {
    this.log('info', message);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   */
  warn(message) {
    this.log('warn', message);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   */
  error(message) {
    this.log('error', message);
  }
}

module.exports = new Logger();