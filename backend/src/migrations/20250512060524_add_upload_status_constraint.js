/**
 * Migration to update the upload_status constraint to include 'approved' value
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    ALTER TABLE flight_uploads DROP CONSTRAINT IF EXISTS flight_uploads_upload_status_check;
    ALTER TABLE flight_uploads ADD CONSTRAINT flight_uploads_upload_status_check 
      CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'error', 'approved'));
  `);
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.raw(`
    ALTER TABLE flight_uploads DROP CONSTRAINT IF EXISTS flight_uploads_upload_status_check;
    ALTER TABLE flight_uploads ADD CONSTRAINT flight_uploads_upload_status_check 
      CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'error'));
  `);
};
