/**
 * Database module proxy
 * This file exists to maintain compatibility with services
 * that import the database from '../db' instead of '../utils/db'
 */

// Re-export the database module
module.exports = require('./utils/db'); 