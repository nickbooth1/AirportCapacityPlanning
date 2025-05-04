/**
 * Airline Data Import Script
 * This script fetches airlines from multiple sources, processes them, and imports
 * them into the Airline repository.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const AirlineService = require('../services/AirlineService');
const db = require('../utils/db');
const { Model } = require('objection');

// Load environment variables
dotenv.config();

// Bind all Objection.js models to the knex instance
Model.knex(db);

// Config
const DATA_DIR = path.join(__dirname, '../../data');
const OPENFLIGHTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';
const WIKIPEDIA_AIRLINES_URL = 'https://en.wikipedia.org/wiki/List_of_airlines';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Fetch airlines data from OpenFlights
 * @returns {Promise<Array>} Array of airline objects
 */
async function fetchOpenFlightsData() {
  console.log('Fetching data from OpenFlights...');
  
  const response = await axios.get(OPENFLIGHTS_URL);
  const lines = response.data.split('\n');
  
  // Save raw data for reference
  fs.writeFileSync(path.join(DATA_DIR, 'openflights_airlines_raw.csv'), response.data);
  
  // Parse the CSV data
  const airlines = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',').map(part => part.replace(/^"(.*)"$/, '$1'));
    
    if (parts.length < 8) continue;
    
    airlines.push({
      name: parts[1],
      iata_code: parts[3] === '\\N' ? null : parts[3],
      icao_code: parts[4] === '\\N' ? null : parts[4],
      callsign: parts[5] === '\\N' ? null : parts[5],
      country: parts[6],
      active: parts[7] === 'Y'
    });
  }
  
  console.log(`Processed ${airlines.length} airlines from OpenFlights`);
  return airlines;
}

/**
 * Fetch airlines data from Wikipedia
 * @returns {Promise<Array>} Array of airline objects
 */
async function fetchWikipediaData() {
  console.log('Fetching data from Wikipedia...');
  
  const response = await axios.get(WIKIPEDIA_AIRLINES_URL);
  const $ = cheerio.load(response.data);
  
  // Save raw data for reference
  fs.writeFileSync(path.join(DATA_DIR, 'wikipedia_airlines_raw.html'), response.data);
  
  const airlines = [];
  
  // Find tables with airline information (this is simplified and may need adjustments)
  $('table.wikitable').each((i, table) => {
    $(table).find('tr').each((j, row) => {
      if (j === 0) return; // Skip header row
      
      const columns = $(row).find('td');
      if (columns.length < 3) return;
      
      const airline = {
        name: $(columns[0]).text().trim(),
        iata_code: $(columns[1]).text().trim() || null,
        icao_code: $(columns[2]).text().trim() || null,
        country: columns.length > 3 ? $(columns[3]).text().trim() : null
      };
      
      // Only add if we have at least one code
      if (airline.name && (airline.iata_code || airline.icao_code)) {
        airlines.push(airline);
      }
    });
  });
  
  console.log(`Processed ${airlines.length} airlines from Wikipedia`);
  return airlines;
}

/**
 * Merge and deduplicate airline data from multiple sources
 * @param {Array} sources - Arrays of airline objects from different sources
 * @returns {Array} Merged and deduplicated airlines
 */
function mergeAirlineData(sources) {
  const airlineMap = new Map();
  
  // Process each source
  for (const [sourceIndex, source] of sources.entries()) {
    for (const airline of source) {
      let key = null;
      
      // Try to match by IATA code first (preferred)
      if (airline.iata_code && airline.iata_code.length === 2) {
        key = `IATA:${airline.iata_code}`;
      } 
      // Then try ICAO code
      else if (airline.icao_code && airline.icao_code.length === 3) {
        key = `ICAO:${airline.icao_code}`;
      }
      // Last resort - use name (less reliable due to naming variations)
      else if (airline.name) {
        key = `NAME:${airline.name.toLowerCase()}`;
      }
      
      if (!key) continue;
      
      // If we already have this airline, merge the data, preferring earlier sources
      if (airlineMap.has(key)) {
        const existing = airlineMap.get(key);
        
        airlineMap.set(key, {
          ...existing,
          // Keep non-null values from existing record, fall back to new record
          iata_code: existing.iata_code || airline.iata_code,
          icao_code: existing.icao_code || airline.icao_code,
          callsign: existing.callsign || airline.callsign,
          country: existing.country || airline.country,
          // Take the most recent active status
          active: sourceIndex === 0 ? airline.active : existing.active
        });
      } else {
        airlineMap.set(key, { ...airline });
      }
    }
  }
  
  // Convert map back to array
  return Array.from(airlineMap.values());
}

/**
 * Save processed data to CSV file
 * @param {Array} airlines - Array of airline objects
 */
function saveProcessedData(airlines) {
  try {
    const parser = new Parser({
      fields: ['name', 'iata_code', 'icao_code', 'callsign', 'country', 'active', 
               'headquarters', 'founded', 'fleet_size', 'destinations', 'alliance']
    });
    const csv = parser.parse(airlines);
    
    fs.writeFileSync(path.join(DATA_DIR, 'processed_airlines.csv'), csv);
    console.log(`Saved ${airlines.length} processed airlines to CSV`);
  } catch (err) {
    console.error('Error saving processed data:', err);
  }
}

/**
 * Import airlines into the database
 * @param {Array} airlines - Array of airline objects
 */
async function importAirlines(airlines) {
  try {
    console.log('Importing airlines into the database...');
    
    // Use the bulk import method from AirlineService
    const results = await AirlineService.bulkImport(airlines);
    
    console.log('Import results:');
    console.log(`- Total: ${results.total}`);
    console.log(`- Created: ${results.created}`);
    console.log(`- Updated: ${results.updated}`);
    console.log(`- Errors: ${results.errors.length}`);
    
    // Save error log if there are any errors
    if (results.errors.length > 0) {
      fs.writeFileSync(
        path.join(DATA_DIR, 'import_errors.json'), 
        JSON.stringify(results.errors, null, 2)
      );
      console.log('Error details saved to import_errors.json');
    }
    
    return results;
  } catch (err) {
    console.error('Error importing airlines:', err);
    throw err;
  }
}

/**
 * Main function to run the import process
 */
async function main() {
  try {
    console.log('Starting airline data import process...');
    
    // Fetch data from sources
    const openFlightsData = await fetchOpenFlightsData();
    const wikipediaData = await fetchWikipediaData();
    
    // Merge data (prioritizing OpenFlights over Wikipedia)
    const mergedData = mergeAirlineData([openFlightsData, wikipediaData]);
    console.log(`Merged data contains ${mergedData.length} unique airlines`);
    
    // Save processed data to CSV
    saveProcessedData(mergedData);
    
    // Import into database
    const importResults = await importAirlines(mergedData);
    
    console.log('Airline data import completed successfully!');
  } catch (error) {
    console.error('Error in airline import process:', error);
  } finally {
    // Close database connection if the destroy method exists
    if (db && typeof db.destroy === 'function') {
      await db.destroy();
    } else {
      console.log('Database connection close method not available, skipping cleanup.');
    }
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  fetchOpenFlightsData,
  fetchWikipediaData,
  mergeAirlineData,
  importAirlines
}; 