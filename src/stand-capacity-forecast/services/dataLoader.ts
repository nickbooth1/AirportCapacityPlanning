import fs from 'fs-extra';
import path from 'path';
import { 
  ForecastParameters,
  InfrastructureChange,
  HistoricalCapacityData,
  StandData,
  AircraftTypeData,
  AirlineGrowthProjection,
  MarketForecast,
  OperationalSettings
} from '../models/types';

/**
 * Loads forecast parameters from JSON file
 */
export const loadForecastParameters = async (filePath: string): Promise<ForecastParameters> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate required fields
    if (data.timeHorizon === undefined ||
        !data.intervalGranularity ||
        !Array.isArray(data.growthScenarios) ||
        data.confidenceLevel === undefined ||
        !data.seasonalFactors ||
        data.disruptionAllowance === undefined) {
      throw new Error('Forecast parameters missing required fields');
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load forecast parameters: ${error.message}`);
    }
    throw new Error('Failed to load forecast parameters: Unknown error');
  }
};

/**
 * Loads infrastructure changes from JSON file
 */
export const loadInfrastructureChanges = async (filePath: string): Promise<InfrastructureChange[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Infrastructure changes data must be an array');
    }
    
    // Validate each change has required fields
    data.forEach((change, index) => {
      if (!change.changeID || !change.changeType || !Array.isArray(change.affectedStandIDs) || 
          !change.startDate || !change.capacityImpactByAircraftType) {
        throw new Error(`Infrastructure change at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load infrastructure changes: ${error.message}`);
    }
    throw new Error('Failed to load infrastructure changes: Unknown error');
  }
};

/**
 * Loads historical capacity data from JSON file
 */
export const loadHistoricalCapacityData = async (filePath: string): Promise<HistoricalCapacityData[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Historical capacity data must be an array');
    }
    
    // Validate each record has required fields
    data.forEach((record, index) => {
      if (!record.date || !record.timeSlotStart || !record.timeSlotEnd || 
          !record.terminalArea || !record.capacityByAircraftType || 
          !record.actualUtilizationByAircraftType) {
        throw new Error(`Historical capacity record at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load historical capacity data: ${error.message}`);
    }
    throw new Error('Failed to load historical capacity data: Unknown error');
  }
};

/**
 * Loads stand data from JSON file
 */
export const loadStandData = async (filePath: string): Promise<StandData[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Stand data must be an array');
    }
    
    // Validate each stand has required fields
    data.forEach((stand, index) => {
      if (!stand.standID || !stand.terminalArea || !Array.isArray(stand.baseCompatibleAircraftTypeIDs)) {
        throw new Error(`Stand at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load stand data: ${error.message}`);
    }
    throw new Error('Failed to load stand data: Unknown error');
  }
};

/**
 * Loads aircraft type data from JSON file
 */
export const loadAircraftTypeData = async (filePath: string): Promise<AircraftTypeData[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Aircraft type data must be an array');
    }
    
    // Validate each aircraft type has required fields
    data.forEach((aircraftType, index) => {
      if (!aircraftType.aircraftTypeID || aircraftType.averageTurnaroundMinutes === undefined || 
          !aircraftType.sizeCategory || aircraftType.currentFleetSize === undefined) {
        throw new Error(`Aircraft type at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load aircraft type data: ${error.message}`);
    }
    throw new Error('Failed to load aircraft type data: Unknown error');
  }
};

/**
 * Loads airline growth projections from JSON file
 */
export const loadAirlineGrowthProjections = async (filePath: string): Promise<AirlineGrowthProjection[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Airline growth projections data must be an array');
    }
    
    // Validate each projection has required fields
    data.forEach((projection, index) => {
      if (!projection.airlineCode || projection.baseYearFlights === undefined || 
          !projection.projectedGrowthByYear || !projection.fleetEvolution) {
        throw new Error(`Airline growth projection at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load airline growth projections: ${error.message}`);
    }
    throw new Error('Failed to load airline growth projections: Unknown error');
  }
};

/**
 * Loads market forecasts from JSON file
 */
export const loadMarketForecasts = async (filePath: string): Promise<MarketForecast[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Market forecasts data must be an array');
    }
    
    // Validate each forecast has required fields
    data.forEach((forecast, index) => {
      if (!forecast.market || forecast.baseYearPassengers === undefined || 
          forecast.baseYearFlights === undefined || !forecast.projectedGrowthByYear || 
          !forecast.seasonalDistribution) {
        throw new Error(`Market forecast at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load market forecasts: ${error.message}`);
    }
    throw new Error('Failed to load market forecasts: Unknown error');
  }
};

/**
 * Loads operational settings from JSON file
 */
export const loadOperationalSettings = async (filePath: string): Promise<OperationalSettings> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate required fields
    if (data.gapBetweenFlightsMinutes === undefined || 
        data.slotDurationMinutes === undefined ||
        !data.operatingDayStartTime ||
        !data.operatingDayEndTime) {
      throw new Error('Operational settings missing required fields');
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load operational settings: ${error.message}`);
    }
    throw new Error('Failed to load operational settings: Unknown error');
  }
}; 