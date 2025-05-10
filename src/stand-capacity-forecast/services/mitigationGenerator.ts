import { 
  CapacityGapAnalysis,
  MitigationStrategy,
  TimeRange
} from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { 
  addMonths, 
  addQuarters, 
  format, 
  parse,
  compareAsc
} from 'date-fns';

/**
 * Generates mitigation strategies for identified capacity gaps
 */
export const generateMitigationStrategies = (
  gapAnalyses: CapacityGapAnalysis[]
): MitigationStrategy[] => {
  const strategies: MitigationStrategy[] = [];
  
  // Early exit if no gaps to analyze
  if (gapAnalyses.length === 0) {
    return strategies;
  }
  
  // Sort gap analyses by date and gap size (most significant first)
  const sortedGaps = [...gapAnalyses].sort((a, b) => {
    // First sort by date
    const dateComparison = compareAsc(
      new Date(a.timePeriod.start),
      new Date(b.timePeriod.start)
    );
    
    if (dateComparison !== 0) {
      return dateComparison;
    }
    
    // Then by gap size (descending)
    return b.totalCapacityGap - a.totalCapacityGap;
  });
  
  // Group analyses by terminal area for strategic planning
  const gapsByTerminal: Record<string, CapacityGapAnalysis[]> = {};
  
  sortedGaps.forEach(gap => {
    if (!gapsByTerminal[gap.terminalArea]) {
      gapsByTerminal[gap.terminalArea] = [];
    }
    gapsByTerminal[gap.terminalArea].push(gap);
  });
  
  // Generate strategies for each terminal area
  Object.entries(gapsByTerminal).forEach(([terminalArea, gaps]) => {
    // Group gaps by scenario for consistent strategy generation
    const gapsByScenario: Record<string, CapacityGapAnalysis[]> = {};
    
    gaps.forEach(gap => {
      if (!gapsByScenario[gap.scenarioName]) {
        gapsByScenario[gap.scenarioName] = [];
      }
      gapsByScenario[gap.scenarioName].push(gap);
    });
    
    // Process each scenario
    Object.entries(gapsByScenario).forEach(([scenarioName, scenarioGaps]) => {
      if (scenarioGaps.length === 0) return;
      
      // Generate strategies based on scenario and terminal
      strategies.push(...generateInfrastructureStrategies(scenarioName, terminalArea, scenarioGaps));
      strategies.push(...generateSchedulingStrategies(scenarioName, terminalArea, scenarioGaps));
      strategies.push(...generateRuleModificationStrategies(scenarioName, terminalArea, scenarioGaps));
    });
  });
  
  return strategies;
};

/**
 * Generates infrastructure-based mitigation strategies
 */
const generateInfrastructureStrategies = (
  scenarioName: string,
  terminalArea: string,
  gaps: CapacityGapAnalysis[]
): MitigationStrategy[] => {
  const strategies: MitigationStrategy[] = [];
  
  // Find the first and most significant gap
  const firstGap = gaps[0];
  const mostSignificantGap = [...gaps].sort((a, b) => 
    b.totalCapacityGap - a.totalCapacityGap
  )[0];
  
  // Get the aircraft types with the largest gaps
  const aircraftGaps = Object.entries(mostSignificantGap.gapByAircraftType)
    .filter(([_, gap]) => gap > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (aircraftGaps.length === 0) {
    return strategies; // No gaps to address
  }
  
  // Strategy 1: New stand construction
  if (mostSignificantGap.totalCapacityGap >= 10) {
    const newStandStrategy: MitigationStrategy = {
      strategyID: uuidv4(),
      strategyType: 'INFRASTRUCTURE',
      description: `Construct new stands in ${terminalArea} to address capacity shortfall for ${
        aircraftGaps.slice(0, 3).map(([type]) => type).join(', ')
      } aircraft.`,
      implementationTimeline: [
        {
          start: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(addMonths(new Date(), 18), "yyyy-MM-dd'T'HH:mm:ss")
        }
      ],
      estimatedCapacityGain: {},
      costEstimate: estimateNewStandCost(aircraftGaps),
      riskLevel: 'MEDIUM',
      prerequisites: ['Environmental approval', 'Capital budget allocation'],
      recommendedImplementationDate: firstGap.thresholdExceededDate ? 
        format(addMonths(new Date(firstGap.thresholdExceededDate), -18), "yyyy-MM-dd'T'HH:mm:ss") :
        format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
    };
    
    // Set estimated capacity gain for relevant aircraft types
    aircraftGaps.forEach(([aircraftType, gap]) => {
      const recommendedStands = Math.ceil(gap / 10); // Rough estimate: 1 stand = 10 movements
      const capacityGain = recommendedStands * 10;
      newStandStrategy.estimatedCapacityGain[aircraftType] = capacityGain;
    });
    
    strategies.push(newStandStrategy);
  }
  
  // Strategy 2: Stand reconfiguration
  if (aircraftGaps.some(([_, gap]) => gap > 5)) {
    const reconfigStrategy: MitigationStrategy = {
      strategyID: uuidv4(),
      strategyType: 'INFRASTRUCTURE',
      description: `Reconfigure existing stands in ${terminalArea} to better accommodate ${
        aircraftGaps.slice(0, 2).map(([type]) => type).join(' and ')
      } aircraft.`,
      implementationTimeline: [
        {
          start: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(addMonths(new Date(), 6), "yyyy-MM-dd'T'HH:mm:ss")
        }
      ],
      estimatedCapacityGain: {},
      costEstimate: 2500000, // $2.5M estimate
      riskLevel: 'LOW',
      prerequisites: ['Operational impact assessment', 'Engineering feasibility study'],
      recommendedImplementationDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
    };
    
    // Set modest capacity gains for relevant aircraft types
    aircraftGaps.forEach(([aircraftType, gap]) => {
      reconfigStrategy.estimatedCapacityGain[aircraftType] = Math.min(gap, 5);
    });
    
    strategies.push(reconfigStrategy);
  }
  
  return strategies;
};

/**
 * Generates scheduling-based mitigation strategies
 */
const generateSchedulingStrategies = (
  scenarioName: string,
  terminalArea: string,
  gaps: CapacityGapAnalysis[]
): MitigationStrategy[] => {
  const strategies: MitigationStrategy[] = [];
  
  // Skip if no gaps
  if (gaps.length === 0) {
    return strategies;
  }
  
  const mostSignificantGap = [...gaps].sort((a, b) => 
    b.totalCapacityGap - a.totalCapacityGap
  )[0];
  
  // Strategy: Schedule optimization
  if (mostSignificantGap.totalCapacityGap > 0) {
    const scheduleStrategy: MitigationStrategy = {
      strategyID: uuidv4(),
      strategyType: 'SCHEDULING',
      description: `Optimize flight schedules in ${terminalArea} to reduce peak demand and better distribute flights throughout the day.`,
      implementationTimeline: [
        {
          start: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(addMonths(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss")
        }
      ],
      estimatedCapacityGain: {},
      costEstimate: 500000, // $500K estimate
      riskLevel: 'LOW',
      prerequisites: ['Airline coordination', 'Slot allocation review'],
      recommendedImplementationDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
    };
    
    // Estimate capacity gains at about 10% of total gap for each aircraft type
    Object.entries(mostSignificantGap.gapByAircraftType)
      .filter(([_, gap]) => gap > 0)
      .forEach(([aircraftType, gap]) => {
        scheduleStrategy.estimatedCapacityGain[aircraftType] = Math.ceil(gap * 0.1);
      });
    
    strategies.push(scheduleStrategy);
  }
  
  // Strategy: Incentivize off-peak operations
  if (mostSignificantGap.totalCapacityGap >= 15) {
    const incentiveStrategy: MitigationStrategy = {
      strategyID: uuidv4(),
      strategyType: 'SCHEDULING',
      description: `Implement incentive program to shift operations to off-peak periods in ${terminalArea}.`,
      implementationTimeline: [
        {
          start: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(addMonths(new Date(), 6), "yyyy-MM-dd'T'HH:mm:ss")
        }
      ],
      estimatedCapacityGain: {},
      costEstimate: 1500000, // $1.5M estimate for incentive program
      riskLevel: 'MEDIUM',
      prerequisites: ['Financial modeling', 'Airline agreement'],
      recommendedImplementationDate: format(addMonths(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss")
    };
    
    // Estimate capacity gains at about 15% of total gap for each aircraft type
    Object.entries(mostSignificantGap.gapByAircraftType)
      .filter(([_, gap]) => gap > 0)
      .forEach(([aircraftType, gap]) => {
        incentiveStrategy.estimatedCapacityGain[aircraftType] = Math.ceil(gap * 0.15);
      });
    
    strategies.push(incentiveStrategy);
  }
  
  return strategies;
};

/**
 * Generates rule modification strategies
 */
const generateRuleModificationStrategies = (
  scenarioName: string,
  terminalArea: string,
  gaps: CapacityGapAnalysis[]
): MitigationStrategy[] => {
  const strategies: MitigationStrategy[] = [];
  
  // Skip if no gaps
  if (gaps.length === 0) {
    return strategies;
  }
  
  const mostSignificantGap = [...gaps].sort((a, b) => 
    b.totalCapacityGap - a.totalCapacityGap
  )[0];
  
  // Strategy: Adjacency rule review
  if (mostSignificantGap.totalCapacityGap > 0) {
    const ruleStrategy: MitigationStrategy = {
      strategyID: uuidv4(),
      strategyType: 'RULE_MODIFICATION',
      description: `Review and optimize stand adjacency rules in ${terminalArea} to increase operational flexibility.`,
      implementationTimeline: [
        {
          start: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(addMonths(new Date(), 4), "yyyy-MM-dd'T'HH:mm:ss")
        }
      ],
      estimatedCapacityGain: {},
      costEstimate: 300000, // $300K estimate
      riskLevel: 'MEDIUM',
      prerequisites: ['Safety assessment', 'Regulatory approval'],
      recommendedImplementationDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
    };
    
    // Estimate capacity gains at about 5-8% of total gap for each aircraft type
    Object.entries(mostSignificantGap.gapByAircraftType)
      .filter(([_, gap]) => gap > 0)
      .forEach(([aircraftType, gap]) => {
        ruleStrategy.estimatedCapacityGain[aircraftType] = Math.ceil(gap * 0.08);
      });
    
    strategies.push(ruleStrategy);
  }
  
  return strategies;
};

/**
 * Estimates cost for new stand construction
 */
const estimateNewStandCost = (
  aircraftGaps: [string, number][]
): number => {
  // Simple cost model based on aircraft types
  let baseCost = 5000000; // $5M base cost
  
  // Add premium for wide-body aircraft
  if (aircraftGaps.some(([type]) => type.includes('77') || type.includes('A3') || type.includes('78'))) {
    baseCost += 3000000; // Additional $3M for wide-body capability
  }
  
  // Scale based on number of aircraft types with gaps
  const scaleFactor = Math.min(aircraftGaps.length, 5) / 5;
  return baseCost * (1 + scaleFactor);
}; 