import { 
  HistoricalFlightData, 
  StandAdjacencyRule, 
  AdjacencyImpactMetrics
} from '../models/types';
import { isWithinInterval, differenceInMinutes } from 'date-fns';

/**
 * Analyzes the impact of adjacency rules on stand capacity
 */
export const analyzeAdjacencyImpact = (
  flights: HistoricalFlightData[],
  adjacencyRules: StandAdjacencyRule[]
): AdjacencyImpactMetrics[] => {
  const metrics: AdjacencyImpactMetrics[] = [];
  
  // Group flights by stand
  const flightsByStand = new Map<string, HistoricalFlightData[]>();
  flights.forEach(flight => {
    const standFlights = flightsByStand.get(flight.assignedStandID) || [];
    standFlights.push(flight);
    flightsByStand.set(flight.assignedStandID, standFlights);
  });
  
  // Process each adjacency rule
  adjacencyRules.forEach(rule => {
    // Skip if we don't have flights for either primary or affected stand
    if (!flightsByStand.has(rule.primaryStandID) || !flightsByStand.has(rule.affectedStandID)) {
      return;
    }
    
    const primaryStandFlights = flightsByStand.get(rule.primaryStandID)!;
    const affectedStandFlights = flightsByStand.get(rule.affectedStandID)!;
    
    // Get flights of triggering aircraft types
    const triggerTypes = Array.isArray(rule.aircraftTypeTrigger) 
      ? rule.aircraftTypeTrigger 
      : [rule.aircraftTypeTrigger];
    
    const triggeringFlights = primaryStandFlights.filter(flight => 
      triggerTypes.includes(flight.aircraftTypeID)
    );
    
    if (triggeringFlights.length === 0) {
      return; // No triggering flights for this rule
    }
    
    // Count impact instances and duration
    let occurrenceCount = 0;
    let totalDurationAffected = 0;
    let estimatedLostCapacity = 0;
    
    // Create a frequency map for trigger aircraft types
    const triggerTypeFrequency: Record<string, number> = {};
    
    // Analyze impact based on rule type
    triggeringFlights.forEach(triggerFlight => {
      const triggerArrival = new Date(triggerFlight.arrivalTime);
      const triggerDeparture = new Date(triggerFlight.departureTime);
      
      // Count trigger aircraft type frequency
      triggerTypeFrequency[triggerFlight.aircraftTypeID] = 
        (triggerTypeFrequency[triggerFlight.aircraftTypeID] || 0) + 1;
      
      // Check for affected stand flights that would be impacted
      const impactedFlights = affectedStandFlights.filter(flight => {
        const flightArrival = new Date(flight.arrivalTime);
        const flightDeparture = new Date(flight.departureTime);
        
        // Check for time overlap
        return isTimeOverlap(triggerArrival, triggerDeparture, flightArrival, flightDeparture);
      });
      
      if (impactedFlights.length > 0) {
        occurrenceCount++;
        
        // Calculate total impacted duration
        impactedFlights.forEach(flight => {
          const flightArrival = new Date(flight.arrivalTime);
          const flightDeparture = new Date(flight.departureTime);
          
          // Calculate overlap duration
          const overlapDuration = calculateOverlapDuration(
            triggerArrival, 
            triggerDeparture, 
            flightArrival, 
            flightDeparture
          );
          
          totalDurationAffected += overlapDuration;
          
          // Estimate lost capacity
          if (rule.restrictionType === 'NO_USE_AFFECTED_STAND') {
            // Each impacted flight is a lost capacity
            estimatedLostCapacity++;
          } else if (
            rule.restrictionType === 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND' &&
            flight.aircraftTypeID === rule.restrictedToAircraftTypeOrSize
          ) {
            // Only count if the actual flight was of the prohibited type
            estimatedLostCapacity++;
          }
          // For MAX_AIRCRAFT_SIZE_REDUCED_TO, we can't easily determine lost capacity
          // without knowing all compatible types for the stand
        });
      }
    });
    
    // Find most common trigger aircraft type
    let mostCommonTriggerType = '';
    let highestFrequency = 0;
    
    Object.entries(triggerTypeFrequency).forEach(([type, frequency]) => {
      if (frequency > highestFrequency) {
        highestFrequency = frequency;
        mostCommonTriggerType = type;
      }
    });
    
    // Add metrics for this rule
    metrics.push({
      primaryStandID: rule.primaryStandID,
      affectedStandID: rule.affectedStandID,
      occurrenceCount,
      totalDurationAffected,
      estimatedLostCapacity,
      mostCommonTriggerAircraftType: mostCommonTriggerType
    });
  });
  
  return metrics;
};

/**
 * Checks if two time ranges overlap
 */
const isTimeOverlap = (
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean => {
  return (start1 <= end2 && start2 <= end1);
};

/**
 * Calculates the duration of overlap between two time ranges in minutes
 */
const calculateOverlapDuration = (
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): number => {
  if (!isTimeOverlap(start1, end1, start2, end2)) {
    return 0;
  }
  
  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;
  
  return differenceInMinutes(overlapEnd, overlapStart);
}; 