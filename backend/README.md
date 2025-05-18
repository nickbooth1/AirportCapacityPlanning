# Airport Capacity Planning System - Backend

This is the backend component of the Airport Capacity Planning System, providing API endpoints, data processing, and business logic for stand allocation and capacity planning.

## Overview

The backend handles:

- Flight schedule data processing
- Stand allocation algorithms
- Capacity planning calculations
- Maintenance schedule integration
- Data validation and reporting

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL or PostgreSQL

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd backend
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Initialize the database:
   ```
   npm run db:migrate
   npm run db:seed
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

## Testing Framework

The backend includes a comprehensive testing framework for validating the system's functionality. The testing framework is designed to progressively test the system with increasing levels of complexity.

### Running Tests

#### Individual Tests

Run specific tests with:

```bash
# Run the sample test (16 flights)
node run-tests.js

# Run the peak hour test (48 flights)
node run-tests.js peak-hour

# Run the full day test (200 flights)
node run-tests.js full-day
```

#### Complete Test Suite

Run all tests in sequence:

```bash
node run-all-tests.js
```

### Test Documentation

Detailed documentation on the testing framework, test scenarios, and how to extend the tests is available in the [test README](./test/README.md).

## Key Components

### Flight Processing

- `/src/services/FlightProcessorService.js` - Handles flight schedule processing
- `/src/services/adapted/StandAllocationAdapter.js` - Adapts flight data for allocation

### Stand Allocation

- `/src/services/standCapacityService.js` - Calculates stand capacity
- `/src/services/adapted/calculator/` - Allocation algorithms and utilities

### Maintenance Integration

- `/src/services/maintenance/` - Maintenance scheduling and integration

## Database Structure

The system uses a relational database with the following key tables:

- `flights` - Flight schedule data
- `stands` - Stand information and constraints
- `airlines` - Airline preferences and requirements
- `stand_allocations` - Results of stand allocation
- `stand_maintenance_requests` - Maintenance scheduling

## Development

### Code Style

This project follows JavaScript Standard Style. Run linting:

```
npm run lint
```

### Test Coverage

Generate test coverage reports:

```
npm run test:coverage
```

### CI/CD

Continuous integration is configured to run tests and linting on all PRs.

## Contributing

Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Troubleshooting

### API URL Issues

If you are having issues with API connections:

1. Check the baseURL in `frontend/src/lib/api.js` to make sure it has the correct prefix (e.g., with or without `/api`)
2. Check individual API calls to make sure they aren't adding duplicate `/api` prefixes

### Stand Capacity Calculation Issues

If the stand capacity calculation shows zero values:

1. **Check Stand-Aircraft Compatibility Data**: Make sure entries exist in the `stand_aircraft_constraints` table
   - Run `node src/scripts/update-stand-constraints.js` to populate constraints

2. **Model Adaptation Issue**: The most common problem is that the database model IDs need to be mapped to the ICAO/IATA codes
   - Database constraint records use numeric IDs (e.g., `1`, `2`) 
   - The capacity calculator expects aircraft type codes (e.g., `A320`, `B77W`)
   - The `standCapacityService.adaptForCalculation` method must convert from IDs to codes
   
3. **Time Slots**: Ensure time slots are properly defined with valid time ranges
   - Run `node src/scripts/update-time-slots.js` to create basic time slots

4. **Turnaround Rules**: Make sure turnaround times are defined for aircraft types
   - Run `node src/scripts/update-turnaround-rules.js` to create basic rules

5. **Operational Settings**: Ensure operational settings exist in the database
   - Create a record in the `operational_settings` table with valid values

To verify that everything is set up correctly, you can run:
```
node src/scripts/verify-capacity-calculation.js
```

# Database Migrations

## Troubleshooting Migrations

If you encounter errors with missing tables in the database, such as "relation does not exist" errors, it might be because some required migrations haven't been run. Here's how to troubleshoot:

1. Check if the table exists in the database:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'table_name'
   );
   ```

2. Check the status of migrations:
   ```bash
   npx knex migrate:list
   ```

3. If migrations are showing as pending but the tables already exist (which can happen if migrations were run manually or via another tool), you can mark them as completed in the knex_migrations table:
   ```sql
   INSERT INTO knex_migrations (name, batch, migration_time) 
   VALUES ('migration_name.js', (SELECT MAX(batch) FROM knex_migrations) + 1, NOW());
   ```

4. If tables are missing entirely, you can create them with SQL commands:
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   ```

5. After manual changes, restart the server to ensure all changes are picked up. 