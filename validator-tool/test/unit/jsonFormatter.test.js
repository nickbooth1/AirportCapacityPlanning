/**
 * JSON Formatter Module Tests
 */

const jsonFormatter = require('../../src/lib/jsonFormatter');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('JSON Formatter Module', () => {
  // Sample flight data for testing
  const sampleFlights = [
    {
      FlightID: 'FL001',
      FlightNumber: 'BA123',
      AirlineCode: 'BA',
      AircraftType: 'B737',
      Origin: 'JFK',
      Destination: 'LHR',
      ScheduledTime: '10:00',
      Terminal: 'T1',
      IsArrival: true
    },
    {
      FlightID: 'FL002',
      FlightNumber: 'BA456',
      AirlineCode: 'BA',
      AircraftType: 'B737',
      Origin: 'LHR',
      Destination: 'CDG',
      ScheduledTime: '11:30',
      Terminal: 'T1',
      IsArrival: false
    }
  ];

  // Sample reference data
  const sampleReferenceData = {
    airlines: [
      {
        code: 'BA',
        name: 'British Airways',
        baseTerminal: 'T1',
        requiresContactStand: true
      }
    ],
    terminals: [
      {
        code: 'T1',
        name: 'Terminal 1',
        stands: [
          {
            name: 'S1',
            isContact: true,
            maxSize: 'Narrow'
          },
          {
            name: 'S2',
            isContact: true,
            maxSize: 'Wide'
          }
        ]
      }
    ]
  };

  describe('convertToStandAllocationFormat', () => {
    it('should convert flight data to Stand Allocation format', () => {
      const result = jsonFormatter.convertToStandAllocationFormat(sampleFlights, {});
      
      // Check that all required objects are present
      expect(result).toHaveProperty('flights');
      expect(result).toHaveProperty('stands');
      expect(result).toHaveProperty('airlines');
      expect(result).toHaveProperty('settings');
      
      // Check that flights are properly formatted
      expect(result.flights.length).toBe(2);
      expect(result.flights[0].FlightID).toBe('FL001');
      expect(result.flights[1].FlightNumber).toBe('BA456');
    });
    
    it('should include reference data when provided', () => {
      const result = jsonFormatter.convertToStandAllocationFormat(sampleFlights, {
        referenceData: sampleReferenceData
      });
      
      // Check that reference data is used
      expect(result.airlines.length).toBe(1);
      expect(result.airlines[0].AirlineCode).toBe('BA');
      expect(result.stands.length).toBe(2);
      expect(result.stands[0].StandName).toBe('S1');
    });
  });

  describe('identifyLinkedFlights', () => {
    it('should identify and link arrival/departure pairs', () => {
      // Create flights that should be linked (same airline, aircraft type, and reasonable turnaround time)
      const flightsToLink = [
        {
          FlightID: 'FL001',
          FlightNumber: 'BA123',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'JFK',
          Destination: 'LHR',
          ScheduledTime: '2023-05-01T10:00:00',
          Terminal: 'T1',
          IsArrival: true
        },
        {
          FlightID: 'FL002',
          FlightNumber: 'BA456',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'LHR',
          Destination: 'CDG',
          ScheduledTime: '2023-05-01T11:30:00', // 1.5 hours after arrival
          Terminal: 'T1',
          IsArrival: false
        }
      ];
      
      const result = jsonFormatter.identifyLinkedFlights(flightsToLink);
      
      // Check that the flights were linked
      expect(result.linkedFlights.length).toBe(1);
      expect(result.flightsWithLinks[0].LinkID).toBeDefined();
      expect(result.flightsWithLinks[1].LinkID).toBeDefined();
      expect(result.flightsWithLinks[0].LinkID).toBe(result.flightsWithLinks[1].LinkID);
    });
    
    it('should not link flights with insufficient turnaround time', () => {
      // Create flights with too little time between them
      const flightsToNotLink = [
        {
          FlightID: 'FL001',
          FlightNumber: 'BA123',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'JFK',
          Destination: 'LHR',
          ScheduledTime: '2023-05-01T10:00:00',
          Terminal: 'T1',
          IsArrival: true
        },
        {
          FlightID: 'FL002',
          FlightNumber: 'BA456',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'LHR',
          Destination: 'CDG',
          ScheduledTime: '2023-05-01T10:15:00', // Only 15 min after arrival
          Terminal: 'T1',
          IsArrival: false
        }
      ];
      
      const result = jsonFormatter.identifyLinkedFlights(flightsToNotLink);
      
      // Check that the flights were not linked
      expect(result.linkedFlights.length).toBe(0);
      expect(result.flightsWithLinks[0].LinkID).toBeUndefined();
      expect(result.flightsWithLinks[1].LinkID).toBeUndefined();
    });
    
    it('should respect existing LinkIDs', () => {
      // Create flights with pre-existing LinkIDs
      const flightsWithLinks = [
        {
          FlightID: 'FL001',
          FlightNumber: 'BA123',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'JFK',
          Destination: 'LHR',
          ScheduledTime: '10:00',
          Terminal: 'T1',
          IsArrival: true,
          LinkID: 'EXISTING_LINK'
        },
        {
          FlightID: 'FL002',
          FlightNumber: 'BA456',
          AirlineCode: 'BA',
          AircraftType: 'B737',
          Origin: 'LHR',
          Destination: 'CDG',
          ScheduledTime: '11:30',
          Terminal: 'T1',
          IsArrival: false,
          LinkID: 'EXISTING_LINK'
        }
      ];
      
      const result = jsonFormatter.identifyLinkedFlights(flightsWithLinks);
      
      // Check that the existing links are preserved
      expect(result.flightsWithLinks[0].LinkID).toBe('EXISTING_LINK');
      expect(result.flightsWithLinks[1].LinkID).toBe('EXISTING_LINK');
    });
  });

  describe('exportToJsonFiles', () => {
    it('should export formatted data to JSON files', () => {
      // Create a temporary directory for the test
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-test-'));
      
      const formattedData = {
        flights: sampleFlights,
        stands: [{ StandName: 'S1', Terminal: 'T1', IsContactStand: true, SizeLimit: 'Narrow' }],
        airlines: [{ AirlineCode: 'BA', AirlineName: 'British Airways', BaseTerminal: 'T1' }],
        settings: { GapBetweenFlights: 15 }
      };
      
      const filePaths = jsonFormatter.exportToJsonFiles(formattedData, tempDir);
      
      // Check that all files were created
      expect(fs.existsSync(filePaths.flights)).toBe(true);
      expect(fs.existsSync(filePaths.stands)).toBe(true);
      expect(fs.existsSync(filePaths.airlines)).toBe(true);
      expect(fs.existsSync(filePaths.settings)).toBe(true);
      
      // Check file contents
      const flightsContent = JSON.parse(fs.readFileSync(filePaths.flights, 'utf8'));
      expect(flightsContent.length).toBe(2);
      expect(flightsContent[0].FlightID).toBe('FL001');
      
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
}); 