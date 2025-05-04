# Airport Capacity Planner - Global Airport Database

## Overview

The Airport Capacity Planner now includes a comprehensive global airport database featuring over 7,500 airports worldwide. This is a significant enhancement over the previous implementation which contained only 10 sample airports.

## Features

- **Complete Global Coverage**: Includes airports from all regions across the world
- **Comprehensive Data**: Each airport includes IATA/ICAO codes, location data, elevation, and timezone
- **Efficient Data Loading**: Data is processed in batches to handle the large dataset
- **Enhanced Search**: Frontend includes search, filtering, and pagination capabilities
- **Geo-Spatial Queries**: Support for finding airports by proximity and coordinates

## Implementation

This enhancement includes:

1. **Airport Data Downloader**: A script to download and process data from OpenFlights
2. **Data Import Script**: Tool to import the comprehensive dataset into the database
3. **Backend API Improvements**:
   - Efficient pagination and filtering
   - Geo-spatial query support
4. **Frontend Enhancements**:
   - Region-based filtering
   - Airport type filtering
   - Improved pagination for large datasets
   - Visual statistics about the data

## Source Data

The airport data comes from the OpenFlights database, which includes:
- IATA & ICAO codes
- Geographic coordinates
- Timezone and DST information
- Airport types and status

## Airport Types

Airports are categorized into the following types:
- **Large Airport**: Major international airports
- **Medium Airport**: Regional airports and domestic hubs
- **Small Airport**: Local and municipal airports
- **Heliport**: Dedicated helicopter landing facilities
- **Seaplane Base**: Water landing facilities

## Usage

### Searching Airports

The airports page provides a comprehensive search tool that allows filtering by:
- Airport name
- IATA/ICAO code
- City or country
- Geographic region
- Airport type

### API Endpoints

The backend provides the following API endpoints:

- `GET /api/airports` - List all airports with pagination and filtering
- `GET /api/airports/:id` - Get airport by ID
- `GET /api/airports/iata/:code` - Get airport by IATA code
- `GET /api/airports/icao/:code` - Get airport by ICAO code
- `GET /api/airports/search` - Search airports by query
- `GET /api/airports/radius` - Find airports within a radius of coordinates
- `GET /api/airports/nearest` - Find the nearest airport to coordinates

## Maintenance

To update the airport database in the future:

1. Run the download script: `node src/scripts/download-airports-data.js`
2. Run the import script: `node src/scripts/import-airports.js`

## Getting Started

See the [Comprehensive Airport Import Guide](docs/comprehensive-airport-import-guide.md) for detailed instructions on importing the full airport database. 