/**
 * OperationEntityExtractor.js
 * 
 * Specializes in extracting operation-specific entities from CRUD operation queries.
 * Extends the base EntityExtractor to provide targeted extraction for create, read, 
 * update, and delete operations.
 */

const EntityExtractor = require('./EntityExtractor');

class OperationEntityExtractor extends EntityExtractor {
  /**
   * Create a new operation entity extractor
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the extractor
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Add operation-specific entity types
    this.entityTypes = {
      ...this.entityTypes,
      ...this.getOperationEntityTypes()
    };
    
    // Recompile patterns with the new entity types
    this.patterns = this.compileEntityPatterns();
    
    this.logger.info('OperationEntityExtractor initialized');
  }
  
  /**
   * Get operation-specific entity type definitions
   * 
   * @returns {Object} - Entity type definitions
   */
  getOperationEntityTypes() {
    return {
      // Entity fields and properties
      name: {
        description: 'Name or identifier for an entity',
        patterns: [
          /\bname[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bcalled\s+['"]?([^'"]+?)['"]?\b/i,
          /\bnamed\s+['"]?([^'"]+?)['"]?\b/i,
          /\bid[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bidentifier[:=\s]+['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      code: {
        description: 'Code or shorthand identifier',
        patterns: [
          /\bcode[:=\s]+['"]?([A-Z0-9]+)['"]?\b/i,
          /\bwith\s+code\s+['"]?([A-Z0-9]+)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      location: {
        description: 'Physical location or position',
        patterns: [
          /\blocation[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bat\s+['"]?([^'"]+?)['"]?\b/i,
          /\bin\s+['"]?([^'"]+?)['"]?\b/i,
          /\bnear\s+['"]?([^'"]+?)['"]?\b/i,
          /\bposition[:=\s]+['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      type: {
        description: 'Type or category of an entity',
        patterns: [
          /\btype[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bcategory[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bkind[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\b(?:a|an)\s+([^'"]+?)\s+(?:stand|terminal|pier|gate)\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      capacity: {
        description: 'Capacity value or limit',
        patterns: [
          /\bcapacity[:=\s]+(\d+)\b/i,
          /\bwith\s+capacity\s+(?:of\s+)?(\d+)\b/i,
          /\baccommodate\s+(\d+)\b/i,
          /\bhold\s+(\d+)\b/i,
          /\bhandling\s+capacity\s+(?:of\s+)?(\d+)\b/i
        ],
        extract: (match) => match[1],
        parse: (value) => parseInt(value, 10)
      },
      
      status: {
        description: 'Status or state of an entity',
        patterns: [
          /\bstatus[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bstate[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bmark\s+(?:as\s+)?['"]?([^'"]+?)['"]?\b/i,
          /\bset\s+(?:to\s+)?['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      priority: {
        description: 'Priority level',
        patterns: [
          /\bpriority[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bwith\s+(?:a\s+)?['"]?([^'"]+?)\s+priority['"]?\b/i,
          /\b(high|medium|low)\s+priority\b/i
        ],
        extract: (match) => match[1].trim().toLowerCase(),
        parse: (value) => {
          // Standardize priority values
          if (['high', 'urgent', 'critical'].includes(value)) return 'high';
          if (['medium', 'normal', 'standard'].includes(value)) return 'medium';
          if (['low', 'minor', 'trivial'].includes(value)) return 'low';
          return value;
        }
      },
      
      description: {
        description: 'Description or details text',
        patterns: [
          /\bdescription[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bdetails[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bcomment[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bnotes?[:=\s]+['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      reason: {
        description: 'Reason or cause',
        patterns: [
          /\breason[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bcause[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bbecause\s+['"]?([^'"]+?)['"]?\b/i,
          /\bdue\s+to\s+['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim()
      },
      
      features: {
        description: 'Features or capabilities',
        patterns: [
          /\bfeatures?[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bcapabilities?[:=\s]+['"]?([^'"]+?)['"]?\b/i,
          /\bwith\s+['"]?([^'"]+?)\s+features?['"]?\b/i,
          /\bthat\s+has\s+['"]?([^'"]+?)['"]?\b/i
        ],
        extract: (match) => match[1].trim(),
        parse: (value) => {
          // Convert to array of features
          return value.split(/,\s*|\s+and\s+|\s*\+\s*/).map(f => f.trim());
        }
      },
      
      // Operation parameters
      id: {
        description: 'Identifier for the operation target',
        patterns: [
          /\bid\s+(\w+)\b/i,
          /\bidentifier\s+(\w+)\b/i,
          /\b#(\w+)\b/,
          /\bnumber\s+(\w+)\b/i
        ],
        extract: (match) => match[1]
      },
      
      startDate: {
        description: 'Start date for the operation',
        patterns: [
          /\bstart(?:ing)?\s+(?:on|from|at)?\s+([\w\s-]+)\b/i,
          /\bfrom\s+([\w\s-]+)\b/i,
          /\bbeginning\s+(?:on|at)?\s+([\w\s-]+)\b/i,
          /\bstart\s+date[:=\s]+([\w\s-]+)\b/i
        ],
        extract: (match) => match[1].trim(),
        parse: (value) => {
          // Use the date parser from the base entity type
          if (this.entityTypes.date && this.entityTypes.date.parse) {
            return this.entityTypes.date.parse(value);
          }
          return value;
        }
      },
      
      endDate: {
        description: 'End date for the operation',
        patterns: [
          /\bend(?:ing)?\s+(?:on|at)?\s+([\w\s-]+)\b/i,
          /\buntil\s+([\w\s-]+)\b/i,
          /\bto\s+([\w\s-]+)\b/i,
          /\bend\s+date[:=\s]+([\w\s-]+)\b/i
        ],
        extract: (match) => match[1].trim(),
        parse: (value) => {
          // Use the date parser from the base entity type
          if (this.entityTypes.date && this.entityTypes.date.parse) {
            return this.entityTypes.date.parse(value);
          }
          return value;
        }
      },
      
      flightNumber: {
        description: 'Flight number',
        patterns: [
          /\bflight\s+([A-Z]{2,3}\d{1,4}[A-Z]?)\b/i,
          /\b([A-Z]{2,3}\d{1,4}[A-Z]?)\s+flight\b/i,
          /\bflight\s+number\s+([A-Z]{2,3}\d{1,4}[A-Z]?)\b/i
        ],
        extract: (match) => match[1].toUpperCase()
      },
      
      standId: {
        description: 'Stand identifier',
        patterns: [
          /\bstand\s+([A-Z0-9]+)\b/i,
          /\bgate\s+([A-Z0-9]+)\b/i,
          /\bto\s+stand\s+([A-Z0-9]+)\b/i,
          /\bfor\s+stand\s+([A-Z0-9]+)\b/i
        ],
        extract: (match) => match[1].toUpperCase()
      },
      
      // Filter criteria for read operations
      sortBy: {
        description: 'Field to sort results by',
        patterns: [
          /\bsort(?:ed)?\s+by\s+(['"]?)(\w+)\1\b/i,
          /\border(?:ed)?\s+by\s+(['"]?)(\w+)\1\b/i
        ],
        extract: (match) => match[2].toLowerCase()
      },
      
      orderDirection: {
        description: 'Direction to sort (ascending or descending)',
        patterns: [
          /\bin\s+(ascending|descending)\s+order\b/i,
          /\border(?:ed)?\s+(asc|desc)\b/i
        ],
        extract: (match) => match[1].toLowerCase(),
        parse: (value) => {
          if (['asc', 'ascending'].includes(value.toLowerCase())) return 'asc';
          if (['desc', 'descending'].includes(value.toLowerCase())) return 'desc';
          return value;
        }
      },
      
      filterBy: {
        description: 'Field to filter results by',
        patterns: [
          /\bfilter(?:ed)?\s+by\s+(['"]?)(\w+)\1\s+(['"]?)([^'"]+)\3\b/i,
          /\bwhere\s+(['"]?)(\w+)\1\s+(?:is|=|equals?)\s+(['"]?)([^'"]+)\3\b/i,
          /\bwith\s+(['"]?)(\w+)\1\s+(['"]?)([^'"]+)\3\b/i
        ],
        extract: (match) => ({ field: match[2].toLowerCase(), value: match[4].trim() })
      }
    };
  }
  
  /**
   * Process a text to extract operation-specific entities
   * 
   * @param {string} text - The text to process
   * @param {Object} context - Additional context (including intent and operation type)
   * @returns {Promise<Object>} - Extraction result with operation parameters
   */
  async process(text, context = {}) {
    // Get the base extraction result
    const baseResult = await super.process(text, context);
    
    // If no entities were found or there was an error, return the base result
    if (!baseResult.success || Object.keys(baseResult.data).length === 0) {
      return baseResult;
    }
    
    // Get operation type to guide parameter extraction
    const operationType = context.operationType || this._inferOperationType(context.intent);
    
    // Extract operation-specific parameters based on operation type
    const operationParams = await this._extractOperationParameters(
      text, 
      baseResult.data, 
      operationType,
      context.intent,
      context.entityType
    );
    
    // Combine base entities with operation parameters
    const enhancedEntities = {
      ...baseResult.data,
      ...operationParams
    };
    
    // Add metadata about required parameters and their completeness
    const metadata = {
      ...baseResult.metadata,
      operationType,
      parameterStatus: this._checkParameterCompleteness(
        enhancedEntities, 
        operationType,
        context.entityType
      )
    };
    
    return this.createSuccessResult(enhancedEntities, metadata);
  }
  
  /**
   * Infer operation type from intent if not provided
   * 
   * @private
   * @param {string} intent - The intent name
   * @returns {string|null} - The operation type or null
   */
  _inferOperationType(intent) {
    if (!intent) return null;
    
    if (intent.startsWith('create.') || intent.startsWith('add.')) {
      return 'create';
    }
    
    if (intent.startsWith('get.') || intent.startsWith('list.') || 
        intent.startsWith('view.') || intent.startsWith('show.')) {
      return 'read';
    }
    
    if (intent.startsWith('update.') || intent.startsWith('edit.') || 
        intent.startsWith('modify.') || intent.startsWith('change.')) {
      return 'update';
    }
    
    if (intent.startsWith('delete.') || intent.startsWith('remove.') || 
        intent.startsWith('cancel.') || intent.startsWith('clear.')) {
      return 'delete';
    }
    
    return null;
  }
  
  /**
   * Extract operation parameters based on operation type
   * 
   * @private
   * @param {string} text - The text to process
   * @param {Object} baseEntities - Entities already extracted
   * @param {string} operationType - CRUD operation type
   * @param {string} intent - The intent name
   * @param {string} entityType - The entity type being operated on
   * @returns {Promise<Object>} - Operation parameters
   */
  async _extractOperationParameters(text, baseEntities, operationType, intent, entityType) {
    // If no operation type, return empty object
    if (!operationType) {
      return {};
    }
    
    // Default parameters
    const params = {};
    
    // Extract parameters specific to each operation type
    switch (operationType) {
      case 'create':
        return this._extractCreateParameters(text, baseEntities, entityType);
        
      case 'read':
        return this._extractReadParameters(text, baseEntities, entityType, intent);
        
      case 'update':
        return this._extractUpdateParameters(text, baseEntities, entityType);
        
      case 'delete':
        return this._extractDeleteParameters(text, baseEntities, entityType);
        
      default:
        return params;
    }
  }
  
  /**
   * Extract parameters for create operations
   * 
   * @private
   * @param {string} text - The text to process
   * @param {Object} baseEntities - Entities already extracted
   * @param {string} entityType - The entity type being created
   * @returns {Promise<Object>} - Create operation parameters
   */
  async _extractCreateParameters(text, baseEntities, entityType) {
    const params = {};
    
    // Common parameters for all entity types
    if (baseEntities.name) {
      params.name = baseEntities.name;
    }
    
    if (baseEntities.code) {
      params.code = baseEntities.code;
    }
    
    if (baseEntities.type) {
      params.type = baseEntities.type;
    }
    
    if (baseEntities.description) {
      params.description = baseEntities.description;
    }
    
    // Entity-specific parameters
    switch (entityType) {
      case 'stand':
        if (baseEntities.terminal) {
          params.terminal = baseEntities.terminal;
        }
        
        if (baseEntities.location) {
          params.location = baseEntities.location;
        }
        
        if (baseEntities.capacity) {
          params.capacity = baseEntities.capacity;
        }
        
        if (baseEntities.features) {
          params.features = baseEntities.features;
        }
        break;
        
      case 'terminal':
        if (baseEntities.capacity) {
          params.capacity = baseEntities.capacity;
        }
        
        if (baseEntities.location) {
          params.location = baseEntities.location;
        }
        break;
        
      case 'maintenance':
        if (baseEntities.startDate) {
          params.startDate = baseEntities.startDate;
        }
        
        if (baseEntities.endDate) {
          params.endDate = baseEntities.endDate;
        }
        
        if (baseEntities.standId || baseEntities.stand) {
          params.standId = baseEntities.standId || baseEntities.stand;
        }
        
        if (baseEntities.reason) {
          params.reason = baseEntities.reason;
        }
        
        if (baseEntities.priority) {
          params.priority = baseEntities.priority;
        }
        break;
        
      case 'flight':
        if (baseEntities.flightNumber) {
          params.flightNumber = baseEntities.flightNumber;
        }
        
        if (baseEntities.airline) {
          params.airline = baseEntities.airline;
        }
        
        if (baseEntities.aircraftType) {
          params.aircraftType = baseEntities.aircraftType;
        }
        
        if (baseEntities.date) {
          params.date = baseEntities.date;
        }
        
        if (baseEntities.time) {
          params.time = baseEntities.time;
        }
        break;
    }
    
    // Check for JSON-like parameters in the text
    params.attributes = this._extractJSONAttributes(text);
    
    return params;
  }
  
  /**
   * Extract parameters for read operations
   * 
   * @private
   * @param {string} text - The text to process
   * @param {Object} baseEntities - Entities already extracted
   * @param {string} entityType - The entity type being read
   * @param {string} intent - The intent name
   * @returns {Promise<Object>} - Read operation parameters
   */
  async _extractReadParameters(text, baseEntities, entityType, intent) {
    const params = {};
    const isList = intent && intent.startsWith('list.');
    
    // Common list operation parameters
    if (isList) {
      if (baseEntities.limit) {
        params.limit = baseEntities.limit;
      }
      
      if (baseEntities.sortBy) {
        params.sortBy = baseEntities.sortBy;
      }
      
      if (baseEntities.orderDirection) {
        params.orderDirection = baseEntities.orderDirection;
      }
      
      if (baseEntities.filterBy) {
        params.filters = Array.isArray(baseEntities.filterBy) 
          ? baseEntities.filterBy 
          : [baseEntities.filterBy];
      }
      
      // Default format for lists if not specified
      if (!baseEntities.format) {
        params.format = 'summary';
      }
    } else {
      // For single entity read, look for format
      if (baseEntities.format) {
        params.format = baseEntities.format;
      } else {
        params.format = 'detailed';
      }
    }
    
    // Entity-specific parameters
    switch (entityType) {
      case 'stand':
        if (baseEntities.stand && !isList) {
          params.id = baseEntities.stand;
        }
        
        if (baseEntities.terminal && isList) {
          params.terminal = baseEntities.terminal;
        }
        
        if (baseEntities.type && isList) {
          params.type = baseEntities.type;
        }
        
        if (baseEntities.status && isList) {
          params.status = baseEntities.status;
        }
        break;
        
      case 'maintenance':
        if (baseEntities.id && !isList) {
          params.id = baseEntities.id;
        }
        
        if (baseEntities.standId || baseEntities.stand) {
          params.standId = baseEntities.standId || baseEntities.stand;
        }
        
        if (baseEntities.status && isList) {
          params.status = baseEntities.status;
        }
        
        if (baseEntities.date && isList) {
          params.date = baseEntities.date;
        }
        
        if (baseEntities.startDate && isList) {
          params.startDate = baseEntities.startDate;
        }
        
        if (baseEntities.endDate && isList) {
          params.endDate = baseEntities.endDate;
        }
        break;
        
      case 'flight':
        if (baseEntities.flightNumber && !isList) {
          params.flightNumber = baseEntities.flightNumber;
        }
        
        if (baseEntities.airline && isList) {
          params.airline = baseEntities.airline;
        }
        
        if (baseEntities.date && isList) {
          params.date = baseEntities.date;
        }
        
        if (baseEntities.time && isList) {
          params.time = baseEntities.time;
        }
        
        if (baseEntities.status && isList) {
          params.status = baseEntities.status;
        }
        break;
    }
    
    return params;
  }
  
  /**
   * Extract parameters for update operations
   * 
   * @private
   * @param {string} text - The text to process
   * @param {Object} baseEntities - Entities already extracted
   * @param {string} entityType - The entity type being updated
   * @returns {Promise<Object>} - Update operation parameters
   */
  async _extractUpdateParameters(text, baseEntities, entityType) {
    const params = {};
    
    // Need identifier for the entity to update
    switch (entityType) {
      case 'stand':
        if (baseEntities.stand) {
          params.id = baseEntities.stand;
        }
        break;
        
      case 'terminal':
        if (baseEntities.terminal) {
          params.id = baseEntities.terminal;
        }
        break;
        
      case 'maintenance':
        if (baseEntities.id) {
          params.id = baseEntities.id;
        }
        break;
        
      case 'flight':
        if (baseEntities.flightNumber) {
          params.id = baseEntities.flightNumber;
        }
        break;
    }
    
    // Extract fields to update
    const fieldsToUpdate = {};
    
    // Common updatable fields
    if (baseEntities.name) {
      fieldsToUpdate.name = baseEntities.name;
    }
    
    if (baseEntities.status) {
      fieldsToUpdate.status = baseEntities.status;
    }
    
    if (baseEntities.description) {
      fieldsToUpdate.description = baseEntities.description;
    }
    
    // Entity-specific fields
    switch (entityType) {
      case 'stand':
        if (baseEntities.type) {
          fieldsToUpdate.type = baseEntities.type;
        }
        
        if (baseEntities.capacity) {
          fieldsToUpdate.capacity = baseEntities.capacity;
        }
        
        if (baseEntities.features) {
          fieldsToUpdate.features = baseEntities.features;
        }
        break;
        
      case 'maintenance':
        if (baseEntities.startDate) {
          fieldsToUpdate.startDate = baseEntities.startDate;
        }
        
        if (baseEntities.endDate) {
          fieldsToUpdate.endDate = baseEntities.endDate;
        }
        
        if (baseEntities.reason) {
          fieldsToUpdate.reason = baseEntities.reason;
        }
        
        if (baseEntities.priority) {
          fieldsToUpdate.priority = baseEntities.priority;
        }
        
        if (baseEntities.standId || baseEntities.stand) {
          fieldsToUpdate.standId = baseEntities.standId || baseEntities.stand;
        }
        break;
        
      case 'flight':
        if (baseEntities.airline) {
          fieldsToUpdate.airline = baseEntities.airline;
        }
        
        if (baseEntities.aircraftType) {
          fieldsToUpdate.aircraftType = baseEntities.aircraftType;
        }
        
        if (baseEntities.date) {
          fieldsToUpdate.date = baseEntities.date;
        }
        
        if (baseEntities.time) {
          fieldsToUpdate.time = baseEntities.time;
        }
        break;
    }
    
    // Add any JSON-like attributes found in the text
    const jsonAttributes = this._extractJSONAttributes(text);
    if (Object.keys(jsonAttributes).length > 0) {
      Object.assign(fieldsToUpdate, jsonAttributes);
    }
    
    // Only add fieldsToUpdate if there are fields to update
    if (Object.keys(fieldsToUpdate).length > 0) {
      params.fieldsToUpdate = fieldsToUpdate;
    }
    
    return params;
  }
  
  /**
   * Extract parameters for delete operations
   * 
   * @private
   * @param {string} text - The text to process
   * @param {Object} baseEntities - Entities already extracted
   * @param {string} entityType - The entity type being deleted
   * @returns {Promise<Object>} - Delete operation parameters
   */
  async _extractDeleteParameters(text, baseEntities, entityType) {
    const params = {};
    
    // Need identifier for the entity to delete
    switch (entityType) {
      case 'stand':
        if (baseEntities.stand) {
          params.id = baseEntities.stand;
        }
        break;
        
      case 'terminal':
        if (baseEntities.terminal) {
          params.id = baseEntities.terminal;
        }
        break;
        
      case 'maintenance':
        if (baseEntities.id) {
          params.id = baseEntities.id;
        }
        break;
        
      case 'flight':
        if (baseEntities.flightNumber) {
          params.id = baseEntities.flightNumber;
        }
        break;
    }
    
    // Check for optional parameters
    if (baseEntities.reason) {
      params.reason = baseEntities.reason;
    }
    
    // Flag for soft delete
    if (/soft delete|mark as deleted|archive/i.test(text)) {
      params.softDelete = true;
    }
    
    // Flag for cascade delete
    if (/cascade|with related|and all associated/i.test(text)) {
      params.cascade = true;
    }
    
    return params;
  }
  
  /**
   * Extract JSON-like attributes from text
   * 
   * @private
   * @param {string} text - The text to process
   * @returns {Object} - Extracted attributes
   */
  _extractJSONAttributes(text) {
    const attributes = {};
    
    // Look for attribute=value patterns
    const attributePatterns = [
      /(\w+)\s*[:=]\s*['"]?([^'"\n]+?)['"]?(?=\s+\w+\s*[:=]|$)/g,
      /with\s+(\w+)\s+(?:of|set to)\s+['"]?([^'"\n]+?)['"]?(?=\s+(?:and|with)\s+\w+|$)/g
    ];
    
    for (const pattern of attributePatterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const key = match[1].trim().toLowerCase();
        const value = match[2].trim();
        
        // Skip known entity types
        if (this.entityTypes[key]) continue;
        
        // Attempt to parse numeric values
        if (/^\d+$/.test(value)) {
          attributes[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          attributes[key] = parseFloat(value);
        } else if (/^(true|false)$/i.test(value)) {
          attributes[key] = value.toLowerCase() === 'true';
        } else {
          attributes[key] = value;
        }
      }
    }
    
    // Look for actual JSON embedded in the text
    const jsonPattern = /{[\s\S]*?}/g;
    const jsonMatches = [...text.matchAll(jsonPattern)];
    
    for (const match of jsonMatches) {
      try {
        const jsonObj = JSON.parse(match[0]);
        Object.assign(attributes, jsonObj);
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
    
    return attributes;
  }
  
  /**
   * Check parameter completeness based on operation type and entity type
   * 
   * @private
   * @param {Object} entities - Extracted entities and parameters
   * @param {string} operationType - CRUD operation type
   * @param {string} entityType - The entity type being operated on
   * @returns {Object} - Parameter status information
   */
  _checkParameterCompleteness(entities, operationType, entityType) {
    // Define required parameters for each operation type and entity type
    const requiredParams = {
      create: {
        stand: ['name', 'terminal'],
        terminal: ['name'],
        maintenance: ['standId', 'startDate', 'endDate'],
        flight: ['flightNumber', 'airline', 'date']
      },
      read: {
        stand: [], // Either 'id' for single or no required params for list
        terminal: [], // Either 'id' for single or no required params for list
        maintenance: [], // Either 'id' for single or no required params for list
        flight: [] // Either 'id' for single or no required params for list
      },
      update: {
        stand: ['id', 'fieldsToUpdate'],
        terminal: ['id', 'fieldsToUpdate'],
        maintenance: ['id', 'fieldsToUpdate'],
        flight: ['id', 'fieldsToUpdate']
      },
      delete: {
        stand: ['id'],
        terminal: ['id'],
        maintenance: ['id'],
        flight: ['id']
      }
    };
    
    // If no operation type or entity type, return empty status
    if (!operationType || !entityType) {
      return {
        isComplete: false,
        missingParams: [],
        requiredParams: []
      };
    }
    
    // Get required parameters for this operation and entity type
    const required = requiredParams[operationType][entityType] || [];
    
    // Check which parameters are missing
    const missing = required.filter(param => {
      // Special handling for fieldsToUpdate
      if (param === 'fieldsToUpdate') {
        return !entities[param] || Object.keys(entities[param]).length === 0;
      }
      
      return !entities[param];
    });
    
    return {
      isComplete: missing.length === 0,
      missingParams: missing,
      requiredParams: required
    };
  }
}

module.exports = OperationEntityExtractor;