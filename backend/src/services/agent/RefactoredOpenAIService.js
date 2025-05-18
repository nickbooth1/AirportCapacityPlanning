/**
 * OpenAI Service - Refactored for DI
 * 
 * This service provides integration with OpenAI APIs for natural language processing
 * using the new BaseService pattern with dependency injection.
 */

const { OpenAI } = require('openai');
const BaseService = require('../BaseService');

class OpenAIService extends BaseService {
  /**
   * Create a new OpenAIService
   * 
   * @param {Object} logger - Logger instance
   * @param {Object} config - Application configuration
   */
  constructor(logger, config) {
    super({ logger });
    
    this.config = config;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    
    this.tokenUsage = {
      prompt: 0,
      completion: 0,
      total: 0
    };
  }
  
  /**
   * Initialize the service
   * 
   * @protected
   * @returns {Promise<void>}
   */
  async _initializeService() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      try {
        this.client = new OpenAI({
          apiKey,
          // Add any additional configuration options here
          maxRetries: 3,
          timeout: 60000
        });
        
        this.isAvailable = true;
        this.logger.info('OpenAI client initialized successfully');
      } catch (error) {
        this.isAvailable = false;
        this.logger.error(`Failed to initialize OpenAI client: ${error.message}`);
        
        // Initialize mock client for development/testing
        this._initializeMockClient();
      }
    } else {
      this.isAvailable = false;
      this.logger.warn('OpenAI API key not provided, using mock client');
      this._initializeMockClient();
    }
  }
  
  /**
   * Initialize a mock client for testing when API key is not available
   * 
   * @private
   */
  _initializeMockClient() {
    this.client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({ mock: "response" })
                }
              }
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150
            }
          })
        }
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: Array(1536).fill(0).map((_, i) => i / 1536)
            }
          ],
          usage: {
            prompt_tokens: 50,
            total_tokens: 50
          }
        })
      }
    };
  }
  
  /**
   * Process a natural language query using the OpenAI API
   * 
   * @param {string} query - The user's query
   * @param {Array} conversationHistory - Array of previous messages in the conversation
   * @param {Object} systemPrompt - System prompt to guide the model's behavior
   * @returns {Promise<Object>} - The processed response
   */
  async processQuery(query, conversationHistory = [], systemPrompt = null) {
    await this._ensureInitialized();
    
    return this._trackOperation(async () => {
      try {
        if (!this.isAvailable) {
          return {
            text: 'The OpenAI service is currently unavailable. Please check your API key configuration.',
            error: 'Service unavailable'
          };
        }
        
        const messages = [];
        
        // Add system prompt if provided
        if (systemPrompt) {
          messages.push({
            role: 'system',
            content: systemPrompt
          });
        } else {
          // Default system prompt
          messages.push({
            role: 'system',
            content: `You are an AI assistant for airport capacity planning.
You have access to information about airport stands, capacity, and maintenance.
Provide clear, concise answers about the current airport state.
If you need more information to answer a question accurately, please ask for clarification.
Your responses should be helpful and focused on airport operations.`
          });
        }
        
        // Add conversation history
        if (conversationHistory && Array.isArray(conversationHistory)) {
          conversationHistory.forEach(message => {
            if (message && message.role && message.content) {
              messages.push({
                role: message.role,
                content: message.content
              });
            }
          });
        }
        
        // Add the current query
        messages.push({
          role: 'user',
          content: query
        });
        
        // Make the API call
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        });
        
        // Update token usage
        this._updateTokenUsage(completion.usage);
        
        return {
          text: completion.choices[0]?.message?.content || '',
          usage: completion.usage,
          model: completion.model
        };
      } catch (error) {
        this.logger.error(`OpenAI API Error: ${error.message}`);
        throw new Error(`Failed to process query: ${error.message}`);
      }
    });
  }
  
  /**
   * Extract entities and intent from a query
   * 
   * @param {string} query - The user's query
   * @returns {Promise<Object>} - Extracted entities and intent
   */
  async extractEntities(query) {
    await this._ensureInitialized();
    
    return this._trackOperation(async () => {
      try {
        if (!this.isAvailable) {
          return {
            intent: null,
            confidence: 0,
            entities: {}
          };
        }
        
        const messages = [
          {
            role: 'system',
            content: `You are an AI assistant for airport capacity planning.
Your task is to extract entities and intent from user queries.
Respond with a JSON object containing:
- intent: The primary user intent (capacity_query, maintenance_query, infrastructure_query, etc.)
- confidence: A number between 0 and 1 indicating confidence in the intent classification
- entities: An object containing extracted entities such as:
  * terminal: Terminal name/number
  * stand: Stand identifier
  * aircraft_type: Type of aircraft (e.g., wide-body, narrow-body, A320, etc.)
  * time_period: Time expression (e.g., today, next week, October 5th, etc.)
  * Any other relevant entities

Only extract what is explicitly mentioned in the query.`
          },
          {
            role: 'user',
            content: query
          }
        ];
        
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });
        
        // Update token usage
        this._updateTokenUsage(completion.usage);
        
        // Parse the JSON response
        const responseText = completion.choices[0]?.message?.content || '{}';
        const parsedResponse = this._safeJsonParse(responseText, {});
        
        return {
          intent: parsedResponse.intent || null,
          confidence: parsedResponse.confidence || 0,
          entities: parsedResponse.entities || {},
          usage: completion.usage
        };
      } catch (error) {
        this.logger.error(`Entity Extraction Error: ${error.message}`);
        // Return empty result on error
        return {
          intent: null,
          confidence: 0,
          entities: {},
          error: error.message
        };
      }
    });
  }
  
  /**
   * Generate text embeddings using OpenAI's embeddings API
   * 
   * @param {string|Array<string>} input - Text to embed, can be a string or array of strings
   * @param {Object} options - Options for the embeddings request
   * @returns {Promise<Object>} - Embedding results
   */
  async createEmbeddings(input, options = {}) {
    await this._ensureInitialized();
    
    return this._trackOperation(async () => {
      try {
        if (!this.isAvailable) {
          return {
            error: 'Service unavailable',
            embeddings: null
          };
        }
        
        // Validate input
        if (!input || (Array.isArray(input) && input.length === 0)) {
          throw new Error('Input text is required for creating embeddings');
        }
        
        const { dimensions = 1536, model = this.embeddingModel } = options;
        
        // Create embeddings request
        const response = await this.client.embeddings.create({
          model,
          input,
          dimensions
        });
        
        // Update token usage if available
        if (response.usage) {
          this._updateTokenUsage({
            prompt_tokens: response.usage.prompt_tokens || 0,
            completion_tokens: 0,
            total_tokens: response.usage.total_tokens || response.usage.prompt_tokens || 0
          });
        }
        
        // Extract embeddings from response
        let embeddings;
        
        if (Array.isArray(input)) {
          // Multiple inputs - return array of embeddings
          embeddings = response.data.map(item => item.embedding);
        } else {
          // Single input - return single embedding
          embeddings = response.data[0].embedding;
        }
        
        return {
          embeddings,
          usage: response.usage,
          model: response.model
        };
      } catch (error) {
        this.logger.error(`Embeddings API Error: ${error.message}`);
        throw new Error(`Failed to create embeddings: ${error.message}`);
      }
    });
  }
  
  /**
   * Update token usage statistics
   * 
   * @private
   * @param {Object} usage - Token usage data from API response
   */
  _updateTokenUsage(usage) {
    if (usage) {
      this.tokenUsage.prompt += usage.prompt_tokens || 0;
      this.tokenUsage.completion += usage.completion_tokens || 0;
      this.tokenUsage.total += usage.total_tokens || 0;
      
      // Log token usage
      this.logger.debug(`OpenAI Token Usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }
  }
  
  /**
   * Get current token usage statistics
   * 
   * @returns {Object} - Token usage data
   */
  getTokenUsage() {
    return { ...this.tokenUsage };
  }
  
  /**
   * Reset token usage statistics
   */
  resetTokenUsage() {
    this.tokenUsage = {
      prompt: 0,
      completion: 0,
      total: 0
    };
  }
  
  /**
   * Safe JSON parsing with fallback
   * 
   * @private
   * @param {string} text - JSON text to parse
   * @param {any} fallback - Fallback value if parsing fails
   * @returns {any} - Parsed object or fallback
   */
  _safeJsonParse(text, fallback = {}) {
    try {
      return JSON.parse(text);
    } catch (error) {
      this.logger.warn(`JSON parse error: ${error.message}`);
      return fallback;
    }
  }
}

// Factory function for DI registration
function createOpenAIService(logger, config) {
  return new OpenAIService(logger, config);
}

// Export both the class and factory function
module.exports = {
  OpenAIService,
  createOpenAIService
};