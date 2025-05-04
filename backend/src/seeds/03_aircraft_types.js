/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Don't clear existing aircraft types
  // Instead, check each one and only insert if it doesn't exist
  
  // Get all existing ICAO codes
  const existingCodes = await knex('aircraft_types')
    .select('icao_code')
    .then(results => results.map(r => r.icao_code));
    
  console.log(`Found ${existingCodes.length} existing aircraft types`);

  // Define all the aircraft types we want to have
  const aircraftTypes = [
    {
      iata_code: '388',
      icao_code: 'A388',
      name: 'Airbus A380-800',
      manufacturer: 'Airbus',
      model: 'A380-800',
      wingspan_meters: 80,
      length_meters: 73,
      size_category_code: 'F'
    },
    {
      iata_code: '77W',
      icao_code: 'B77W',
      name: 'Boeing 777-300ER',
      manufacturer: 'Boeing',
      model: '777-300ER',
      wingspan_meters: 65,
      length_meters: 74,
      size_category_code: 'E'
    },
    {
      iata_code: '789',
      icao_code: 'B789',
      name: 'Boeing 787-9 Dreamliner',
      manufacturer: 'Boeing',
      model: '787-9',
      wingspan_meters: 60,
      length_meters: 63,
      size_category_code: 'E'
    },
    {
      iata_code: '359',
      icao_code: 'A359',
      name: 'Airbus A350-900',
      manufacturer: 'Airbus',
      model: 'A350-900',
      wingspan_meters: 65,
      length_meters: 67,
      size_category_code: 'E'
    },
    {
      iata_code: '351',
      icao_code: 'A35K',
      name: 'Airbus A350-1000',
      manufacturer: 'Airbus',
      model: 'A350-1000',
      wingspan_meters: 65,
      length_meters: 74,
      size_category_code: 'E'
    },
    {
      iata_code: '781',
      icao_code: 'B78X',
      name: 'Boeing 787-10 Dreamliner',
      manufacturer: 'Boeing',
      model: '787-10',
      wingspan_meters: 60,
      length_meters: 68,
      size_category_code: 'E'
    },
    {
      iata_code: '788',
      icao_code: 'B788',
      name: 'Boeing 787-8 Dreamliner',
      manufacturer: 'Boeing',
      model: '787-8',
      wingspan_meters: 60,
      length_meters: 57,
      size_category_code: 'E'
    },
    {
      iata_code: '77L',
      icao_code: 'B77L',
      name: 'Boeing 777-200LR',
      manufacturer: 'Boeing',
      model: '777-200LR',
      wingspan_meters: 65,
      length_meters: 64,
      size_category_code: 'E'
    },
    {
      iata_code: '773',
      icao_code: 'B773',
      name: 'Boeing 777-300',
      manufacturer: 'Boeing',
      model: '777-300',
      wingspan_meters: 65,
      length_meters: 74,
      size_category_code: 'E'
    },
    {
      iata_code: '772',
      icao_code: 'B772',
      name: 'Boeing 777-200',
      manufacturer: 'Boeing',
      model: '777-200',
      wingspan_meters: 65,
      length_meters: 64,
      size_category_code: 'E'
    },
    {
      iata_code: '764',
      icao_code: 'B764',
      name: 'Boeing 767-400ER',
      manufacturer: 'Boeing',
      model: '767-400ER',
      wingspan_meters: 52,
      length_meters: 61,
      size_category_code: 'D'
    },
    {
      iata_code: '763',
      icao_code: 'B763',
      name: 'Boeing 767-300ER',
      manufacturer: 'Boeing',
      model: '767-300ER',
      wingspan_meters: 48,
      length_meters: 55,
      size_category_code: 'D'
    },
    {
      iata_code: '76W',
      icao_code: 'B763',
      name: 'Boeing 767-300ER (Winglets)',
      manufacturer: 'Boeing',
      model: '767-300ER',
      wingspan_meters: 48,
      length_meters: 55,
      size_category_code: 'D'
    },
    {
      iata_code: '762',
      icao_code: 'B762',
      name: 'Boeing 767-200ER',
      manufacturer: 'Boeing',
      model: '767-200ER',
      wingspan_meters: 48,
      length_meters: 49,
      size_category_code: 'D'
    },
    {
      iata_code: '333',
      icao_code: 'A333',
      name: 'Airbus A330-300',
      manufacturer: 'Airbus',
      model: 'A330-300',
      wingspan_meters: 60,
      length_meters: 63,
      size_category_code: 'E'
    },
    {
      iata_code: '332',
      icao_code: 'A332',
      name: 'Airbus A330-200',
      manufacturer: 'Airbus',
      model: 'A330-200',
      wingspan_meters: 60,
      length_meters: 59,
      size_category_code: 'E'
    },
    {
      iata_code: '339',
      icao_code: 'A339',
      name: 'Airbus A330-900neo',
      manufacturer: 'Airbus',
      model: 'A330-900neo',
      wingspan_meters: 64,
      length_meters: 63,
      size_category_code: 'E'
    },
    {
      iata_code: '338',
      icao_code: 'A338',
      name: 'Airbus A330-800neo',
      manufacturer: 'Airbus',
      model: 'A330-800neo',
      wingspan_meters: 64,
      length_meters: 59,
      size_category_code: 'E'
    },
    {
      iata_code: '75W',
      icao_code: 'B752',
      name: 'Boeing 757-200 (Winglets)',
      manufacturer: 'Boeing',
      model: '757-200',
      wingspan_meters: 38,
      length_meters: 47,
      size_category_code: 'C'
    },
    {
      iata_code: '753',
      icao_code: 'B753',
      name: 'Boeing 757-300',
      manufacturer: 'Boeing',
      model: '757-300',
      wingspan_meters: 38,
      length_meters: 54,
      size_category_code: 'C'
    },
    {
      iata_code: '752',
      icao_code: 'B752',
      name: 'Boeing 757-200',
      manufacturer: 'Boeing',
      model: '757-200',
      wingspan_meters: 38,
      length_meters: 47,
      size_category_code: 'C'
    },
    {
      iata_code: '321',
      icao_code: 'A321',
      name: 'Airbus A321',
      manufacturer: 'Airbus',
      model: 'A321',
      wingspan_meters: 36,
      length_meters: 44,
      size_category_code: 'C'
    },
    {
      iata_code: '320',
      icao_code: 'A320',
      name: 'Airbus A320',
      manufacturer: 'Airbus',
      model: 'A320',
      wingspan_meters: 36,
      length_meters: 37,
      size_category_code: 'C'
    },
    {
      iata_code: '319',
      icao_code: 'A319',
      name: 'Airbus A319',
      manufacturer: 'Airbus',
      model: 'A319',
      wingspan_meters: 36,
      length_meters: 34,
      size_category_code: 'C'
    },
    {
      iata_code: '318',
      icao_code: 'A318',
      name: 'Airbus A318',
      manufacturer: 'Airbus',
      model: 'A318',
      wingspan_meters: 36,
      length_meters: 31,
      size_category_code: 'C'
    },
    {
      iata_code: '738',
      icao_code: 'B738',
      name: 'Boeing 737-800',
      manufacturer: 'Boeing',
      model: '737-800',
      wingspan_meters: 36,
      length_meters: 40,
      size_category_code: 'C'
    },
    {
      iata_code: '73H',
      icao_code: 'B738',
      name: 'Boeing 737-800 (Winglets)',
      manufacturer: 'Boeing',
      model: '737-800',
      wingspan_meters: 36,
      length_meters: 40,
      size_category_code: 'C'
    },
    {
      iata_code: '739',
      icao_code: 'B739',
      name: 'Boeing 737-900',
      manufacturer: 'Boeing',
      model: '737-900',
      wingspan_meters: 36,
      length_meters: 42,
      size_category_code: 'C'
    },
    {
      iata_code: '73J',
      icao_code: 'B739',
      name: 'Boeing 737-900ER',
      manufacturer: 'Boeing',
      model: '737-900ER',
      wingspan_meters: 36,
      length_meters: 42,
      size_category_code: 'C'
    },
    {
      iata_code: '737',
      icao_code: 'B737',
      name: 'Boeing 737-700',
      manufacturer: 'Boeing',
      model: '737-700',
      wingspan_meters: 36,
      length_meters: 33,
      size_category_code: 'C'
    },
    {
      iata_code: '736',
      icao_code: 'B736',
      name: 'Boeing 737-600',
      manufacturer: 'Boeing',
      model: '737-600',
      wingspan_meters: 36,
      length_meters: 31,
      size_category_code: 'C'
    },
    {
      iata_code: '735',
      icao_code: 'B735',
      name: 'Boeing 737-500',
      manufacturer: 'Boeing',
      model: '737-500',
      wingspan_meters: 29,
      length_meters: 31,
      size_category_code: 'C'
    },
    {
      iata_code: '73G',
      icao_code: 'B737',
      name: 'Boeing 737-700 (Winglets)',
      manufacturer: 'Boeing',
      model: '737-700',
      wingspan_meters: 36,
      length_meters: 33,
      size_category_code: 'C'
    },
    {
      iata_code: '7M8',
      icao_code: 'B38M',
      name: 'Boeing 737 MAX 8',
      manufacturer: 'Boeing',
      model: '737 MAX 8',
      wingspan_meters: 36,
      length_meters: 40,
      size_category_code: 'C'
    },
    {
      iata_code: '7M9',
      icao_code: 'B39M',
      name: 'Boeing 737 MAX 9',
      manufacturer: 'Boeing',
      model: '737 MAX 9',
      wingspan_meters: 36,
      length_meters: 42,
      size_category_code: 'C'
    },
    {
      iata_code: '7M7',
      icao_code: 'B37M',
      name: 'Boeing 737 MAX 7',
      manufacturer: 'Boeing',
      model: '737 MAX 7',
      wingspan_meters: 36,
      length_meters: 35,
      size_category_code: 'C'
    },
    {
      iata_code: '223',
      icao_code: 'A223',
      name: 'Airbus A220-300',
      manufacturer: 'Airbus',
      model: 'A220-300',
      wingspan_meters: 35,
      length_meters: 38,
      size_category_code: 'C'
    },
    {
      iata_code: '221',
      icao_code: 'A221',
      name: 'Airbus A220-100',
      manufacturer: 'Airbus',
      model: 'A220-100',
      wingspan_meters: 35,
      length_meters: 35,
      size_category_code: 'C'
    },
    {
      iata_code: 'E90',
      icao_code: 'E190',
      name: 'Embraer E190',
      manufacturer: 'Embraer',
      model: 'E190',
      wingspan_meters: 28,
      length_meters: 36,
      size_category_code: 'C'
    },
    {
      iata_code: 'E95',
      icao_code: 'E195',
      name: 'Embraer E195',
      manufacturer: 'Embraer',
      model: 'E195',
      wingspan_meters: 28,
      length_meters: 38,
      size_category_code: 'C'
    },
    {
      iata_code: 'E75',
      icao_code: 'E75L',
      name: 'Embraer E175',
      manufacturer: 'Embraer',
      model: 'E175',
      wingspan_meters: 28,
      length_meters: 32,
      size_category_code: 'C'
    },
    {
      iata_code: 'E70',
      icao_code: 'E170',
      name: 'Embraer E170',
      manufacturer: 'Embraer',
      model: 'E170',
      wingspan_meters: 26,
      length_meters: 30,
      size_category_code: 'C'
    },
    {
      iata_code: 'AT7',
      icao_code: 'AT75',
      name: 'ATR 72-600',
      manufacturer: 'ATR',
      model: 'ATR 72-600',
      wingspan_meters: 27,
      length_meters: 27,
      size_category_code: 'B'
    },
    {
      iata_code: 'AT4',
      icao_code: 'AT45',
      name: 'ATR 42-500',
      manufacturer: 'ATR',
      model: 'ATR 42-500',
      wingspan_meters: 25,
      length_meters: 23,
      size_category_code: 'B'
    },
    {
      iata_code: 'DH8',
      icao_code: 'DH8D',
      name: 'Bombardier Dash 8 Q400',
      manufacturer: 'Bombardier',
      model: 'Dash 8 Q400',
      wingspan_meters: 28,
      length_meters: 33,
      size_category_code: 'C'
    },
    {
      iata_code: 'CRJ',
      icao_code: 'CRJ7',
      name: 'Bombardier CRJ700',
      manufacturer: 'Bombardier',
      model: 'CRJ700',
      wingspan_meters: 24,
      length_meters: 32,
      size_category_code: 'B'
    },
    {
      iata_code: 'CR9',
      icao_code: 'CRJ9',
      name: 'Bombardier CRJ900',
      manufacturer: 'Bombardier',
      model: 'CRJ900',
      wingspan_meters: 24,
      length_meters: 36,
      size_category_code: 'B'
    },
    {
      iata_code: 'CRK',
      icao_code: 'CRJX',
      name: 'Bombardier CRJ1000',
      manufacturer: 'Bombardier',
      model: 'CRJ1000',
      wingspan_meters: 24,
      length_meters: 39,
      size_category_code: 'B'
    },
    {
      iata_code: 'SF3',
      icao_code: 'SF34',
      name: 'Saab 340',
      manufacturer: 'Saab',
      model: '340',
      wingspan_meters: 21,
      length_meters: 20,
      size_category_code: 'B'
    },
    {
      iata_code: 'C30',
      icao_code: 'C30J',
      name: 'Cessna 208 Caravan',
      manufacturer: 'Cessna',
      model: '208 Caravan',
      wingspan_meters: 16,
      length_meters: 12,
      size_category_code: 'A'
    }
  ];
  
  // Filter to only include aircraft that don't exist yet
  const newAircraftTypes = aircraftTypes.filter(
    aircraft => !existingCodes.includes(aircraft.icao_code)
  );
  
  console.log(`Attempting to add ${newAircraftTypes.length} new aircraft types`);
  
  // Insert new aircraft types one by one
  if (newAircraftTypes.length > 0) {
    let addedCount = 0;
    
    for (const aircraft of newAircraftTypes) {
      try {
        await knex('aircraft_types').insert(aircraft);
        addedCount++;
        console.log(`Added ${aircraft.name} (${aircraft.icao_code})`);
      } catch (error) {
        console.error(`Error adding ${aircraft.name} (${aircraft.icao_code}): ${error.message}`);
      }
    }
    
    console.log(`Successfully added ${addedCount} new aircraft types`);
  } else {
    console.log('No new aircraft types to add');
  }
}; 