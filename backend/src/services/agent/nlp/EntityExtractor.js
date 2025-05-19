/**
 * Entity Extractor
 * 
 * This class is responsible for extracting entities from user queries.
 * It identifies and extracts key information like stand IDs, airport codes, 
 * dates, and other domain-specific entities from natural language text.
 */

const NLPProcessorBase = require('./NLPProcessorBase');

class EntityExtractor extends NLPProcessorBase {
  /**
   * Create a new entity extractor
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the extractor
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Get OpenAI service for entity extraction
    this.openAIService = services.openAIService;
    
    // Reference data services for entity validation
    this.airlineService = services.airlineService;
    this.airportService = services.airportService;
    this.standDataService = services.standDataService || 
      (services.knowledgeServices ? services.knowledgeServices.StandDataService : null);
    this.referenceDataService = services.referenceDataService || 
      (services.knowledgeServices ? services.knowledgeServices.ReferenceDataService : null);
    
    // Entity type definitions
    this.entityTypes = options.entityTypes || this.getDefaultEntityTypes();
    
    // Pre-compiled regex patterns for entity extraction
    this.patterns = this.compileEntityPatterns();
  }
  
  /**
   * Get the default entity type definitions
   * 
   * @returns {Object} - Entity type definitions
   */
  getDefaultEntityTypes() {
    return {
      stand: {
        description: 'Stand identifier (e.g. A1, T1B5)',
        patterns: [
          /\b(?:stand|gate)\s+([A-Z0-9]+)\b/i,
          /\bT(\d)[A-Z](\d+)\b/i,
          /\b([A-Z])(\d+)\b/i
        ],
        extract: (match) => match[1] || match[0],
        validate: async (value) => {
          if (this.standDataService) {
            try {
              // Try to find the stand
              const stands = await this.standDataService.getStands({ name: value });
              return stands && stands.length > 0;
            } catch (error) {
              return false;
            }
          }
          // If no validation service, assume it's valid
          return true;
        }
      },
      terminal: {
        description: 'Terminal identifier (e.g. T1, Terminal 2)',
        patterns: [
          /\bT(\d+)\b/i,
          /\bterminal\s+(\d+)\b/i
        ],
        extract: (match) => {
          const num = match[1];
          return `T${num}`;
        }
      },
      pier: {
        description: 'Pier identifier (e.g. A, Pier B)',
        patterns: [
          /\bpier\s+([A-Z])\b/i,
          /\b(?:^|\s)([A-Z])(?:\s|$)\b/i
        ],
        extract: (match) => match[1]
      },
      airport: {
        description: 'Airport IATA code (e.g. LHR, JFK)',
        patterns: [
          /\b([A-Z]{3})\b/i,
          /\bairport\s+([A-Z]{3})\b/i
        ],
        extract: (match) => match[1].toUpperCase(),
        validate: async (value) => {
          if (this.airportService) {
            try {
              const airport = await this.airportService.getAirportByIATA(value);
              return !!airport;
            } catch (error) {
              return false;
            }
          }
          // If no validation service, assume it's valid
          return true;
        }
      },
      airline: {
        description: 'Airline IATA code (e.g. BA, AA)',
        patterns: [
          /\b([A-Z]{2})\b/i,
          /\bairline\s+([A-Z]{2})\b/i
        ],
        extract: (match) => match[1].toUpperCase(),
        validate: async (value) => {
          if (this.airlineService) {
            try {
              const airline = await this.airlineService.getAirlineByIATA(value);
              return !!airline;
            } catch (error) {
              return false;
            }
          }
          // If no validation service, assume it's valid
          return true;
        }
      },
      aircraftType: {
        description: 'Aircraft type IATA code (e.g. 738, 320)',
        patterns: [
          /\b([0-9]{3})\b/,
          /\b([A-Z][0-9]{2}[0-9A-Z]?)\b/i
        ],
        extract: (match) => match[1],
        validate: async (value) => {
          if (this.referenceDataService) {
            try {
              const aircraft = await this.referenceDataService.getAircraftTypeByIATA(value);
              return !!aircraft;
            } catch (error) {
              return false;
            }
          }
          return true;
        }
      },
      date: {
        description: 'Date (e.g. tomorrow, next Monday, 2023-05-15)',
        patterns: [
          /\b(today|tomorrow|yesterday)\b/i,
          /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
          /\b(20\d{2})-([01]\d)-([0-3]\d)\b/
        ],
        extract: (match) => match[0],
        parse: (value) => {
          const now = new Date();
          
          if (/today/i.test(value)) {
            return now.toISOString().split('T')[0];
          } else if (/tomorrow/i.test(value)) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
          } else if (/yesterday/i.test(value)) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
          } else if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(value)) {
            const dayMatch = value.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
            const dayName = dayMatch[1].toLowerCase();
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = daysOfWeek.indexOf(dayName);
            
            const resultDate = new Date(now);
            const currentDay = resultDate.getDay();
            
            // Calculate days to add to get to the next occurrence of target day
            let daysToAdd = (targetDay - currentDay + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7; // If today is the target day, go to next week
            
            resultDate.setDate(resultDate.getDate() + daysToAdd);
            return resultDate.toISOString().split('T')[0];
          } else {
            // Try to parse as a date string
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch (e) {
              // If parsing fails, return the original value
              return value;
            }
            
            return value;
          }
        }
      },
      time: {
        description: 'Time (e.g. 9am, 14:30)',
        patterns: [
          /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/,
          /\b([1-9]|1[0-2])\s*(am|pm)\b/i
        ],
        extract: (match) => match[0],
        parse: (value) => {
          // Convert 12-hour format to 24-hour
          const amPmMatch = value.match(/([1-9]|1[0-2])\s*(am|pm)/i);
          if (amPmMatch) {
            let hour = parseInt(amPmMatch[1], 10);
            const isPM = /pm/i.test(amPmMatch[2]);
            
            if (isPM && hour < 12) hour += 12;
            if (!isPM && hour === 12) hour = 0;
            
            return `${hour.toString().padStart(2, '0')}:00`;
          }
          
          // Return HH:MM format as is
          return value;
        }
      },
      duration: {
        description: 'Duration (e.g. 2 hours, 30 minutes)',
        patterns: [
          /\b(\d+)\s*(hour|hr|hours|hrs)\b/i,
          /\b(\d+)\s*(minute|min|minutes|mins)\b/i,
          /\b(\d+)\s*(day|days)\b/i
        ],
        extract: (match) => match[0],
        parse: (value) => {
          // Convert to minutes for standardization
          const hourMatch = value.match(/(\d+)\s*(hour|hr|hours|hrs)/i);
          const minuteMatch = value.match(/(\d+)\s*(minute|min|minutes|mins)/i);
          const dayMatch = value.match(/(\d+)\s*(day|days)/i);
          
          let minutes = 0;
          
          if (hourMatch) {
            minutes += parseInt(hourMatch[1], 10) * 60;
          }
          
          if (minuteMatch) {
            minutes += parseInt(minuteMatch[1], 10);
          }
          
          if (dayMatch) {
            minutes += parseInt(dayMatch[1], 10) * 24 * 60;
          }
          
          return minutes;
        }
      },
      boolean: {
        description: 'Boolean value (e.g. yes, no, true, false)',
        patterns: [
          /\b(yes|no|true|false)\b/i
        ],
        extract: (match) => match[1].toLowerCase(),
        parse: (value) => {
          return ['yes', 'true'].includes(value.toLowerCase());
        }
      },
      number: {
        description: 'Numeric value',
        patterns: [
          /\b(\d+)\b/,
          /\b(\d+\.\d+)\b/
        ],
        extract: (match) => match[1],
        parse: (value) => {
          return parseFloat(value);
        }
      },
      limit: {
        description: 'Result limit (e.g. top 5, first 10)',
        patterns: [
          /\btop\s+(\d+)\b/i,
          /\bfirst\s+(\d+)\b/i,
          /\blimit\s+(\d+)\b/i
        ],
        extract: (match) => match[1],
        parse: (value) => {
          return parseInt(value, 10);
        }
      },
      format: {
        description: 'Result format (e.g. detailed, summary, simple)',
        patterns: [
          /\b(detailed|summary|simple)\s+format\b/i,
          /\bin\s+(detailed|summary|simple)\s+format\b/i
        ],
        extract: (match) => match[1].toLowerCase()
      }
    };
  }
  
  /**
   * Compile regex patterns for entity extraction
   * 
   * @returns {Object} - Compiled patterns
   */
  compileEntityPatterns() {
    const patterns = {};
    
    // Compile patterns for each entity type
    for (const [entityType, config] of Object.entries(this.entityTypes)) {
      patterns[entityType] = config.patterns;
    }
    
    return patterns;
  }
  
  /**
   * Process a text to extract entities
   * 
   * @param {string} text - The text to process
   * @param {Object} context - Additional context (including intent)
   * @returns {Promise<Object>} - Extraction result
   */
  async process(text, context = {}) {
    return this.trackPerformance(async () => {
      try {
        // Trim and normalize the text
        const normalizedText = this.normalizeText(text);
        
        if (!normalizedText) {
          return this.createErrorResult(
            'Empty or invalid text input',
            'INVALID_INPUT'
          );
        }
        
        // Extract entities using rule-based approach
        const ruleBasedEntities = await this.extractEntitiesWithRules(normalizedText);
        
        // If we have an intent in the context, use it to guide AI extraction
        const intent = context.intent || null;
        
        // Use AI to extract entities, especially for more complex cases
        const aiEntities = await this.extractEntitiesWithAI(normalizedText, intent, ruleBasedEntities);
        
        // Merge entities, preferring AI results where available
        const mergedEntities = this.mergeEntities(ruleBasedEntities, aiEntities);
        
        // Final validation and processing of extracted entities
        const processedEntities = await this.processExtractedEntities(mergedEntities);
        
        return this.createSuccessResult(processedEntities, {
          entityCount: Object.keys(processedEntities).length
        });
      } catch (error) {
        this.logger.error(`Error extracting entities: ${error.message}`);
        return this.createErrorResult(
          `Entity extraction error: ${error.message}`,
          'PROCESSING_ERROR'
        );
      }
    }, 'entity extraction');
  }
  
  /**
   * Normalize input text for processing
   * 
   * @param {string} text - Input text
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text.trim();
  }
  
  /**
   * Extract entities using rule-based approach
   * 
   * @param {string} text - Normalized text
   * @returns {Promise<Object>} - Extracted entities
   */
  async extractEntitiesWithRules(text) {
    const entities = {};
    
    // Check each entity type's patterns
    for (const [entityType, patterns] of Object.entries(this.patterns)) {
      const entityConfig = this.entityTypes[entityType];
      
      // Try each pattern for this entity type
      for (const pattern of patterns) {
        const matches = [...text.matchAll(new RegExp(pattern, 'gi'))];
        
        if (matches.length > 0) {
          // For the first match, use direct assignment
          if (!entities[entityType]) {
            const value = entityConfig.extract(matches[0]);
            entities[entityType] = value;
          } 
          // For subsequent matches, create an array
          else {
            // Convert to array if not already
            if (!Array.isArray(entities[entityType])) {
              entities[entityType] = [entities[entityType]];
            }
            
            // Add new match if not already included
            const value = entityConfig.extract(matches[0]);
            if (!entities[entityType].includes(value)) {
              entities[entityType].push(value);
            }
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Extract entities using AI
   * 
   * @param {string} text - Normalized text
   * @param {string|null} intent - The intent (if available)
   * @param {Object} ruleBasedEntities - Entities already extracted by rules
   * @returns {Promise<Object|null>} - Extracted entities or null
   */
  async extractEntitiesWithAI(text, intent, ruleBasedEntities) {
    // Check if OpenAI service is available
    if (!this.openAIService || !this.openAIService.isAvailable) {
      this.logger.warn('OpenAI service not available for entity extraction');
      return null;
    }
    
    try {
      // Prepare entity type descriptions
      const entityDescriptions = Object.entries(this.entityTypes)
        .map(([type, config]) => `${type}: ${config.description}`)
        .join('\n');
      
      // Format the system message to guide the extraction
      let systemMessage = `
        You are an entity extraction system for an airport capacity planning agent.
        Extract entities from the query and respond with a JSON object.
        
        Entities to extract:
        ${entityDescriptions}
        
        Format your response as a JSON object with entity types as keys and extracted values.
        For example: {"stand": "A1", "terminal": "T2"}
        
        If no entities are found, respond with: {}
      `;
      
      // If an intent is provided, add it to the system message
      if (intent) {
        systemMessage += `\n\nThe query intent is: ${intent}\nFocus on entities relevant to this intent.`;
      }
      
      // If rule-based entities were found, add them for context
      if (ruleBasedEntities && Object.keys(ruleBasedEntities).length > 0) {
        systemMessage += `\n\nEntities already identified: ${JSON.stringify(ruleBasedEntities)}`;
      }
      
      // Create the messages array
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: text }
      ];
      
      // Call the OpenAI API
      const response = await this.openAIService.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.2,
        max_tokens: 150
      });
      
      if (!response || !response.choices || response.choices.length === 0) {
        this.logger.warn('Empty or invalid response from AI entity extractor');
        return null;
      }
      
      // Get the response content
      const content = response.choices[0].message.content.trim();
      
      // Parse the JSON response
      try {
        // Extract the JSON from the response
        const jsonMatch = content.match(/\{.*\}/s);
        
        if (!jsonMatch) {
          this.logger.warn(`Could not extract JSON from AI response: ${content}`);
          return null;
        }
        
        const result = JSON.parse(jsonMatch[0]);
        
        return result;
      } catch (parseError) {
        this.logger.error(`Error parsing AI response: ${parseError.message}, Response: ${content}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error in AI entity extraction: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Merge entities from different extraction methods
   * 
   * @param {Object} ruleBasedEntities - Entities from rule-based extraction
   * @param {Object|null} aiEntities - Entities from AI extraction
   * @returns {Object} - Merged entities
   */
  mergeEntities(ruleBasedEntities, aiEntities) {
    // If no AI entities, just return rule-based ones
    if (!aiEntities) {
      return { ...ruleBasedEntities };
    }
    
    const mergedEntities = { ...ruleBasedEntities };
    
    // Add or merge AI entities
    for (const [entityType, value] of Object.entries(aiEntities)) {
      // If entity doesn't exist in rule-based, just add it
      if (!mergedEntities[entityType]) {
        mergedEntities[entityType] = value;
        continue;
      }
      
      // If both are arrays, combine them
      if (Array.isArray(mergedEntities[entityType]) && Array.isArray(value)) {
        // Add unique values from AI entities
        for (const item of value) {
          if (!mergedEntities[entityType].includes(item)) {
            mergedEntities[entityType].push(item);
          }
        }
      } 
      // If rule-based is array but AI is not, add to array if unique
      else if (Array.isArray(mergedEntities[entityType])) {
        if (!mergedEntities[entityType].includes(value)) {
          mergedEntities[entityType].push(value);
        }
      }
      // If AI is array but rule-based is not, convert to array and combine
      else if (Array.isArray(value)) {
        const existingValue = mergedEntities[entityType];
        mergedEntities[entityType] = [existingValue, ...value.filter(v => v !== existingValue)];
      }
      // If neither is array, convert to array if different
      else if (mergedEntities[entityType] !== value) {
        mergedEntities[entityType] = [mergedEntities[entityType], value];
      }
      // Otherwise (both same value), keep as is
    }
    
    return mergedEntities;
  }
  
  /**
   * Process and validate extracted entities
   * 
   * @param {Object} entities - Extracted entities
   * @returns {Promise<Object>} - Processed entities
   */
  async processExtractedEntities(entities) {
    const processedEntities = {};
    
    // Process each entity type
    for (const [entityType, value] of Object.entries(entities)) {
      const entityConfig = this.entityTypes[entityType];
      
      if (!entityConfig) {
        // Unknown entity type, keep as is
        processedEntities[entityType] = value;
        continue;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        const processedValues = [];
        
        for (const item of value) {
          // Validate if a validator is available
          if (entityConfig.validate) {
            try {
              const isValid = await entityConfig.validate(item);
              if (!isValid) continue; // Skip invalid values
            } catch (error) {
              this.logger.warn(`Validation error for ${entityType} '${item}': ${error.message}`);
              continue;
            }
          }
          
          // Parse if a parser is available
          if (entityConfig.parse) {
            try {
              processedValues.push(entityConfig.parse(item));
            } catch (error) {
              this.logger.warn(`Parsing error for ${entityType} '${item}': ${error.message}`);
              processedValues.push(item); // Use original value as fallback
            }
          } else {
            processedValues.push(item);
          }
        }
        
        // Only use array if we have multiple values
        if (processedValues.length > 1) {
          processedEntities[entityType] = processedValues;
        } else if (processedValues.length === 1) {
          processedEntities[entityType] = processedValues[0];
        }
      } 
      // Handle single values
      else {
        // Validate if a validator is available
        if (entityConfig.validate) {
          try {
            const isValid = await entityConfig.validate(value);
            if (!isValid) continue; // Skip invalid values
          } catch (error) {
            this.logger.warn(`Validation error for ${entityType} '${value}': ${error.message}`);
            continue;
          }
        }
        
        // Parse if a parser is available
        if (entityConfig.parse) {
          try {
            processedEntities[entityType] = entityConfig.parse(value);
          } catch (error) {
            this.logger.warn(`Parsing error for ${entityType} '${value}': ${error.message}`);
            processedEntities[entityType] = value; // Use original value as fallback
          }
        } else {
          processedEntities[entityType] = value;
        }
      }
    }
    
    return processedEntities;
  }
}

module.exports = EntityExtractor;