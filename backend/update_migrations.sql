-- Mark our migrations as completed in the knex_migrations table
INSERT INTO knex_migrations (name, batch, migration_time) VALUES 
('20250511235000_create_flight_schedules_table.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW()),
('20250511235001_create_unallocated_flights_table.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW()),
('20250511235002_create_stand_utilization_metrics_table.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW()),
('20250511235003_create_allocation_issues_table.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW()),
('20250511235004_update_stand_allocations_table.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW()); 