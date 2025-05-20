/**
 * Tests for FormatterService
 */

const { FormatterService } = require('../../../../src/services/agent/formatting');

describe('FormatterService', () => {
  describe('Table formatting', () => {
    it('should format data as a table', () => {
      const headers = ['Name', 'Age', 'Occupation'];
      const rows = [
        ['John', '30', 'Engineer'],
        ['Alice', '25', 'Designer'],
        ['Bob', '35', 'Manager']
      ];
      
      // Test markdown format
      const markdownTable = FormatterService.formatTable(headers, rows, { format: 'markdown' });
      expect(markdownTable).toContain('Name');
      expect(markdownTable).toContain('Age');
      expect(markdownTable).toContain('Occupation');
      expect(markdownTable).toContain('John');
      expect(markdownTable).toContain('---');
      
      // Test HTML format
      const htmlTable = FormatterService.formatTable(headers, rows, { format: 'html' });
      expect(htmlTable).toContain('<table');
      expect(htmlTable).toContain('<th>Name');
      expect(htmlTable).toContain('<td>John');
      
      // Test JSON format
      const jsonTable = FormatterService.formatTable(headers, rows, { format: 'json' });
      const parsedTable = JSON.parse(jsonTable);
      expect(parsedTable.table.headers).toEqual(headers);
      expect(parsedTable.table.rows).toEqual(rows);
    });
    
    it('should format comparison tables highlighting differences', () => {
      const items = [
        { name: 'Product A', price: 100, rating: 4.5, inStock: true },
        { name: 'Product B', price: 150, rating: 4.5, inStock: false }
      ];
      
      const keys = ['price', 'rating', 'inStock'];
      
      const comparisonTable = FormatterService.formatComparisonTable(
        'Product Comparison', 
        items, 
        keys, 
        { format: 'markdown', highlightDifferences: true }
      );
      
      expect(comparisonTable).toContain('Product Comparison');
      expect(comparisonTable).toContain('Product A');
      expect(comparisonTable).toContain('Product B');
      expect(comparisonTable).toContain('Price');
      // Highlighted differences (price and inStock differ, rating is the same)
      expect(comparisonTable).toContain('100');
      expect(comparisonTable).toContain('150');
    });
  });
  
  describe('List formatting', () => {
    it('should format simple lists', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      
      // Test markdown format
      const markdownList = FormatterService.formatList(items, { format: 'markdown' });
      expect(markdownList).toContain('- Item 1');
      expect(markdownList).toContain('- Item 2');
      expect(markdownList).toContain('- Item 3');
      
      // Test HTML format
      const htmlList = FormatterService.formatList(items, { format: 'html' });
      expect(htmlList).toContain('<ul>');
      expect(htmlList).toContain('<li>Item 1</li>');
      expect(htmlList).toContain('</ul>');
    });
    
    it('should format hierarchical lists', () => {
      const items = [
        { text: 'Parent 1', children: [
          { text: 'Child 1.1' },
          { text: 'Child 1.2', children: [
            { text: 'Grandchild 1.2.1' }
          ]}
        ]},
        { text: 'Parent 2' }
      ];
      
      // Test markdown format
      const markdownList = FormatterService.formatList(items, { format: 'markdown' });
      expect(markdownList).toContain('- Parent 1');
      expect(markdownList).toContain('  - Child 1.1');
      expect(markdownList).toContain('    - Grandchild 1.2.1');
      expect(markdownList).toContain('- Parent 2');
      
      // Test HTML format
      const htmlList = FormatterService.formatList(items, { format: 'html' });
      expect(htmlList).toContain('<ul>');
      expect(htmlList).toContain('<li>Parent 1</li>');
      expect(htmlList).toContain('<ul>');
      expect(htmlList).toContain('<li>Child 1.1</li>');
      expect(htmlList).toContain('</ul>');
    });
    
    it('should format lists with highlighted items', () => {
      const items = [
        { text: 'Regular item' },
        { text: 'Important item', highlight: true },
        { text: 'Another regular item' }
      ];
      
      // Test markdown format
      const markdownList = FormatterService.formatList(items, { format: 'markdown' });
      expect(markdownList).toContain('- Regular item');
      expect(markdownList).toContain('**- Important item**');  // Should be highlighted
      expect(markdownList).toContain('- Another regular item');
    });
  });
  
  describe('Text highlighting', () => {
    it('should highlight text in different formats', () => {
      const text = 'Important information';
      
      // Test markdown format
      const markdownHighlight = FormatterService.highlightText(text, { format: 'markdown' });
      expect(markdownHighlight).toBe('**Important information**');
      
      // Test HTML format
      const htmlHighlight = FormatterService.highlightText(text, { format: 'html' });
      expect(htmlHighlight).toContain('<span class="highlight">Important information</span>');
      
      // Test text format
      const textHighlight = FormatterService.highlightText(text, { format: 'text' });
      expect(textHighlight).toBe('!Important information!');
    });
  });
  
  describe('Progressive disclosure', () => {
    it('should format disclosure blocks', () => {
      const summary = 'Click to see more details';
      const details = 'These are the detailed contents that are initially hidden.';
      
      // Test markdown format
      const markdownDisclosure = FormatterService.formatDisclosure(summary, details, { format: 'markdown' });
      expect(markdownDisclosure).toContain('### Click to see more details');
      expect(markdownDisclosure).toContain('> These are the detailed contents');
      
      // Test HTML format
      const htmlDisclosure = FormatterService.formatDisclosure(summary, details, { format: 'html' });
      expect(htmlDisclosure).toContain('<details>');
      expect(htmlDisclosure).toContain('<summary>Click to see more details</summary>');
      expect(htmlDisclosure).toContain('<div class="details-content">These are the detailed contents');
      expect(htmlDisclosure).toContain('</details>');
    });
    
    it('should format multi-level disclosure for hierarchical data', () => {
      const hierarchicalData = {
        summary: 'Main Topic',
        details: {
          summary: 'Sub-topic 1',
          details: 'Detailed information about sub-topic 1'
        }
      };
      
      // Test markdown format
      const markdownHierarchy = FormatterService.formatMultiLevelDisclosure(hierarchicalData, { format: 'markdown' });
      expect(markdownHierarchy).toContain('### Main Topic');
      expect(markdownHierarchy).toContain('### Sub-topic 1');
      expect(markdownHierarchy).toContain('Detailed information about sub-topic 1');
    });
  });
});