# Airport Database Enhancement

This document outlines the steps to enhance the Airport Capacity Planner with a comprehensive global airport database.

## Overview

The Airport Capacity Planner initially used a sample dataset with 10 major airports. This enhancement expands the database to include thousands of airports worldwide, using data from OpenFlights and other aviation sources.

## Benefits

- Comprehensive coverage of global airports
- Accurate airport details including IATA/ICAO codes, locations, and facilities
- Better support for capacity planning across diverse airport types and regions
- Enhanced geospatial queries for proximity-based planning

## Implementation Steps

### 1. Download the Comprehensive Airport Data

The first step is to download and process the airport data from OpenFlights:

```bash
# Install required dependencies
cd backend
npm install

# Run the download script
node src/scripts/download-airports-data.js
```

This will:
- Download airport data from OpenFlights
- Download country data for proper country name mapping
- Process and standardize the data format
- Save it as `src/data/airports.json`

### 2. Import the Airport Data

After downloading the data, import it into your database:

```bash
# Run database migrations if not already done
npx knex migrate:latest

# Import the comprehensive airport data
node src/scripts/import-airports.js
```

This script:
- Imports all airports in batches to prevent memory issues
- Handles duplicate records by updating existing entries
- Logs any errors for later analysis

### 3. Restart the Application

Restart both the backend and frontend services to apply the changes:

```bash
# Restart the application
npm run start
```

### 4. Verify the Import

1. Open your browser and navigate to the Airports page
2. Verify that many more airports are now listed
3. Test the search functionality with different airports
4. Test filtering by region and airport type

## Data Sources

The primary data source is OpenFlights, which provides:
- Basic airport information (name, location, codes)
- Geospatial coordinates
- Country and regional data

## Maintenance

To update the airport database in the future:
1. Run the download script again to fetch the latest data
2. Run the import script to update the database
3. Review any error logs for issues

## Troubleshooting

If you encounter issues:

1. **Missing Dependencies**: Ensure all required npm packages are installed
   ```bash
   cd backend
   npm install csv-parser axios
   ```

2. **Database Connection Issues**: Check your `.env` file for proper database credentials

3. **Import Errors**: Check the error log at `backend/src/logs/airport-import-errors.json` 