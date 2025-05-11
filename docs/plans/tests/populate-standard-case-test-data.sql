-- Clear existing test data
DELETE FROM stand_adjacencies WHERE TRUE;
DELETE FROM stand_aircraft_constraints WHERE TRUE;
DELETE FROM turnaround_rules WHERE TRUE;
DELETE FROM stands WHERE TRUE;
DELETE FROM aircraft_types WHERE TRUE;
DELETE FROM piers WHERE TRUE;
DELETE FROM terminals WHERE TRUE;
DELETE FROM time_slots WHERE TRUE;

-- Reset sequences (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'terminals_id_seq') THEN
        ALTER SEQUENCE terminals_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'piers_id_seq') THEN
        ALTER SEQUENCE piers_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'aircraft_types_id_seq') THEN
        ALTER SEQUENCE aircraft_types_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'stands_id_seq') THEN
        ALTER SEQUENCE stands_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'stand_aircraft_constraints_id_seq') THEN
        ALTER SEQUENCE stand_aircraft_constraints_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'turnaround_rules_id_seq') THEN
        ALTER SEQUENCE turnaround_rules_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'time_slots_id_seq') THEN
        ALTER SEQUENCE time_slots_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'stand_adjacencies_id_seq') THEN
        ALTER SEQUENCE stand_adjacencies_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Add is_active column to aircraft_types if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'aircraft_types' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE aircraft_types ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add is_active column to turnaround_rules if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'turnaround_rules' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE turnaround_rules ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Terminal
INSERT INTO terminals (name, code, description)
VALUES ('Terminal 1', 'T1', 'Main terminal');

-- Piers
INSERT INTO piers (name, code, terminal_id, description)
VALUES ('Pier A', 'PA', 1, 'Domestic flights');

-- Aircraft Types
INSERT INTO aircraft_types (iata_code, icao_code, name, manufacturer, model, wingspan_meters, length_meters, size_category_code, is_active)
VALUES 
('320', 'A320', 'Airbus A320', 'Airbus', 'A320', 36, 37, 'C', true),
('77W', 'B77W', 'Boeing 777-300ER', 'Boeing', '777-300ER', 65, 74, 'E', true);

-- Stands
INSERT INTO stands (name, code, pier_id, is_active, stand_type, has_jetbridge, max_wingspan_meters, max_length_meters, max_aircraft_size_code)
VALUES 
('Stand 1A', '1A', 1, true, 'CONTACT', true, 36, 45, 'C'),
('Stand 2A', '2A', 1, true, 'CONTACT', true, 65, 75, 'E');

-- Stand Aircraft Constraints (define which aircraft can use which stand)
INSERT INTO stand_aircraft_constraints (stand_id, aircraft_type_id, is_allowed)
VALUES
((SELECT id FROM stands WHERE code = '1A'), (SELECT id FROM aircraft_types WHERE iata_code = '320'), true),
((SELECT id FROM stands WHERE code = '2A'), (SELECT id FROM aircraft_types WHERE iata_code = '77W'), true);

-- Turnaround Rules
INSERT INTO turnaround_rules (aircraft_type_id, min_turnaround_minutes, is_active)
VALUES 
((SELECT id FROM aircraft_types WHERE iata_code = '320'), 45, true),
((SELECT id FROM aircraft_types WHERE iata_code = '77W'), 90, true);

-- Time Slots
INSERT INTO time_slots (name, start_time, end_time, description, is_active)
VALUES 
('Morning', '06:00:00', '12:00:00', 'Morning period', true),
('Afternoon', '12:00:00', '18:00:00', 'Afternoon period', true),
('Evening', '18:00:00', '23:59:59', 'Evening period', true); 