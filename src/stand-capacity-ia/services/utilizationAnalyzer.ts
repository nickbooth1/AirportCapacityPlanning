import { 
  HistoricalFlightData, 
  StandData, 
  AircraftTypeData, 
  StandUtilizationMetrics,
  TimeRange,
  OperationalSettings
} from '../models/types';
import { parse, format, addMinutes, isWithinInterval, differenceInMinutes } from 'date-fns';

/**
 * Analyzes stand utilization based on historical flight data
 */
export const analyzeStandUtilization = (
  flights: HistoricalFlightData[],
  stands: StandData[],
  operationalSettings: OperationalSettings
): StandUtilizationMetrics[] => {
  const metrics: StandUtilizationMetrics[] = [];
  
  // Create a lookup of stand IDs to their compatible aircraft types
  const standCompatibilityMap = new Map<string, string[]>();
  stands.forEach(stand => {
    standCompatibilityMap.set(stand.standID, stand.baseCompatibleAircraftTypeIDs);
  });
  
  // Process each stand
  stands.forEach(stand => {
    // Get flights assigned to this stand
    const standFlights = flights.filter(flight => flight.assignedStandID === stand.standID);
    
    // Calculate total operational minutes in the dataset
    const flightDates = [...new Set(standFlights.map(flight => flight.arrivalTime.split('T')[0]))];
    const totalOperationalMinutes = flightDates.length * 
      calculateOperationalMinutesPerDay(operationalSettings);
    
    // Calculate total utilized minutes
    let totalUtilizedMinutes = 0;
    standFlights.forEach(flight => {
      const arrivalTime = new Date(flight.arrivalTime);
      const departureTime = new Date(flight.departureTime);
      
      // Only count time within operational hours
      const utilizationMinutes = calculateUtilizationMinutes(
        arrivalTime, 
        departureTime,
        operationalSettings
      );
      
      totalUtilizedMinutes += utilizationMinutes;
    });
    
    // Calculate utilization rate
    const utilizationRate = totalOperationalMinutes > 0 ? 
      Math.min(totalUtilizedMinutes / totalOperationalMinutes, 1.0) : 0;
    
    // Calculate peak utilization periods (simplified algorithm)
    const peakUtilizationPeriods = identifyPeakPeriods(standFlights, operationalSettings);
    
    // Calculate idle periods (simplified algorithm)
    const idlePeriods = identifyIdlePeriods(standFlights, operationalSettings, flightDates);
    
    // Calculate optimal aircraft type utilization
    const optimalAircraftTypeUtilization = calculateOptimalUtilization(
      standFlights, 
      standCompatibilityMap.get(stand.standID) || []
    );
    
    // Count suboptimal allocations
    const suboptimalAllocationInstances = countSuboptimalAllocations(
      standFlights, 
      standCompatibilityMap.get(stand.standID) || []
    );
    
    // Add metrics for this stand
    metrics.push({
      standID: stand.standID,
      utilizationRate,
      peakUtilizationPeriods,
      idlePeriods,
      optimalAircraftTypeUtilization,
      suboptimalAllocationInstances
    });
  });
  
  return metrics;
};

/**
 * Calculates total operational minutes in a day based on settings
 */
const calculateOperationalMinutesPerDay = (settings: OperationalSettings): number => {
  const startTime = parse(settings.operatingDayStartTime, 'HH:mm:ss', new Date());
  const endTime = parse(settings.operatingDayEndTime, 'HH:mm:ss', new Date());
  
  return differenceInMinutes(endTime, startTime);
};

/**
 * Calculates utilization minutes within operational hours
 */
const calculateUtilizationMinutes = (
  arrivalTime: Date,
  departureTime: Date,
  settings: OperationalSettings
): number => {
  // Create operational hours for the arrival date
  const arrivalDate = format(arrivalTime, 'yyyy-MM-dd');
  const operationalStart = new Date(`${arrivalDate}T${settings.operatingDayStartTime}`);
  const operationalEnd = new Date(`${arrivalDate}T${settings.operatingDayEndTime}`);
  
  // Clamp times to operational hours
  const effectiveArrival = arrivalTime < operationalStart ? operationalStart : arrivalTime;
  const effectiveDeparture = departureTime > operationalEnd ? operationalEnd : departureTime;
  
  // Calculate minutes within operational hours
  if (effectiveArrival >= effectiveDeparture) {
    return 0;
  }
  
  return differenceInMinutes(effectiveDeparture, effectiveArrival);
};

/**
 * Identifies peak utilization periods
 * Simplified algorithm: Periods with back-to-back flights
 */
const identifyPeakPeriods = (
  flights: HistoricalFlightData[],
  settings: OperationalSettings
): TimeRange[] => {
  const peakPeriods: TimeRange[] = [];
  
  if (flights.length <= 1) {
    return peakPeriods;
  }
  
  // Sort flights by arrival time
  const sortedFlights = [...flights].sort((a, b) => 
    new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
  );
  
  // Find periods with back-to-back flights (less than gap time between flights)
  let currentPeakStart: Date | null = null;
  let lastDeparture: Date | null = null;
  
  sortedFlights.forEach(flight => {
    const arrival = new Date(flight.arrivalTime);
    const departure = new Date(flight.departureTime);
    
    if (lastDeparture && 
        differenceInMinutes(arrival, lastDeparture) <= settings.gapBetweenFlightsMinutes) {
      // Part of a peak period
      if (!currentPeakStart) {
        currentPeakStart = lastDeparture;
      }
    } else if (currentPeakStart) {
      // End of a peak period
      peakPeriods.push({
        start: format(currentPeakStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(lastDeparture!, "yyyy-MM-dd'T'HH:mm:ss")
      });
      currentPeakStart = null;
    }
    
    lastDeparture = departure;
  });
  
  // Don't forget to add the last peak period if there is one
  if (currentPeakStart && lastDeparture) {
    peakPeriods.push({
      start: format(currentPeakStart, "yyyy-MM-dd'T'HH:mm:ss"),
      end: format(lastDeparture, "yyyy-MM-dd'T'HH:mm:ss")
    });
  }
  
  return peakPeriods;
};

/**
 * Identifies idle periods (periods with no flights)
 * Simplified algorithm: Periods longer than a threshold with no flights
 */
const identifyIdlePeriods = (
  flights: HistoricalFlightData[],
  settings: OperationalSettings,
  dates: string[]
): TimeRange[] => {
  const idlePeriods: TimeRange[] = [];
  const idleThresholdMinutes = settings.slotDurationMinutes * 3; // Example threshold
  
  // Process each date
  dates.forEach(date => {
    // Create operational hours for this date
    const operationalStart = new Date(`${date}T${settings.operatingDayStartTime}`);
    const operationalEnd = new Date(`${date}T${settings.operatingDayEndTime}`);
    
    // Get flights for this date
    const dateFlights = flights.filter(flight => flight.arrivalTime.startsWith(date));
    
    if (dateFlights.length === 0) {
      // No flights on this day, the entire day is idle
      idlePeriods.push({
        start: format(operationalStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(operationalEnd, "yyyy-MM-dd'T'HH:mm:ss")
      });
      return;
    }
    
    // Sort flights by arrival time
    const sortedFlights = [...dateFlights].sort((a, b) => 
      new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
    );
    
    // Check for idle period at the start of the day
    const firstArrival = new Date(sortedFlights[0].arrivalTime);
    if (differenceInMinutes(firstArrival, operationalStart) >= idleThresholdMinutes) {
      idlePeriods.push({
        start: format(operationalStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(firstArrival, "yyyy-MM-dd'T'HH:mm:ss")
      });
    }
    
    // Check for idle periods between flights
    for (let i = 0; i < sortedFlights.length - 1; i++) {
      const currentDeparture = new Date(sortedFlights[i].departureTime);
      const nextArrival = new Date(sortedFlights[i + 1].arrivalTime);
      
      if (differenceInMinutes(nextArrival, currentDeparture) >= idleThresholdMinutes) {
        idlePeriods.push({
          start: format(currentDeparture, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(nextArrival, "yyyy-MM-dd'T'HH:mm:ss")
        });
      }
    }
    
    // Check for idle period at the end of the day
    const lastDeparture = new Date(sortedFlights[sortedFlights.length - 1].departureTime);
    if (differenceInMinutes(operationalEnd, lastDeparture) >= idleThresholdMinutes) {
      idlePeriods.push({
        start: format(lastDeparture, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(operationalEnd, "yyyy-MM-dd'T'HH:mm:ss")
      });
    }
  });
  
  return idlePeriods;
};

/**
 * Calculates optimal aircraft type utilization
 */
const calculateOptimalUtilization = (
  flights: HistoricalFlightData[],
  compatibleTypes: string[]
): Record<string, number> => {
  const utilization: Record<string, number> = {};
  
  // Initialize with zero utilization for all compatible types
  compatibleTypes.forEach(type => {
    utilization[type] = 0;
  });
  
  // Count occurrences of each aircraft type
  flights.forEach(flight => {
    if (compatibleTypes.includes(flight.aircraftTypeID)) {
      utilization[flight.aircraftTypeID] = (utilization[flight.aircraftTypeID] || 0) + 1;
    }
  });
  
  // Convert to percentages
  const totalFlights = flights.length;
  if (totalFlights > 0) {
    Object.keys(utilization).forEach(type => {
      utilization[type] = utilization[type] / totalFlights;
    });
  }
  
  return utilization;
};

/**
 * Counts instances of suboptimal allocations (flights with non-compatible aircraft types)
 */
const countSuboptimalAllocations = (
  flights: HistoricalFlightData[],
  compatibleTypes: string[]
): number => {
  return flights.filter(flight => !compatibleTypes.includes(flight.aircraftTypeID)).length;
}; 