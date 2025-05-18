/**
 * Validator Module
 * Validates data against schema, integrity, and business rules
 */
const dataMapper = require('./dataMapper');
const dateParser = require('../utils/dateParser');

// Define validation rule severity levels
const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Validate data against schema requirements
 * @param {Array} data - Array of data records
 * @param {string} entityType - Type of entity (flights, stands, etc.)
 * @returns {Object} - Validation results
 */
function validateSchema(data, entityType) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  const requiredFields = dataMapper.getMappingFields(entityType);
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  data.forEach((record, index) => {
    requiredFields.forEach(field => {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        results.isValid = false;
        results.errors.push({
          severity: SEVERITY.ERROR,
          code: 'E001',
          field,
          recordId: getRecordIdentifier(record),
          message: `Missing required field: ${field}`,
          row: index + 1,
          column: field
        });
      }
    });
  });
  
  return results;
}

/**
 * Validate data types
 * @param {Array} data - Array of data records
 * @param {string} entityType - Type of entity
 * @returns {Object} - Validation results
 */
function validateDataTypes(data, entityType) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  // Type validation rules by entity type and field
  const typeRules = {
    flights: {
      IsArrival: { type: 'boolean', validate: isBoolean },
      ScheduledTime: { type: 'datetime', validate: isValidDateTime },
      EstimatedTime: { type: 'datetime', validate: isValidDateTime, required: false },
      ActualTime: { type: 'datetime', validate: isValidDateTime, required: false }
    },
    stands: {
      IsContactStand: { type: 'boolean', validate: isBoolean }
    },
    maintenance: {
      StartTime: { type: 'datetime', validate: isValidDateTime },
      EndTime: { type: 'datetime', validate: isValidDateTime }
    }
  };
  
  const rules = typeRules[entityType] || {};
  
  data.forEach((record, index) => {
    Object.entries(rules).forEach(([field, rule]) => {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        if (!rule.validate(record[field])) {
          results.isValid = false;
          const result = {
            severity: SEVERITY.ERROR,
            code: 'E002',
            field,
            recordId: getRecordIdentifier(record),
            message: `Invalid data type for ${field}. Expected ${rule.type}`,
            value: record[field],
            row: index + 1,
            column: field
          };
          
          // Add suggestions for date fields
          if (rule.type === 'datetime') {
            result.suggestion = 'Use format: YYYY-MM-DDTHH:mm:ss';
            
            // Try to determine what format they are using
            const format = dateParser.getRecommendedFormat(record[field]);
            if (format !== 'YYYY-MM-DDTHH:mm:ss') {
              result.details = `Current format appears to be: ${format}`;
            }
          }
          
          results.errors.push(result);
        } else if (rule.type === 'datetime') {
          // Add information about parsed date format
          const parseResult = dateParser.parseDate(record[field]);
          if (parseResult.valid && parseResult.format !== 'native') {
            results.info.push({
              severity: SEVERITY.INFO,
              code: 'I001',
              field,
              recordId: getRecordIdentifier(record),
              message: `Date format identified as: ${parseResult.format}`,
              details: `Original: ${record[field]}, Parsed to ISO: ${parseResult.isoString}`,
              row: index + 1,
              column: field
            });
          }
        }
      } else if (rule.required) {
        results.isValid = false;
        results.errors.push({
          severity: SEVERITY.ERROR,
          code: 'E001',
          field,
          recordId: getRecordIdentifier(record),
          message: `Missing required field: ${field}`,
          row: index + 1,
          column: field
        });
      }
    });
  });
  
  return results;
}

/**
 * Validate time format
 * @param {string} timeString - Time string to validate
 * @returns {boolean} - True if valid
 */
function validateTimeFormat(timeString) {
  return dateParser.isValidDate(timeString);
}

/**
 * Run all basic validations on data
 * @param {Array} data - Array of data records
 * @param {string} entityType - Type of entity
 * @returns {Object} - Combined validation results
 */
function validate(data, entityType) {
  const schemaResults = validateSchema(data, entityType);
  const typeResults = validateDataTypes(data, entityType);
  
  return {
    isValid: schemaResults.isValid && typeResults.isValid,
    errors: [...schemaResults.errors, ...typeResults.errors],
    warnings: [...schemaResults.warnings, ...typeResults.warnings],
    info: [...(schemaResults.info || []), ...(typeResults.info || [])]
  };
}

/**
 * Validate data integrity against reference data
 * @param {Array} data - Array of data records
 * @param {Object} referenceData - Reference data
 * @returns {Object} - Validation results
 */
function validateDataIntegrity(data, referenceData) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  if (!referenceData) {
    throw new Error('Reference data is required');
  }
  
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  // Extract reference data collections
  const { airlines = [], aircraftTypes = [], terminals = [] } = referenceData;
  
  data.forEach((record, index) => {
    // Validate airline code
    if (record.AirlineCode) {
      validateAirlineCode(record.AirlineCode, airlines, record, index, results);
    }
    
    // Validate aircraft type
    if (record.AircraftType) {
      validateAircraftType(record.AircraftType, aircraftTypes, record, index, results);
    }
    
    // Validate terminal
    if (record.Terminal) {
      validateTerminal(record.Terminal, terminals, record, index, results);
    }
    
    // Validate linked flights if applicable
    if (record.LinkID) {
      // This needs the full dataset to check if LinkID references an existing flight
      const linkedFlight = data.find(flight => 
        flight.FlightID === record.LinkID || flight.FlightNumber === record.LinkID
      );
      
      if (!linkedFlight) {
        results.isValid = false;
        results.errors.push({
          severity: SEVERITY.ERROR,
          code: 'E004',
          field: 'LinkID',
          recordId: getRecordIdentifier(record),
          message: `LinkedID '${record.LinkID}' does not reference an existing flight`,
          value: record.LinkID,
          row: index + 1,
          column: 'LinkID'
        });
      }
    }
  });
  
  return results;
}

/**
 * Validate business rules
 * @param {Array} data - Array of data records
 * @param {Object} settings - Business rule settings
 * @returns {Object} - Validation results
 */
function validateBusinessRules(data, settings = {}) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  // Apply different rule sets
  validateTurnaroundTimes(data, settings, results);
  validateFlightConnections(data, settings, results);
  validateAircraftUtilization(data, settings, results);
  
  return results;
}

/**
 * Validate turnaround times for linked flights
 * @param {Array} data - Flight data
 * @param {Object} settings - Settings
 * @param {Object} results - Validation results to update
 */
function validateTurnaroundTimes(data, settings, results) {
  const minTurnaroundMinutes = settings.minTurnaroundMinutes || 45;
  
  // Find all arrival-departure pairs
  const linkedFlights = new Map();
  
  // First, collect all flights with LinkID
  data.forEach(flight => {
    if (flight.LinkID) {
      if (!linkedFlights.has(flight.LinkID)) {
        linkedFlights.set(flight.LinkID, []);
      }
      linkedFlights.get(flight.LinkID).push(flight);
    }
  });
  
  // Check each link for sufficient turnaround time
  linkedFlights.forEach((flights, linkId) => {
    if (flights.length !== 2) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W001',
        field: 'LinkID',
        recordId: linkId,
        message: `LinkID '${linkId}' is used by ${flights.length} flights instead of expected 2 (arrival-departure pair)`,
        value: linkId
      });
      return;
    }
    
    const arrival = flights.find(f => f.IsArrival);
    const departure = flights.find(f => !f.IsArrival);
    
    if (!arrival || !departure) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W002',
        field: 'LinkID',
        recordId: linkId,
        message: `LinkID '${linkId}' does not connect an arrival with a departure`,
        value: linkId
      });
      return;
    }
    
    // Calculate time difference using enhanced date parser
    let arrivalTime, departureTime;
    const arrivalResult = dateParser.parseDate(arrival.ScheduledTime);
    const departureResult = dateParser.parseDate(departure.ScheduledTime);
    
    if (arrivalResult.valid && departureResult.valid) {
      arrivalTime = arrivalResult.date;
      departureTime = departureResult.date;
    } else {
      // Fallback to basic parsing
      arrivalTime = new Date(arrival.ScheduledTime);
      departureTime = new Date(departure.ScheduledTime);
    }
    
    if (isNaN(arrivalTime.getTime()) || isNaN(departureTime.getTime())) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W003',
        field: 'ScheduledTime',
        recordId: linkId,
        message: `Cannot validate turnaround time for LinkID '${linkId}' due to invalid date formats`,
        value: linkId
      });
      return;
    }
    
    const turnaroundMinutes = Math.floor((departureTime - arrivalTime) / (1000 * 60));
    
    if (turnaroundMinutes < 0) {
      results.errors.push({
        severity: SEVERITY.ERROR,
        code: 'E005',
        field: 'ScheduledTime',
        recordId: linkId,
        message: `Departure (${departure.FlightID}) is scheduled before arrival (${arrival.FlightID}) for LinkID '${linkId}'`,
        value: turnaroundMinutes
      });
      results.isValid = false;
    } else if (turnaroundMinutes < minTurnaroundMinutes) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W004',
        field: 'ScheduledTime',
        recordId: linkId,
        message: `Turnaround time of ${turnaroundMinutes} minutes is less than minimum required ${minTurnaroundMinutes} minutes for LinkID '${linkId}'`,
        value: turnaroundMinutes
      });
    }
  });
}

/**
 * Validate flight connections
 * @param {Array} data - Flight data
 * @param {Object} settings - Settings
 * @param {Object} results - Validation results to update
 */
function validateFlightConnections(data, settings, results) {
  // ... Existing implementation ...
  const connections = settings.connections || [];
  
  if (connections.length === 0) {
    return;
  }
  
  connections.forEach(connection => {
    const {
      arrival_flight_id,
      departure_flight_id,
      min_transfer_minutes = 30,
      max_transfer_minutes = 180,
      is_critical = false
    } = connection;
    
    // Find the flights
    const arrival = data.find(f => 
      f.FlightID === arrival_flight_id || f.FlightNumber === arrival_flight_id
    );
    
    const departure = data.find(f => 
      f.FlightID === departure_flight_id || f.FlightNumber === departure_flight_id
    );
    
    if (!arrival) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W005',
        field: 'FlightID',
        recordId: arrival_flight_id,
        message: `Connection arrival flight '${arrival_flight_id}' not found in dataset`,
        value: arrival_flight_id
      });
      return;
    }
    
    if (!departure) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W006',
        field: 'FlightID',
        recordId: departure_flight_id,
        message: `Connection departure flight '${departure_flight_id}' not found in dataset`,
        value: departure_flight_id
      });
      return;
    }
    
    // Calculate transfer time using enhanced date parser
    let arrivalTime, departureTime;
    const arrivalResult = dateParser.parseDate(arrival.ScheduledTime);
    const departureResult = dateParser.parseDate(departure.ScheduledTime);
    
    if (arrivalResult.valid && departureResult.valid) {
      arrivalTime = arrivalResult.date;
      departureTime = departureResult.date;
    } else {
      // Fallback to basic parsing
      arrivalTime = new Date(arrival.ScheduledTime);
      departureTime = new Date(departure.ScheduledTime);
    }
    
    if (isNaN(arrivalTime.getTime()) || isNaN(departureTime.getTime())) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W007',
        field: 'ScheduledTime',
        recordId: `${arrival_flight_id}-${departure_flight_id}`,
        message: `Cannot validate transfer time for connection due to invalid date formats`,
        value: `${arrival.ScheduledTime}, ${departure.ScheduledTime}`
      });
      return;
    }
    
    const transferMinutes = Math.floor((departureTime - arrivalTime) / (1000 * 60));
    
    if (transferMinutes < 0) {
      const severity = is_critical ? SEVERITY.ERROR : SEVERITY.WARNING;
      results[severity === SEVERITY.ERROR ? 'errors' : 'warnings'].push({
        severity,
        code: is_critical ? 'E006' : 'W008',
        field: 'ScheduledTime',
        recordId: `${arrival_flight_id}-${departure_flight_id}`,
        message: `Connection departure is scheduled before arrival`,
        value: transferMinutes
      });
      
      if (is_critical) {
        results.isValid = false;
      }
    } else if (transferMinutes < min_transfer_minutes) {
      const severity = is_critical ? SEVERITY.ERROR : SEVERITY.WARNING;
      results[severity === SEVERITY.ERROR ? 'errors' : 'warnings'].push({
        severity,
        code: is_critical ? 'E007' : 'W009',
        field: 'ScheduledTime',
        recordId: `${arrival_flight_id}-${departure_flight_id}`,
        message: `Transfer time of ${transferMinutes} minutes is less than minimum required ${min_transfer_minutes} minutes`,
        value: transferMinutes
      });
      
      if (is_critical) {
        results.isValid = false;
      }
    } else if (transferMinutes > max_transfer_minutes) {
      results.warnings.push({
        severity: SEVERITY.WARNING,
        code: 'W010',
        field: 'ScheduledTime',
        recordId: `${arrival_flight_id}-${departure_flight_id}`,
        message: `Transfer time of ${transferMinutes} minutes exceeds maximum recommended ${max_transfer_minutes} minutes`,
        value: transferMinutes
      });
    }
  });
}

/**
 * Validate aircraft utilization (no scheduling conflicts)
 * @param {Array} data - Flight data
 * @param {Object} settings - Settings
 * @param {Object} results - Validation results to update
 */
function validateAircraftUtilization(data, settings, results) {
  // ... Existing implementation ...
  // This would validate that the same aircraft isn't scheduled for overlapping flights
  // For this validation, we need aircraft registration which might not be in the data
  // As a fallback, we'll check flights with the same flight number
  
  // Group flights by flight number
  const flightsByNumber = {};
  
  data.forEach(flight => {
    if (!flight.FlightNumber) return;
    
    if (!flightsByNumber[flight.FlightNumber]) {
      flightsByNumber[flight.FlightNumber] = [];
    }
    
    flightsByNumber[flight.FlightNumber].push(flight);
  });
  
  // Check each group for conflicts
  Object.entries(flightsByNumber).forEach(([flightNumber, flights]) => {
    if (flights.length <= 1) return;
    
    // Get all flight time ranges using enhanced date parser
    const timeRanges = flights.map(flight => {
      const parseResult = dateParser.parseDate(flight.ScheduledTime);
      const scheduledTime = parseResult.valid ? parseResult.date : new Date(flight.ScheduledTime);
      
      if (isNaN(scheduledTime.getTime())) {
        return null;
      }
      
      // Estimate flight duration based on arrival/departure
      const durationHours = flight.IsArrival ? 0 : 2; // Default duration for departures
      
      const endTime = new Date(scheduledTime);
      endTime.setHours(endTime.getHours() + durationHours);
      
      return {
        flight,
        startTime: scheduledTime,
        endTime
      };
    }).filter(Boolean);
    
    // Check for overlaps
    for (let i = 0; i < timeRanges.length; i++) {
      for (let j = i + 1; j < timeRanges.length; j++) {
        const range1 = timeRanges[i];
        const range2 = timeRanges[j];
        
        // Skip if different day
        if (range1.startTime.toDateString() !== range2.startTime.toDateString()) {
          continue;
        }
        
        // Check if ranges overlap
        if (
          (range1.startTime <= range2.endTime && range1.endTime >= range2.startTime) ||
          (range2.startTime <= range1.endTime && range2.endTime >= range1.startTime)
        ) {
          results.warnings.push({
            severity: SEVERITY.WARNING,
            code: 'W011',
            field: 'FlightNumber',
            recordId: flightNumber,
            message: `Potential scheduling conflict for flights with number ${flightNumber}`,
            value: flightNumber
          });
          break;
        }
      }
    }
  });
}

/**
 * Validate airline code against reference data
 * @param {string} airlineCode - Airline code to validate
 * @param {Array} airlines - Reference airline data
 * @param {Object} record - Current record
 * @param {number} index - Record index
 * @param {Object} results - Results object to update
 */
function validateAirlineCode(airlineCode, airlines, record, index, results) {
  const airline = airlines.find(a => 
    a.AirlineCode === airlineCode || a.IATACode === airlineCode || a.ICAOCode === airlineCode
  );
  
  if (!airline) {
    results.errors.push({
      severity: SEVERITY.ERROR,
      code: 'E004',
      field: 'AirlineCode',
      recordId: getRecordIdentifier(record),
      message: `Airline code '${airlineCode}' not found in reference data`,
      value: airlineCode,
      row: index + 1,
      column: 'AirlineCode'
    });
    results.isValid = false;
  }
}

/**
 * Validate aircraft type against reference data
 * @param {string} aircraftType - Aircraft type to validate
 * @param {Array} aircraftTypes - Reference aircraft data
 * @param {Object} record - Current record
 * @param {number} index - Record index
 * @param {Object} results - Results object to update
 */
function validateAircraftType(aircraftType, aircraftTypes, record, index, results) {
  // Try to match against iata/icao in the enhanced reference format
  const aircraft = aircraftTypes.find(a => {
    // First try direct match
    if (a.iata === aircraftType || a.icao === aircraftType) {
      return true;
    }
    
    // Then try legacy field match (for backward compatibility)
    if (a.IATACode === aircraftType || a.ICAOCode === aircraftType || a.AircraftType === aircraftType) {
      return true;
    }
    
    return false;
  });
  
  if (!aircraft) {
    // For aircraft types, we issue a warning rather than an error
    // since slight variations in type codes are common
    results.warnings.push({
      severity: SEVERITY.WARNING,
      code: 'W012',
      field: 'AircraftType',
      recordId: getRecordIdentifier(record),
      message: `Aircraft type '${aircraftType}' not found in reference data`,
      value: aircraftType,
      row: index + 1,
      column: 'AircraftType'
    });
    
    // Try to find similar aircraft types for suggestion
    const similarTypes = findSimilarAircraftTypes(aircraftType, aircraftTypes);
    if (similarTypes.length > 0) {
      const lastWarning = results.warnings[results.warnings.length - 1];
      lastWarning.suggestedFix = similarTypes[0];
      lastWarning.suggestions = similarTypes;
      lastWarning.details = `Did you mean: ${similarTypes.join(', ')}?`;
    }
  } else {
    // Add information about the matched aircraft type
    results.info.push({
      severity: SEVERITY.INFO,
      code: 'I002',
      field: 'AircraftType',
      recordId: getRecordIdentifier(record),
      message: `Aircraft type '${aircraftType}' matches ${aircraft.model || aircraft.iata}`,
      details: aircraft.notes ? `Notes: ${aircraft.notes}` : '',
      row: index + 1,
      column: 'AircraftType'
    });
  }
}

/**
 * Find similar aircraft types for suggestions
 * @param {string} type - Aircraft type to match
 * @param {Array} aircraftTypes - Reference aircraft data
 * @returns {Array} - Similar aircraft types
 */
function findSimilarAircraftTypes(type, aircraftTypes) {
  // Strip non-alphanumeric characters
  const cleanType = type.replace(/[^a-zA-Z0-9]/g, '');
  
  return aircraftTypes
    .filter(a => {
      // Try matching against both enhanced and legacy fields
      const cleanIATA = (a.iata || a.IATACode || '').replace(/[^a-zA-Z0-9]/g, '');
      const cleanICAO = (a.icao || a.ICAOCode || '').replace(/[^a-zA-Z0-9]/g, '');
      
      return cleanIATA.includes(cleanType) || 
             cleanType.includes(cleanIATA) ||
             cleanICAO.includes(cleanType) ||
             cleanType.includes(cleanICAO);
    })
    .map(a => a.iata || a.IATACode || a.icao || a.ICAOCode)
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Validate terminal against reference data
 * @param {string} terminal - Terminal to validate
 * @param {Array} terminals - Reference terminal data
 * @param {Object} record - Current record
 * @param {number} index - Record index
 * @param {Object} results - Results object to update
 */
function validateTerminal(terminal, terminals, record, index, results) {
  if (terminals.length === 0) {
    return;
  }
  
  const terminalExists = terminals.some(t => 
    t.TerminalCode === terminal || t.Terminal === terminal
  );
  
  if (!terminalExists) {
    results.errors.push({
      severity: SEVERITY.ERROR,
      code: 'E004',
      field: 'Terminal',
      recordId: getRecordIdentifier(record),
      message: `Terminal '${terminal}' not found in reference data`,
      value: terminal,
      row: index + 1,
      column: 'Terminal'
    });
    results.isValid = false;
  }
}

/**
 * Check if value is a boolean
 * @param {any} value - Value to check
 * @returns {boolean} - True if boolean
 */
function isBoolean(value) {
  if (typeof value === 'boolean') {
    return true;
  }
  
  if (typeof value === 'string') {
    const lowered = value.toLowerCase().trim();
    return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(lowered);
  }
  
  if (typeof value === 'number') {
    return value === 0 || value === 1;
  }
  
  return false;
}

/**
 * Check if value is a valid date/time
 * @param {any} value - Value to check
 * @returns {boolean} - True if valid
 */
function isValidDateTime(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  
  if (typeof value === 'string') {
    return dateParser.isValidDate(value);
  }
  
  return false;
}

/**
 * Get identifier for a record (for error messages)
 * @param {Object} record - Record to identify
 * @returns {string} - Identifier
 */
function getRecordIdentifier(record) {
  if (record.FlightID) {
    return record.FlightID;
  }
  
  if (record.FlightNumber) {
    return record.FlightNumber;
  }
  
  if (record.StandName) {
    return record.StandName;
  }
  
  return 'Unknown';
}

module.exports = {
  validateSchema,
  validateDataTypes,
  validateTimeFormat,
  validate,
  validateDataIntegrity,
  validateBusinessRules,
  validateTurnaroundTimes,
  validateFlightConnections,
  validateAircraftUtilization,
  SEVERITY
}; 