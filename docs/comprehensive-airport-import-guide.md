# Comprehensive Airport Database Import Guide

This guide walks you through the process of downloading and importing a comprehensive global airport database to replace the limited sample data.

## Prerequisites

- Node.js and npm installed
- Access to the Airport Capacity Planner codebase
- Database connection configured

## Step 1: Install Dependencies

First, make sure all required dependencies are installed:

```bash
# From the project root
cd backend
npm install
```

## Step 2: Download Airport Data

The first step is to download and process comprehensive airport data from OpenFlights:

```bash
# From the backend directory
node src/scripts/download-airports-data.js
```

This script will:
1. Download airport data from OpenFlights
2. Download country data for proper mapping
3. Process the data into our required format
4. Save it to `src/data/airports.json`

You should see output like:
```
Downloading from https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat...
Processing 7698 airports...
Saving 6423 valid airports to /path/to/src/data/airports.json
Airport data processing complete!
```

## Step 3: Import Airport Data to the Database

After downloading the data, import it into your database:

```bash
# From the backend directory
node src/scripts/import-airports.js
```

This script will:
1. Read the downloaded airport data
2. Process it in batches to prevent memory issues
3. Import each airport into the database
4. Handle duplicates by updating existing records
5. Log progress and any errors

The import process may take a few minutes depending on the size of the dataset.

## Step 4: Start the Application

Start both the backend and frontend to see the changes:

```bash
# From the project root
npm run start
```

## Step 5: Verify the Import

1. Open your browser and navigate to http://localhost:3000/airports
2. You should now see thousands of airports instead of just 10
3. Try using the search function with different airports
4. Test the region and type filters
5. Check the pagination with the larger dataset

## Troubleshooting

### Error: Cannot find module 'csv-parser'

Run:
```bash
cd backend
npm install csv-parser
```

### Database Connection Issues

Make sure your database is running and the connection details in `.env` are correct.

### Import Errors

Check the error log file at `backend/src/logs/airport-import-errors.json` for details about any failed imports.

### API Endpoint Not Found

If you receive a 404 error when accessing the airports page, verify that:

1. The backend server is running
2. Your API routes are properly configured
3. The request is going to the correct endpoint

## Next Steps

After importing the comprehensive airport database, you can:

1. Explore the geo-spatial query features
2. Create custom airport groups for your capacity planning
3. Build reports based on regional airport data
4. Add additional data points like runway information 