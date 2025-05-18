/**
 * Migration: Add TimescaleDB and PostGIS Extensions
 * 
 * This migration adds the TimescaleDB extension for time-series data management
 * and PostGIS extension for spatial data support, required for Phase 5.
 */

exports.up = async function(knex) {
  // Since extensions are PostgreSQL-specific, we need to use raw queries
  return knex.raw(`
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS postgis;
  `);
};

exports.down = async function(knex) {
  // Note: Dropping extensions can be dangerous in production,
  // especially if they contain data
  return knex.raw(`
    DROP EXTENSION IF EXISTS postgis;
    DROP EXTENSION IF EXISTS timescaledb;
  `);
};