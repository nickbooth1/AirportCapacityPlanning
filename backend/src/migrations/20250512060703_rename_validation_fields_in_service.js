/**
 * Migration to rename validation fields in flight_uploads table to match service naming
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    -- Add valid_flights column if it doesn't exist
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN valid_flights INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN invalid_flights INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN total_flights INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      -- Copy data from existing columns if they exist
      BEGIN
        UPDATE flight_uploads SET valid_flights = valid_count WHERE valid_count IS NOT NULL;
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
      
      BEGIN
        UPDATE flight_uploads SET invalid_flights = invalid_count WHERE invalid_count IS NOT NULL;
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
      
      BEGIN
        UPDATE flight_uploads SET total_flights = COALESCE(valid_count, 0) + COALESCE(invalid_count, 0) WHERE valid_count IS NOT NULL OR invalid_count IS NOT NULL;
      EXCEPTION
        WHEN undefined_column THEN NULL;
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
    DO $$ 
    BEGIN
      -- Don't drop columns in down migration, as they might be used by the application
      -- Just ensure valid_count and invalid_count columns exist
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN valid_count INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE flight_uploads ADD COLUMN invalid_count INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      -- Copy data back
      BEGIN
        UPDATE flight_uploads SET valid_count = valid_flights WHERE valid_flights IS NOT NULL;
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
      
      BEGIN
        UPDATE flight_uploads SET invalid_count = invalid_flights WHERE invalid_flights IS NOT NULL;
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
    END $$;
  `);
};
