import { 
  ForecastParameters,
  InfrastructureChange,
  HistoricalCapacityData,
  StandData,
  AircraftTypeData,
  AirlineGrowthProjection,
  MarketForecast,
  OperationalSettings,
  CapacityForecast,
  TimeRange
} from '../models/types';
import { 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  addQuarters, 
  addYears,
  format,
  parse,
  isWithinInterval,
  getYear
} from 'date-fns';

/**
 * Forecasts future capacity based on historical data and planned changes
 */
export const forecastCapacity = (
  historicalData: HistoricalCapacityData[],
  infrastructureChanges: InfrastructureChange[],
  stands: StandData[],
  aircraftTypes: AircraftTypeData[],
  airlineGrowth: AirlineGrowthProjection[],
  marketForecasts: MarketForecast[],
  parameters: ForecastParameters,
  operationalSettings: OperationalSettings
): CapacityForecast[] => {
  const forecasts: CapacityForecast[] = [];
  
  // Group historical data by terminal area
  const terminalAreas = [...new Set(stands.map(stand => stand.terminalArea))];
  
  // Establish baseline capacity by terminal area and aircraft type
  const baselineCapacity = calculateBaselineCapacity(historicalData, terminalAreas, aircraftTypes);
  
  // Generate time periods for forecast
  const timePeriods = generateForecastPeriods(parameters);
  
  // Process each terminal area
  terminalAreas.forEach(terminalArea => {
    // Process each time period
    timePeriods.forEach(period => {
      // Calculate forecasted capacity
      const forecastedCapacity = calculateForecastedCapacity(
        baselineCapacity[terminalArea],
        period,
        infrastructureChanges,
        stands.filter(s => s.terminalArea === terminalArea),
        aircraftTypes,
        airlineGrowth,
        marketForecasts,
        parameters
      );
      
      // Calculate percentage change from baseline
      const totalBaseline = Object.values(baselineCapacity[terminalArea]).reduce((sum, val) => sum + val, 0);
      const totalForecasted = Object.values(forecastedCapacity.capacity).reduce((sum, val) => sum + val, 0);
      const percentageChange = totalBaseline > 0 ? 
        ((totalForecasted - totalBaseline) / totalBaseline) * 100 : 0;
      
      // Create capacity forecast entry
      forecasts.push({
        timePeriod: period,
        terminalArea,
        baselineCapacityByAircraftType: baselineCapacity[terminalArea],
        forecastedCapacityByAircraftType: forecastedCapacity.capacity,
        appliedInfrastructureChanges: forecastedCapacity.appliedChanges,
        capacityChangeFromBaseline: percentageChange,
        limitingFactors: forecastedCapacity.limitingFactors
      });
    });
  });
  
  return forecasts;
};

/**
 * Calculates baseline capacity from historical data
 */
const calculateBaselineCapacity = (
  historicalData: HistoricalCapacityData[],
  terminalAreas: string[],
  aircraftTypes: AircraftTypeData[]
): Record<string, Record<string, number>> => {
  const baseline: Record<string, Record<string, number>> = {};
  
  // Initialize baseline capacity for each terminal area and aircraft type
  terminalAreas.forEach(terminal => {
    baseline[terminal] = {};
    aircraftTypes.forEach(aircraft => {
      baseline[terminal][aircraft.aircraftTypeID] = 0;
    });
  });
  
  // Group historical data by terminal area
  const dataByTerminal: Record<string, HistoricalCapacityData[]> = {};
  historicalData.forEach(record => {
    if (!dataByTerminal[record.terminalArea]) {
      dataByTerminal[record.terminalArea] = [];
    }
    dataByTerminal[record.terminalArea].push(record);
  });
  
  // Calculate average capacity for each terminal area and aircraft type
  Object.entries(dataByTerminal).forEach(([terminal, records]) => {
    if (!baseline[terminal]) return;
    
    // Group by aircraft type
    const capacityByAircraft: Record<string, number[]> = {};
    
    records.forEach(record => {
      Object.entries(record.capacityByAircraftType).forEach(([aircraft, capacity]) => {
        if (!capacityByAircraft[aircraft]) {
          capacityByAircraft[aircraft] = [];
        }
        capacityByAircraft[aircraft].push(capacity);
      });
    });
    
    // Calculate average capacity
    Object.entries(capacityByAircraft).forEach(([aircraft, capacities]) => {
      if (capacities.length > 0) {
        const total = capacities.reduce((sum, val) => sum + val, 0);
        baseline[terminal][aircraft] = Math.round(total / capacities.length);
      }
    });
  });
  
  return baseline;
};

/**
 * Generates time periods for forecast based on parameters
 */
const generateForecastPeriods = (parameters: ForecastParameters): TimeRange[] => {
  const periods: TimeRange[] = [];
  const now = new Date();
  let currentDate = now;
  
  for (let i = 0; i < parameters.timeHorizon; i++) {
    if (parameters.intervalGranularity === 'MONTHLY') {
      // Generate monthly periods
      for (let month = 0; month < 12; month++) {
        const periodStart = startOfMonth(currentDate);
        const periodEnd = endOfMonth(currentDate);
        
        periods.push({
          start: format(periodStart, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(periodEnd, "yyyy-MM-dd'T'HH:mm:ss")
        });
        
        currentDate = addMonths(currentDate, 1);
      }
    } else if (parameters.intervalGranularity === 'QUARTERLY') {
      // Generate quarterly periods
      for (let quarter = 0; quarter < 4; quarter++) {
        const periodStart = startOfMonth(currentDate);
        const periodEnd = endOfMonth(addMonths(currentDate, 2));
        
        periods.push({
          start: format(periodStart, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(periodEnd, "yyyy-MM-dd'T'HH:mm:ss")
        });
        
        currentDate = addQuarters(currentDate, 1);
      }
    } else {
      // Generate yearly periods
      const periodStart = startOfMonth(currentDate);
      const periodEnd = endOfMonth(addMonths(currentDate, 11));
      
      periods.push({
        start: format(periodStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(periodEnd, "yyyy-MM-dd'T'HH:mm:ss")
      });
      
      currentDate = addYears(currentDate, 1);
    }
  }
  
  return periods;
};

/**
 * Calculates forecasted capacity for a specific period
 */
interface ForecastResult {
  capacity: Record<string, number>;
  appliedChanges: string[];
  limitingFactors: string[];
}

const calculateForecastedCapacity = (
  baselineCapacity: Record<string, number>,
  period: TimeRange,
  infrastructureChanges: InfrastructureChange[],
  stands: StandData[],
  aircraftTypes: AircraftTypeData[],
  airlineGrowth: AirlineGrowthProjection[],
  marketForecasts: MarketForecast[],
  parameters: ForecastParameters
): ForecastResult => {
  // Initialize with baseline capacity
  const forecastedCapacity: Record<string, number> = { ...baselineCapacity };
  const appliedChanges: string[] = [];
  const limitingFactors: string[] = [];
  
  // Calculate period year for growth calculations
  const periodStart = new Date(period.start);
  const periodYear = getYear(periodStart);
  const currentYear = getYear(new Date());
  const yearDiff = periodYear - currentYear;
  
  // Apply infrastructure changes that affect this period
  infrastructureChanges.forEach(change => {
    const changeStart = new Date(change.startDate);
    const changeEnd = change.endDate ? new Date(change.endDate) : null;
    
    // Check if the change affects this period
    const startsBeforePeriodEnds = changeStart <= new Date(period.end);
    const endsAfterPeriodStarts = !changeEnd || changeEnd >= new Date(period.start);
    
    if (startsBeforePeriodEnds && endsAfterPeriodStarts) {
      // Apply the capacity impact
      Object.entries(change.capacityImpactByAircraftType).forEach(([aircraft, impact]) => {
        if (forecastedCapacity[aircraft] !== undefined) {
          forecastedCapacity[aircraft] += impact;
          
          // Ensure capacity doesn't go below zero
          forecastedCapacity[aircraft] = Math.max(0, forecastedCapacity[aircraft]);
        }
      });
      
      appliedChanges.push(change.changeID);
      
      // Add limiting factor if this is a capacity reduction
      if (Object.values(change.capacityImpactByAircraftType).some(impact => impact < 0)) {
        limitingFactors.push(`INFRASTRUCTURE_CHANGE:${change.changeType}`);
      }
    }
  });
  
  // Apply airline growth projections
  airlineGrowth.forEach(airline => {
    // Get growth rate for this year if available, otherwise assume no growth
    const yearKey = periodYear.toString();
    const growthRate = airline.projectedGrowthByYear[yearKey] || 0;
    
    // Apply growth only if positive
    if (growthRate > 0) {
      const growthFactor = 1 + (growthRate / 100);
      
      // Apply to all aircraft types in the airline's fleet that year
      const fleetForYear = airline.fleetEvolution[yearKey] || {};
      
      Object.entries(fleetForYear).forEach(([aircraft, count]) => {
        if (forecastedCapacity[aircraft] !== undefined && count > 0) {
          // Scale capacity based on airline's growth rate and fleet size
          const baseFleetSize = aircraftTypes.find(a => a.aircraftTypeID === aircraft)?.currentFleetSize || 1;
          const fleetRatio = count / baseFleetSize;
          const scaleFactor = growthFactor * fleetRatio;
          
          forecastedCapacity[aircraft] = Math.round(forecastedCapacity[aircraft] * scaleFactor);
        }
      });
    }
  });
  
  // Apply market forecasts
  marketForecasts.forEach(market => {
    // Get growth rate for this year if available, otherwise assume no growth
    const yearKey = periodYear.toString();
    const growthRate = market.projectedGrowthByYear[yearKey] || 0;
    
    // Apply growth only if positive
    if (growthRate > 0) {
      const growthFactor = 1 + (growthRate / 100);
      
      // Apply to all aircraft types (simplified approach)
      Object.keys(forecastedCapacity).forEach(aircraft => {
        forecastedCapacity[aircraft] = Math.round(forecastedCapacity[aircraft] * growthFactor);
      });
    }
  });
  
  // Apply seasonal factors if applicable
  const periodMonth = periodStart.getMonth() + 1; // 1-12
  const seasonalFactor = parameters.seasonalFactors[periodMonth.toString()] || 1.0;
  
  if (seasonalFactor !== 1.0) {
    Object.keys(forecastedCapacity).forEach(aircraft => {
      forecastedCapacity[aircraft] = Math.round(forecastedCapacity[aircraft] * seasonalFactor);
    });
    
    if (seasonalFactor < 1.0) {
      limitingFactors.push('SEASONAL_REDUCTION');
    }
  }
  
  // Apply disruption allowance
  if (parameters.disruptionAllowance > 0) {
    const disruptionFactor = 1 - (parameters.disruptionAllowance / 100);
    
    Object.keys(forecastedCapacity).forEach(aircraft => {
      forecastedCapacity[aircraft] = Math.round(forecastedCapacity[aircraft] * disruptionFactor);
    });
    
    limitingFactors.push('DISRUPTION_ALLOWANCE');
  }
  
  // Apply aircraft fleet changes (retirements and additions)
  aircraftTypes.forEach(aircraft => {
    const yearKey = periodYear.toString();
    const retirements = aircraft.projectedRetirements[yearKey] || 0;
    const additions = aircraft.projectedAdditions[yearKey] || 0;
    
    if (retirements > 0 || additions > 0) {
      // Calculate net fleet change
      const netChange = additions - retirements;
      const currentFleet = aircraft.currentFleetSize;
      
      if (currentFleet > 0 && forecastedCapacity[aircraft.aircraftTypeID] !== undefined) {
        // Scale capacity based on fleet changes
        const fleetFactor = 1 + (netChange / currentFleet);
        forecastedCapacity[aircraft.aircraftTypeID] = Math.round(
          forecastedCapacity[aircraft.aircraftTypeID] * fleetFactor
        );
        
        // Ensure capacity doesn't go below zero
        forecastedCapacity[aircraft.aircraftTypeID] = Math.max(
          0, 
          forecastedCapacity[aircraft.aircraftTypeID]
        );
        
        if (netChange < 0) {
          limitingFactors.push(`FLEET_RETIREMENT:${aircraft.aircraftTypeID}`);
        }
      }
    }
  });
  
  return {
    capacity: forecastedCapacity,
    appliedChanges,
    limitingFactors: [...new Set(limitingFactors)] // Remove duplicates
  };
}; 