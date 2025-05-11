-- SQL script to generate test data for Stand Capacity Tool
-- Creates 30 stands with varied configurations and adjacency relationships

-- First, ensure we have necessary terminals and piers
INSERT INTO terminals (name, code, description)
VALUES 
  ('Terminal 1', 'T1', 'Main passenger terminal'),
  ('Terminal 2', 'T2', 'Secondary passenger terminal'),
  ('Terminal 3', 'T3', 'International terminal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO piers (name, code, terminal_id, description)
VALUES 
  ('Pier A', 'A', (SELECT id FROM terminals WHERE code = 'T1'), 'North pier of Terminal 1'),
  ('Pier B', 'B', (SELECT id FROM terminals WHERE code = 'T1'), 'South pier of Terminal 1'),
  ('Pier C', 'C', (SELECT id FROM terminals WHERE code = 'T2'), 'Main pier of Terminal 2'),
  ('Pier D', 'D', (SELECT id FROM terminals WHERE code = 'T3'), 'International pier'),
  ('Pier E', 'E', (SELECT id FROM terminals WHERE code = 'T3'), 'Remote pier for widebody aircraft')
ON CONFLICT (code, terminal_id) DO NOTHING;

-- Create fuel availability settings
ALTER TABLE stands ADD COLUMN IF NOT EXISTS fuel_enabled BOOLEAN DEFAULT false;

-- Clear existing test stands (if any) - be careful with this in production!
-- DELETE FROM stand_adjacencies WHERE stand_id IN (SELECT id FROM stands WHERE name LIKE 'TEST%');
-- DELETE FROM stand_aircraft_constraints WHERE stand_id IN (SELECT id FROM stands WHERE name LIKE 'TEST%');
-- DELETE FROM stands WHERE name LIKE 'TEST%';

-- Create 30 test stands with varied configurations
-- Pier A stands (Terminal 1) - Primarily for narrow body aircraft
INSERT INTO stands (name, code, pier_id, is_active, stand_type, has_jetbridge, max_wingspan_meters, 
                   max_length_meters, max_aircraft_size, description, latitude, longitude, fuel_enabled)
SELECT 
  'TEST-A' || num,                               -- name
  'A' || num,                                    -- code
  (SELECT id FROM piers WHERE code = 'A'),       -- pier_id
  true,                                          -- is_active
  'contact',                                     -- stand_type
  true,                                          -- has_jetbridge
  36,                                            -- max_wingspan_meters
  40,                                            -- max_length_meters
  'C',                                           -- max_aircraft_size
  'Test narrow body stand at Pier A',            -- description
  40.6 + (num::float / 100),                     -- latitude (dummy values)
  -73.8 + (num::float / 100),                    -- longitude (dummy values)
  num % 3 = 0                                    -- fuel_enabled (every 3rd stand)
FROM generate_series(1, 10) AS num
ON CONFLICT (code, pier_id) DO NOTHING;

-- Pier B stands (Terminal 1) - Mixed use for narrow and small wide body aircraft
INSERT INTO stands (name, code, pier_id, is_active, stand_type, has_jetbridge, max_wingspan_meters, 
                   max_length_meters, max_aircraft_size, description, latitude, longitude, fuel_enabled)
SELECT 
  'TEST-B' || num,                               -- name
  'B' || num,                                    -- code
  (SELECT id FROM piers WHERE code = 'B'),       -- pier_id
  true,                                          -- is_active
  'contact',                                     -- stand_type
  true,                                          -- has_jetbridge
  CASE WHEN num % 2 = 0 THEN 52 ELSE 36 END,     -- max_wingspan_meters (every 2nd stand larger)
  CASE WHEN num % 2 = 0 THEN 60 ELSE 40 END,     -- max_length_meters
  CASE WHEN num % 2 = 0 THEN 'D' ELSE 'C' END,   -- max_aircraft_size
  CASE WHEN num % 2 = 0 
    THEN 'Test small wide body stand at Pier B'
    ELSE 'Test narrow body stand at Pier B'
  END,                                           -- description
  40.65 + (num::float / 100),                    -- latitude
  -73.75 + (num::float / 100),                   -- longitude
  num % 2 = 0                                    -- fuel_enabled (all wide body stands)
FROM generate_series(1, 8) AS num
ON CONFLICT (code, pier_id) DO NOTHING;

-- Pier D stands (Terminal 3) - International terminal with wide body aircraft
INSERT INTO stands (name, code, pier_id, is_active, stand_type, has_jetbridge, max_wingspan_meters, 
                   max_length_meters, max_aircraft_size, description, latitude, longitude, fuel_enabled)
SELECT 
  'TEST-D' || num,                               -- name
  'D' || num,                                    -- code
  (SELECT id FROM piers WHERE code = 'D'),       -- pier_id
  true,                                          -- is_active
  'contact',                                     -- stand_type
  true,                                          -- has_jetbridge
  CASE 
    WHEN num <= 2 THEN 80        -- A380 compatible
    WHEN num <= 5 THEN 65        -- B777/B787 compatible
    ELSE 52                      -- A330/B767 compatible
  END,                                           -- max_wingspan_meters
  CASE 
    WHEN num <= 2 THEN 80
    WHEN num <= 5 THEN 70
    ELSE 60
  END,                                           -- max_length_meters
  CASE 
    WHEN num <= 2 THEN 'F'
    WHEN num <= 5 THEN 'E'
    ELSE 'D'
  END,                                           -- max_aircraft_size
  'Test wide body stand at Pier D',              -- description
  40.7 + (num::float / 100),                     -- latitude
  -73.9 + (num::float / 100),                    -- longitude
  true                                           -- fuel_enabled (all are fuel enabled)
FROM generate_series(1, 7) AS num
ON CONFLICT (code, pier_id) DO NOTHING;

-- Pier E stands (Terminal 3) - Remote stands primarily for wide body aircraft
INSERT INTO stands (name, code, pier_id, is_active, stand_type, has_jetbridge, max_wingspan_meters, 
                   max_length_meters, max_aircraft_size, description, latitude, longitude, fuel_enabled)
SELECT 
  'TEST-E' || num,                               -- name
  'E' || num,                                    -- code
  (SELECT id FROM piers WHERE code = 'E'),       -- pier_id
  true,                                          -- is_active
  'remote',                                      -- stand_type
  false,                                         -- has_jetbridge
  CASE 
    WHEN num = 1 THEN 80         -- A380 compatible
    ELSE 65                      -- B777/B787 compatible
  END,                                           -- max_wingspan_meters
  CASE 
    WHEN num = 1 THEN 80
    ELSE 70
  END,                                           -- max_length_meters
  CASE 
    WHEN num = 1 THEN 'F'
    ELSE 'E'
  END,                                           -- max_aircraft_size
  'Test remote wide body stand at Pier E',       -- description
  40.75 + (num::float / 100),                    -- latitude
  -73.95 + (num::float / 100),                   -- longitude
  CASE WHEN num <= 3 THEN true ELSE false END    -- fuel_enabled (first 3 only)
FROM generate_series(1, 5) AS num
ON CONFLICT (code, pier_id) DO NOTHING;

-- Set up stand adjacency relationships
-- Clear existing adjacencies for test stands
DELETE FROM stand_adjacencies 
WHERE stand_id IN (SELECT id FROM stands WHERE name LIKE 'TEST%')
OR adjacent_stand_id IN (SELECT id FROM stands WHERE name LIKE 'TEST%');

-- Create adjacency relationships between Pier A stands (linear pier)
-- Each stand affects adjacent stands
INSERT INTO stand_adjacencies (stand_id, adjacent_stand_id, impact_direction, restriction_type, max_aircraft_size_code, description)
SELECT 
  s1.id, 
  s2.id, 
  CASE 
    WHEN s1.code < s2.code THEN 'right'
    ELSE 'left'
  END,
  'size_limited',
  'B',  -- Allow only up to size B when adjacent stand is in use
  'Size restriction due to adjacent stand usage'
FROM stands s1
JOIN stands s2 ON 
  s1.pier_id = s2.pier_id AND
  CAST(SUBSTRING(s1.code FROM 2) AS integer) = CAST(SUBSTRING(s2.code FROM 2) AS integer) - 1
WHERE 
  s1.name LIKE 'TEST-A%' AND
  s2.name LIKE 'TEST-A%';

-- Create adjacency relationships between Pier B stands (facing stands)
-- Every even stand affects the odd stand across from it
INSERT INTO stand_adjacencies (stand_id, adjacent_stand_id, impact_direction, restriction_type, max_aircraft_size_code, description)
SELECT 
  s1.id, 
  s2.id, 
  'front',
  CASE
    WHEN s1.max_aircraft_size = 'D' THEN 'no_use'  -- No use when a wide-body is at the facing stand
    ELSE 'size_limited'  -- Size limitation otherwise
  END,
  'B',  -- Allow only up to size B when adjacent stand is in use (if not completely blocked)
  'Restriction due to facing stand usage'
FROM stands s1
JOIN stands s2 ON 
  s1.pier_id = s2.pier_id AND
  (CAST(SUBSTRING(s1.code FROM 2) AS integer) % 2 = 0) AND
  (CAST(SUBSTRING(s2.code FROM 2) AS integer) = CAST(SUBSTRING(s1.code FROM 2) AS integer) - 1)
WHERE 
  s1.name LIKE 'TEST-B%' AND
  s2.name LIKE 'TEST-B%';

-- Create adjacency relationships between Pier D stands (large aircraft restrictions)
-- D1 and D2 (A380 capable) affect neighboring stands
INSERT INTO stand_adjacencies (stand_id, adjacent_stand_id, impact_direction, restriction_type, max_aircraft_size_code, description)
SELECT 
  s1.id, 
  s2.id, 
  CASE 
    WHEN CAST(SUBSTRING(s1.code FROM 2) AS integer) < CAST(SUBSTRING(s2.code FROM 2) AS integer) THEN 'right'
    ELSE 'left'
  END,
  'no_use',  -- No use when A380 is at the adjacent stand
  NULL,
  'No operations allowed due to A380 at adjacent stand'
FROM stands s1
JOIN stands s2 ON 
  s1.pier_id = s2.pier_id AND
  ABS(CAST(SUBSTRING(s1.code FROM 2) AS integer) - CAST(SUBSTRING(s2.code FROM 2) AS integer)) = 1
WHERE 
  s1.name LIKE 'TEST-D%' AND
  s2.name LIKE 'TEST-D%' AND
  s1.max_aircraft_size = 'F';

-- Create complex adjacency pattern for Pier E remote stands
-- E1 (A380 capable) affects multiple surrounding stands
INSERT INTO stand_adjacencies (stand_id, adjacent_stand_id, impact_direction, restriction_type, max_aircraft_size_code, description)
SELECT 
  s1.id, 
  s2.id, 
  CASE 
    WHEN CAST(SUBSTRING(s2.code FROM 2) AS integer) > CAST(SUBSTRING(s1.code FROM 2) AS integer) THEN 'right'
    ELSE 'left'
  END,
  CASE
    WHEN ABS(CAST(SUBSTRING(s1.code FROM 2) AS integer) - CAST(SUBSTRING(s2.code FROM 2) AS integer)) = 1 THEN 'no_use'
    ELSE 'size_limited'
  END,
  CASE
    WHEN ABS(CAST(SUBSTRING(s1.code FROM 2) AS integer) - CAST(SUBSTRING(s2.code FROM 2) AS integer)) = 1 THEN NULL
    ELSE 'C'
  END,
  CASE
    WHEN ABS(CAST(SUBSTRING(s1.code FROM 2) AS integer) - CAST(SUBSTRING(s2.code FROM 2) AS integer)) = 1 
      THEN 'No operations allowed due to A380 at adjacent stand'
    ELSE 'Size restriction due to A380 at nearby stand'
  END
FROM stands s1
JOIN stands s2 ON 
  s1.pier_id = s2.pier_id AND
  s1.id != s2.id AND
  CAST(SUBSTRING(s1.code FROM 2) AS integer) = 1 AND
  CAST(SUBSTRING(s2.code FROM 2) AS integer) <= 3
WHERE 
  s1.name LIKE 'TEST-E%' AND
  s2.name LIKE 'TEST-E%' AND
  s1.max_aircraft_size = 'F';

-- Add some additional adjacency relationships between Pier E stands
INSERT INTO stand_adjacencies (stand_id, adjacent_stand_id, impact_direction, restriction_type, max_aircraft_size_code, description)
SELECT 
  s1.id, 
  s2.id, 
  CASE 
    WHEN CAST(SUBSTRING(s1.code FROM 2) AS integer) < CAST(SUBSTRING(s2.code FROM 2) AS integer) THEN 'right'
    ELSE 'left'
  END,
  'size_limited',
  'D',  -- Allow only up to size D when adjacent stand is in use
  'Size restriction due to adjacent stand usage'
FROM stands s1
JOIN stands s2 ON 
  s1.pier_id = s2.pier_id AND
  ABS(CAST(SUBSTRING(s1.code FROM 2) AS integer) - CAST(SUBSTRING(s2.code FROM 2) AS integer)) = 1
WHERE 
  s1.name LIKE 'TEST-E%' AND
  s2.name LIKE 'TEST-E%' AND
  s1.max_aircraft_size = 'E' AND
  s2.max_aircraft_size = 'E';

-- Create aircraft compatibility constraints
-- Ensure all test stands have appropriate aircraft type compatibility
-- This would typically be handled by application logic, but we'll set some explicit constraints

-- Get all aircraft_types
-- Add constraints for specific stands to emphasize different capabilities
-- A stands - narrow body and regional jet focused
-- B stands - mixed use
-- D stands - wide body focused
-- E stands - wide body and 1 A380 capable

-- Note: In a real implementation, you'd iterate through all stands and aircraft types
-- to create appropriate constraints based on size categories and stand capabilities. 