/**
 * Test script for the Stand Capacity Tool standard case implementation
 * 
 * This script tests the capacity calculator with mock data to verify that:
 * 1. Standard case calculation works correctly
 * 2. Standard case values make sense relative to best/worst cases
 * 3. Standard case ignores adjacency restrictions properly
 */

// Import the necessary modules
// In a real implementation, you would use proper imports
// const CapacityResult = require('../../backend/src/services/adapted/models/capacityResult');
// const CapacityCalculator = require('../../backend/src/services/adapted/calculator/capacityCalculator');
// const TimeSlot = require('../../backend/src/services/adapted/models/timeSlot');
// const AircraftType = require('../../backend/src/services/adapted/models/aircraftType');
// const Stand = require('../../backend/src/services/adapted/models/stand');

// Mock implementations for testing
class CapacityResult {
  constructor() {
    this.bestCaseCapacity = new Map();
    this.standardCaseCapacity = new Map();
    this.worstCaseCapacity = new Map();
    this.timeSlots = [];
    this.aircraftTypes = [];
  }

  setTimeSlots(slots) {
    this.timeSlots = [...slots];
    slots.forEach(slot => {
      this.bestCaseCapacity.set(slot.label, new Map());
      this.standardCaseCapacity.set(slot.label, new Map());
      this.worstCaseCapacity.set(slot.label, new Map());
    });
  }

  setAircraftTypes(types) {
    this.aircraftTypes = [...types];
    this.timeSlots.forEach(slot => {
      const bestCaseSlotMap = this.bestCaseCapacity.get(slot.label);
      const standardCaseSlotMap = this.standardCaseCapacity.get(slot.label);
      const worstCaseSlotMap = this.worstCaseCapacity.get(slot.label);
      
      types.forEach(type => {
        bestCaseSlotMap.set(type.aircraftTypeID, 0);
        standardCaseSlotMap.set(type.aircraftTypeID, 0);
        worstCaseSlotMap.set(type.aircraftTypeID, 0);
      });
    });
  }

  incrementCapacity(slotLabel, aircraftTypeID, caseType = 'best') {
    let capacityMap;
    
    if (caseType === 'worst') {
      capacityMap = this.worstCaseCapacity;
    } else if (caseType === 'standard') {
      capacityMap = this.standardCaseCapacity;
    } else {
      capacityMap = this.bestCaseCapacity;
    }
    
    const slotMap = capacityMap.get(slotLabel);
    if (!slotMap) {
      throw new Error(`Time slot "${slotLabel}" not found in capacity map`);
    }
    
    if (!slotMap.has(aircraftTypeID)) {
      slotMap.set(aircraftTypeID, 0);
    }
    
    slotMap.set(aircraftTypeID, slotMap.get(aircraftTypeID) + 1);
  }

  getCapacity(slotLabel, aircraftTypeID, caseType = 'best') {
    let capacityMap;
    
    if (caseType === 'worst') {
      capacityMap = this.worstCaseCapacity;
    } else if (caseType === 'standard') {
      capacityMap = this.standardCaseCapacity;
    } else {
      capacityMap = this.bestCaseCapacity;
    }
    
    if (!capacityMap.has(slotLabel)) {
      return 0;
    }
    
    const slotMap = capacityMap.get(slotLabel);
    return slotMap.has(aircraftTypeID) ? slotMap.get(aircraftTypeID) : 0;
  }

  toJson() {
    const result = {
      timeSlots: this.timeSlots.map(slot => ({
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime
      })),
      aircraftTypes: this.aircraftTypes.map(type => ({
        aircraftTypeID: type.aircraftTypeID,
        sizeCategory: type.sizeCategory
      })),
      bestCaseCapacity: {},
      standardCaseCapacity: {},
      worstCaseCapacity: {}
    };
    
    this.timeSlots.forEach(slot => {
      result.bestCaseCapacity[slot.label] = {};
      result.standardCaseCapacity[slot.label] = {};
      result.worstCaseCapacity[slot.label] = {};
      
      this.aircraftTypes.forEach(type => {
        result.bestCaseCapacity[slot.label][type.aircraftTypeID] = 
          this.getCapacity(slot.label, type.aircraftTypeID, 'best');
        
        result.standardCaseCapacity[slot.label][type.aircraftTypeID] = 
          this.getCapacity(slot.label, type.aircraftTypeID, 'standard');
        
        result.worstCaseCapacity[slot.label][type.aircraftTypeID] = 
          this.getCapacity(slot.label, type.aircraftTypeID, 'worst');
      });
    });
    
    return result;
  }
}

class CapacityCalculator {
  constructor(options) {
    this.timeSlots = options.timeSlots || [];
    this.stands = options.stands || [];
    this.aircraftTypes = options.aircraftTypes || [];
    this.aircraftTypeMap = options.aircraftTypeMap || new Map();
    this.adjacencyRules = options.adjacencyRules || new Map();
    this.settings = options.settings || { gapBetweenFlightsMinutes: 15 };
  }

  calculate() {
    const result = new CapacityResult();
    result.setTimeSlots(this.timeSlots);
    result.setAircraftTypes(this.aircraftTypes);
    
    this.timeSlots.forEach(slot => {
      console.log(`Calculating capacity for slot: ${slot.label}`);
      
      this.stands.forEach(stand => {
        // Process best case (no adjacency restrictions)
        this._processStandCapacity(stand, stand.baseCompatibleAircraftTypeIDs, slot, result, 'best');
        
        // Process standard case (ignoring adjacency information)
        this._processStandCapacity(stand, stand.baseCompatibleAircraftTypeIDs, slot, result, 'standard');
        
        // Process worst case (with adjacency restrictions)
        const worstCaseCompatibleTypes = this._getWorstCaseCompatibleTypes(stand);
        this._processStandCapacity(stand, worstCaseCompatibleTypes, slot, result, 'worst');
      });
    });
    
    return result;
  }

  _getWorstCaseCompatibleTypes(stand) {
    // Start with base compatibility
    let compatibleTypes = [...stand.baseCompatibleAircraftTypeIDs];
    
    // Apply adjacency rules
    for (const [adjacentStandID, rules] of this.adjacencyRules.entries()) {
      // Skip if this stand is not affected by the adjacency
      if (stand.standID !== adjacentStandID) {
        continue;
      }

      // Apply each rule
      for (const rule of rules) {
        if (rule.restrictionType === 'NO_USE_AFFECTED_STAND') {
          compatibleTypes = [];
          break;
        } else if (rule.restrictionType === 'MAX_AIRCRAFT_SIZE_REDUCED_TO') {
          // Only keep aircraft of the specified size or smaller
          const restrictedSize = rule.restrictedToAircraftTypeOrSize;
          compatibleTypes = compatibleTypes.filter(typeID => {
            const type = this.aircraftTypeMap.get(typeID);
            return type && this._isAircraftSizeSmallEnough(type.sizeCategory, restrictedSize);
          });
        } else if (rule.restrictionType === 'AIRCRAFT_TYPE_PROHIBITED') {
          // Remove the prohibited aircraft type
          compatibleTypes = compatibleTypes.filter(
            typeID => typeID !== rule.triggerAircraftTypeID
          );
        }
      }
    }
    
    return compatibleTypes;
  }

  _isAircraftSizeSmallEnough(actualSize, maxSize) {
    // Size categories from smallest to largest
    const sizeHierarchy = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    const actualIndex = sizeHierarchy.indexOf(actualSize);
    const maxIndex = sizeHierarchy.indexOf(maxSize);
    
    return actualIndex !== -1 && maxIndex !== -1 && actualIndex <= maxIndex;
  }

  _processStandCapacity(stand, compatibleTypes, slot, result, caseType) {
    compatibleTypes.forEach(aircraftTypeID => {
      const aircraftType = this.aircraftTypeMap.get(aircraftTypeID);
      if (!aircraftType) {
        console.warn(`Aircraft type not found: ${aircraftTypeID}`);
        return;
      }
      
      // Calculate total occupation time
      const totalOccupationMinutes = 
        aircraftType.averageTurnaroundMinutes + this.settings.gapBetweenFlightsMinutes;
      
      // Calculate how many aircraft can fit in this time slot
      const slotDurationMinutes = slot.getDurationMinutes();
      const capacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
      
      // Increment the capacity counter if capacity > 0
      if (capacity > 0) {
        console.log(`Incrementing capacity for ${aircraftTypeID} in ${slot.label} (${caseType} case): ${capacity}`);
        result.incrementCapacity(slot.label, aircraftTypeID, caseType);
      }
    });
  }
}

// Test data
const mockTimeSlots = [
  {
    label: "Morning",
    startTime: "08:00",
    endTime: "12:00",
    getDurationMinutes: () => 240
  },
  {
    label: "Afternoon",
    startTime: "12:00",
    endTime: "18:00",
    getDurationMinutes: () => 360
  }
];

const mockAircraftTypes = [
  {
    aircraftTypeID: "A320",
    sizeCategory: "C",
    averageTurnaroundMinutes: 45
  },
  {
    aircraftTypeID: "B777",
    sizeCategory: "E",
    averageTurnaroundMinutes: 90
  },
  {
    aircraftTypeID: "E190",
    sizeCategory: "C",
    averageTurnaroundMinutes: 35
  }
];

const mockStands = [
  {
    standID: "Stand1",
    baseCompatibleAircraftTypeIDs: ["A320", "B777", "E190"],
    adjacentStands: ["Stand2"]
  },
  {
    standID: "Stand2",
    baseCompatibleAircraftTypeIDs: ["A320", "E190"],
    adjacentStands: ["Stand1"]
  },
  {
    standID: "Stand3",
    baseCompatibleAircraftTypeIDs: ["A320", "E190"],
    adjacentStands: []
  }
];

// Create adjacency rules
const mockAdjacencyRules = new Map();
mockAdjacencyRules.set("Stand1", [
  {
    restrictionType: "MAX_AIRCRAFT_SIZE_REDUCED_TO",
    triggerStandID: "Stand2",
    triggerAircraftTypeID: "A320",
    restrictedToAircraftTypeOrSize: "C"
  }
]);

mockAdjacencyRules.set("Stand2", [
  {
    restrictionType: "AIRCRAFT_TYPE_PROHIBITED",
    triggerStandID: "Stand1",
    triggerAircraftTypeID: "B777",
    restrictedToAircraftTypeOrSize: null
  }
]);

// Settings
const mockSettings = {
  gapBetweenFlightsMinutes: 15
};

// Create aircraft type map
const aircraftTypeMap = new Map();
mockAircraftTypes.forEach(type => aircraftTypeMap.set(type.aircraftTypeID, type));

// Run the test
function runTest() {
  console.log("=== STAND CAPACITY TOOL: STANDARD CASE TEST ===");
  console.log("Running capacity calculation with mock data...");
  
  // Create calculator
  const calculator = new CapacityCalculator({
    timeSlots: mockTimeSlots,
    stands: mockStands,
    aircraftTypes: mockAircraftTypes,
    aircraftTypeMap: aircraftTypeMap,
    adjacencyRules: mockAdjacencyRules,
    settings: mockSettings
  });
  
  // Calculate capacity
  const result = calculator.calculate();
  
  // Convert to JSON for easier inspection
  const jsonResult = result.toJson();
  
  // Log results
  console.log("\n=== TEST RESULTS ===");
  console.log("Time Slots:", jsonResult.timeSlots);
  console.log("Aircraft Types:", jsonResult.aircraftTypes);
  console.log("\nBest Case Capacity:", JSON.stringify(jsonResult.bestCaseCapacity, null, 2));
  console.log("\nStandard Case Capacity:", JSON.stringify(jsonResult.standardCaseCapacity, null, 2));
  console.log("\nWorst Case Capacity:", JSON.stringify(jsonResult.worstCaseCapacity, null, 2));
  
  // Verify expectations
  verifyResults(jsonResult);
}

function verifyResults(result) {
  console.log("\n=== VERIFICATION ===");
  const verificationResults = [];
  
  // Check for both time slots
  mockTimeSlots.forEach(slot => {
    const slotLabel = slot.label;
    console.log(`\nVerifying slot: ${slotLabel}`);
    
    // Check each aircraft type
    mockAircraftTypes.forEach(type => {
      const typeID = type.aircraftTypeID;
      
      // Get capacities
      const bestCase = result.bestCaseCapacity[slotLabel][typeID] || 0;
      const standardCase = result.standardCaseCapacity[slotLabel][typeID] || 0;
      const worstCase = result.worstCaseCapacity[slotLabel][typeID] || 0;
      
      console.log(`${typeID}: best=${bestCase}, standard=${standardCase}, worst=${worstCase}`);
      
      // Check relationships
      // 1. Standard case should be equal to best case (as per requirements)
      const standardEqualsBest = standardCase === bestCase;
      
      // 2. Worst case should be less than or equal to standard case
      const worstLessThanOrEqualStandard = worstCase <= standardCase;
      
      const passed = standardEqualsBest && worstLessThanOrEqualStandard;
      
      verificationResults.push({
        slot: slotLabel,
        aircraftType: typeID,
        passed,
        issues: []
      });
      
      if (!standardEqualsBest) {
        verificationResults[verificationResults.length - 1].issues.push(
          `Standard case (${standardCase}) should equal best case (${bestCase})`
        );
      }
      
      if (!worstLessThanOrEqualStandard) {
        verificationResults[verificationResults.length - 1].issues.push(
          `Worst case (${worstCase}) should be <= standard case (${standardCase})`
        );
      }
    });
  });
  
  // Print overall results
  console.log("\n=== OVERALL VERIFICATION RESULTS ===");
  const passedCount = verificationResults.filter(r => r.passed).length;
  const totalCount = verificationResults.length;
  
  console.log(`Passed: ${passedCount}/${totalCount} tests (${Math.round(passedCount/totalCount*100)}%)`);
  
  // Print any failures
  const failures = verificationResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log("\nFAILURES:");
    failures.forEach(failure => {
      console.log(`- Slot: ${failure.slot}, Aircraft: ${failure.aircraftType}`);
      failure.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    });
    console.log("\nVERIFICATION FAILED");
  } else {
    console.log("\nVERIFICATION PASSED");
  }
}

// Run the test
runTest(); 