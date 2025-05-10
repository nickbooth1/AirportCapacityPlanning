import { 
  StandUtilizationMetrics,
  AdjacencyImpactMetrics,
  OptimizationRecommendation,
  StandData,
  AircraftTypeData
} from '../models/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates optimization recommendations based on analysis data
 */
export const generateRecommendations = (
  utilizationMetrics: StandUtilizationMetrics[],
  adjacencyImpactMetrics: AdjacencyImpactMetrics[],
  stands: StandData[],
  aircraftTypes: AircraftTypeData[]
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];
  
  // Add underutilization recommendations
  recommendations.push(...generateUnderutilizationRecommendations(utilizationMetrics));
  
  // Add suboptimal allocation recommendations
  recommendations.push(...generateSuboptimalAllocationRecommendations(utilizationMetrics, stands));
  
  // Add adjacency rule modification recommendations
  recommendations.push(...generateAdjacencyRuleRecommendations(adjacencyImpactMetrics));
  
  // Add schedule optimization recommendations
  recommendations.push(...generateScheduleOptimizationRecommendations(utilizationMetrics));
  
  // Sort recommendations by estimated capacity gain (descending)
  recommendations.sort((a, b) => b.estimatedCapacityGain - a.estimatedCapacityGain);
  
  return recommendations;
};

/**
 * Generates recommendations for underutilized stands
 */
const generateUnderutilizationRecommendations = (
  utilizationMetrics: StandUtilizationMetrics[]
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];
  
  // Set threshold for underutilization
  const lowUtilizationThreshold = 0.3; // 30%
  
  // Find significantly underutilized stands
  const underutilizedStands = utilizationMetrics.filter(metric => 
    metric.utilizationRate < lowUtilizationThreshold
  );
  
  if (underutilizedStands.length > 0) {
    // Group stands by similar utilization levels
    const utilBuckets: Record<string, StandUtilizationMetrics[]> = {};
    
    underutilizedStands.forEach(standMetric => {
      // Round to nearest 5%
      const utilBucket = Math.floor(standMetric.utilizationRate * 20) / 20;
      const bucketKey = utilBucket.toFixed(2);
      
      if (!utilBuckets[bucketKey]) {
        utilBuckets[bucketKey] = [];
      }
      
      utilBuckets[bucketKey].push(standMetric);
    });
    
    // Generate recommendations for each bucket
    Object.entries(utilBuckets).forEach(([bucketKey, stands]) => {
      const utilizationPercent = Math.round(parseFloat(bucketKey) * 100);
      const standIDs = stands.map(s => s.standID);
      
      // Estimate capacity gain - simplified assumption
      const estimatedCapacityGain = stands.length * 2; // Assume 2 flights per stand
      
      recommendations.push({
        recommendationID: uuidv4(),
        recommendationType: 'REALLOCATION',
        description: `Repurpose or reallocate ${standIDs.length} underutilized stands (${utilizationPercent}% utilization): ${standIDs.join(', ')}`,
        estimatedCapacityGain,
        implementationComplexity: 'MEDIUM',
        affectedStands: standIDs,
        affectedTimeSlots: [] // This would typically include time periods
      });
    });
  }
  
  return recommendations;
};

/**
 * Generates recommendations for suboptimal aircraft allocations
 */
const generateSuboptimalAllocationRecommendations = (
  utilizationMetrics: StandUtilizationMetrics[],
  stands: StandData[]
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];
  
  // Set threshold for suboptimal allocations
  const suboptimalThreshold = 5; // At least 5 suboptimal allocations
  
  // Find stands with significant suboptimal allocations
  const suboptimalStands = utilizationMetrics.filter(metric => 
    metric.suboptimalAllocationInstances >= suboptimalThreshold
  );
  
  if (suboptimalStands.length > 0) {
    // Generate recommendations for suboptimal stands
    suboptimalStands.forEach(standMetric => {
      // Find stand data for this stand
      const standData = stands.find(s => s.standID === standMetric.standID);
      
      if (!standData) return;
      
      // Find optimal aircraft types with low utilization
      const optimalTypes = Object.entries(standMetric.optimalAircraftTypeUtilization)
        .filter(([_, utilization]) => utilization < 0.3) // Less than 30% utilization
        .map(([type]) => type);
      
      if (optimalTypes.length > 0) {
        // Estimate capacity gain - assume 50% of suboptimal allocations could be better allocated
        const estimatedCapacityGain = Math.ceil(standMetric.suboptimalAllocationInstances * 0.5);
        
        recommendations.push({
          recommendationID: uuidv4(),
          recommendationType: 'REALLOCATION',
          description: `Improve aircraft type allocation for stand ${standMetric.standID} (${standMetric.suboptimalAllocationInstances} suboptimal allocations). Increase usage of compatible types: ${optimalTypes.join(', ')}`,
          estimatedCapacityGain,
          implementationComplexity: 'LOW',
          affectedStands: [standMetric.standID],
          affectedTimeSlots: [] // This would typically include time periods
        });
      }
    });
  }
  
  return recommendations;
};

/**
 * Generates recommendations for adjacency rule modifications
 */
const generateAdjacencyRuleRecommendations = (
  adjacencyMetrics: AdjacencyImpactMetrics[]
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];
  
  // Set threshold for high-impact adjacency rules
  const highImpactThreshold = 10; // At least 10 lost capacity
  
  // Find high-impact adjacency rules
  const highImpactRules = adjacencyMetrics.filter(metric => 
    metric.estimatedLostCapacity >= highImpactThreshold
  );
  
  if (highImpactRules.length > 0) {
    // Sort by estimated lost capacity (descending)
    highImpactRules.sort((a, b) => b.estimatedLostCapacity - a.estimatedLostCapacity);
    
    // Generate recommendations for top impactful rules
    highImpactRules.slice(0, 5).forEach(ruleMetric => {
      recommendations.push({
        recommendationID: uuidv4(),
        recommendationType: 'RULE_MODIFICATION',
        description: `Modify adjacency rule between stands ${ruleMetric.primaryStandID} and ${ruleMetric.affectedStandID}. Current impact: ${ruleMetric.estimatedLostCapacity} lost flights, triggered most often by ${ruleMetric.mostCommonTriggerAircraftType}`,
        estimatedCapacityGain: ruleMetric.estimatedLostCapacity,
        implementationComplexity: 'HIGH',
        affectedStands: [ruleMetric.primaryStandID, ruleMetric.affectedStandID],
        affectedTimeSlots: [] // This would typically include time periods
      });
    });
  }
  
  return recommendations;
};

/**
 * Generates recommendations for schedule optimization
 */
const generateScheduleOptimizationRecommendations = (
  utilizationMetrics: StandUtilizationMetrics[]
): OptimizationRecommendation[] => {
  const recommendations: OptimizationRecommendation[] = [];
  
  // Group stands by utilization rate
  const highUtilizationStands = utilizationMetrics.filter(metric => metric.utilizationRate > 0.8);
  
  if (highUtilizationStands.length > 0) {
    // Look for stands with both peak periods and idle periods
    const standsWithPeaksAndIdles = highUtilizationStands.filter(
      metric => metric.peakUtilizationPeriods.length > 0 && metric.idlePeriods.length > 0
    );
    
    if (standsWithPeaksAndIdles.length > 0) {
      // Generate recommendation for schedule optimization
      const standIDs = standsWithPeaksAndIdles.map(s => s.standID);
      
      // Estimate capacity gain - simplified assumption
      const estimatedCapacityGain = standsWithPeaksAndIdles.length; // One flight per stand
      
      recommendations.push({
        recommendationID: uuidv4(),
        recommendationType: 'SCHEDULE_ADJUSTMENT',
        description: `Optimize flight schedules for ${standIDs.length} high-utilization stands with uneven usage patterns: ${standIDs.join(', ')}. Redistribute flights from peak periods to idle periods.`,
        estimatedCapacityGain,
        implementationComplexity: 'MEDIUM',
        affectedStands: standIDs,
        affectedTimeSlots: [] // This would be populated with actual time periods
      });
    }
  }
  
  return recommendations;
}; 