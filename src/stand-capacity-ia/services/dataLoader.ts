import fs from 'fs-extra';
import path from 'path';
import { 
  HistoricalFlightData, 
  StandData, 
  AircraftTypeData, 
  StandAdjacencyRule,
  OperationalSettings
} from '../models/types';

/**
 * Loads historical flight data from JSON file
 */
export const loadHistoricalFlightData = async (filePath: string): Promise<HistoricalFlightData[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Historical flight data must be an array');
    }
    
    // Validate each flight has required fields
    data.forEach((flight, index) => {
      if (!flight.flightID || !flight.aircraftTypeID || !flight.arrivalTime || 
          !flight.departureTime || !flight.assignedStandID) {
        throw new Error(`Flight at index ${index} is missing required fields`);
      }
      
      // Calculate turnaround duration if not provided
      if (flight.turnaroundDuration === undefined) {
        const arrivalTime = new Date(flight.arrivalTime);
        const departureTime = new Date(flight.departureTime);
        flight.turnaroundDuration = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60));
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load historical flight data: ${error.message}`);
    }
    throw new Error('Failed to load historical flight data: Unknown error');
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
      if (!stand.standID || !Array.isArray(stand.baseCompatibleAircraftTypeIDs)) {
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
      if (!aircraftType.aircraftTypeID || aircraftType.averageTurnaroundMinutes === undefined) {
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
 * Loads stand adjacency rules from JSON file
 */
export const loadStandAdjacencyRules = async (filePath: string): Promise<StandAdjacencyRule[]> => {
  try {
    const data = await fs.readJSON(filePath);
    
    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('Stand adjacency rules data must be an array');
    }
    
    // Validate each rule has required fields
    data.forEach((rule, index) => {
      if (!rule.primaryStandID || !rule.aircraftTypeTrigger || 
          !rule.affectedStandID || !rule.restrictionType) {
        throw new Error(`Adjacency rule at index ${index} is missing required fields`);
      }
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load stand adjacency rules: ${error.message}`);
    }
    throw new Error('Failed to load stand adjacency rules: Unknown error');
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