-- Create flight_schedules table
CREATE TABLE IF NOT EXISTS flight_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  upload_id INTEGER,
  created_by INTEGER,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'draft',
  validated_at TIMESTAMP,
  allocated_at TIMESTAMP,
  valid_flights INTEGER DEFAULT 0,
  invalid_flights INTEGER DEFAULT 0,
  allocated_flights INTEGER DEFAULT 0,
  unallocated_flights INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unallocated_flights table
CREATE TABLE IF NOT EXISTS unallocated_flights (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER,
  flight_id INTEGER,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create stand_utilization_metrics table
CREATE TABLE IF NOT EXISTS stand_utilization_metrics (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER,
  stand_id INTEGER,
  time_period VARCHAR(20) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  utilization_percentage DECIMAL(5,2) NOT NULL,
  minutes_utilized INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create allocation_issues table
CREATE TABLE IF NOT EXISTS allocation_issues (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER,
  issue_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  affected_entities JSON NOT NULL,
  recommendation TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update stand_allocations table
-- First check if the columns exist to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stand_allocations' AND column_name = 'schedule_id') THEN
    ALTER TABLE stand_allocations ADD COLUMN schedule_id INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stand_allocations' AND column_name = 'start_time') THEN
    ALTER TABLE stand_allocations ADD COLUMN start_time TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stand_allocations' AND column_name = 'end_time') THEN
    ALTER TABLE stand_allocations ADD COLUMN end_time TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stand_allocations' AND column_name = 'is_manual') THEN
    ALTER TABLE stand_allocations ADD COLUMN is_manual BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index on stand_allocations
CREATE INDEX IF NOT EXISTS stand_allocations_schedule_stand_flight_idx ON stand_allocations (schedule_id, stand_id, flight_id); 