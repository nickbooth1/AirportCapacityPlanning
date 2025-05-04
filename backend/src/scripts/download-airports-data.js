/**
 * Download and Process OpenFlights Airport Data
 * 
 * This script downloads airport data from the OpenFlights database,
 * processes it into the format expected by our application,
 * and saves it as a JSON file that can be imported.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const readline = require('readline');

// URLs for data sources
const OPENFLIGHTS_AIRPORTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const COUNTRIES_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/countries.dat';

// Output file path
const OUTPUT_FILE = path.join(__dirname, '../data/airports.json');

// Map country codes to country names
const countryMap = new Map();

// Full to ISO 2-letter country code mapping for some common countries
const COUNTRY_CODE_MAP = {
  'PAPUA NEW GUINEA': 'PG',
  'GREENLAND': 'GL',
  'CANADA': 'CA',
  'UNITED STATES': 'US',
  'UNITED KINGDOM': 'GB',
  'AUSTRALIA': 'AU',
  'NEW ZEALAND': 'NZ',
  'GERMANY': 'DE',
  'FRANCE': 'FR',
  'ITALY': 'IT',
  'SPAIN': 'ES',
  'RUSSIA': 'RU',
  'CHINA': 'CN',
  'JAPAN': 'JP',
  'INDIA': 'IN',
  'BRAZIL': 'BR',
  'MEXICO': 'MX',
  'SOUTH AFRICA': 'ZA',
  'UNITED ARAB EMIRATES': 'AE',
  'SAUDI ARABIA': 'SA',
  'TURKEY': 'TR',
  'SWITZERLAND': 'CH',
  'SWEDEN': 'SE',
  'NORWAY': 'NO',
  'DENMARK': 'DK',
  'FINLAND': 'FI',
  'POLAND': 'PL',
  'NETHERLANDS': 'NL',
  'BELGIUM': 'BE',
  'AUSTRIA': 'AT',
};

async function downloadFile(url) {
  console.log(`Downloading from ${url}...`);
  const response = await axios.get(url, { responseType: 'text' });
  return response.data;
}

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Don't forget the last value
  result.push(currentValue);
  
  return result;
}

async function parseCSVData(data, hasHeader = false) {
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const results = [];
  
  // Skip header if needed
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    results.push(parseCSVLine(line));
  }
  
  return results;
}

async function loadCountryData() {
  try {
    const countryData = await downloadFile(COUNTRIES_URL);
    const countries = await parseCSVData(countryData);
    
    countries.forEach(country => {
      // Country format: ID,"Name","Code","Continent"
      if (country.length >= 3) {
        const code = country[2].replace(/"/g, ''); // ISO country code
        const name = country[1].replace(/"/g, ''); // Country name
        countryMap.set(code, name);
      }
    });
    
    console.log(`Loaded ${countryMap.size} countries`);
  } catch (error) {
    console.error('Error loading country data:', error.message);
    // Fallback with a minimal countries map
    console.log('Using fallback country data');
    const fallbackCountries = [
      ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'],
      ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'],
      ['JP', 'Japan'], ['CN', 'China'], ['IN', 'India'],
      ['BR', 'Brazil'], ['RU', 'Russia'], ['ZA', 'South Africa']
    ];
    fallbackCountries.forEach(([code, name]) => countryMap.set(code, name));
  }
}

function getCleanValue(value) {
  if (!value) return '';
  // Remove quotes and trim
  return value.replace(/"/g, '').trim();
}

function determineAirportType(type, name) {
  // OpenFlights "airport" type
  if (type.toLowerCase() === 'airport') {
    // Check if it's a major international airport based on the name
    if (name.toLowerCase().includes('international') || 
        name.toLowerCase().includes('intl')) {
      return 'large_airport';
    }
    
    // Other identifiers for large airports
    if (name.toLowerCase().includes('international') ||
        name.toLowerCase().includes(' intl') ||
        name.toLowerCase().includes('major')) {
      return 'large_airport';
    }
    
    // Medium airports typically have 'regional' in the name
    if (name.toLowerCase().includes('regional') ||
        name.toLowerCase().includes('municipal') ||
        name.toLowerCase().includes('domestic')) {
      return 'medium_airport';
    }
    
    // Default to small airport
    return 'small_airport';
  } 
  
  // Map other types
  const typeMap = {
    'heliport': 'heliport',
    'seaplane_base': 'seaplane_base',
    'closed': 'closed',
    'balloonport': 'small_airport'
  };
  
  return typeMap[type.toLowerCase()] || 'small_airport';
}

// Function to get the ISO 2-letter country code
function getISOCountryCode(country) {
  // If it's already a valid 2-letter code, return it
  if (country && country.length === 2) {
    return country.toUpperCase();
  }
  
  // Check our mapping for common countries
  const upperCountry = country.toUpperCase();
  if (COUNTRY_CODE_MAP[upperCountry]) {
    return COUNTRY_CODE_MAP[upperCountry];
  }
  
  // If we can't determine the ISO code, use a default
  return 'XX'; // Unknown country code
}

async function processAirports() {
  try {
    // Load country data first
    await loadCountryData();
    
    // Download airport data
    const airportData = await downloadFile(OPENFLIGHTS_AIRPORTS_URL);
    const lines = airportData.split('\n').filter(line => line.trim() !== '');
    
    console.log(`Processing ${lines.length} airports...`);
    
    const processedAirports = [];
    
    for (const line of lines) {
      // Use a simple regex to split on commas not inside quotes
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      
      if (parts.length < 11) continue; // Skip incomplete entries
      
      const id = getCleanValue(parts[0]);
      const name = getCleanValue(parts[1]);
      const city = getCleanValue(parts[2]);
      const countryRaw = getCleanValue(parts[3]);
      const iataCode = getCleanValue(parts[4]);
      const icaoCode = getCleanValue(parts[5]);
      const latitude = parseFloat(getCleanValue(parts[6])) || 0;
      const longitude = parseFloat(getCleanValue(parts[7])) || 0;
      const elevation = parseInt(getCleanValue(parts[8])) || 0;
      const timezone = getCleanValue(parts[11]) || '';
      const dst = getCleanValue(parts[10]) || '';
      const type = parts.length > 12 ? getCleanValue(parts[12]) : 'airport';
      
      // Skip if no IATA or ICAO code
      if ((iataCode === '\N' || iataCode === '' || iataCode.length !== 3) && 
          (icaoCode === '\N' || icaoCode === '' || icaoCode.length !== 4)) {
        continue;
      }
      
      // Skip if coordinates are invalid
      if (isNaN(latitude) || isNaN(longitude)) {
        continue;
      }
      
      // Convert country to a valid ISO 2-letter code
      const country = getISOCountryCode(countryRaw);
      
      processedAirports.push({
        name: name,
        iata_code: iataCode !== '\N' ? iataCode : '',
        icao_code: icaoCode !== '\N' ? icaoCode : '',
        city: city,
        country: country,
        country_name: countryMap.get(country) || countryRaw,
        latitude: latitude,
        longitude: longitude,
        elevation_ft: elevation,
        timezone: timezone,
        dst: dst,
        type: determineAirportType(type, name),
        status: 'active'
      });
    }
    
    console.log(`Saving ${processedAirports.length} valid airports to ${OUTPUT_FILE}`);
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedAirports, null, 2));
    
    console.log('Airport data processing complete!');
    console.log(`Successfully saved ${processedAirports.length} airports.`);
  } catch (error) {
    console.error('Error processing airport data:', error);
  }
}

// Run the process
processAirports(); 