/**
 * JSON Formatter Module
 * Transforms validated flight data into Stand Allocation compatible JSON format
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert validated flight data to Stand Allocation format
 * @param {Array} validatedData - Validated flight schedule data
 * @param {Object} options - Conversion options
 * @returns {Object} Object containing all formatted data
 */
function convertToStandAllocationFormat(validatedData, options = {}) {
  const flightsData = generateFlightsJson(validatedData, options);
  
  // If reference data is provided, use it for stands and airlines
  const standsData = options.referenceData?.terminals 
    ? generateStandsJson(options.referenceData.terminals, options)
    : [];
    
  const airlinesData = options.referenceData?.airlines 
    ? generateAirlinesJson(options.referenceData.airlines, options)
    : [];
  
  const settingsData = generateSettingsJson(options.settings || {});
  
  return {
    flights: flightsData,
    stands: standsData,
    airlines: airlinesData,
    settings: settingsData
  };
}

/**
 * Generate flights.json content
 * @param {Array} flights - Validated flight data
 * @param {Object} options - Conversion options
 * @returns {Array} Formatted flights array
 */
function generateFlightsJson(flights, options = {}) {
  // First, identify linked flights and generate LinkIDs
  const { linkedFlights, flightsWithLinks } = identifyLinkedFlights(flights, options);
  
  // Transform each flight to the expected format
  return flightsWithLinks.map(flight => ({
    FlightID: flight.FlightID || `FL${String(flight.id).padStart(4, '0')}`,
    FlightNumber: flight.FlightNumber,
    AirlineCode: flight.AirlineCode,
    AircraftType: flight.AircraftType,
    Origin: flight.Origin,
    Destination: flight.Destination,
    ScheduledTime: formatTime(flight.ScheduledTime),
    Terminal: flight.Terminal,
    IsArrival: typeof flight.IsArrival === 'string' 
      ? flight.IsArrival.toLowerCase() === 'true' 
      : Boolean(flight.IsArrival),
    LinkID: flight.LinkID,
    is_critical_connection: flight.is_critical_connection || false,
    base_priority_score: flight.base_priority_score || 0
  }));
}

/**
 * Generate stands.json content
 * @param {Array} terminalData - Terminal/stand reference data
 * @param {Object} options - Conversion options
 * @returns {Array} Formatted stands array
 */
function generateStandsJson(terminalData, options = {}) {
  if (!terminalData || !Array.isArray(terminalData)) {
    return [];
  }
  
  // Transform terminal data to stands
  return terminalData.flatMap(terminal => {
    // If terminal has stands property, use those
    if (terminal.stands && Array.isArray(terminal.stands)) {
      return terminal.stands.map(stand => ({
        StandName: stand.StandName || stand.name,
        Terminal: terminal.code || terminal.name,
        IsContactStand: stand.IsContactStand || stand.isContact || false,
        SizeLimit: stand.SizeLimit || stand.maxSize || "Narrow",
        AdjacencyRules: stand.AdjacencyRules || {}
      }));
    }
    
    // If no stands, create a default stand for the terminal
    return [{
      StandName: `${terminal.code || terminal.name}-1`,
      Terminal: terminal.code || terminal.name,
      IsContactStand: true,
      SizeLimit: "Wide",
      AdjacencyRules: {}
    }];
  });
}

/**
 * Generate airlines.json content
 * @param {Array} airlineData - Airline reference data
 * @param {Object} options - Conversion options
 * @returns {Array} Formatted airlines array
 */
function generateAirlinesJson(airlineData, options = {}) {
  if (!airlineData || !Array.isArray(airlineData)) {
    return [];
  }
  
  // Get unique airline codes from flight data if provided
  const uniqueAirlineCodes = options.flightData 
    ? [...new Set(options.flightData.map(f => f.AirlineCode))]
    : [];
  
  // Transform airline data
  return airlineData
    // Filter to only include airlines in the flight data if applicable
    .filter(airline => !uniqueAirlineCodes.length || 
      uniqueAirlineCodes.includes(airline.code || airline.AirlineCode))
    .map(airline => ({
      AirlineCode: airline.code || airline.AirlineCode,
      AirlineName: airline.name || airline.AirlineName,
      BaseTerminal: airline.baseTerminal || airline.BaseTerminal || "T1",
      RequiresContactStand: airline.requiresContactStand || airline.RequiresContactStand || false,
      priority_tier: airline.priorityTier || airline.priority_tier || 1
    }));
}

/**
 * Generate settings.json content
 * @param {Object} settingsData - Settings data or defaults
 * @returns {Object} Formatted settings object
 */
function generateSettingsJson(settingsData = {}) {
  return {
    GapBetweenFlights: settingsData.gapBetweenFlights || 15,
    TurnaroundTimeSettings: settingsData.turnaroundTimeSettings || {
      Default: 45,
      Narrow: 30,
      Wide: 45,
      Super: 60
    },
    prioritization_weights: settingsData.prioritizationWeights || {
      aircraft_type_A380: 10.0,
      aircraft_type_B747: 8.0,
      airline_tier: 2.0,
      requires_contact_stand: 3.0,
      critical_connection: 5.0,
      base_score: 1.0
    },
    solver_parameters: settingsData.solverParameters || {
      use_solver: true,
      solver_time_limit_seconds: 30,
      optimality_gap: 0.05,
      max_solutions: 1
    }
  };
}

/**
 * Identify linked flights (arrivals paired with departures)
 * @param {Array} flights - Flight data
 * @param {Object} options - Options for linking algorithm
 * @returns {Object} Object containing linked flights and flights with links
 */
function identifyLinkedFlights(flights, options = {}) {
  const linkedPairs = [];
  const flightsWithLinks = [...flights]; // Create a copy of flights to modify
  
  // Configuration options
  const turnaroundSettings = options.turnaroundSettings || {
    Default: 45,
    Narrow: 30,
    Wide: 45,
    Super: 60
  };
  const maxTurnaroundMinutes = options.maxTurnaroundMinutes || 180; // 3 hours default
  
  // First, handle any explicit links (flights that already have LinkIDs)
  const existingLinkMap = new Map();
  
  flights.forEach(flight => {
    if (flight.LinkID) {
      if (!existingLinkMap.has(flight.LinkID)) {
        existingLinkMap.set(flight.LinkID, []);
      }
      existingLinkMap.get(flight.LinkID).push(flight);
    }
  });
  
  // Generate unique LinkIDs starting from a higher number to avoid conflicts
  let nextLinkId = Math.max(1000, 
    ...Array.from(existingLinkMap.keys())
      .map(id => parseInt(id.replace(/\D/g, '')) || 0)
  );
  
  // Sort flights by scheduled time
  const sortedFlights = [...flights].sort((a, b) => {
    const timeA = new Date(a.ScheduledTime);
    const timeB = new Date(b.ScheduledTime);
    return timeA - timeB;
  });
  
  // Group flights by aircraft type and airline
  const flightGroups = {};
  
  sortedFlights.forEach(flight => {
    // Skip flights that already have a LinkID
    if (flight.LinkID) return;
    
    const key = `${flight.AirlineCode}-${flight.AircraftType}`;
    if (!flightGroups[key]) {
      flightGroups[key] = { arrivals: [], departures: [] };
    }
    
    if (flight.IsArrival === true || flight.IsArrival === 'true') {
      flightGroups[key].arrivals.push(flight);
    } else {
      flightGroups[key].departures.push(flight);
    }
  });
  
  // For each group, try to match arrivals with departures
  Object.values(flightGroups).forEach(group => {
    // Sort arrivals and departures by time
    group.arrivals.sort((a, b) => new Date(a.ScheduledTime) - new Date(b.ScheduledTime));
    group.departures.sort((a, b) => new Date(a.ScheduledTime) - new Date(b.ScheduledTime));
    
    // Match each arrival with the next available departure
    group.arrivals.forEach(arrival => {
      const arrivalTime = new Date(arrival.ScheduledTime);
      
      // Find a matching departure
      const matchIndex = group.departures.findIndex(departure => {
        const departureTime = new Date(departure.ScheduledTime);
        const diffMinutes = (departureTime - arrivalTime) / (1000 * 60);
        
        // Get the expected turnaround time based on aircraft type
        let expectedTurnaround = turnaroundSettings.Default;
        if (arrival.AircraftType) {
          // Check if aircraft type contains indicators of wide/narrow/super
          const acType = arrival.AircraftType.toLowerCase();
          if (acType.includes('a380') || acType.includes('747')) {
            expectedTurnaround = turnaroundSettings.Super;
          } else if (acType.includes('777') || acType.includes('787') || acType.includes('330') || 
                    acType.includes('340') || acType.includes('350') || acType.includes('wide')) {
            expectedTurnaround = turnaroundSettings.Wide;
          } else {
            expectedTurnaround = turnaroundSettings.Narrow;
          }
        }
        
        // Return true if this is a valid match (departure is after arrival + turnaround time,
        // but not more than maxTurnaroundMinutes)
        return diffMinutes >= expectedTurnaround && diffMinutes <= maxTurnaroundMinutes;
      });
      
      if (matchIndex !== -1) {
        const matchedDeparture = group.departures.splice(matchIndex, 1)[0];
        
        // Generate LinkID and add to the pairs
        const linkId = `LINK${nextLinkId++}`;
        linkedPairs.push({
          arrivalFlight: arrival,
          departureFlight: matchedDeparture,
          linkId
        });
        
        // Update the flights with the LinkID
        const arrivalIndex = flightsWithLinks.findIndex(f => 
          f.FlightNumber === arrival.FlightNumber && 
          f.ScheduledTime === arrival.ScheduledTime);
        
        const departureIndex = flightsWithLinks.findIndex(f => 
          f.FlightNumber === matchedDeparture.FlightNumber && 
          f.ScheduledTime === matchedDeparture.ScheduledTime);
        
        if (arrivalIndex !== -1) {
          flightsWithLinks[arrivalIndex] = { ...flightsWithLinks[arrivalIndex], LinkID: linkId };
        }
        
        if (departureIndex !== -1) {
          flightsWithLinks[departureIndex] = { ...flightsWithLinks[departureIndex], LinkID: linkId };
        }
      }
    });
  });
  
  return { linkedFlights: linkedPairs, flightsWithLinks };
}

/**
 * Apply generated LinkIDs to flight objects
 * @param {Array} flights - Flight data array
 * @param {Map} linkMap - Map of flight IDs to LinkIDs
 * @returns {Array} Flights with LinkIDs applied
 */
function applyLinkIDs(flights, linkMap) {
  return flights.map(flight => {
    if (linkMap.has(flight.FlightID)) {
      return { ...flight, LinkID: linkMap.get(flight.FlightID) };
    }
    return flight;
  });
}

/**
 * Format time to the expected format for Stand Allocation
 * @param {string} timeStr - Time string in various formats
 * @returns {string} Formatted time string
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  
  try {
    // Parse the time string
    const date = new Date(timeStr);
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      // If it's just a time (HH:MM), return as is
      if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }
      return timeStr;
    }
    
    // For dates with times, use ISO format or HH:MM depending on options
    return date.toISOString().replace(/\.\d{3}Z$/, '');
  } catch (error) {
    return timeStr;
  }
}

/**
 * Export all formatted data to JSON files in the specified directory
 * @param {Object} formattedData - Object containing all formatted data
 * @param {string} outputDir - Directory to save the JSON files
 * @returns {Object} Object containing paths to the created files
 */
function exportToJsonFiles(formattedData, outputDir) {
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePaths = {};
  
  // Write each data set to a file
  if (formattedData.flights && formattedData.flights.length > 0) {
    const flightsPath = path.join(outputDir, 'flights.json');
    fs.writeFileSync(flightsPath, JSON.stringify(formattedData.flights, null, 2));
    filePaths.flights = flightsPath;
  }
  
  if (formattedData.stands && formattedData.stands.length > 0) {
    const standsPath = path.join(outputDir, 'stands.json');
    fs.writeFileSync(standsPath, JSON.stringify(formattedData.stands, null, 2));
    filePaths.stands = standsPath;
  }
  
  if (formattedData.airlines && formattedData.airlines.length > 0) {
    const airlinesPath = path.join(outputDir, 'airlines.json');
    fs.writeFileSync(airlinesPath, JSON.stringify(formattedData.airlines, null, 2));
    filePaths.airlines = airlinesPath;
  }
  
  const settingsPath = path.join(outputDir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(formattedData.settings, null, 2));
  filePaths.settings = settingsPath;
  
  return filePaths;
}

module.exports = {
  convertToStandAllocationFormat,
  generateFlightsJson,
  generateStandsJson,
  generateAirlinesJson,
  generateSettingsJson,
  identifyLinkedFlights,
  applyLinkIDs,
  exportToJsonFiles
}; 