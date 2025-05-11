-- Migration to add body_type column to aircraft_types table
ALTER TABLE aircraft_types ADD COLUMN body_type VARCHAR(10);

-- Update existing records based on size category
UPDATE aircraft_types 
SET body_type = 
  CASE 
    WHEN size_category IN ('A', 'B', 'C') THEN 'narrow'
    WHEN size_category IN ('D', 'E', 'F') THEN 'wide'
    ELSE 'unknown'
  END;

-- Update specific aircraft types that may need manual classification
-- Wide-body aircraft that might not fit the size category pattern
UPDATE aircraft_types
SET body_type = 'wide'
WHERE icao_code IN (
  'A332', 'A333', 'A339', 'A338', -- Airbus A330 series
  'A359', 'A35K',                 -- Airbus A350 series
  'A388',                         -- Airbus A380
  'B762', 'B763', 'B764',         -- Boeing 767 series
  'B772', 'B773', 'B77L', 'B77W', -- Boeing 777 series
  'B788', 'B789', 'B78X'          -- Boeing 787 series
);

-- Narrow-body aircraft that might not fit the size category pattern
UPDATE aircraft_types
SET body_type = 'narrow'
WHERE icao_code IN (
  'A318', 'A319', 'A320', 'A321', -- Airbus A320 family
  'A221', 'A223',                 -- Airbus A220 series
  'B735', 'B736', 'B737', 'B738', 'B739', -- Boeing 737 classic/NG
  'B37M', 'B38M', 'B39M',         -- Boeing 737 MAX
  'B752', 'B753',                 -- Boeing 757 series
  'E170', 'E75L', 'E190', 'E195', -- Embraer E-jets
  'AT45', 'AT75',                 -- ATR 42/72
  'DH8D',                         -- Dash 8
  'CRJ7', 'CRJ9', 'CRJX',         -- CRJ series
  'SF34', 'C30J'                  -- Other regional aircraft
);

-- Add NOT NULL constraint after population
ALTER TABLE aircraft_types ALTER COLUMN body_type SET NOT NULL; 