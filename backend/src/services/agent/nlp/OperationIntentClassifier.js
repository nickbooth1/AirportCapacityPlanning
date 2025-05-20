/**
 * OperationIntentClassifier.js
 * 
 * Specializes in classifying CRUD (Create, Read, Update, Delete) operation intents.
 * Extends the base IntentClassifier to focus on data operation queries.
 */

const IntentClassifier = require('./IntentClassifier');

class OperationIntentClassifier extends IntentClassifier {
  /**
   * Create a new operation intent classifier
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the classifier
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Override or extend the intent categories for CRUD operations
    this.intentCategories = {
      ...this.intentCategories,
      
      // CRUD operation categories
      create: [
        'create.stand', 'create.terminal', 'create.pier', 'create.airline',
        'create.airport', 'create.aircraft', 'create.maintenance', 'create.flight',
        'create.allocation', 'create.scenario', 'add.stand', 'add.terminal',
        'add.airline', 'add.airport', 'register.aircraft', 'schedule.maintenance',
        'allocate.stand'
      ],
      
      read: [
        'get.stand', 'get.terminal', 'get.pier', 'get.airline',
        'get.airport', 'get.aircraft', 'get.maintenance', 'get.flight',
        'get.allocation', 'get.scenario', 'view.stand', 'view.terminal',
        'view.flight', 'view.allocation', 'list.stands', 'list.terminals',
        'list.airlines', 'list.airports', 'list.aircraft', 'list.flights',
        'list.allocations', 'list.scenarios', 'show.stand', 'show.terminal'
      ],
      
      update: [
        'update.stand', 'update.terminal', 'update.pier', 'update.airline',
        'update.airport', 'update.aircraft', 'update.maintenance', 'update.flight',
        'update.allocation', 'update.scenario', 'edit.stand', 'edit.terminal',
        'edit.flight', 'edit.allocation', 'modify.stand', 'modify.terminal',
        'modify.maintenance', 'change.stand', 'change.terminal', 'change.allocation'
      ],
      
      delete: [
        'delete.stand', 'delete.terminal', 'delete.pier', 'delete.airline',
        'delete.airport', 'delete.aircraft', 'delete.maintenance', 'delete.flight',
        'delete.allocation', 'delete.scenario', 'remove.stand', 'remove.terminal',
        'remove.airline', 'remove.flight', 'cancel.maintenance', 'cancel.flight',
        'cancel.allocation', 'clear.allocation'
      ]
    };
    
    // Load operation-specific intent definitions
    this.loadOperationIntentDefinitions();
    
    this.logger.info('OperationIntentClassifier initialized');
  }
  
  /**
   * Load operation-specific intent definitions
   */
  loadOperationIntentDefinitions() {
    // Add or replace with operation-specific intent definitions
    const operationIntents = this.getOperationIntentDefinitions();
    
    // Create a set of existing intent names for quick lookup
    const existingIntentNames = new Set(this.intents.map(intent => intent.name));
    
    // Add new intents and replace existing ones
    for (const intent of operationIntents) {
      if (existingIntentNames.has(intent.name)) {
        // Replace existing intent
        const index = this.intents.findIndex(i => i.name === intent.name);
        this.intents[index] = intent;
      } else {
        // Add new intent
        this.intents.push(intent);
      }
    }
    
    this.logger.info(`Loaded ${operationIntents.length} operation intent definitions`);
  }
  
  /**
   * Get operation-specific intent definitions
   * 
   * @returns {Array<Object>} - Array of intent definitions
   */
  getOperationIntentDefinitions() {
    return [
      // CREATE operations
      {
        name: 'create.stand',
        description: 'Create a new stand',
        examples: [
          'Create a new stand',
          'Add a stand to Terminal 1',
          'Register a new stand A15',
          'Create a remote stand for Terminal 2',
          'Add a contact stand with jetway'
        ],
        operation: 'create',
        entityType: 'stand'
      },
      {
        name: 'create.terminal',
        description: 'Create a new terminal',
        examples: [
          'Create a new terminal',
          'Add Terminal 3 to the airport',
          'Register a new terminal',
          'Create a satellite terminal',
          'Add a domestic terminal'
        ],
        operation: 'create',
        entityType: 'terminal'
      },
      {
        name: 'create.airline',
        description: 'Create a new airline',
        examples: [
          'Add a new airline',
          'Create airline ABC',
          'Register a new carrier',
          'Add a new airline with code XYZ',
          'Create an airline called AirTest'
        ],
        operation: 'create',
        entityType: 'airline'
      },
      {
        name: 'create.maintenance',
        description: 'Create a maintenance request or schedule maintenance',
        examples: [
          'Schedule maintenance for stand A1',
          'Create a maintenance request',
          'Add maintenance for Terminal 1 on June 15',
          'Schedule runway maintenance',
          'Create a stand closure for repairs'
        ],
        operation: 'create',
        entityType: 'maintenance'
      },
      {
        name: 'create.flight',
        description: 'Add a new flight or flight schedule',
        examples: [
          'Add a new flight',
          'Create flight AA123',
          'Add a daily flight for XYZ Airlines',
          'Create a new flight schedule',
          'Register flight BA456 arriving tomorrow'
        ],
        operation: 'create',
        entityType: 'flight'
      },
      
      // READ operations
      {
        name: 'get.stand',
        description: 'Get details of a specific stand',
        examples: [
          'Show stand A1',
          'Get details of stand T1B5',
          'View information about stand 23',
          'Show me stand Terminal 2 B10',
          'Get stand G42 details'
        ],
        operation: 'read',
        entityType: 'stand'
      },
      {
        name: 'list.stands',
        description: 'List multiple stands',
        examples: [
          'List all stands',
          'Show all stands in Terminal 1',
          'Get stands for widebody aircraft',
          'List remote stands',
          'Show available stands'
        ],
        operation: 'read',
        entityType: 'stand',
        isList: true
      },
      {
        name: 'get.maintenance',
        description: 'Get details of specific maintenance',
        examples: [
          'Show maintenance request #123',
          'Get details of stand A1 maintenance',
          'View current maintenance on Terminal 2',
          'Show me scheduled maintenance',
          'Get maintenance information for next week'
        ],
        operation: 'read',
        entityType: 'maintenance'
      },
      {
        name: 'list.flights',
        description: 'List multiple flights',
        examples: [
          'List all flights',
          'Show flights for tomorrow',
          'Get all AA flights',
          'List arrivals for Terminal 1',
          'Show departures after 3pm'
        ],
        operation: 'read',
        entityType: 'flight',
        isList: true
      },
      
      // UPDATE operations
      {
        name: 'update.stand',
        description: 'Update a stand\'s information',
        examples: [
          'Update stand A1',
          'Change the information for stand T1B5',
          'Edit stand 23 details',
          'Modify stand T2B10 capacity',
          'Update stand G42 equipment'
        ],
        operation: 'update',
        entityType: 'stand'
      },
      {
        name: 'update.maintenance',
        description: 'Update a maintenance request or schedule',
        examples: [
          'Update maintenance request #123',
          'Change the maintenance schedule for stand A1',
          'Reschedule Terminal 2 maintenance',
          'Extend the maintenance on stand B12',
          'Change the completion date for maintenance'
        ],
        operation: 'update',
        entityType: 'maintenance'
      },
      {
        name: 'update.flight',
        description: 'Update flight information',
        examples: [
          'Update flight AA123',
          'Change the departure time for BA456',
          'Edit flight XY789 gate assignment',
          'Modify the aircraft for flight DL012',
          'Update tomorrow\'s flight schedule'
        ],
        operation: 'update',
        entityType: 'flight'
      },
      {
        name: 'update.allocation',
        description: 'Update stand allocation',
        examples: [
          'Update stand allocation for AA123',
          'Change the stand for flight BA456',
          'Reassign flight XY789 to a different stand',
          'Modify tomorrow\'s allocations',
          'Update gate assignments for Terminal 1'
        ],
        operation: 'update',
        entityType: 'allocation'
      },
      
      // DELETE operations
      {
        name: 'delete.stand',
        description: 'Delete a stand',
        examples: [
          'Delete stand A1',
          'Remove stand T1B5',
          'Delete stand 23 from the system',
          'Remove Terminal 2 stand B10',
          'Decommission stand G42'
        ],
        operation: 'delete',
        entityType: 'stand'
      },
      {
        name: 'delete.maintenance',
        description: 'Delete a maintenance request or cancel maintenance',
        examples: [
          'Cancel maintenance request #123',
          'Delete stand A1 maintenance',
          'Cancel scheduled maintenance on Terminal 2',
          'Remove maintenance from the calendar',
          'Cancel next week\'s maintenance'
        ],
        operation: 'delete',
        entityType: 'maintenance'
      },
      {
        name: 'delete.flight',
        description: 'Delete a flight or cancel a flight',
        examples: [
          'Delete flight AA123',
          'Cancel flight BA456',
          'Remove flight XY789 from the schedule',
          'Cancel tomorrow\'s flights',
          'Delete all flights for airline ZZ'
        ],
        operation: 'delete',
        entityType: 'flight'
      },
      {
        name: 'delete.allocation',
        description: 'Delete a stand allocation',
        examples: [
          'Delete stand allocation for AA123',
          'Remove flight BA456 from its stand',
          'Clear the allocation for flight XY789',
          'Remove all allocations for Terminal 1',
          'Delete tomorrow\'s allocations'
        ],
        operation: 'delete',
        entityType: 'allocation'
      }
    ];
  }
  
  /**
   * Classify intent using rule-based approach, with focus on CRUD operations
   * 
   * @param {string} text - Normalized input text
   * @returns {Object|null} - Classification result or null
   */
  classifyWithRules(text) {
    // First try the base classifier's rules
    const baseResult = super.classifyWithRules(text);
    if (baseResult) {
      return baseResult;
    }
    
    // Convert to lowercase for better matching
    const lowerText = text.toLowerCase();
    
    // Operation-specific rule patterns
    const operationPatterns = [
      // CREATE patterns
      {
        patterns: [
          /create (?:a )?(?:new )?(\w+)/i,
          /add (?:a )?(?:new )?(\w+)/i,
          /register (?:a )?(?:new )?(\w+)/i,
          /schedule (?:a )?(?:new )?(\w+)/i,
          /new (\w+) creation/i
        ],
        operation: 'create'
      },
      // READ patterns
      {
        patterns: [
          /(?:get|show|view|display|find) (?:the )?(\w+)/i,
          /list (?:all )?(\w+)s/i,
          /show (?:all )?(\w+)s/i,
          /view (?:all )?(\w+)s/i,
          /(?:what|where) (?:is|are) (?:the )?(\w+)/i
        ],
        operation: 'read'
      },
      // UPDATE patterns
      {
        patterns: [
          /update (?:the )?(\w+)/i,
          /change (?:the )?(\w+)/i,
          /edit (?:the )?(\w+)/i,
          /modify (?:the )?(\w+)/i,
          /reschedule (?:the )?(\w+)/i
        ],
        operation: 'update'
      },
      // DELETE patterns
      {
        patterns: [
          /delete (?:the )?(\w+)/i,
          /remove (?:the )?(\w+)/i,
          /cancel (?:the )?(\w+)/i,
          /decommission (?:the )?(\w+)/i,
          /clear (?:the )?(\w+)/i
        ],
        operation: 'delete'
      }
    ];
    
    // Entity types to map captured values to specific entities
    const entityTypes = {
      'stand': 'stand',
      'stands': 'stand',
      'terminal': 'terminal',
      'terminals': 'terminal',
      'pier': 'pier',
      'piers': 'pier',
      'airline': 'airline',
      'airlines': 'airline',
      'airport': 'airport',
      'airports': 'airport',
      'aircraft': 'aircraft',
      'flight': 'flight',
      'flights': 'flight',
      'maintenance': 'maintenance',
      'allocation': 'allocation',
      'allocations': 'allocation',
      'scenario': 'scenario',
      'scenarios': 'scenario',
      'gate': 'stand',
      'gates': 'stand'
    };
    
    // Check each operation pattern
    for (const { patterns, operation } of operationPatterns) {
      for (const pattern of patterns) {
        const match = lowerText.match(pattern);
        if (match && match[1]) {
          const capturedEntity = match[1].toLowerCase();
          
          // Check if the captured entity is one we recognize
          const entityType = entityTypes[capturedEntity] || capturedEntity;
          
          // Form the intent name
          const intentName = `${operation}.${entityType}`;
          
          // Check if we have a list operation
          const isList = operation === 'read' && (
            pattern.toString().includes('all') || 
            lowerText.includes('all') || 
            capturedEntity.endsWith('s')
          );
          
          // For list operations, modify the intent name
          const finalIntentName = isList && entityType !== 'maintenance' 
            ? `list.${entityType}s` 
            : intentName;
          
          // Check if this is a valid intent in our definitions
          if (this.getAllIntents().includes(finalIntentName)) {
            return {
              intent: finalIntentName,
              confidence: 0.8,
              match: pattern.toString(),
              operation,
              entityType
            };
          }
        }
      }
    }
    
    // Keyword-based operation intent mapping
    const operationKeywords = {
      'create': ['create', 'add', 'new', 'register', 'schedule', 'insert'],
      'read': ['get', 'show', 'view', 'display', 'list', 'find', 'search', 'query'],
      'update': ['update', 'change', 'edit', 'modify', 'reschedule', 'revise', 'amend'],
      'delete': ['delete', 'remove', 'cancel', 'decommission', 'clear', 'eliminate']
    };
    
    // Entity keywords
    const entityKeywords = {
      'stand': ['stand', 'gate', 'bay', 'parking position'],
      'terminal': ['terminal', 'building'],
      'flight': ['flight', 'arrival', 'departure'],
      'maintenance': ['maintenance', 'repair', 'closure', 'work', 'servicing'],
      'allocation': ['allocation', 'assignment', 'allocated', 'assigned']
    };
    
    // Try to identify operation and entity from keywords
    let bestOperation = null;
    let bestOperationScore = 0;
    let bestEntity = null;
    let bestEntityScore = 0;
    
    // Check operations
    for (const [operation, keywords] of Object.entries(operationKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          const score = keyword.length / lowerText.length; // Simple relevance score
          if (score > bestOperationScore) {
            bestOperation = operation;
            bestOperationScore = score;
          }
        }
      }
    }
    
    // Check entities
    for (const [entity, keywords] of Object.entries(entityKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          const score = keyword.length / lowerText.length; // Simple relevance score
          if (score > bestEntityScore) {
            bestEntity = entity;
            bestEntityScore = score;
          }
        }
      }
    }
    
    // If we have both an operation and entity, construct an intent
    if (bestOperation && bestEntity && bestOperationScore > 0 && bestEntityScore > 0) {
      // Form the intent name
      const intentName = bestOperation === 'read' && lowerText.includes('all')
        ? `list.${bestEntity}s`
        : `${bestOperation}.${bestEntity}`;
      
      // Check if this is a valid intent in our definitions
      if (this.getAllIntents().includes(intentName)) {
        return {
          intent: intentName,
          confidence: bestOperationScore * bestEntityScore * 0.9, // Combined confidence score
          operation: bestOperation,
          entityType: bestEntity
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get CRUD operation type from intent
   * 
   * @param {string} intent - Intent name
   * @returns {string|null} - 'create', 'read', 'update', 'delete', or null
   */
  getOperationType(intent) {
    // Check each operation category
    for (const operation of ['create', 'read', 'update', 'delete']) {
      if (this.intentCategories[operation].includes(intent)) {
        return operation;
      }
    }
    
    // For list intents, the operation is 'read'
    if (intent.startsWith('list.')) {
      return 'read';
    }
    
    // Not a CRUD operation
    return null;
  }
  
  /**
   * Get entity type from intent
   * 
   * @param {string} intent - Intent name
   * @returns {string|null} - Entity type or null
   */
  getEntityType(intent) {
    const parts = intent.split('.');
    if (parts.length === 2) {
      // For regular intents like 'create.stand'
      return parts[1];
    } else if (parts.length === 1 && intent.startsWith('list')) {
      // For list intents, remove the trailing 's'
      const entityType = intent.substring(5); // Remove 'list.'
      return entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    }
    
    return null;
  }
  
  /**
   * Check if the intent is for listing multiple items
   * 
   * @param {string} intent - Intent name
   * @returns {boolean} - True if the intent is for listing multiple items
   */
  isList(intent) {
    return intent.startsWith('list.') || 
           (intent.startsWith('get.') && intent.endsWith('s'));
  }
  
  /**
   * Process a text to classify its CRUD operation intent
   * 
   * @param {string} text - The text to classify
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Classification result with CRUD metadata
   */
  async process(text, context = {}) {
    // Get the base classification result
    const baseResult = await super.process(text, context);
    
    // If no intent was found or there was an error, return the base result
    if (!baseResult.success || !baseResult.data.intent) {
      return baseResult;
    }
    
    // Get the CRUD operation type and entity type
    const intent = baseResult.data.intent;
    const operationType = this.getOperationType(intent);
    const entityType = this.getEntityType(intent);
    const isList = this.isList(intent);
    
    // Enhance with CRUD metadata
    return this.createSuccessResult({
      ...baseResult.data,
      operationType,
      entityType,
      isList,
      requiresConfirmation: ['create', 'update', 'delete'].includes(operationType)
    });
  }
}

module.exports = OperationIntentClassifier;