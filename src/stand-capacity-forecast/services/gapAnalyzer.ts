import { 
  CapacityForecast,
  DemandProjection,
  CapacityGapAnalysis
} from '../models/types';
import { parse, isWithinInterval, differenceInMonths, format } from 'date-fns';

/**
 * Analyzes capacity gaps by comparing forecasted capacity against projected demand
 */
export const analyzeCapacityGap = (
  forecasts: CapacityForecast[],
  demandProjections: DemandProjection[]
): CapacityGapAnalysis[] => {
  const gapAnalyses: CapacityGapAnalysis[] = [];
  
  // Group forecasts by terminal area and time period
  const forecastsByTerminalAndPeriod = groupForecasts(forecasts);
  
  // Group demand projections by scenario and time period
  const demandByScenarioAndPeriod = groupDemandProjections(demandProjections);
  
  // Process each demand scenario
  Object.keys(demandByScenarioAndPeriod).forEach(scenarioName => {
    const scenarioDemand = demandByScenarioAndPeriod[scenarioName];
    
    // Process each terminal area
    Object.keys(forecastsByTerminalAndPeriod).forEach(terminalArea => {
      const terminalForecasts = forecastsByTerminalAndPeriod[terminalArea];
      
      // Process each time period in the demand scenario
      Object.keys(scenarioDemand).forEach(periodKey => {
        const demand = scenarioDemand[periodKey];
        
        // Skip if we don't have a matching forecast for this terminal and period
        if (!terminalForecasts[periodKey]) return;
        
        const forecast = terminalForecasts[periodKey];
        
        // Calculate capacity gap by aircraft type
        const gapByAircraftType: Record<string, number> = {};
        let totalDemand = 0;
        let totalCapacity = 0;
        
        Object.entries(demand.projectedFlightsByAircraftType).forEach(([aircraftType, flightCount]) => {
          const capacity = forecast.forecastedCapacityByAircraftType[aircraftType] || 0;
          const gap = flightCount - capacity;
          
          gapByAircraftType[aircraftType] = gap;
          totalDemand += flightCount;
          totalCapacity += capacity;
        });
        
        // Calculate overall capacity gap
        const totalGap = Math.max(0, totalDemand - totalCapacity);
        const percentageShortfall = totalCapacity > 0 ? 
          (totalGap / totalCapacity) * 100 : 0;
        
        // Determine when capacity threshold is exceeded
        const thresholdExceededDate = determineThresholdExceededDate(
          forecast.timePeriod,
          totalDemand,
          totalCapacity
        );
        
        // Estimate business impact
        const businessImpact = estimateBusinessImpact(totalGap, percentageShortfall);
        
        // Create gap analysis
        gapAnalyses.push({
          scenarioName,
          timePeriod: forecast.timePeriod,
          terminalArea,
          gapByAircraftType,
          totalCapacityGap: totalGap,
          percentageShortfall,
          estimatedBusinessImpact: businessImpact,
          thresholdExceededDate
        });
      });
    });
  });
  
  // Sort by time period (ascending)
  gapAnalyses.sort((a, b) => 
    new Date(a.timePeriod.start).getTime() - new Date(b.timePeriod.start).getTime()
  );
  
  return gapAnalyses;
};

/**
 * Groups forecasts by terminal area and time period for easier lookup
 */
const groupForecasts = (
  forecasts: CapacityForecast[]
): Record<string, Record<string, CapacityForecast>> => {
  const grouped: Record<string, Record<string, CapacityForecast>> = {};
  
  forecasts.forEach(forecast => {
    // Initialize terminal area if not exists
    if (!grouped[forecast.terminalArea]) {
      grouped[forecast.terminalArea] = {};
    }
    
    // Use time period as key
    const periodKey = `${forecast.timePeriod.start}|${forecast.timePeriod.end}`;
    grouped[forecast.terminalArea][periodKey] = forecast;
  });
  
  return grouped;
};

/**
 * Groups demand projections by scenario and time period for easier lookup
 */
const groupDemandProjections = (
  projections: DemandProjection[]
): Record<string, Record<string, DemandProjection>> => {
  const grouped: Record<string, Record<string, DemandProjection>> = {};
  
  projections.forEach(projection => {
    // Initialize scenario if not exists
    if (!grouped[projection.scenarioName]) {
      grouped[projection.scenarioName] = {};
    }
    
    // Use time period as key
    const periodKey = `${projection.timePeriod.start}|${projection.timePeriod.end}`;
    grouped[projection.scenarioName][periodKey] = projection;
  });
  
  return grouped;
};

/**
 * Determines when capacity threshold is exceeded during the period
 */
const determineThresholdExceededDate = (
  period: {start: string, end: string},
  demand: number,
  capacity: number
): string | null => {
  // If demand doesn't exceed capacity, return null
  if (demand <= capacity) {
    return null;
  }
  
  // For simplicity, assume linear growth in demand throughout the period
  const periodStart = new Date(period.start);
  const periodEnd = new Date(period.end);
  
  // Calculate months in the period
  const monthsInPeriod = differenceInMonths(periodEnd, periodStart) + 1;
  
  if (monthsInPeriod <= 1) {
    // If period is a month or less, assume threshold exceeded at the start
    return period.start;
  }
  
  // Calculate when threshold is exceeded (linear approximation)
  const excessDemandRatio = capacity / demand;
  const monthsUntilExceeded = Math.floor(excessDemandRatio * monthsInPeriod);
  
  // Calculate exceeded date
  const exceededDate = new Date(periodStart);
  exceededDate.setMonth(exceededDate.getMonth() + monthsUntilExceeded);
  
  return format(exceededDate, "yyyy-MM-dd'T'HH:mm:ss");
};

/**
 * Estimates business impact based on capacity gap
 */
const estimateBusinessImpact = (
  capacityGap: number,
  percentageShortfall: number
): string => {
  // Simple categorization of business impact
  if (capacityGap === 0) {
    return "No impact - capacity is sufficient";
  } else if (capacityGap < 10 || percentageShortfall < 5) {
    return "Low impact - minor capacity shortfall";
  } else if (capacityGap < 50 || percentageShortfall < 15) {
    return "Medium impact - noticeable capacity shortfall";
  } else if (capacityGap < 100 || percentageShortfall < 30) {
    return "High impact - significant capacity shortfall";
  } else {
    return "Critical impact - severe capacity shortfall";
  }
}; 