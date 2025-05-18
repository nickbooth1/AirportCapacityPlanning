/**
 * Migration to fix flights validation_status constraint
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    -- First check if constraint exists
    DO $$ 
    BEGIN
      -- Check if the constraint exists
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'flights_validation_status_check'
      ) THEN
        -- Drop the constraint if it exists
        ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_validation_status_check;
      END IF;
      
      -- Add constraint that allows all necessary values
      ALTER TABLE flights ADD CONSTRAINT flights_validation_status_check 
        CHECK (validation_status IN ('valid', 'invalid', 'pending', 'new'));
    END $$;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.raw(`
    -- Revert to original constraint
    ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_validation_status_check;
    ALTER TABLE flights ADD CONSTRAINT flights_validation_status_check 
      CHECK (validation_status IN ('valid', 'invalid'));
  `);
};
