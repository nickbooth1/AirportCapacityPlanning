/**
 * AggregatedCapacityImpactService
 * 
 * Service for calculating the impact of maintenance on airport capacity
 * Integrates the validated capacity impact calculation logic from Phases 1 & 2
 * into a reusable backend service that can be called via an API endpoint.
 */
const standCapacityToolService = require('./standCapacityToolService');
const maintenanceRequestService = require('./maintenanceRequestService');
const Stand = require('../models/Stand');
const AircraftType = require('../models/AircraftType');
const OperationalSettings = require('../models/OperationalSettings');
const MaintenanceStatusType = require('../models/MaintenanceStatusType');
const db = require('../utils/db');
const { format, parseISO, eachDayOfInterval } = require('date-fns');

class AggregatedCapacityImpactService {
  constructor() {
    // Cached data, loaded asynchronously if needed
    this.standsData = null; // Map<standCode, { dbId, compatibleAircraftICAOs }>
    this.aircraftTypesData = null; // Map<icaoCode, { sizeCategory, averageTurnaroundMinutes, bodyType }>
    this.operationalSettings = null;
    this.maintenanceStatusTypes = null; // Map<id, name>
    this.isInitialized = false;

    // Configuration for maintenance statuses
    this.MAINTENANCE_IMPACT_CATEGORIES = {
      DEFINITE: [2, 4, 5], // Approved, In Progress, Completed
      POTENTIAL: [1],      // Requested
    };
  }

  /**
   * Initialize service by loading reference data from database
   * @private
   */
  async _initialize() {
    if (this.isInitialized) return;
    
    try {
      // Fetch stands data
      const stands = await Stand.query()
        .where('is_active', true)
        .select('id', 'code', 'max_aircraft_size_code');
      
      console.log('Loaded stands from database:', stands.map(s => ({ id: s.id, code: s.code })));
      
      // Fetch aircraft types with turnaround times
      const aircraftTypes = await AircraftType.query()
        .where('is_active', true)
        .select('id', 'icao_code', 'size_category_code');
      
      // Get turnaround rules
      const turnaroundRules = await db('turnaround_rules')
        .select('aircraft_type_id', 'min_turnaround_minutes')
        .where('is_active', true);
      
      // Create a map of aircraft type ID to turnaround time
      const turnaroundMap = new Map();
      turnaroundRules.forEach(rule => {
        turnaroundMap.set(rule.aircraft_type_id, rule.min_turnaround_minutes);
      });
      
      // Fetch operational settings
      this.operationalSettings = await OperationalSettings.query().first() || {
        default_gap_minutes: 15,
        slot_duration_minutes: 60
      };
      
      // Fetch maintenance status types
      const statusTypes = await MaintenanceStatusType.query();
      this.maintenanceStatusTypes = new Map();
      statusTypes.forEach(status => {
        this.maintenanceStatusTypes.set(status.id, status.name);
      });
      
      // Fetch stand constraints data for aircraft compatibility
      const standConstraints = await db('stand_aircraft_constraints')
        .select('stand_id', 'aircraft_type_id', 'is_allowed')
        .where('is_allowed', true);
      
      // Group constraints by stand_id
      const standConstraintsMap = new Map();
      standConstraints.forEach(constraint => {
        if (!standConstraintsMap.has(constraint.stand_id)) {
          standConstraintsMap.set(constraint.stand_id, []);
        }
        standConstraintsMap.get(constraint.stand_id).push(constraint.aircraft_type_id);
      });
      
      // Initialize stands data map
      this.standsData = new Map();
      
      // Process each stand
      for (const stand of stands) {
        // Find compatible aircraft types
        let compatibleAircraftICAOs = [];
        
        // Check if we have constraints for this stand
        if (standConstraintsMap.has(stand.id)) {
          // Get aircraft ICAOs from constraints
          const compatibleIds = standConstraintsMap.get(stand.id);
          for (const aircraftTypeId of compatibleIds) {
            const aircraftType = aircraftTypes.find(type => type.id === aircraftTypeId);
            if (aircraftType && aircraftType.icao_code) {
              compatibleAircraftICAOs.push(aircraftType.icao_code);
            }
          }
        }
        
        // If no constraints found, use the max aircraft size code as fallback
        if (compatibleAircraftICAOs.length === 0 && stand.max_aircraft_size_code) {
          // Determine compatible types based on max size code
          compatibleAircraftICAOs = this._getCompatibleTypesFromSizeCode(stand.max_aircraft_size_code, aircraftTypes);
        }
        
        // Add stand to the map
        this.standsData.set(stand.code, {
          dbId: stand.id,
          compatibleAircraftICAOs
        });
        
        console.log(`Stand ${stand.code} (ID: ${stand.id}) has ${compatibleAircraftICAOs.length} compatible aircraft types`);
      }
      
      // Process aircraft types
      this.aircraftTypesData = new Map();
      
      for (const type of aircraftTypes) {
        const turnaroundMinutes = turnaroundMap.get(type.id) || 45; // Default to 45 minutes
        const bodyType = this._getBodyType(type.size_category_code);
        
        this.aircraftTypesData.set(type.icao_code, {
          sizeCategory: type.size_category_code,
          averageTurnaroundMinutes: turnaroundMinutes,
          bodyType
        });
      }
      
      this.isInitialized = true;
      console.log(`AggregatedCapacityImpactService initialized with ${this.standsData.size} stands and ${this.aircraftTypesData.size} aircraft types`);
    } catch (error) {
      console.error('Error initializing AggregatedCapacityImpactService:', error);
      throw error;
    }
  }

  /**
   * Determine aircraft body type from size category code
   * @param {string} sizeCategoryCode - Aircraft size category (A-F)
   * @returns {string} - Body type ('narrowBody' or 'wideBody')
   * @private
   */
  _getBodyType(sizeCategoryCode) {
    // A-D are narrow body, E-F are wide body
    if (!sizeCategoryCode) return 'narrowBody';
    
    const size = sizeCategoryCode.trim().toUpperCase();
    return ['E', 'F'].includes(size) ? 'wideBody' : 'narrowBody';
  }

  /**
   * Get compatible aircraft types based on size category code
   * @param {string} maxSizeCode - Maximum aircraft size code
   * @param {Array} aircraftTypes - All aircraft types
   * @returns {Array<string>} - Array of compatible ICAO codes
   * @private
   */
  _getCompatibleTypesFromSizeCode(maxSizeCode, aircraftTypes) {
    if (!maxSizeCode) return [];
    
    const normalized = maxSizeCode.trim().toUpperCase();
    const sizeHierarchy = ['A', 'B', 'C', 'D', 'E', 'F'];
    const maxIndex = sizeHierarchy.indexOf(normalized);
    
    if (maxIndex === -1) return [];
    
    // All aircraft with size code <= maxSizeCode are compatible
    return aircraftTypes
      .filter(type => {
        if (!type.size_category_code) return false;
        const typeIndex = sizeHierarchy.indexOf(type.size_category_code.trim().toUpperCase());
        return typeIndex !== -1 && typeIndex <= maxIndex;
      })
      .map(type => type.icao_code);
  }

  /**
   * Calculate the daily impacted capacity due to maintenance
   * @param {Object} options - Options for the calculation
   * @param {string} options.startDate - Start date (YYYY-MM-DD)
   * @param {string} options.endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of daily capacity impact results
   */
  async getDailyImpactedCapacity(options) {
    // Ensure service is initialized
    await this._initialize();
    
    // Validate inputs
    if (!options.startDate || !options.endDate) {
      throw new Error('startDate and endDate are required');
    }
    
    try {
      // 1. Fetch Daily Gross Capacity Template from standCapacityToolService
      const standIds = Array.from(this.standsData.values()).map(stand => stand.dbId);
      console.log(`Using ${standIds.length} standIds for capacity calculation:`, standIds);
      
      const capacityResult = await standCapacityToolService.calculateCapacity({
        useDefinedTimeSlots: false,
        standIds
      });
      
      console.log('Time slots from capacity calculator:', capacityResult.timeSlots);
      console.log('Sample slot capacity structure:', JSON.stringify(capacityResult.bestCaseCapacity, null, 2));
      
      // Ensure the structure is in the expected format
      const bestCaseCapacity = {};
      
      // Fix structure if needed: each time slot should contain aircraft type capacities
      if (capacityResult.bestCaseCapacity) {
        for (const slotName in capacityResult.bestCaseCapacity) {
          bestCaseCapacity[slotName] = capacityResult.bestCaseCapacity[slotName];
        }
      }
      
      const dailyGrossCapacityTemplate = {
        bestCaseCapacity: bestCaseCapacity,
        timeSlots: capacityResult.timeSlots || []
      };
      
      console.log(`Daily template has ${dailyGrossCapacityTemplate.timeSlots.length} time slots`);
      console.log(`First slot available: ${dailyGrossCapacityTemplate.timeSlots[0]?.name || 'None'}`);
      
      // If no time slots defined, nothing will work
      if (dailyGrossCapacityTemplate.timeSlots.length === 0) {
        console.error('ERROR: No time slots defined in capacity template. Cannot calculate impacts.');
        return [];
      }
      
      // 2. Fetch All Relevant Maintenance Requests
      const allRelevantStatusIds = [
        ...this.MAINTENANCE_IMPACT_CATEGORIES.DEFINITE,
        ...this.MAINTENANCE_IMPACT_CATEGORIES.POTENTIAL
      ];
      
      const maintenanceRequests = await maintenanceRequestService.getAllRequests({
        startDate: options.startDate,
        endDate: options.endDate,
        status: allRelevantStatusIds
      });
      
      // Process maintenance requests to ensure they have all required fields
      const processedRequests = maintenanceRequests.map(request => {
        // Try to extract code from stand name if needed
        let standCode = 'Unknown';
        if (request.stand) {
          // First try to use the stand code directly
          standCode = request.stand.code;
          
          // If that's not available or not in our stands data, try to extract from the name
          if (!standCode || !this.standsData.has(standCode)) {
            const standName = request.stand.name || '';
            // Try to extract S101, L102, etc. from names like "Stand 101" or "Large Stand 102"
            const codeMatch = standName.match(/(?:Stand|Large Stand)\s+(\d+)/i);
            if (codeMatch && codeMatch[1]) {
              const extractedNumber = codeMatch[1];
              // Try different formats: S101, L101, 101
              const possibleCodes = [
                `S${extractedNumber}`, 
                `L${extractedNumber}`,
                extractedNumber
              ];
              
              // Use the first code that exists in our standsData
              for (const code of possibleCodes) {
                if (this.standsData.has(code)) {
                  standCode = code;
                  break;
                }
              }
            }
          }
        }
        
        return {
          id: request.id,
          title: request.title,
          stand_id: request.stand_id,
          standCode,
          status_id: request.status_id,
          statusName: request.status ? request.status.name : 
                    (this.maintenanceStatusTypes.get(request.status_id) || 'Unknown'),
          start_datetime: request.start_datetime,
          end_datetime: request.end_datetime
        };
      });
      
      console.log(`Found ${maintenanceRequests.length} maintenance requests for period ${options.startDate} to ${options.endDate}`);
      console.log('Available stands in lookup:', Array.from(this.standsData.keys()));
      console.log('Processed maintenance requests:', processedRequests);
      
      // 3. Process each day in the date range
      let startDate, endDate;
      try {
        startDate = new Date(options.startDate);
        endDate = new Date(options.endDate);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid start or end date');
        }
        
        console.log(`Processing date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      } catch (error) {
        console.error('Error parsing date range:', options.startDate, options.endDate, error);
        throw new Error('Invalid time value');
      }
      
      // Get all days in the interval
      const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Results array to store daily impact data
      const results = [];
      
      // Process each day
      for (const currentDate of daysInRange) {
        // Format date as YYYY-MM-DD for consistency
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        console.log(`Processing day: ${formattedDate}`);
        
        // a. Calculate Original Daily Totals from template
        const originalDailyCapacity = this._calculateDailyTotals(dailyGrossCapacityTemplate.bestCaseCapacity);
        
        // b. Initialize Daily Impact Accumulators
        const dailyDefiniteReduction = { narrowBody: 0, wideBody: 0, total: 0 };
        const dailyPotentialReduction = { narrowBody: 0, wideBody: 0, total: 0 };
        const contributingDefiniteRequests = [];
        const contributingPotentialRequests = [];
        
        // c. Deep copy template slot capacities for current day net calculation
        const currentDayNetSlotCapacities = this._deepCopy(dailyGrossCapacityTemplate.bestCaseCapacity);
        
        // d. Filter maintenance for current day
        const maintenanceForDay = processedRequests.filter(request => {
          try {
            const requestStart = new Date(request.start_datetime);
            const requestEnd = new Date(request.end_datetime);
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Skip invalid dates
            if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) {
              console.error(`Invalid date in maintenance request ${request.id}: start=${request.start_datetime}, end=${request.end_datetime}`);
              return false;
            }
            
            console.log(`Checking maintenance request ${request.id} for ${formattedDate}:`);
            console.log(`  Request start: ${requestStart.toISOString()}, end: ${requestEnd.toISOString()}`);
            console.log(`  Day start: ${dayStart.toISOString()}, end: ${dayEnd.toISOString()}`);
            console.log(`  Overlap: ${requestStart <= dayEnd && requestEnd >= dayStart}`);
            
            return requestStart <= dayEnd && requestEnd >= dayStart;
          } catch (error) {
            console.error(`Error processing maintenance request ${request.id}:`, error);
            return false;
          }
        });
        
        console.log(`Day ${formattedDate}: Found ${maintenanceForDay.length} maintenance requests`);
        if (maintenanceForDay.length > 0) {
          console.log('Maintenance requests for this day:', maintenanceForDay);
        }
        
        // e. Loop through template slots
        for (const templateSlot of dailyGrossCapacityTemplate.timeSlots) {
          const slotLabel = templateSlot.name;
          
          // Get slot times
          let slotStartDateTime, slotEndDateTime;
          try {
            const slotTimeParts = templateSlot.start_time.split(':');
            const slotHours = parseInt(slotTimeParts[0], 10);
            const slotMinutes = parseInt(slotTimeParts[1], 10);
            
            // Validate time parts
            if (isNaN(slotHours) || isNaN(slotMinutes) || slotHours < 0 || slotHours > 23 || slotMinutes < 0 || slotMinutes > 59) {
              console.error(`Invalid time format in slot ${slotLabel}: ${templateSlot.start_time}`);
              continue; // Skip this slot
            }
            
            // Construct absolute slot DateTimes
            slotStartDateTime = new Date(currentDate);
            slotStartDateTime.setHours(slotHours, slotMinutes, 0, 0);
            
            const slotEndTimeParts = templateSlot.end_time.split(':');
            const slotEndHours = parseInt(slotEndTimeParts[0], 10);
            const slotEndMinutes = parseInt(slotEndTimeParts[1], 10);
            
            // Validate time parts
            if (isNaN(slotEndHours) || isNaN(slotEndMinutes) || slotEndHours < 0 || slotEndHours > 23 || slotEndMinutes < 0 || slotEndMinutes > 59) {
              console.error(`Invalid time format in slot ${slotLabel}: ${templateSlot.end_time}`);
              continue; // Skip this slot
            }
            
            slotEndDateTime = new Date(currentDate);
            slotEndDateTime.setHours(slotEndHours, slotEndMinutes, 0, 0);
          } catch (error) {
            console.error(`Error processing time slot ${slotLabel}:`, error);
            continue; // Skip this slot
          }
          
          // ii. Identify active maintenance in slot
          const maintenanceInSlot = maintenanceForDay.filter(request => {
            try {
              const requestStart = new Date(request.start_datetime);
              const requestEnd = new Date(request.end_datetime);
              
              // Skip invalid dates
              if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) {
                console.error(`Invalid date in maintenance request ${request.id}: start=${request.start_datetime}, end=${request.end_datetime}`);
                return false;
              }
              
              return requestStart < slotEndDateTime && requestEnd > slotStartDateTime;
            } catch (error) {
              console.error(`Error processing time slot for maintenance request ${request.id}:`, error);
              return false;
            }
          });
          
          if (maintenanceInSlot.length > 0) {
            console.log(`Slot ${slotLabel} (${templateSlot.start_time}-${templateSlot.end_time}): Found ${maintenanceInSlot.length} maintenance requests`);
          }
          
          // Process each maintenance request in this slot
          for (const maintenance of maintenanceInSlot) {
            const standCode = maintenance.standCode;
            const standData = this.standsData.get(standCode);
            
            console.log(`Processing maintenance: ${maintenance.title}, Stand Code: ${standCode}, Found in map: ${!!standData}`);
            
            if (!standData) continue; // Skip if stand not found
            
            // Get compatible aircraft for this stand
            const compatibleAircraftICAOs = standData.compatibleAircraftICAOs;
            
            // For each compatible aircraft type
            for (const aircraftTypeICAO of compatibleAircraftICAOs) {
              const aircraftTypeData = this.aircraftTypesData.get(aircraftTypeICAO);
              
              if (!aircraftTypeData) {
                console.log(`WARNING: No data found for aircraft type ${aircraftTypeICAO} on stand ${standCode}`);
                continue; // Skip if aircraft type not found
              }
              
              // Check if this slot exists in capacity data
              if (!currentDayNetSlotCapacities[slotLabel]) {
                console.log(`WARNING: No capacity data for slot ${slotLabel}`);
                continue;
              }
              
              // Check if there's any entry for this aircraft type in the capacity data
              // Sometimes aircraft types in the capacity data might use a different code format
              let matchingAircraftKey = aircraftTypeICAO;
              
              // If the exact code doesn't exist, try to find any aircraft of the same type
              if (!currentDayNetSlotCapacities[slotLabel][aircraftTypeICAO]) {
                const bodyType = aircraftTypeData.bodyType;
                const sizeCategory = aircraftTypeData.sizeCategory;
                
                // Log the available aircraft types in this slot
                console.log(`Available aircraft in slot ${slotLabel}:`, Object.keys(currentDayNetSlotCapacities[slotLabel]));
                console.log(`Looking for matching aircraft for ${aircraftTypeICAO} (${bodyType}, ${sizeCategory})`);
                
                // Try to find an aircraft with similar characteristics
                for (const key in currentDayNetSlotCapacities[slotLabel]) {
                  const keyAircraftData = this.aircraftTypesData.get(key);
                  if (keyAircraftData && keyAircraftData.bodyType === bodyType) {
                    console.log(`Found matching aircraft type ${key} for ${aircraftTypeICAO}`);
                    matchingAircraftKey = key;
                    break;
                  }
                }
              }
              
              // Check if this aircraft type has capacity in this slot
              if (!currentDayNetSlotCapacities[slotLabel][matchingAircraftKey] || 
                  currentDayNetSlotCapacities[slotLabel][matchingAircraftKey] <= 0) {
                
                if (maintenanceInSlot.length > 0) {
                  console.log(`No capacity for aircraft type ${matchingAircraftKey} in slot ${slotLabel}`);
                  console.log(`Capacity slots available: ${Object.keys(currentDayNetSlotCapacities[slotLabel] || {}).join(', ')}`);
                }
                continue; // No capacity to reduce
              }
              
              console.log(`FOUND CAPACITY IMPACT: Reducing capacity for ${matchingAircraftKey} in slot ${slotLabel} due to maintenance on stand ${standCode} (${maintenance.title})`);
              console.log(`  Current capacity: ${currentDayNetSlotCapacities[slotLabel][matchingAircraftKey]}`);
              
              // Calculate single stand slot contribution
              const singleStandSlotContribution = 1; // Simplest model: 1 stand = 1 capacity unit
              
              // Determine body type
              const bodyType = aircraftTypeData.bodyType;
              
              // Determine impact type (definite/potential) based on status_id
              const isDefiniteImpact = this.MAINTENANCE_IMPACT_CATEGORIES.DEFINITE.includes(maintenance.status_id);
              
              // Apply reduction to net slot capacities
              currentDayNetSlotCapacities[slotLabel][matchingAircraftKey] -= singleStandSlotContribution;
              if (currentDayNetSlotCapacities[slotLabel][matchingAircraftKey] < 0) {
                currentDayNetSlotCapacities[slotLabel][matchingAircraftKey] = 0;
              }
              
              // Accumulate daily reduction totals
              if (isDefiniteImpact) {
                dailyDefiniteReduction[bodyType] += singleStandSlotContribution;
                dailyDefiniteReduction.total += singleStandSlotContribution;
                
                // Store contributing request info
                if (!contributingDefiniteRequests.find(r => r.id === maintenance.id)) {
                  contributingDefiniteRequests.push({
                    id: maintenance.id,
                    title: maintenance.title,
                    standCode: maintenance.standCode,
                    statusName: maintenance.statusName,
                    startTime: maintenance.start_datetime,
                    endTime: maintenance.end_datetime
                  });
                }
              } else {
                dailyPotentialReduction[bodyType] += singleStandSlotContribution;
                dailyPotentialReduction.total += singleStandSlotContribution;
                
                // Store contributing request info
                if (!contributingPotentialRequests.find(r => r.id === maintenance.id)) {
                  contributingPotentialRequests.push({
                    id: maintenance.id,
                    title: maintenance.title,
                    standCode: maintenance.standCode,
                    statusName: maintenance.statusName,
                    startTime: maintenance.start_datetime,
                    endTime: maintenance.end_datetime
                  });
                }
              }
            }
          }
        }
        
        // f. Calculate final daily total capacities
        const netDailyCapacity = this._calculateDailyTotals(currentDayNetSlotCapacities);
        
        // Calculate capacity after definite impact (original minus definite reduction)
        const capacityAfterDefiniteImpact = {
          narrowBody: originalDailyCapacity.narrowBody - dailyDefiniteReduction.narrowBody,
          wideBody: originalDailyCapacity.wideBody - dailyDefiniteReduction.wideBody,
          total: originalDailyCapacity.total - dailyDefiniteReduction.total
        };
        
        // g. Assemble and add daily result object to results array
        results.push({
          date: formattedDate,
          originalDailyCapacity,
          capacityAfterDefiniteImpact,
          finalNetCapacity: netDailyCapacity,
          maintenanceImpacts: {
            definite: {
              reduction: dailyDefiniteReduction,
              requests: contributingDefiniteRequests
            },
            potential: {
              reduction: dailyPotentialReduction,
              requests: contributingPotentialRequests
            }
          }
        });
        
        // Debug the impact for this day
        if (contributingDefiniteRequests.length > 0 || contributingPotentialRequests.length > 0) {
          console.log(`Day ${formattedDate} IMPACT SUMMARY:`);
          console.log(`  Original capacity: ${JSON.stringify(originalDailyCapacity)}`);
          console.log(`  After definite impact: ${JSON.stringify(capacityAfterDefiniteImpact)}`);
          console.log(`  Final net capacity: ${JSON.stringify(netDailyCapacity)}`);
          console.log(`  Definite reduction: ${JSON.stringify(dailyDefiniteReduction)}`);
          console.log(`  Potential reduction: ${JSON.stringify(dailyPotentialReduction)}`);
          console.log(`  Definite requests: ${contributingDefiniteRequests.length}`);
          console.log(`  Potential requests: ${contributingPotentialRequests.length}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in AggregatedCapacityImpactService.getDailyImpactedCapacity:', error);
      throw error;
    }
  }

  /**
   * Calculate daily totals from slot capacities
   * @param {Object} slotCapacities - Slot capacities from capacity template
   * @returns {Object} - Daily totals by aircraft body type
   * @private
   */
  _calculateDailyTotals(slotCapacities) {
    const totals = {
      narrowBody: 0,
      wideBody: 0,
      total: 0
    };
    
    // Loop through each time slot
    for (const slotLabel in slotCapacities) {
      const slotData = slotCapacities[slotLabel];
      
      // Loop through each aircraft type in the slot
      for (const aircraftTypeICAO in slotData) {
        const capacity = slotData[aircraftTypeICAO];
        
        // Get aircraft data
        const aircraftTypeData = this.aircraftTypesData.get(aircraftTypeICAO);
        
        if (!aircraftTypeData) continue; // Skip if not found
        
        // Add to appropriate body type total
        if (aircraftTypeData.bodyType === 'wideBody') {
          totals.wideBody += capacity;
        } else {
          totals.narrowBody += capacity;
        }
        
        // Add to overall total
        totals.total += capacity;
      }
    }
    
    return totals;
  }

  /**
   * Create a deep copy of an object
   * @param {Object} obj - Object to copy
   * @returns {Object} - Deep copy of the object
   * @private
   */
  _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

module.exports = new AggregatedCapacityImpactService(); 