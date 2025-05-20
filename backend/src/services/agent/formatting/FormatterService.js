/**
 * FormatterService.js
 * 
 * This service provides advanced formatting capabilities for agent responses.
 * It includes formatters for tables, enhanced lists, text highlighting, and 
 * progressive disclosure of complex information.
 */

const logger = require('../../../utils/logger');

class FormatterService {
  constructor(options = {}) {
    // Configure options
    this.options = {
      defaultTableStyle: options.defaultTableStyle || 'markdown',
      defaultHighlightStyle: options.defaultHighlightStyle || 'markdown',
      defaultListStyle: options.defaultListStyle || 'markdown',
      ...options
    };
    
    // Table styling templates for different output formats
    this.tableTemplates = {
      text: {
        tableStart: '',
        tableEnd: '',
        headerStart: '',
        headerEnd: '\n',
        rowStart: '',
        rowEnd: '\n',
        cellSeparator: '\t',
        headerCellDecorator: cell => cell.toUpperCase(),
        bodyCellDecorator: cell => cell,
        rowSeparator: line => '-'.repeat(line.length) + '\n'
      },
      markdown: {
        tableStart: '',
        tableEnd: '\n',
        headerStart: '',
        headerEnd: '\n',
        rowStart: '',
        rowEnd: '\n',
        cellSeparator: ' | ',
        headerCellDecorator: cell => cell,
        bodyCellDecorator: cell => cell,
        rowSeparator: (_, colWidths) => colWidths.map(w => '-'.repeat(w)).join(' | ') + '\n'
      },
      html: {
        tableStart: '<table class="comparison-table">\\n<thead>\\n',
        tableEnd: '</tbody>\\n</table>',
        headerStart: '<tr>\\n',
        headerEnd: '</tr>\\n</thead>\\n<tbody>\\n',
        rowStart: '<tr>\\n',
        rowEnd: '</tr>\\n',
        cellSeparator: '',
        headerCellDecorator: cell => `<th>${cell}</th>\\n`,
        bodyCellDecorator: cell => `<td>${cell}</td>\\n`,
        rowSeparator: () => ''
      },
      json: {
        // For JSON, we'll handle the formatting differently since it's a structured format
        tableStart: '{\\n  "table": {\\n    "headers": ',
        tableEnd: '\\n  }\\n}',
        headerStart: '[',
        headerEnd: '],\\n    "rows": [',
        rowStart: '[',
        rowEnd: ']',
        cellSeparator: ', ',
        headerCellDecorator: cell => `"${cell.replace(/"/g, '\\"')}"`,
        bodyCellDecorator: cell => {
          // Try to determine if the cell should be a number, boolean, or string
          if (cell === 'true' || cell === 'false') return cell;
          if (!isNaN(cell) && cell !== '') return cell;
          return `"${cell.replace(/"/g, '\\"')}"`;
        },
        rowSeparator: () => ',\\n    '
      }
    };
    
    // List formatting templates
    this.listTemplates = {
      text: {
        listStart: '',
        listEnd: '',
        itemStart: '* ',
        itemEnd: '\\n',
        nestedListIndent: '  '
      },
      markdown: {
        listStart: '',
        listEnd: '\\n',
        itemStart: '- ',
        itemEnd: '\\n',
        nestedListIndent: '  '
      },
      html: {
        listStart: '<ul>\\n',
        listEnd: '</ul>',
        itemStart: '<li>',
        itemEnd: '</li>\\n',
        nestedListIndent: '',
        nestedListStart: '<ul>\\n',
        nestedListEnd: '</ul>\\n'
      },
      json: {
        // For JSON, we'll handle the formatting differently
        listStart: '{\\n  "list": [',
        listEnd: '\\n  ]\\n}',
        itemStart: '    "',
        itemEnd: '"',
        itemSeparator: ',\\n'
      }
    };
    
    // Highlight templates
    this.highlightTemplates = {
      text: {
        start: '! ',
        end: ' !',
        inlineStart: '!',
        inlineEnd: '!'
      },
      markdown: {
        start: '**',
        end: '**',
        inlineStart: '**',
        inlineEnd: '**'
      },
      html: {
        start: '<strong class="highlight">',
        end: '</strong>',
        inlineStart: '<span class="highlight">',
        inlineEnd: '</span>'
      },
      json: {
        start: '{ "highlight": "',
        end: '" }',
        inlineStart: '',
        inlineEnd: ''
      }
    };
    
    // Progressive disclosure templates
    this.disclosureTemplates = {
      text: {
        summaryStart: '=== ',
        summaryEnd: ' ===\\n',
        detailsStart: '',
        detailsEnd: '\\n==========\\n'
      },
      markdown: {
        summaryStart: '### ',
        summaryEnd: '\\n',
        detailsStart: '> ',
        detailsEnd: '\\n'
      },
      html: {
        summaryStart: '<details>\\n<summary>',
        summaryEnd: '</summary>\\n',
        detailsStart: '<div class="details-content">',
        detailsEnd: '</div>\\n</details>'
      },
      json: {
        summaryStart: '{\\n  "disclosure": {\\n    "summary": "',
        summaryEnd: '",\\n    "details": "',
        detailsStart: '',
        detailsEnd: '"\\n  }\\n}'
      }
    };
    
    logger.info('FormatterService initialized');
  }
  
  /**
   * Format data as a table
   * @param {Array<string>} headers - Table headers
   * @param {Array<Array<string>>} rows - Table rows
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted table
   */
  formatTable(headers, rows, options = {}) {
    try {
      const format = options.format || this.options.defaultTableStyle;
      const template = this.tableTemplates[format] || this.tableTemplates.markdown;
      
      if (format === 'json') {
        // For JSON, return a structured object instead of a string
        return JSON.stringify({
          table: {
            headers,
            rows
          }
        }, null, 2);
      }
      
      // Calculate column widths for proper alignment
      const colWidths = headers.map((h, colIndex) => {
        const headerLen = String(h).length;
        const maxRowLen = rows.reduce((max, row) => {
          const cellLength = String(row[colIndex] || '').length;
          return Math.max(max, cellLength);
        }, 0);
        return Math.max(headerLen, maxRowLen);
      });
      
      // Format header row
      let formattedHeader = template.headerStart;
      formattedHeader += headers.map((header, i) => {
        const paddedHeader = this._padCell(header, colWidths[i], options);
        return template.headerCellDecorator(paddedHeader);
      }).join(template.cellSeparator);
      formattedHeader += template.headerEnd;
      
      // Add separator row after header
      const separatorRow = template.rowSeparator(formattedHeader, colWidths);
      
      // Format data rows
      const formattedRows = rows.map((row, rowIndex) => {
        let formattedRow = template.rowStart;
        formattedRow += row.map((cell, i) => {
          const paddedCell = this._padCell(cell, colWidths[i], options);
          return template.bodyCellDecorator(paddedCell);
        }).join(template.cellSeparator);
        formattedRow += template.rowEnd;
        return formattedRow;
      }).join('');
      
      // Combine all parts of the table
      return template.tableStart + formattedHeader + separatorRow + formattedRows + template.tableEnd;
    } catch (error) {
      logger.error(`Error formatting table: ${error.message}`);
      
      // Fallback to simple text table
      const headerRow = headers.join('\t');
      const dataRows = rows.map(row => row.join('\t'));
      return [headerRow, '-'.repeat(headerRow.length), ...dataRows].join('\n');
    }
  }
  
  /**
   * Pad a cell to the specified width
   * @private
   * @param {string} cell - Cell content
   * @param {number} width - Desired width
   * @param {Object} options - Padding options
   * @returns {string} - Padded cell
   */
  _padCell(cell, width, options = {}) {
    const cellStr = String(cell || '');
    const align = options.align || 'left';
    
    if (align === 'right') {
      return cellStr.padStart(width);
    } else if (align === 'center') {
      const leftPad = Math.floor((width - cellStr.length) / 2);
      return ' '.repeat(leftPad) + cellStr.padEnd(width - leftPad);
    } else {
      return cellStr.padEnd(width);
    }
  }
  
  /**
   * Format data as a comparison table highlighting differences
   * @param {string} title - Table title
   * @param {Array<Object>} items - Items to compare
   * @param {Array<string>} keys - Keys to include in comparison
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted comparison table
   */
  formatComparisonTable(title, items, keys, options = {}) {
    try {
      if (!items || items.length < 2 || !keys || keys.length === 0) {
        throw new Error('Invalid comparison data: need at least 2 items and 1 key');
      }
      
      const format = options.format || this.options.defaultTableStyle;
      
      // Create headers: first column is the property name, then item identifiers
      const headers = [
        options.propertyLabel || 'Property',
        ...items.map((item, i) => item.name || item.id || `Item ${i+1}`)
      ];
      
      // Create rows: each row compares one property across all items
      const rows = keys.map(key => {
        // First cell is the property name
        const propertyName = options.keyLabels?.[key] || this._formatPropertyName(key);
        
        // Rest of the cells contain the property values for each item
        const values = items.map(item => {
          let value = this._getNestedProperty(item, key);
          
          // Format value appropriately
          if (value === undefined || value === null) {
            return options.nullValue || 'N/A';
          } else if (typeof value === 'object') {
            return JSON.stringify(value);
          } else {
            return String(value);
          }
        });
        
        // Highlight differences if requested
        if (options.highlightDifferences !== false) {
          const allSame = values.every(v => v === values[0]);
          if (!allSame) {
            return [propertyName, ...values.map(v => this.highlightText(v, { format }))]
          }
        }
        
        return [propertyName, ...values];
      });
      
      // Add title if provided
      const tableWithTitle = title ? 
        `${title}\n${this.formatTable(headers, rows, { ...options, format })}` :
        this.formatTable(headers, rows, { ...options, format });
        
      return tableWithTitle;
    } catch (error) {
      logger.error(`Error formatting comparison table: ${error.message}`);
      return `Error creating comparison: ${error.message}`;
    }
  }
  
  /**
   * Format a property name to be more readable
   * @private
   * @param {string} key - Property key
   * @returns {string} - Formatted property name
   */
  _formatPropertyName(key) {
    // Convert camelCase or snake_case to Title Case With Spaces
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s+/, '')
      .replace(/\s+/, ' ')
      .replace(/^\w/, c => c.toUpperCase());
  }
  
  /**
   * Get a nested property from an object using dot notation
   * @private
   * @param {Object} obj - The object to extract from
   * @param {string} key - The property key (supports dot notation)
   * @returns {any} - The property value
   */
  _getNestedProperty(obj, key) {
    return key.split('.').reduce((o, k) => (o || {})[k], obj);
  }
  
  /**
   * Format a list with enhanced styling
   * @param {Array<string|Object>} items - List items
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted list
   */
  formatList(items, options = {}) {
    try {
      const format = options.format || this.options.defaultListStyle;
      const template = this.listTemplates[format] || this.listTemplates.markdown;
      
      if (format === 'json') {
        // For JSON, return a structured object
        return JSON.stringify({ 
          list: items.map(item => {
            if (typeof item === 'string') return item;
            if (item.text) return item.text;
            return JSON.stringify(item);
          })
        }, null, 2);
      }
      
      const processItem = (item, level = 0) => {
        const indent = template.nestedListIndent.repeat(level);
        
        // If item is a string, format it as a simple item
        if (typeof item === 'string') {
          return `${indent}${template.itemStart}${item}${template.itemEnd}`;
        }
        
        // If item has text, use it as the main content
        if (item.text) {
          let itemText = `${indent}${template.itemStart}${item.text}`;
          
          // Add highlight if specified
          if (item.highlight) {
            itemText = this.highlightText(itemText, { format });
          }
          
          // If the item has children, process them as a nested list
          if (item.children && item.children.length > 0) {
            if (format === 'html') {
              itemText += template.itemEnd + indent + template.nestedListStart;
              itemText += item.children.map(child => processItem(child, level + 1)).join('');
              itemText += indent + template.nestedListEnd + indent;
            } else {
              itemText += template.itemEnd;
              itemText += item.children.map(child => processItem(child, level + 1)).join('');
            }
          } else {
            itemText += template.itemEnd;
          }
          
          return itemText;
        }
        
        // Default case: convert to string
        return `${indent}${template.itemStart}${JSON.stringify(item)}${template.itemEnd}`;
      };
      
      // Process all items
      const formattedItems = items.map(item => processItem(item)).join(
        format === 'json' ? template.itemSeparator : ''
      );
      
      // Combine all parts of the list
      return template.listStart + formattedItems + template.listEnd;
    } catch (error) {
      logger.error(`Error formatting list: ${error.message}`);
      
      // Fallback to simple text list
      return items.map(item => {
        if (typeof item === 'string') return `* ${item}`;
        if (item.text) return `* ${item.text}`;
        return `* ${JSON.stringify(item)}`;
      }).join('\n');
    }
  }
  
  /**
   * Highlight important text
   * @param {string} text - Text to highlight
   * @param {Object} options - Highlighting options
   * @returns {string} - Highlighted text
   */
  highlightText(text, options = {}) {
    try {
      const format = options.format || this.options.defaultHighlightStyle;
      const template = this.highlightTemplates[format] || this.highlightTemplates.markdown;
      const isInline = options.inline !== false;
      
      // For block-level highlighting
      if (!isInline) {
        return `${template.start}${text}${template.end}`;
      }
      
      // For inline highlighting
      return `${template.inlineStart}${text}${template.inlineEnd}`;
    } catch (error) {
      logger.error(`Error highlighting text: ${error.message}`);
      return `!${text}!`;
    }
  }
  
  /**
   * Format with progressive disclosure for complex information
   * @param {string} summary - Summary text
   * @param {string} details - Detailed information
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted disclosure block
   */
  formatDisclosure(summary, details, options = {}) {
    try {
      const format = options.format || 'markdown';
      const template = this.disclosureTemplates[format] || this.disclosureTemplates.markdown;
      
      if (format === 'json') {
        return JSON.stringify({
          disclosure: {
            summary,
            details
          }
        }, null, 2);
      }
      
      return `${template.summaryStart}${summary}${template.summaryEnd}${template.detailsStart}${details}${template.detailsEnd}`;
    } catch (error) {
      logger.error(`Error formatting disclosure: ${error.message}`);
      return `${summary}\n---\n${details}`;
    }
  }
  
  /**
   * Create a multi-level disclosure for hierarchical information
   * @param {Object} data - Hierarchical data object
   * @param {Object} options - Formatting options
   * @returns {string} - Nested disclosure blocks
   */
  formatMultiLevelDisclosure(data, options = {}) {
    try {
      const format = options.format || 'markdown';
      
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }
      
      const processLevel = (node, level = 0) => {
        if (!node || typeof node !== 'object') {
          return String(node || '');
        }
        
        // For array items
        if (Array.isArray(node)) {
          return this.formatList(node.map(item => {
            if (typeof item === 'object' && item !== null) {
              return { text: processLevel(item, level + 1) };
            }
            return String(item);
          }), { format });
        }
        
        // Extract summary and details
        const { summary, details, ...rest } = node;
        
        if (!summary) {
          // If no summary, just stringify the object
          return JSON.stringify(rest);
        }
        
        if (!details && Object.keys(rest).length === 0) {
          // If only summary, no details or other properties
          return summary;
        }
        
        // Process details if it exists, or use the rest of the properties
        let detailsContent;
        if (details) {
          detailsContent = typeof details === 'object' ? 
            processLevel(details, level + 1) : details;
        } else {
          const subItems = Object.entries(rest).map(([key, value]) => {
            const valContent = typeof value === 'object' ? 
              processLevel(value, level + 1) : value;
            return `**${this._formatPropertyName(key)}**: ${valContent}`;
          });
          detailsContent = subItems.join('\n\n');
        }
        
        return this.formatDisclosure(summary, detailsContent, { format });
      };
      
      return processLevel(data);
    } catch (error) {
      logger.error(`Error formatting multi-level disclosure: ${error.message}`);
      return JSON.stringify(data, null, 2);
    }
  }
}

module.exports = new FormatterService();