/**
 * Scrape GHA Data
 * 
 * This script scrapes ground handling agent data from various sources:
 * 1. Wikipedia
 * 2. Major airport websites
 * 
 * The collected data is saved to a JSON file that can be imported into the database.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Config
const OUTPUT_FILE = path.join(__dirname, '../data/scraped_ghas.json');
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Airport websites to scrape
const AIRPORT_WEBSITES = [
  {
    name: 'London Heathrow',
    code: 'LHR',
    url: 'https://www.heathrow.com/at-the-airport/terminal-guides/which-terminal/airline-contacts',
    selector: '.terminal-guide__content table tbody tr',
    dataExtractor: ($, element) => {
      const columns = $(element).find('td');
      if (columns.length >= 2) {
        const name = $(columns[0]).text().trim();
        // Only include entries that look like GHAs (exclude airlines)
        if (name.includes('Handling') || name.includes('Services') || name.includes('Aviation')) {
          return {
            name: name,
            operates_at: ['LHR'],
            country: 'GB',
            country_name: 'United Kingdom',
            data_source: 'airport_website_lhr'
          };
        }
      }
      return null;
    }
  },
  {
    name: 'Frankfurt Airport',
    code: 'FRA',
    url: 'https://www.frankfurt-airport.com/en/airport-guide/at-the-airport/airlines-and-tourism-services.html',
    selector: '.teaser',
    dataExtractor: ($, element) => {
      const name = $(element).find('h2').text().trim();
      // Only include entries that look like GHAs
      if (name.includes('Handling') || name.includes('Services') || name.includes('Ground')) {
        return {
          name: name,
          operates_at: ['FRA'],
          country: 'DE',
          country_name: 'Germany',
          data_source: 'airport_website_fra'
        };
      }
      return null;
    }
  }
  // More airports can be added here
];

/**
 * Scrape Wikipedia for ground handling companies
 */
async function scrapeWikipediaGHAs() {
  try {
    console.log('Scraping Wikipedia for ground handling companies...');
    
    const url = 'https://en.wikipedia.org/wiki/Ground_handling';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Save raw data for reference
    fs.writeFileSync(path.join(DATA_DIR, 'wikipedia_gha_raw.html'), response.data);
    
    const ghas = [];
    
    // Process sections containing GHA information
    $('h2, h3').each((i, header) => {
      const headerText = $(header).text().trim();
      
      // Look for sections that might contain GHA listings
      if (headerText.includes('service provider') || 
          headerText.includes('handling agent') || 
          headerText.includes('Company') || 
          headerText.includes('Providers')) {
        
        // Look for tables or lists in the section
        const nextTable = $(header).nextAll('table').first();
        if (nextTable.length) {
          // Process table rows
          $(nextTable).find('tr').each((j, row) => {
            if (j === 0) return; // Skip header row
            
            const columns = $(row).find('td');
            if (columns.length >= 2) {
              const name = $(columns[0]).text().trim();
              const country = $(columns.length > 1 ? 1 : 0).text().trim();
              
              if (name && name !== '') {
                ghas.push({
                  name: name,
                  country_name: country,
                  country: guessCountryCode(country),
                  status: 'active',
                  data_source: 'wikipedia',
                  service_types: guessServiceTypes(name)
                });
              }
            }
          });
        }
        
        // Look for lists as well
        const nextList = $(header).nextAll('ul').first();
        if (nextList.length) {
          $(nextList).find('li').each((j, item) => {
            const text = $(item).text().trim();
            // Extract name (assuming name is at the beginning of the list item)
            const name = text.split(',')[0].trim();
            
            if (name && name !== '') {
              ghas.push({
                name: name,
                status: 'active',
                data_source: 'wikipedia',
                service_types: guessServiceTypes(name)
              });
            }
          });
        }
      }
    });
    
    console.log(`Found ${ghas.length} GHAs from Wikipedia`);
    return ghas;
  } catch (error) {
    console.error('Error scraping Wikipedia:', error);
    return [];
  }
}

/**
 * Scrape airport websites for GHA data
 */
async function scrapeAirportWebsites() {
  try {
    console.log('Scraping airport websites for GHA data...');
    
    const allGHAs = [];
    
    for (const airport of AIRPORT_WEBSITES) {
      console.log(`Scraping ${airport.name} (${airport.code})...`);
      
      try {
        const response = await axios.get(airport.url);
        const $ = cheerio.load(response.data);
        
        // Save raw data for reference
        fs.writeFileSync(path.join(DATA_DIR, `airport_${airport.code}_raw.html`), response.data);
        
        // Extract GHA data using the custom selector and extractor for this airport
        const ghas = [];
        $(airport.selector).each((i, element) => {
          const gha = airport.dataExtractor($, element);
          if (gha) {
            ghas.push(gha);
          }
        });
        
        console.log(`Found ${ghas.length} GHAs at ${airport.code}`);
        allGHAs.push(...ghas);
      } catch (error) {
        console.error(`Error scraping ${airport.code}:`, error);
      }
    }
    
    return allGHAs;
  } catch (error) {
    console.error('Error scraping airport websites:', error);
    return [];
  }
}

/**
 * Guess the service types provided by a GHA based on its name
 * @param {string} name - The GHA name
 * @returns {Array} - Array of service types
 */
function guessServiceTypes(name) {
  const services = [];
  const nameLower = name.toLowerCase();
  
  // Check for service keywords in the name
  if (nameLower.includes('passenger') || nameLower.includes('terminal')) {
    services.push('passenger_services');
  }
  
  if (nameLower.includes('ramp') || nameLower.includes('ground')) {
    services.push('ramp_services');
  }
  
  if (nameLower.includes('baggage') || nameLower.includes('luggage')) {
    services.push('baggage_handling');
  }
  
  if (nameLower.includes('cargo') || nameLower.includes('freight')) {
    services.push('cargo_handling');
  }
  
  if (nameLower.includes('aircraft') || nameLower.includes('plane')) {
    services.push('aircraft_services');
  }
  
  if (nameLower.includes('fuel') || nameLower.includes('petrol')) {
    services.push('fuel_services');
  }
  
  if (nameLower.includes('catering') || nameLower.includes('food')) {
    services.push('catering');
  }
  
  if (nameLower.includes('security') || nameLower.includes('secure')) {
    services.push('security');
  }
  
  if (nameLower.includes('maintenance') || nameLower.includes('repair')) {
    services.push('maintenance');
  }
  
  // If no specific services detected, add a general service type
  if (services.length === 0) {
    if (nameLower.includes('handling') || nameLower.includes('service')) {
      services.push('ramp_services', 'passenger_services');
    } else {
      services.push('other');
    }
  }
  
  return services;
}

/**
 * Guess the ISO country code based on country name
 * @param {string} countryName - The country name
 * @returns {string} - Two-letter ISO country code
 */
function guessCountryCode(countryName) {
  if (!countryName) return null;
  
  // Mapping of common country names to codes
  const COUNTRY_CODE_MAP = {
    'united kingdom': 'GB',
    'uk': 'GB',
    'united states': 'US',
    'usa': 'US',
    'germany': 'DE',
    'france': 'FR',
    'italy': 'IT',
    'spain': 'ES',
    'canada': 'CA',
    'australia': 'AU',
    'japan': 'JP',
    'china': 'CN',
    'india': 'IN',
    'russia': 'RU',
    'brazil': 'BR',
    'south africa': 'ZA',
    'netherlands': 'NL',
    'switzerland': 'CH',
    'sweden': 'SE',
    'denmark': 'DK',
    'norway': 'NO',
    'finland': 'FI',
    'belgium': 'BE',
    'austria': 'AT',
    'portugal': 'PT',
    'greece': 'GR',
    'poland': 'PL',
    'ireland': 'IE',
    'turkey': 'TR',
    'united arab emirates': 'AE',
    'uae': 'AE',
    'dubai': 'AE',
    'saudi arabia': 'SA',
    'singapore': 'SG',
    'hong kong': 'HK',
    'malaysia': 'MY',
    'thailand': 'TH',
    'indonesia': 'ID',
    'philippines': 'PH',
    'new zealand': 'NZ',
    'mexico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'qatar': 'QA',
    'kuwait': 'KW',
    'oman': 'OM',
    'bahrain': 'BH'
  };
  
  const normalizedName = countryName.toLowerCase().trim();
  return COUNTRY_CODE_MAP[normalizedName] || null;
}

/**
 * Deduplicate GHAs based on name similarity
 * @param {Array} ghas - Array of GHA objects
 * @returns {Array} - Deduplicated array
 */
function deduplicateGHAs(ghas) {
  const uniqueGHAs = [];
  const nameMap = new Map();
  
  for (const gha of ghas) {
    const normalizedName = gha.name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (nameMap.has(normalizedName)) {
      // Merge with existing GHA
      const existingIndex = nameMap.get(normalizedName);
      const existingGHA = uniqueGHAs[existingIndex];
      
      // Merge operates_at arrays
      if (gha.operates_at && gha.operates_at.length > 0) {
        existingGHA.operates_at = Array.from(new Set([
          ...(existingGHA.operates_at || []),
          ...gha.operates_at
        ]));
      }
      
      // Merge service_types arrays
      if (gha.service_types && gha.service_types.length > 0) {
        existingGHA.service_types = Array.from(new Set([
          ...(existingGHA.service_types || []),
          ...gha.service_types
        ]));
      }
      
      // Prefer non-null country codes
      if (!existingGHA.country && gha.country) {
        existingGHA.country = gha.country;
        existingGHA.country_name = gha.country_name;
      }
      
      // Update data source
      existingGHA.data_source = `${existingGHA.data_source},${gha.data_source}`;
      
    } else {
      // Add as a new unique GHA
      nameMap.set(normalizedName, uniqueGHAs.length);
      uniqueGHAs.push({
        ...gha,
        // Ensure all GHAs have these properties
        operates_at: gha.operates_at || [],
        service_types: gha.service_types || [],
        status: gha.status || 'active'
      });
    }
  }
  
  return uniqueGHAs;
}

/**
 * Main function to scrape and process GHA data
 */
async function scrapeGHAData() {
  try {
    console.log('Starting GHA data collection...');
    
    // Collect data from different sources
    const wikipediaGHAs = await scrapeWikipediaGHAs();
    const airportGHAs = await scrapeAirportWebsites();
    
    // Combine all sources
    const allGHAs = [
      ...wikipediaGHAs,
      ...airportGHAs
    ];
    
    // Deduplicate
    const uniqueGHAs = deduplicateGHAs(allGHAs);
    
    console.log(`Collected and processed ${uniqueGHAs.length} unique ground handling agents`);
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueGHAs, null, 2));
    
    console.log(`Data saved to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('Error in GHA data collection:', error);
  }
}

// Run the scraper
scrapeGHAData(); 