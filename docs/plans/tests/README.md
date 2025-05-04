# Airport Capacity Planner - Connectivity Tests

This directory contains tests to verify that all components of the Airport Capacity Planner application are properly connected and working together.

## Test Files

1. **Backend Database Connectivity Test**
   - Location: `backend/tests/db-connectivity.test.js`
   - Purpose: Verifies that the backend can successfully connect to the database and query a table.

2. **Frontend API Connectivity Test**
   - Location: `frontend/tests/api-connectivity.test.js`
   - Purpose: Verifies that the frontend can successfully communicate with backend API endpoints.

3. **End-to-End Connectivity Test**
   - Location: `tests/e2e-connectivity.js`
   - Purpose: Performs an integrated test of the entire system, checking database, backend API, and frontend availability.

## Running the Tests

You can run these tests using the following npm scripts from the root directory:

```bash
# Install dependencies
npm install

# Test backend-to-database connectivity
npm run test:backend-db

# Test frontend-to-backend API connectivity
npm run test:frontend-api

# Run the complete end-to-end connectivity test
npm run test:e2e
```

## Prerequisites

Before running the tests, ensure:

1. PostgreSQL database is running and populated with initial schema
2. Backend server is running (`npm run start:backend`)
3. Frontend development server is running (`npm run start:frontend`)

## Configuration

You can customize the test configuration using environment variables:

- `FRONTEND_URL`: URL of the frontend application (default: http://localhost:3000)
- `BACKEND_URL`: URL of the backend API (default: http://localhost:3001/api)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection details

## Troubleshooting

If you encounter errors running the tests:

1. **Module not found errors**: 
   Make sure you have run `npm install` in the root directory to install all dependencies needed for testing.
   
   The following packages are required at the root level:
   - axios
   - concurrently
   - dotenv
   - knex
   - pg

2. **Database connection errors**:
   - Verify PostgreSQL is running: `pg_isready`
   - Check your database credentials in the environment variables
   - Ensure the database exists: `createdb airport_capacity_planner` (if it doesn't)

3. **Backend connectivity issues**:
   - Make sure the backend server is running: `npm run start:backend`
   - Check if the API is accessible at http://localhost:3001/api/terminals

4. **Frontend connectivity issues**:
   - Make sure the frontend server is running: `npm run start:frontend`
   - Check if the frontend is accessible at http://localhost:3000 