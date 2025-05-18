const { expect } = require('chai');
const dateParser = require('../../src/utils/dateParser');

describe('Date Parser Utility', () => {
  describe('parseDate function', () => {
    it('should parse ISO format correctly', () => {
      const result = dateParser.parseDate('2023-05-15T14:30:00Z');
      expect(result.valid).to.be.true;
      expect(result.date).to.be.an.instanceOf(Date);
      expect(result.format).to.equal('native');
    });

    it('should parse ISO-like format with space correctly', () => {
      const result = dateParser.parseDate('2023-05-15 14:30:00');
      expect(result.valid).to.be.true;
      expect(result.date).to.be.an.instanceOf(Date);
    });

    it('should parse US date format correctly', () => {
      const result = dateParser.parseDate('05/15/2023 14:30:00');
      expect(result.valid).to.be.true;
      expect(result.date).to.be.an.instanceOf(Date);
    });

    it('should parse European date format correctly', () => {
      const result = dateParser.parseDate('15/05/2023 14:30:00');
      expect(result.valid).to.be.true;
      expect(result.date).to.be.an.instanceOf(Date);
    });

    it('should parse date with month abbreviation correctly', () => {
      const result = dateParser.parseDate('15-MAY-2023 14:30:00');
      expect(result.valid).to.be.true;
      expect(result.date).to.be.an.instanceOf(Date);
    });

    it('should handle invalid date strings', () => {
      const result = dateParser.parseDate('not-a-date');
      expect(result.valid).to.be.false;
      expect(result.error).to.exist;
    });

    it('should handle empty date strings', () => {
      const result = dateParser.parseDate('');
      expect(result.valid).to.be.false;
      expect(result.error).to.exist;
    });

    it('should handle null date strings', () => {
      const result = dateParser.parseDate(null);
      expect(result.valid).to.be.false;
      expect(result.error).to.exist;
    });
  });

  describe('formatToISO function', () => {
    it('should format a date to ISO string', () => {
      const date = new Date(2023, 4, 15, 14, 30, 0); // May 15, 2023 14:30:00
      const result = dateParser.formatToISO(date);
      expect(result).to.be.a('string');
      expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return null for invalid dates', () => {
      const result = dateParser.formatToISO(new Date('invalid'));
      expect(result).to.be.null;
    });

    it('should return null for null input', () => {
      const result = dateParser.formatToISO(null);
      expect(result).to.be.null;
    });
  });

  describe('formatDate function', () => {
    const date = new Date(2023, 4, 15, 14, 30, 0); // May 15, 2023 14:30:00

    it('should format a date to YYYY-MM-DD', () => {
      const result = dateParser.formatDate(date, 'YYYY-MM-DD');
      expect(result).to.equal('2023-05-15');
    });

    it('should format a date to YYYY-MM-DD HH:mm', () => {
      const result = dateParser.formatDate(date, 'YYYY-MM-DD HH:mm');
      expect(result).to.equal('2023-05-15 14:30');
    });

    it('should format a date to YYYY-MM-DD HH:mm:ss', () => {
      const result = dateParser.formatDate(date, 'YYYY-MM-DD HH:mm:ss');
      expect(result).to.equal('2023-05-15 14:30:00');
    });

    it('should format a date to MM/DD/YYYY', () => {
      const result = dateParser.formatDate(date, 'MM/DD/YYYY');
      expect(result).to.equal('05/15/2023');
    });

    it('should format a date to DD/MM/YYYY', () => {
      const result = dateParser.formatDate(date, 'DD/MM/YYYY');
      expect(result).to.equal('15/05/2023');
    });

    it('should use default format if not specified', () => {
      const result = dateParser.formatDate(date);
      expect(result).to.equal('2023-05-15T14:30:00');
    });

    it('should return null for invalid dates', () => {
      const result = dateParser.formatDate(new Date('invalid'));
      expect(result).to.be.null;
    });
  });

  describe('isValidDate function', () => {
    it('should return true for valid date strings', () => {
      expect(dateParser.isValidDate('2023-05-15T14:30:00')).to.be.true;
      expect(dateParser.isValidDate('2023-05-15 14:30:00')).to.be.true;
      expect(dateParser.isValidDate('05/15/2023')).to.be.true;
      expect(dateParser.isValidDate('15/05/2023')).to.be.true;
    });

    it('should return false for invalid date strings', () => {
      expect(dateParser.isValidDate('not-a-date')).to.be.false;
      expect(dateParser.isValidDate('')).to.be.false;
      expect(dateParser.isValidDate(null)).to.be.false;
    });
  });

  describe('getRecommendedFormat function', () => {
    it('should return correct format for valid date strings', () => {
      const format = dateParser.getRecommendedFormat('2023-05-15T14:30:00');
      expect(format).to.be.a('string');
    });

    it('should return suggested format for invalid date strings', () => {
      const format = dateParser.getRecommendedFormat('not-a-date');
      expect(format).to.equal('YYYY-MM-DDTHH:mm:ss');
    });
  });
}); 