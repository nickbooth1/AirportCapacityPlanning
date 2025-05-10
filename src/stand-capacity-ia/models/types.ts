/**
 * Represents historical flight data
 */
export interface HistoricalFlightData {
  flightID: string;
  aircraftTypeID: string;
  arrivalTime: string;
  departureTime: string;
  assignedStandID: string;
  turnaroundDuration: number; // in minutes
}

/**
 * Represents a time range
 */
export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Represents historical stand capacity data
 */
export interface HistoricalStandCapacityData {
  date: string;
  timeSlotStart: string;
  timeSlotEnd: string;
  standID: string;
  plannedCapacityByAircraftType: Record<string, number>;
  actualCapacityByAircraftType: Record<string, number>;
  capacityLimitingFactors: string[];
}

/**
 * Represents stand utilization metrics
 */
export interface StandUtilizationMetrics {
  standID: string;
  utilizationRate: number; // 0.0-1.0
  peakUtilizationPeriods: TimeRange[];
  idlePeriods: TimeRange[];
  optimalAircraftTypeUtilization: Record<string, number>;
  suboptimalAllocationInstances: number;
}

/**
 * Represents adjacency impact metrics
 */
export interface AdjacencyImpactMetrics {
  primaryStandID: string;
  affectedStandID: string;
  occurrenceCount: number;
  totalDurationAffected: number; // in minutes
  estimatedLostCapacity: number; // number of potential flights
  mostCommonTriggerAircraftType: string;
}

/**
 * Represents optimization recommendations
 */
export interface OptimizationRecommendation {
  recommendationID: string;
  recommendationType: 'REALLOCATION' | 'RULE_MODIFICATION' | 'SCHEDULE_ADJUSTMENT';
  description: string;
  estimatedCapacityGain: number; // flights per day
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedStands: string[];
  affectedTimeSlots: TimeRange[];
}

/**
 * Represents stand configuration data
 */
export interface StandData {
  standID: string;
  baseCompatibleAircraftTypeIDs: string[];
}

/**
 * Represents aircraft type data
 */
export interface AircraftTypeData {
  aircraftTypeID: string;
  averageTurnaroundMinutes: number;
}

/**
 * Represents stand adjacency rules
 */
export interface StandAdjacencyRule {
  primaryStandID: string;
  aircraftTypeTrigger: string | string[];
  affectedStandID: string;
  restrictionType: 'NO_USE_AFFECTED_STAND' | 'MAX_AIRCRAFT_SIZE_REDUCED_TO' | 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND';
  restrictedToAircraftTypeOrSize?: string;
  notes?: string;
}

/**
 * Represents operational settings
 */
export interface OperationalSettings {
  gapBetweenFlightsMinutes: number;
  slotDurationMinutes: number;
  operatingDayStartTime: string;
  operatingDayEndTime: string;
} 