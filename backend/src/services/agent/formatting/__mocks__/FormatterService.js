/**
 * FormatterService.js mock for testing
 */

const FormatterService = {
  formatTable: jest.fn().mockReturnValue('<formatted-table>'),
  formatComparisonTable: jest.fn().mockReturnValue('<formatted-comparison-table>'),
  formatList: jest.fn().mockReturnValue('<formatted-list>'),
  formatDisclosure: jest.fn().mockReturnValue('<formatted-disclosure>'),
  highlightText: jest.fn().mockReturnValue('<highlighted-text>')
};

module.exports = FormatterService;