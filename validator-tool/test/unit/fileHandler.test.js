/**
 * File Handler unit tests
 */
const path = require('path');
const fileHandler = require('../../src/lib/fileHandler');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

describe('File Handler Module', () => {
  const csvFilePath = path.join(FIXTURES_DIR, 'sample-flights.csv');
  
  // Test file format detection
  describe('detectFileFormat', () => {
    it('should detect CSV files correctly', () => {
      const format = fileHandler.detectFileFormat(csvFilePath);
      expect(format).toBe('csv');
    });
    
    it('should throw error for non-existent files', () => {
      expect(() => {
        fileHandler.detectFileFormat('non-existent-file.csv');
      }).toThrow(/not found/);
    });
  });
  
  // Test file parsing
  describe('parseFile', () => {
    it('should parse CSV files into JSON objects', async () => {
      const data = await fileHandler.parseFile(csvFilePath);
      
      // Verify parsed data
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('flight_id');
      expect(data[0]).toHaveProperty('flight_no');
      expect(data[0]).toHaveProperty('carrier');
    });
  });
  
  // Test file stats
  describe('getFileStats', () => {
    it('should return file statistics', () => {
      const stats = fileHandler.getFileStats(csvFilePath);
      
      expect(stats).toHaveProperty('name', 'sample-flights.csv');
      expect(stats).toHaveProperty('extension', '.csv');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('sizeFormatted');
    });
  });
  
  // Test sample records
  describe('getSampleRecords', () => {
    it('should return the specified number of sample records', () => {
      const data = [
        { id: 1, name: 'Record 1' },
        { id: 2, name: 'Record 2' },
        { id: 3, name: 'Record 3' },
        { id: 4, name: 'Record 4' },
        { id: 5, name: 'Record 5' }
      ];
      
      const samples = fileHandler.getSampleRecords(data, 3);
      
      expect(samples.length).toBe(3);
      expect(samples[0].id).toBe(1);
      expect(samples[2].id).toBe(3);
    });
    
    it('should handle cases where requested samples exceed data length', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const samples = fileHandler.getSampleRecords(data, 5);
      
      expect(samples.length).toBe(2);
    });
    
    it('should throw error for non-array data', () => {
      expect(() => {
        fileHandler.getSampleRecords('not an array');
      }).toThrow(/must be an array/);
    });
  });
}); 