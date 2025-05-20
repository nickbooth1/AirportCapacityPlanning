/**
 * Mock implementation of FormatterService for testing
 */

const FormatterService = {
  formatTable: jest.fn().mockImplementation((headerRow, rows, options = {}) => {
    const format = options.format || 'text';
    
    if (format === 'html') {
      return '<table><thead><tr><th>' + headerRow.join('</th><th>') + '</th></tr></thead><tbody><tr><td>Sample data</td></tr></tbody></table>';
    } else if (format === 'markdown') {
      return `| ${headerRow.join(' | ')} |\n| ${headerRow.map(() => '---').join(' | ')} |\n| Sample data |`;
    } else {
      return headerRow.join('\t') + '\nSample data';
    }
  }),
  
  formatComparisonTable: jest.fn().mockImplementation((title, items, keys, options = {}) => {
    const format = options.format || 'text';
    
    if (format === 'html') {
      return '<h3>' + title + '</h3><table><tr><th>Feature</th><th>Item 1</th><th>Item 2</th></tr><tr><td>Sample data</td></tr></table>';
    } else if (format === 'markdown') {
      return `### ${title}\n\n| Feature | Item 1 | Item 2 |\n| --- | --- | --- |\n| Sample data |`;
    } else {
      return `${title}\nFeature\tItem 1\tItem 2\nSample data`;
    }
  }),
  
  formatList: jest.fn().mockImplementation((items, options = {}) => {
    const format = options.format || 'text';
    
    if (format === 'html') {
      return '<ul><li>Item 1</li><li>Item 2</li></ul>';
    } else if (format === 'markdown') {
      return '- Item 1\n- Item 2';
    } else {
      return '* Item 1\n* Item 2';
    }
  }),
  
  formatDisclosure: jest.fn().mockImplementation((summary, details, options = {}) => {
    const format = options.format || 'text';
    
    if (format === 'html') {
      return `<details><summary>${summary}</summary><p>${details}</p></details>`;
    } else if (format === 'markdown') {
      return `### ${summary}\n\n> ${details}`;
    } else {
      return `${summary}:\n  ${details}`;
    }
  }),
  
  highlightText: jest.fn().mockImplementation((text, options = {}) => {
    const format = options.format || 'text';
    
    if (format === 'html') {
      return `<span class="highlight">${text}</span>`;
    } else if (format === 'markdown') {
      return `**${text}**`;
    } else {
      return `[${text}]`;
    }
  }),
  
  formatJSON: jest.fn().mockImplementation((data) => {
    return JSON.stringify(data, null, 2);
  })
};

module.exports = { FormatterService };