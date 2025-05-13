/**
 * Migration to update the flight_uploads table constraints and columns
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    -- Drop constraint if exists and recreate with 'approved' status
    ALTER TABLE flight_uploads DROP CONSTRAINT IF EXISTS flight_uploads_upload_status_check;
    ALTER TABLE flight_uploads ADD CONSTRAINT flight_uploads_upload_status_check 
      CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'error', 'approved'));
    
    -- Ensure validation_status column exists
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN validation_status VARCHAR(255) DEFAULT 'pending';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
    END $$;
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
    -- Revert constraint to original state
    ALTER TABLE flight_uploads DROP CONSTRAINT IF EXISTS flight_uploads_upload_status_check;
    ALTER TABLE flight_uploads ADD CONSTRAINT flight_uploads_upload_status_check 
      CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed', 'error'));
  `);
}; 