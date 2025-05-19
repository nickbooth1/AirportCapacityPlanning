/**
 * Intent Classifier
 * 
 * This class is responsible for classifying user queries into specific intents.
 * It uses a combination of rules and AI models to determine the most likely intent
 * of a user's query.
 */

const NLPProcessorBase = require('./NLPProcessorBase');

class IntentClassifier extends NLPProcessorBase {
  /**
   * Create a new intent classifier
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the classifier
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Get OpenAI service for classification
    this.openAIService = services.openAIService;
    
    // Intent definitions 
    this.intents = options.intents || [];
    
    // Intent categories from our query handlers
    this.intentCategories = {
      asset: [
        'stand.details', 'stand.info', 'stand.status', 'stand.find',
        'stand.location', 'stand.nearest', 'terminal.stands', 'pier.stands',
        'stand.capability', 'stand.aircraft', 'aircraft.stands', 'stand.equipment'
      ],
      reference: [
        'airport.info', 'airport.details', 'airport.search', 'airport.list',
        'airline.info', 'airline.details', 'airline.search', 'airline.list', 'route.airlines',
        'gha.info', 'gha.details', 'gha.search', 'gha.list', 'airline.gha', 'airport.gha',
        'aircraft.info', 'aircraft.details', 'aircraft.search', 'aircraft.list', 'aircraft.size'
      ],
      maintenance: [
        'maintenance.status', 'maintenance.schedule', 'maintenance.request',
        'maintenance.impact', 'maintenance.upcoming', 'stand.maintenance'
      ],
      operational: [
        'capacity.current', 'capacity.forecast', 'capacity.impact',
        'allocation.status', 'allocation.conflicts', 'operational.settings'
      ]
    };
    
    // Load intent examples and descriptions
    this.loadIntentDefinitions();
  }
  
  /**
   * Load intent definitions, examples and descriptions
   */
  loadIntentDefinitions() {
    // If intents are already provided, use those
    if (this.intents.length > 0) {
      return;
    }
    
    // Otherwise, load the default intent definitions
    this.intents = this.getDefaultIntentDefinitions();
    
    // Log the number of loaded intents
    this.logger.info(`Loaded ${this.intents.length} intent definitions`);
  }
  
  /**
   * Get the default intent definitions
   * 
   * @returns {Array<Object>} - Array of intent definitions
   */
  getDefaultIntentDefinitions() {
    // This could be loaded from a file or database in a real implementation
    return [
      {
        name: 'stand.details',
        description: 'Get details about a specific stand',
        examples: [
          'Tell me about stand A1',
          'Show information for stand T2B10',
          'What are the details of stand 15?',
          'Give me details on stand Terminal 1 B5'
        ]
      },
      {
        name: 'stand.info',
        description: 'Get general information about stands',
        examples: [
          'How many stands do we have?',
          'What types of stands are available?',
          'Tell me about our stands',
          'Give me information about the stands'
        ]
      },
      {
        name: 'stand.status',
        description: 'Check the status or availability of a stand',
        examples: [
          'Is stand A1 available?',
          'What is the status of stand T2B10?',
          'Check if stand 15 is under maintenance',
          'Is stand T1B5 operational?'
        ]
      },
      // More intent definitions would be added here...
      // Examples for other categories
      {
        name: 'airport.info',
        description: 'Get information about an airport',
        examples: [
          'Tell me about LHR airport',
          'What information do you have on JFK?',
          'Show details for London Heathrow',
          'Give me information about Frankfurt Airport'
        ]
      },
      {
        name: 'maintenance.status',
        description: 'Check the status of maintenance activities',
        examples: [
          'What maintenance is currently happening?',
          'Show me the status of all maintenance requests',
          'Any stands under maintenance right now?',
          'What is the current maintenance situation?'
        ]
      },
      {
        name: 'capacity.current',
        description: 'Get information about current capacity',
        examples: [
          'What is our current capacity?',
          'How many more flights can we handle today?',
          'Show me the current capacity status',
          'What is the capacity utilization right now?'
        ]
      }
    ];
  }
  
  /**
   * Get all available intents
   * 
   * @returns {Array<string>} - List of all intent names
   */
  getAllIntents() {
    return this.intents.map(intent => intent.name);
  }
  
  /**
   * Get example queries for a specific intent
   * 
   * @param {string} intentName - Name of the intent
   * @returns {Array<string>} - Example queries for the intent
   */
  getExamplesForIntent(intentName) {
    const intent = this.intents.find(i => i.name === intentName);
    return intent ? intent.examples : [];
  }
  
  /**
   * Process a text to classify its intent
   * 
   * @param {string} text - The text to classify
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Classification result
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
        
        // Try rule-based classification first for very obvious intents
        const ruleBasedResult = this.classifyWithRules(normalizedText);
        
        if (ruleBasedResult && ruleBasedResult.confidence > this.confidence.highThreshold) {
          return this.createSuccessResult({
            intent: ruleBasedResult.intent,
            confidence: ruleBasedResult.confidence,
            method: 'rules'
          });
        }
        
        // If no high-confidence rule match, use AI classification
        const aiResult = await this.classifyWithAI(normalizedText, context);
        
        // Combine results if both methods returned something
        if (ruleBasedResult && aiResult) {
          // If AI result is high confidence, prefer it
          if (aiResult.confidence > this.confidence.threshold) {
            return this.createSuccessResult({
              intent: aiResult.intent,
              confidence: aiResult.confidence,
              method: 'ai',
              alternativeIntent: ruleBasedResult.intent,
              alternativeConfidence: ruleBasedResult.confidence
            });
          } 
          // Otherwise, if rule-based result has higher confidence, use that
          else if (ruleBasedResult.confidence > aiResult.confidence) {
            return this.createSuccessResult({
              intent: ruleBasedResult.intent,
              confidence: ruleBasedResult.confidence,
              method: 'rules',
              alternativeIntent: aiResult.intent,
              alternativeConfidence: aiResult.confidence
            });
          }
        }
        
        // If AI classification failed, fall back to rule-based
        if (!aiResult && ruleBasedResult) {
          return this.createSuccessResult({
            intent: ruleBasedResult.intent,
            confidence: ruleBasedResult.confidence,
            method: 'rules'
          });
        }
        
        // If we have an AI result, return it
        if (aiResult) {
          return this.createSuccessResult({
            intent: aiResult.intent,
            confidence: aiResult.confidence,
            method: 'ai'
          });
        }
        
        // If all methods failed, return an error
        return this.createErrorResult(
          'Failed to classify intent',
          'CLASSIFICATION_FAILED'
        );
      } catch (error) {
        this.logger.error(`Error classifying intent: ${error.message}`);
        return this.createErrorResult(
          `Intent classification error: ${error.message}`,
          'PROCESSING_ERROR'
        );
      }
    }, 'intent classification');
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
   * Classify intent using rule-based approach
   * 
   * @param {string} text - Normalized input text
   * @returns {Object|null} - Classification result or null
   */
  classifyWithRules(text) {
    // Convert to lowercase for better matching
    const lowerText = text.toLowerCase();
    
    // Pattern-based rules for common intents
    const rules = [
      // Stand detail patterns
      {
        patterns: [
          /details? (?:for|of|about) stand ([a-z0-9]+)/i,
          /tell me about stand ([a-z0-9]+)/i,
          /information (?:for|on|about) stand ([a-z0-9]+)/i,
          /stand ([a-z0-9]+) details/i
        ],
        intent: 'stand.details'
      },
      // Stand status patterns
      {
        patterns: [
          /status (?:of|for) stand ([a-z0-9]+)/i,
          /is stand ([a-z0-9]+) available/i,
          /stand ([a-z0-9]+) (?:status|availability)/i,
          /available stands/i
        ],
        intent: 'stand.status'
      },
      // Airport info patterns
      {
        patterns: [
          /information (?:about|on) ([a-z]{3}) airport/i,
          /tell me about ([a-z]{3})/i,
          /details? (?:for|of|about) ([a-z]{3}) airport/i
        ],
        intent: 'airport.info'
      },
      // Airline info patterns
      {
        patterns: [
          /information (?:about|on) ([a-z]{2}) airline/i,
          /tell me about ([a-z]{2}) airlines?/i,
          /details? (?:for|of|about) ([a-z]{2}) airlines?/i
        ],
        intent: 'airline.info'
      },
      // Aircraft info patterns
      {
        patterns: [
          /information (?:about|on) ([a-z0-9]{3,4}) aircraft/i,
          /tell me about ([a-z0-9]{3,4}) aircraft/i,
          /details? (?:for|of|about) ([a-z0-9]{3,4}) aircraft/i
        ],
        intent: 'aircraft.info'
      }
    ];
    
    // Check each rule
    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(lowerText)) {
          return {
            intent: rule.intent,
            confidence: 0.85, // High confidence for pattern matches
            match: pattern.toString()
          };
        }
      }
    }
    
    // Keyword-based intent mapping for simpler cases
    const keywordMap = {
      'stand.info': ['stands', 'stand information', 'how many stands', 'stand types'],
      'capacity.current': ['current capacity', 'capacity now', 'how much capacity', 'capacity status'],
      'maintenance.status': ['current maintenance', 'maintenance status', 'stands under maintenance'],
      'airport.list': ['list airports', 'available airports', 'all airports', 'supported airports']
    };
    
    // Check each keyword set
    for (const [intent, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return {
            intent,
            confidence: 0.75, // Medium confidence for keyword matches
            match: keyword
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Classify intent using AI
   * 
   * @param {string} text - Normalized input text
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} - Classification result or null
   */
  async classifyWithAI(text, context = {}) {
    // Check if OpenAI service is available
    if (!this.openAIService || !this.openAIService.isAvailable) {
      this.logger.warn('OpenAI service not available for intent classification');
      return null;
    }
    
    // Get all potential intents for the model to choose from
    const availableIntents = this.getAllIntents();
    
    if (availableIntents.length === 0) {
      this.logger.warn('No intent definitions available for classification');
      return null;
    }
    
    try {
      // Prepare the list of intents with descriptions
      const intentDescriptions = this.intents.map(intent => 
        `${intent.name}: ${intent.description}`
      ).join('\n');
      
      // Format the system message to guide the classification
      const systemMessage = `
        You are an intent classifier for an airport capacity planning agent.
        Classify the query into one of these intents:
        ${intentDescriptions}
        
        Respond with ONLY the intent name and the confidence score (0.0 to 1.0).
        Format: {intent: "intent.name", confidence: 0.XX}
        If you cannot classify with at least 50% confidence, respond with: {intent: null, confidence: 0.0}
      `;
      
      // Create conversation with context if available
      let messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: text }
      ];
      
      // If there's relevant context, add it
      if (context.recentIntents && context.recentIntents.length > 0) {
        const contextMsg = `Recent conversation context: ${context.recentIntents.join(', ')}`;
        messages.splice(1, 0, { role: 'system', content: contextMsg });
      }
      
      // Call the OpenAI API
      const response = await this.openAIService.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.3,
        max_tokens: 50
      });
      
      if (!response || !response.choices || response.choices.length === 0) {
        this.logger.warn('Empty or invalid response from AI intent classifier');
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
        
        // Validate the result
        if (!result.intent && result.confidence === 0) {
          this.logger.info('AI could not classify with sufficient confidence');
          return null;
        }
        
        // Check if the intent is valid
        if (result.intent && !availableIntents.includes(result.intent)) {
          this.logger.warn(`AI returned invalid intent: ${result.intent}`);
          return null;
        }
        
        return {
          intent: result.intent,
          confidence: result.confidence,
          aiResponse: content
        };
      } catch (parseError) {
        this.logger.error(`Error parsing AI response: ${parseError.message}, Response: ${content}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error in AI intent classification: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get intent category
   * 
   * @param {string} intent - Intent name
   * @returns {string|null} - Category name or null if not found
   */
  getIntentCategory(intent) {
    for (const [category, intents] of Object.entries(this.intentCategories)) {
      if (intents.includes(intent)) {
        return category;
      }
    }
    return null;
  }
}

module.exports = IntentClassifier;