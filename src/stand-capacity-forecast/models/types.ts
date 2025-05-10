/**
 * Represents forecast configuration parameters
 */
export interface ForecastParameters {
  timeHorizon: number; // years
  intervalGranularity: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  growthScenarios: string[]; // e.g., "CONSERVATIVE", "MODERATE", "AGGRESSIVE"
  confidenceLevel: number; // 0.0-1.0
  seasonalFactors: Record<string, number>; // <Month, factor>
  disruptionAllowance: number; // percentage buffer
}

/**
 * Represents a time range
 */
export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Represents planned infrastructure changes
 */
export interface InfrastructureChange {
  changeID: string;
  changeType: 'NEW_STAND' | 'CLOSURE' | 'RECONFIGURATION' | 'MAINTENANCE';
  affectedStandIDs: string[];
  startDate: string;
  endDate: string | null; // null for permanent changes
  capacityImpactByAircraftType: Record<string, number>;
  description: string;
}

/**
 * Represents demand projection data
 */
export interface DemandProjection {
  scenarioName: string;
  timePeriod: TimeRange;
  projectedFlightsByAircraftType: Record<string, number>;
  growthRateFromBaseline: number; // percentage
  confidenceInterval: Record<string, number>; // e.g., "LOWER": 0.85, "UPPER": 1.15
  driverAssumptions: Record<string, string>; // key assumptions behind projection
}

/**
 * Represents forecasted capacity data
 */
export interface CapacityForecast {
  timePeriod: TimeRange;
  terminalArea: string;
  baselineCapacityByAircraftType: Record<string, number>;
  forecastedCapacityByAircraftType: Record<string, number>;
  appliedInfrastructureChanges: string[]; // ChangeIDs
  capacityChangeFromBaseline: number; // percentage
  limitingFactors: string[];
}

/**
 * Represents capacity gap analysis
 */
export interface CapacityGapAnalysis {
  scenarioName: string;
  timePeriod: TimeRange;
  terminalArea: string;
  gapByAircraftType: Record<string, number>;
  totalCapacityGap: number; // flight movements
  percentageShortfall: number;
  estimatedBusinessImpact: string;
  thresholdExceededDate: string | null;
}

/**
 * Represents mitigation strategy
 */
export interface MitigationStrategy {
  strategyID: string;
  strategyType: 'INFRASTRUCTURE' | 'SCHEDULING' | 'RULE_MODIFICATION';
  description: string;
  implementationTimeline: TimeRange[];
  estimatedCapacityGain: Record<string, number>; // <AircraftType, capacity>
  costEstimate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  prerequisites: string[];
  recommendedImplementationDate: string;
}

/**
 * Represents historical capacity data
 */
export interface HistoricalCapacityData {
  date: string;
  timeSlotStart: string;
  timeSlotEnd: string;
  terminalArea: string;
  capacityByAircraftType: Record<string, number>;
  actualUtilizationByAircraftType: Record<string, number>;
}

/**
 * Represents stand configuration data
 */
export interface StandData {
  standID: string;
  terminalArea: string;
  baseCompatibleAircraftTypeIDs: string[];
}

/**
 * Represents aircraft type data
 */
export interface AircraftTypeData {
  aircraftTypeID: string;
  averageTurnaroundMinutes: number;
  sizeCategory: string; // e.g., "NARROW_BODY", "WIDE_BODY"
  currentFleetSize: number;
  projectedRetirements: Record<string, number>; // <Year, count>
  projectedAdditions: Record<string, number>; // <Year, count>
}

/**
 * Represents airline growth projection
 */
export interface AirlineGrowthProjection {
  airlineCode: string;
  baseYearFlights: number;
  projectedGrowthByYear: Record<string, number>; // <Year, growth percentage>
  fleetEvolution: Record<string, Record<string, number>>; // <Year, <AircraftType, count>>
}

/**
 * Represents market forecast data
 */
export interface MarketForecast {
  market: string; // e.g., "DOMESTIC", "EUROPE", "LONG_HAUL"
  baseYearPassengers: number;
  baseYearFlights: number;
  projectedGrowthByYear: Record<string, number>; // <Year, growth percentage>
  seasonalDistribution: Record<string, number>; // <Month, percentage>
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