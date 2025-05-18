const { OpenAI } = require('openai');
const logger = require('../../utils/logger');

class OpenAIService {
  constructor() {
    // Only create a real client if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isAvailable = true;
      } catch (error) {
        logger.error(`Failed to initialize OpenAI client: ${error.message}`);
        this.isAvailable = false;
        this.initializeMockClient();
      }
    } else {
      logger.warn('OpenAI API key not provided. Using mock client.');
      this.isAvailable = false;
      this.initializeMockClient();
    }
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.tokenUsage = {
      prompt: 0,
      completion: 0,
      total: 0
    };
  }
  
  // Initialize a mock client for testing when API key is not available
  initializeMockClient() {
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
      }
    };
  }

  /**
   * Process a natural language query using the OpenAI API
   * @param {string} query - The user's query
   * @param {Array} conversationHistory - Array of previous messages in the conversation
   * @param {Object} systemPrompt - System prompt to guide the model's behavior
   * @returns {Promise<Object>} - The processed response
   */
  async processQuery(query, conversationHistory = [], systemPrompt = null) {
    try {
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
      conversationHistory.forEach(message => {
        messages.push({
          role: message.role,
          content: message.content
        });
      });
      
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
      this.updateTokenUsage(completion.usage);
      
      return {
        text: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
        model: completion.model
      };
    } catch (error) {
      logger.error(`OpenAI API Error: ${error.message}`);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  /**
   * Extract entities and intent from a query
   * @param {string} query - The user's query
   * @returns {Promise<Object>} - Extracted entities and intent
   */
  async extractEntities(query) {
    try {
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

Also check for scenario-related intents such as:
- scenario_create: User wants to create a new scenario
- scenario_modify: User wants to modify a scenario
- scenario_compare: User wants to compare scenarios
- scenario_query: User wants information about a scenario
- what_if_analysis: User wants to analyze a what-if scenario

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
      this.updateTokenUsage(completion.usage);
      
      // Parse the JSON response
      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsedResponse = JSON.parse(responseText);
      
      return {
        intent: parsedResponse.intent || null,
        confidence: parsedResponse.confidence || 0,
        entities: parsedResponse.entities || {},
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Entity Extraction Error: ${error.message}`);
      // Return empty result on error
      return {
        intent: null,
        confidence: 0,
        entities: {},
        error: error.message
      };
    }
  }

  /**
   * Extract parameters from natural language
   * @param {string} prompt - Prompt with description to extract parameters from
   * @returns {Promise<Object>} - Extracted parameters
   */
  async extractParameters(prompt) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant for airport capacity planning.
Your task is to extract structured parameters from scenario descriptions.
You should identify all specific values mentioned that could be relevant for capacity scenarios.
Parse the input text and extract all parameters in a clean, normalized format.
Return a JSON object where:
- parameters: An object containing all extracted parameters in camelCase format
- confidence: A number between 0 and 1 indicating your confidence in the extraction
- reasoning: Array of strings explaining your reasoning for each parameter extraction`
        },
        {
          role: 'user',
          content: prompt
        }
      ];
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      // Parse the JSON response
      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsedResponse = JSON.parse(responseText);
      
      return {
        parameters: parsedResponse.parameters || {},
        confidence: parsedResponse.confidence || 0,
        reasoning: parsedResponse.reasoning || [],
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Parameter Extraction Error: ${error.message}`);
      // Return empty result on error
      return {
        parameters: {},
        confidence: 0,
        reasoning: [],
        error: error.message
      };
    }
  }

  /**
   * Perform multi-step reasoning for complex queries
   * @param {string} query - The complex query to reason about
   * @param {object} context - Additional context information
   * @returns {Promise<Object>} - Reasoning steps and result
   */
  async performMultiStepReasoning(query, context = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant for airport capacity planning with advanced reasoning capabilities.
Your task is to break down complex queries into a series of reasoning steps and provide a final answer.
When presented with a complex query, analyze it step by step, considering all relevant factors.
You should reason through the implications of each parameter change on airport capacity.

Return a JSON object with:
- steps: An array of reasoning steps, where each step includes:
  * stepNumber: The step number
  * description: A description of this reasoning step
  * type: The step type (calculation, parameter_extraction, data_retrieval, validation, comparison, recommendation)
  * dependsOn: Array of step IDs this step depends on (e.g. ["step-1", "step-2"])
  * parameters: Object with parameters needed for this step
  * conclusion: The conclusion drawn from this step
- finalAnswer: The final answer or recommendation after all reasoning steps
- confidence: A number between 0 and 1 indicating your confidence in the result`
        },
        {
          role: 'user',
          content: `Query: ${query}
Context: ${JSON.stringify(context, null, 2)}

Please perform multi-step reasoning on this query and provide your analysis.`
        }
      ];
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      // Parse the JSON response
      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsedResponse = JSON.parse(responseText);
      
      return {
        steps: parsedResponse.steps || [],
        finalAnswer: parsedResponse.finalAnswer || {},
        confidence: parsedResponse.confidence || 0,
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Multi-step Reasoning Error: ${error.message}`);
      // Return empty result on error
      return {
        steps: [],
        finalAnswer: {},
        confidence: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Perform enhanced multi-step reasoning with deeper analysis for complex capacity problems
   * @param {string} query - The complex query to reason about
   * @param {object} context - Additional context information including conversation history
   * @returns {Promise<Object>} - Detailed reasoning steps and result with explanations
   */
  async performEnhancedReasoning(query, context = {}) {
    try {
      // Identify the problem domain to provide more specialized guidance
      const domainTags = await this.identifyProblemDomain(query);
      
      // Create a more specific system prompt based on the problem domain
      let systemPrompt = `You are an AI assistant for airport capacity planning with enhanced reasoning capabilities.
      Your task is to break down complex capacity problems into logical, sequential steps and provide detailed explanations.
      
      For this ${domainTags.join(', ')} problem, analyze step by step, considering all relevant factors including:
      - Capacity constraints and bottlenecks
      - Stand allocation efficiency
      - Terminal usage optimization
      - Aircraft size and type considerations
      - Time-based patterns and peak periods
      - Maintenance impacts and scheduling
      - Ground handling requirements
      
      Structure your reasoning using first principles thinking:
      1. Break down the problem into its fundamental components
      2. Challenge assumptions that might limit optimal solutions
      3. Build up from base truths using logical inference
      4. Consider multiple perspectives and approaches
      5. Synthesize findings into practical recommendations
      
      Return a JSON object with:
      - steps: An array of reasoning steps, where each step includes:
        * stepNumber: The step number
        * description: A clear description of this reasoning step
        * type: The step type (calculation, parameter_extraction, data_retrieval, validation, comparison, recommendation)
        * dependsOn: Array of step IDs this step depends on (e.g. ["step-1", "step-2"])
        * parameters: Object with parameters needed for this step
        * expectedOutcome: What you expect to learn from this step
        * reasoning: Your thought process for including this step
      - approach: A brief explanation of your overall approach to solving this problem
      - confidence: A number between 0 and 1 indicating your confidence in the result
      - limitations: Any limitations or assumptions in your analysis`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Query: ${query}
Context: ${JSON.stringify(context, null, 2)}

Please perform detailed multi-step reasoning on this airport capacity query and provide your analysis.`
        }
      ];
      
      // Add relevant conversation history if available
      if (context.history && Array.isArray(context.history)) {
        const relevantHistory = context.history
          .filter(msg => 
            msg.content.toLowerCase().includes('capacity') ||
            msg.content.toLowerCase().includes('stand') ||
            msg.content.toLowerCase().includes('terminal') ||
            msg.content.toLowerCase().includes('maintenance')
          )
          .slice(-3); // Take up to 3 most recent relevant messages
          
        if (relevantHistory.length > 0) {
          messages.splice(1, 0, ...
          relevantHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })));
        }
      }
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.2, // Lower temperature for more focused reasoning
        max_tokens: 3000, // Allow more tokens for detailed reasoning
        response_format: { type: 'json_object' }
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      // Parse the JSON response
      const responseText = completion.choices[0]?.message?.content || '{}';
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`JSON parsing error in enhanced reasoning: ${parseError.message}`);
        logger.debug(`Response text: ${responseText}`);
        throw new Error(`Failed to parse reasoning response: ${parseError.message}`);
      }
      
      // Process the steps to ensure they're properly structured for the reasoning service
      const processedSteps = (parsedResponse.steps || []).map((step, index) => ({
        stepNumber: step.stepNumber || index + 1,
        description: step.description,
        type: step.type || this.inferStepType(step.description),
        dependsOn: step.dependsOn || [],
        parameters: step.parameters || {},
        expectedOutcome: step.expectedOutcome,
        reasoning: step.reasoning
      }));
      
      return {
        steps: processedSteps,
        approach: parsedResponse.approach || '',
        finalAnswer: parsedResponse.finalAnswer || {},
        confidence: parsedResponse.confidence || 0,
        limitations: parsedResponse.limitations || [],
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Enhanced reasoning error: ${error.message}`);
      // Return basic reasoning as fallback
      return this.performMultiStepReasoning(query, context);
    }
  }
  
  /**
   * Identify the problem domain for a capacity query
   * @param {string} query - The user query
   * @returns {Promise<Array<string>>} - Tags identifying the problem domain
   */
  async identifyProblemDomain(query) {
    try {
      const prompt = `
      Analyze this airport capacity query and identify which domain tags apply:
      "${query}"
      
      Return a JSON array of applicable tags from the following list:
      - stand_allocation: For problems related to allocating stands to aircraft
      - maintenance_impact: For problems analyzing maintenance impact on capacity
      - peak_hour_analysis: For problems analyzing capacity during peak hours
      - terminal_optimization: For problems optimizing terminal usage
      - aircraft_mix: For problems involving different aircraft types and sizes
      - capacity_forecasting: For problems predicting future capacity needs
      - bottleneck_analysis: For problems identifying capacity bottlenecks
      - scenario_comparison: For problems comparing different capacity scenarios
      `;
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });
      
      // Parse response
      const responseText = response.choices[0]?.message?.content || '[]';
      try {
        const parsedResponse = JSON.parse(responseText);
        return Array.isArray(parsedResponse) ? parsedResponse : [];
      } catch (parseError) {
        logger.warn(`Error parsing problem domain tags: ${parseError.message}`);
        return ['general_capacity'];
      }
    } catch (error) {
      logger.warn(`Error identifying problem domain: ${error.message}`);
      return ['general_capacity'];
    }
  }
  
  /**
   * Infer step type from description
   * @param {string} description - Step description
   * @returns {string} - Inferred step type
   */
  inferStepType(description) {
    const desc = description.toLowerCase();
    if (desc.includes('calculat') || desc.includes('comput')) return 'calculation';
    if (desc.includes('extract') || desc.includes('identif')) return 'parameter_extraction';
    if (desc.includes('retriev') || desc.includes('fetch') || desc.includes('get')) return 'data_retrieval';
    if (desc.includes('validat') || desc.includes('verify') || desc.includes('check')) return 'validation';
    if (desc.includes('compar') || desc.includes('contrast')) return 'comparison';
    if (desc.includes('recommend') || desc.includes('suggest')) return 'recommendation';
    return 'analysis';
  }

  /**
   * Extract entity relationships from text
   * @param {string} text - The text to analyze
   * @param {Array<Object>} entities - Extracted entities
   * @returns {Promise<Object>} - Entity relationship map
   */
  async extractEntityRelationships(text, entities) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant for airport capacity planning.
Your task is to identify relationships between entities mentioned in text.
Analyze the provided text and entities to determine how they relate to each other.
For example, a terminal may contain stands, or a maintenance request may affect a specific stand.

Return a JSON object with:
- relationships: An object mapping entity IDs to arrays of related entity IDs
- confidence: A number between 0 and 1 indicating your confidence in the extraction`
        },
        {
          role: 'user',
          content: `Text: ${text}
Entities: ${JSON.stringify(entities, null, 2)}

Identify the relationships between these entities.`
        }
      ];
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      // Parse the JSON response
      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsedResponse = JSON.parse(responseText);
      
      return {
        relationships: parsedResponse.relationships || {},
        confidence: parsedResponse.confidence || 0,
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Entity Relationship Extraction Error: ${error.message}`);
      // Return empty result on error
      return {
        relationships: {},
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate a response based on retrieved data
   * @param {string} query - The original user query
   * @param {string} intent - The classified intent
   * @param {Object} data - The data retrieved from APIs
   * @returns {Promise<Object>} - Generated response
   */
  async generateResponse(query, intent, data) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant for airport capacity planning.
Your task is to generate a natural language response based on data retrieved from the system.
The response should be clear, concise, and directly address the user's query.
Do not include any visualizations or data that is not provided.
Format your response to be readable in a chat interface.`
        },
        {
          role: 'user',
          content: `Query: ${query}
Intent: ${intent}
Data: ${JSON.stringify(data, null, 2)}

Generate a natural language response based on this information.`
        }
      ];
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      return {
        text: completion.choices[0]?.message?.content || '',
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Response Generation Error: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Process a complex capacity query through multi-step reasoning
   * @param {string} query - The capacity query to analyze
   * @param {Array} history - Previous conversation messages for context
   * @param {Object} additionalContext - Additional context information
   * @returns {Promise<Object>} - Reasoning results with explanations
   */
  async processComplexCapacityQuery(query, history = [], additionalContext = {}) {
    try {
      logger.info(`Processing complex capacity query: ${query}`);
      
      // Prepare context with conversation history
      const context = {
        ...additionalContext,
        history: history.slice(-10) // Use up to 10 most recent messages for context
      };
      
      // Perform enhanced reasoning
      const reasoningResult = await this.performEnhancedReasoning(query, context);
      
      // Extract key insights from the reasoning
      const insights = await this.extractKeyInsights(reasoningResult, query);
      
      return {
        reasoning: reasoningResult,
        insights: insights,
        usage: reasoningResult.usage
      };
    } catch (error) {
      logger.error(`Complex capacity query processing error: ${error.message}`);
      throw new Error(`Failed to process complex capacity query: ${error.message}`);
    }
  }
  
  /**
   * Extract key insights from reasoning results
   * @param {Object} reasoningResult - The results of multi-step reasoning
   * @param {string} originalQuery - The original user query
   * @returns {Promise<Array>} - Key insights extracted from the reasoning
   */
  async extractKeyInsights(reasoningResult, originalQuery) {
    try {
      const prompt = `
      Extract 3-5 key insights from this reasoning analysis about airport capacity:
      
      Original query: "${originalQuery}"
      
      Reasoning approach: ${reasoningResult.approach || 'Not specified'}
      
      Reasoning steps:
      ${(reasoningResult.steps || []).map(step => 
        `Step ${step.stepNumber}: ${step.description}\n${step.reasoning ? `Reasoning: ${step.reasoning}` : ''}`
      ).join('\n\n')}
      
      ${reasoningResult.limitations ? `Limitations:\n${reasoningResult.limitations.join('\n')}` : ''}
      
      Return a JSON array of insight objects, each with:
      - key: A short title for the insight (5-7 words)
      - description: A detailed explanation of the insight (2-3 sentences)
      - relevance: Why this insight matters for airport capacity planning
      - confidence: A number between 0 and 1 indicating confidence in this insight
      `;
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      // Parse response
      const responseText = response.choices[0]?.message?.content || '[]';
      const parsedResponse = JSON.parse(responseText);
      
      return Array.isArray(parsedResponse) ? parsedResponse : [];
    } catch (error) {
      logger.warn(`Error extracting key insights: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Generate comparison analysis between scenarios
   * @param {Object} scenarioResults - Results from multiple scenarios
   * @param {Array<string>} metrics - Metrics being compared
   * @returns {Promise<Object>} - Generated comparison analysis
   */
  async generateComparisonAnalysis(scenarioResults, metrics) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant for airport capacity planning.
Your task is to generate an insightful comparison analysis between different scenarios.
Focus on the key differences, trade-offs, and implications of each scenario.
Highlight the most significant findings and provide actionable insights.
Your analysis should be clear, data-driven, and focused on the specified metrics.`
        },
        {
          role: 'user',
          content: `Scenario Results: ${JSON.stringify(scenarioResults, null, 2)}
Metrics to Compare: ${JSON.stringify(metrics, null, 2)}

Generate a comprehensive comparison analysis of these scenarios.`
        }
      ];
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.5,
        max_tokens: 1500
      });
      
      // Update token usage
      this.updateTokenUsage(completion.usage);
      
      return {
        analysis: completion.choices[0]?.message?.content || '',
        usage: completion.usage
      };
    } catch (error) {
      logger.error(`Comparison Analysis Error: ${error.message}`);
      throw new Error(`Failed to generate comparison analysis: ${error.message}`);
    }
  }

  /**
   * Update token usage statistics
   * @param {Object} usage - Token usage data from API response
   */
  updateTokenUsage(usage) {
    if (usage) {
      this.tokenUsage.prompt += usage.prompt_tokens || 0;
      this.tokenUsage.completion += usage.completion_tokens || 0;
      this.tokenUsage.total += usage.total_tokens || 0;
      
      // Log token usage
      logger.info(`OpenAI Token Usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }
  }

  /**
   * Get current token usage statistics
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
}

module.exports = new OpenAIService();