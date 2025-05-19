/**
 * Response Generator Service
 * 
 * This service provides structured response generation capabilities for the AgentController.
 * It uses templates, dynamic content replacement, and LLM-based generation to create
 * natural language responses for different query types and intents.
 * 
 * Enhanced features:
 * - Integration with WorkingMemoryService for context retrieval
 * - Integration with MultiStepReasoningService for complex responses
 * - Support for multiple response formats (text, JSON, HTML)
 * - Template interpolation with reasoning results and knowledge
 * - Personalized responses based on user context
 */

const OpenAIService = require('./OpenAIService');
const WorkingMemoryService = require('./WorkingMemoryService');
const MultiStepReasoningService = require('./MultiStepReasoningService');
const logger = require('../../utils/logger');
const { performance } = require('perf_hooks');

/**
 * Service for generating structured responses
 */
class ResponseGeneratorService {
  /**
   * Initialize the response generator service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.workingMemoryService = services.workingMemoryService || new WorkingMemoryService();
    this.multiStepReasoningService = services.multiStepReasoningService || new MultiStepReasoningService({
      workingMemoryService: this.workingMemoryService
    });
    
    // Configure options
    this.options = {
      defaultTTL: options.defaultTTL || 30 * 60 * 1000, // 30 minutes
      enablePersonalization: options.enablePersonalization !== false,
      useMultiStepReasoning: options.useMultiStepReasoning !== false,
      ...options
    };
    
    // Initialize response templates by intent
    this.responseTemplates = {
      capacity_query: {
        default: "Based on the data, the capacity for {terminal} {time_period} is {capacity_value}. {additional_details}",
        comparison: "When comparing {entity1} and {entity2}, {comparison_result}. {key_difference}",
        historical: "Historical capacity data shows {trend_description}. {historical_insight}",
        forecast: "The forecast indicates {forecast_description}. {recommendation}",
        no_data: "I couldn't find capacity data for {entities}. Would you like me to check for similar information?"
      },
      maintenance_query: {
        default: "There {is_are} {count} maintenance {request_plural} for {stand}. {details}",
        scheduled: "Scheduled maintenance for {stand} is planned for {time_period}. {impact}",
        status: "Maintenance request #{request_id} status is {status}. {details}",
        impact: "The maintenance will impact capacity by {impact_percentage}. {mitigation_options}",
        no_data: "I couldn't find maintenance information for {entities}. Would you like me to check the schedule?"
      },
      infrastructure_query: {
        default: "Terminal {terminal} has {count} stands. {details}",
        stand_details: "Stand {stand} is {status} and can accommodate {aircraft_types}. {additional_info}",
        terminal_overview: "Terminal {terminal} overview: {overview}",
        pier_details: "Pier {pier} has {count} stands. {details}",
        no_data: "I couldn't find infrastructure information for {entities}. Please check your query."
      },
      stand_status_query: {
        default: "Stand {stand} is currently {status}. {occupancy_details}",
        availability: "Stand {stand} is available for the next {time_period}. {next_scheduled}",
        occupied: "Stand {stand} is occupied by flight {flight} until {time}. {next_available}",
        maintenance: "Stand {stand} is under maintenance until {time}. {reason}",
        no_data: "I couldn't find status information for stand {stand}. Please check the stand identifier."
      },
      scenario_query: {
        default: "Scenario '{scenario_name}' shows {scenario_description}. {key_metrics}",
        comparison: "Comparing scenarios: {comparison_result}. {recommendation}",
        what_if: "In this what-if scenario, {impact_description}. {insight}",
        parameters: "Scenario parameters: {parameter_list}. {parameter_impact}",
        no_data: "I couldn't find the scenario you're looking for. Would you like me to list available scenarios?"
      },
      help_request: {
        default: "I can help with airport capacity planning. You can ask about {capabilities}.",
        specific: "To {action}, you can ask: \"{example_query}\". {additional_help}",
        topic: "Here's how I can help with {topic}: {topic_capabilities}",
        list: "Here are some things you can ask me: {query_list}",
        error: "I'm not sure how to help with that. Try asking about capacity, maintenance, or infrastructure."
      },
      complex_reasoning: {
        default: "{reasoning_result}",
        with_evidence: "Based on the analysis: {reasoning_result}\n\nEvidence: {evidence_summary}",
        detailed: "{reasoning_result}\n\nReasoning process:\n{reasoning_steps}"
      },
      knowledge_based: {
        default: "According to the available information, {knowledge_result}",
        detailed: "According to the available information: {knowledge_result}\n\nSources: {knowledge_sources}"
      }
    };
    
    // Initialize response format templates
    this.formatTemplates = {
      text: {
        wrapperStart: "",
        wrapperEnd: "",
        sectionStart: "",
        sectionEnd: "\n\n",
        listItemPrefix: "• "
      },
      json: {
        wrapperStart: "{",
        wrapperEnd: "}",
        sectionStart: "\"",
        sectionEnd: "\",",
        listItemPrefix: ""
      },
      html: {
        wrapperStart: "<div class=\"response\">",
        wrapperEnd: "</div>",
        sectionStart: "<section>",
        sectionEnd: "</section>",
        listItemPrefix: "<li>"
      },
      markdown: {
        wrapperStart: "",
        wrapperEnd: "",
        sectionStart: "## ",
        sectionEnd: "\n\n",
        listItemPrefix: "* "
      }
    };
    
    // Generic error responses by error type
    this.errorResponses = {
      not_found: "I couldn't find {entity_type} {entity_name}. Please check if it exists or try a different query.",
      access_denied: "You don't have permission to access {resource_type} {resource_name}. Please contact an administrator.",
      invalid_parameters: "There was an issue with your request parameters: {error_details}. Please check and try again.",
      server_error: "I encountered a system error while processing your request. Please try again later.",
      timeout: "The request took too long to process. This might indicate a complex query or system load. Please try again or simplify your query.",
      generic: "I apologize, but I couldn't complete your request. {error_details}"
    };
    
    // Initialize templates for system interactions
    this.systemTemplates = {
      action_approval_request: "I can {action_description}. Would you like me to proceed with this action?",
      action_approved: "I've successfully executed the action: {action_description}. {result_summary}",
      action_rejected: "I've cancelled the action: {action_description}. {reason}",
      action_error: "I couldn't execute the action: {action_description}. Error: {error_message}",
      processing: "I'm processing your request for {entity_type} {entity_name}...",
      feedback_confirmation: "Thank you for your feedback. I'll use it to improve my responses in the future."
    };
    
    // Templates for visualizations
    this.visualizationTemplates = {
      chart_description: "The chart shows {chart_description}. {key_insight}",
      data_summary: "The data shows {summary_description}. {highlight}",
      key_metrics: "Key metrics: {metrics_list}."
    };
    
    // Initialize templates for reasoning output
    this.reasoningTemplates = {
      step_summary: "Step {step_number}: {step_description}",
      evidence_item: "• {evidence_content}",
      reasoning_summary: "Reasoning summary: {summary}",
      knowledge_source: "[{source_index}] {source_name}: {source_content}"
    };
    
    // Initialize performance metrics
    this.metrics = {
      totalGenerated: 0,
      successfulGeneration: 0,
      failedGeneration: 0,
      templateBasedGeneration: 0,
      llmBasedGeneration: 0,
      reasoningBasedGeneration: 0,
      totalLatency: 0,
      averageLatency: 0
    };
    
    logger.info('Enhanced ResponseGeneratorService initialized');
  }

  /**
   * Generate a response using templates and entity data
   * @param {Object} input - Response generation parameters
   * @param {string} input.intent - Detected intent
   * @param {Object} input.entities - Extracted entities
   * @param {Object} input.data - Result data from tool execution
   * @param {string} input.query - Original user query
   * @param {Object} input.options - Additional generation options
   * @returns {Promise<Object>} - Generated response
   */
  async generateResponse(input) {
    const startTime = performance.now();
    const requestId = this._generateRequestId();
    
    try {
      logger.info(`Generating response [${requestId}] for intent: ${input.intent}`);
      
      // Extract key parameters
      const { intent, entities, data, query, options = {} } = input;
      
      // Extract session and user info for context
      const sessionId = options.sessionId || `session-${Date.now()}`;
      const userId = options.userId;
      const queryId = options.queryId || `query-${Date.now()}`;
      
      // Set response options
      const responseOptions = {
        templateType: options.templateType || 'default',
        tone: options.tone || 'professional',
        format: options.format || 'text',
        detail: options.detail || 'medium',
        useLLM: options.useLLM !== false, 
        includeVisualizations: options.includeVisualizations !== false,
        useReasoning: options.useReasoning,
        sessionId,
        userId,
        queryId
      };
      
      // Retrieve context from working memory if available
      let context = {};
      if (this.options.enablePersonalization && sessionId) {
        context = await this.getContextForResponse(sessionId, queryId, options);
      }
      
      // Generate response text
      let responseText;
      let suggestedActions = [];
      let generationMethod = 'template';
      let reasoningResult = null;
      
      // Check if we're handling an error case
      if (input.error) {
        responseText = await this._generateErrorResponse(
          input.error, 
          intent, 
          entities
        );
      } 
      // Check if we should use multi-step reasoning for complex queries
      else if (this.shouldUseReasoning(input, responseOptions)) {
        const reasoningResponse = await this.generateReasoningBasedResponse(
          query, 
          {
            sessionId,
            queryId,
            intent,
            entities,
            ...context
          },
          responseOptions
        );
        
        responseText = reasoningResponse.text;
        reasoningResult = reasoningResponse.reasoning;
        generationMethod = 'reasoning';
      }
      // Check if we have a template for this intent
      else if (this.responseTemplates[intent]) {
        // Try to use specific template type if available, fallback to default
        const templateType = this.responseTemplates[intent][responseOptions.templateType] ? 
          responseOptions.templateType : 'default';
        
        // Get template
        const template = this.responseTemplates[intent][templateType];
        
        // Prepare enhanced data with context
        const enhancedData = this._enhanceDataWithContext(data, context);
        
        // Fill in template with entities and data
        responseText = await this._fillTemplate(template, entities, enhancedData, {
          ...responseOptions,
          context
        });
        
        // Generate suggested follow-up actions based on the current context
        suggestedActions = this._generateSuggestedActions(intent, entities, enhancedData);
        generationMethod = 'template';
      } 
      // Fallback to LLM generation for unknown intents or missing templates
      else {
        const llmResponse = await this._generateResponseWithLLM(
          query, 
          intent, 
          entities, 
          data, 
          {
            ...responseOptions,
            context
          }
        );
        responseText = llmResponse.text;
        suggestedActions = llmResponse.suggestedActions || [];
        generationMethod = 'llm';
      }
      
      // Apply output formatting if needed
      const formattedResponse = this._applyOutputFormat(responseText, responseOptions.format);
      
      // Generate speech version if needed
      let responseSpeech = null;
      if (responseOptions.format === 'speech') {
        responseSpeech = this._formatForSpeech(formattedResponse);
      }
      
      // Process visualizations if available and requested
      let visualizations = [];
      if (responseOptions.includeVisualizations && data && data.visualizations) {
        visualizations = data.visualizations;
      }
      
      // Store the response in working memory if session ID is provided
      if (sessionId) {
        await this.storeResponseInMemory(
          sessionId, 
          queryId, 
          formattedResponse, 
          {
            intent,
            entities,
            suggestedActions,
            generationMethod,
            reasoning: reasoningResult
          }
        );
      }
      
      // Track performance metrics
      const processingTime = performance.now() - startTime;
      this._updateMetrics({
        processingTime,
        success: true,
        method: generationMethod
      });
      
      logger.debug(`Response generated in ${processingTime.toFixed(2)}ms using ${generationMethod}`);
      
      return {
        text: formattedResponse,
        speech: responseSpeech,
        visualizations,
        suggestedActions,
        processingTime,
        requestId,
        reasoning: reasoningResult
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error(`Response generation error [${requestId}]: ${error.message}`, { error: error.stack });
      
      // Update metrics
      this._updateMetrics({
        processingTime,
        success: false
      });
      
      // Generate a fallback response
      const fallbackResponse = this._generateFallbackResponse(input.intent);
      
      return {
        text: fallbackResponse,
        speech: null,
        visualizations: [],
        suggestedActions: [],
        error: error.message,
        processingTime,
        requestId
      };
    }
  }

  /**
   * Determine if reasoning should be used for response generation
   * @param {Object} input - Input data
   * @param {Object} options - Response options
   * @returns {boolean} - Whether to use reasoning
   */
  shouldUseReasoning(input, options) {
    // If explicitly set in options, use that
    if (options.useReasoning !== undefined) {
      return options.useReasoning;
    }
    
    // If multi-step reasoning is disabled globally, don't use it
    if (!this.options.useMultiStepReasoning) {
      return false;
    }
    
    // Check if the intent indicates a complex query
    const complexIntents = [
      'analysis', 'comparison', 'optimization', 'impact_assessment',
      'forecast', 'planning', 'recommendation', 'what_if'
    ];
    
    if (input.intent && complexIntents.some(i => input.intent.includes(i))) {
      return true;
    }
    
    // Check for query complexity indicators
    const complexityIndicators = [
      'why', 'how', 'explain', 'analyze', 'compare', 'difference', 
      'impact', 'predict', 'forecast', 'optimize', 'best way', 
      'recommend', 'suggestion', 'improve'
    ];
    
    if (input.query && complexityIndicators.some(indicator => 
      input.query.toLowerCase().includes(indicator))) {
      return true;
    }
    
    // Default to not using reasoning for simple queries
    return false;
  }
  
  /**
   * Generate a response using multi-step reasoning
   * @param {string} query - The user query
   * @param {Object} context - Query context
   * @param {Object} options - Response options
   * @returns {Promise<Object>} - Generated response with reasoning
   */
  async generateReasoningBasedResponse(query, context, options) {
    try {
      this.metrics.reasoningBasedGeneration++;
      logger.info(`Generating reasoning-based response for query: ${query}`);
      
      // Execute query using multi-step reasoning
      const reasoningResult = await this.multiStepReasoningService.executeQuery(
        query,
        context,
        {
          ...options,
          detail: options.detail
        }
      );
      
      if (!reasoningResult.success) {
        throw new Error(`Reasoning failed: ${reasoningResult.error}`);
      }
      
      // Get the appropriate template
      const templateType = options.detail === 'comprehensive' ? 'detailed' : 
                          (options.detail === 'brief' ? 'default' : 'with_evidence');
                          
      const template = this.responseTemplates.complex_reasoning[templateType];
      
      // Format reasoning steps if detailed template
      let reasoningSteps = '';
      if (templateType === 'detailed' && reasoningResult.reasoning) {
        reasoningSteps = reasoningResult.reasoning
          .map(step => `${this.reasoningTemplates.step_summary
            .replace('{step_number}', step.stepNumber)
            .replace('{step_description}', step.description)}\n${step.explanation}`)
          .join('\n\n');
      }
      
      // Format evidence if with_evidence template
      let evidenceSummary = '';
      if (templateType === 'with_evidence' && reasoningResult.evidence) {
        evidenceSummary = reasoningResult.evidence
          .map(evidence => this.reasoningTemplates.evidence_item
            .replace('{evidence_content}', this._summarizeEvidenceItem(evidence)))
          .join('\n');
      }
      
      // Fill template with reasoning results
      const filledTemplate = template
        .replace('{reasoning_result}', reasoningResult.answer || '')
        .replace('{reasoning_steps}', reasoningSteps)
        .replace('{evidence_summary}', evidenceSummary);
      
      return {
        text: filledTemplate,
        reasoning: {
          answer: reasoningResult.answer,
          confidence: reasoningResult.confidence,
          steps: reasoningResult.reasoning,
          evidence: reasoningResult.evidence,
          sources: reasoningResult.knowledgeSources
        }
      };
    } catch (error) {
      logger.error(`Error in reasoning-based response generation: ${error.message}`);
      
      // Fall back to standard LLM generation
      const llmResponse = await this._generateResponseWithLLM(
        query, 
        context.intent, 
        context.entities, 
        {}, 
        options
      );
      
      return {
        text: llmResponse.text,
        reasoning: null
      };
    }
  }
  
  /**
   * Summarize an evidence item
   * @private
   * @param {Object} evidence - Evidence item
   * @returns {string} - Summary of evidence
   */
  _summarizeEvidenceItem(evidence) {
    if (typeof evidence === 'string') {
      return evidence;
    }
    
    if (evidence.summary) {
      return evidence.summary;
    }
    
    if (evidence.description) {
      return `${evidence.description}${evidence.summary ? ': ' + evidence.summary : ''}`;
    }
    
    return JSON.stringify(evidence);
  }
  
  /**
   * Retrieve context from working memory for response generation
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Context for response generation
   */
  async getContextForResponse(sessionId, queryId, options = {}) {
    try {
      if (!this.workingMemoryService) {
        return {};
      }
      
      // Get session context
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      
      // Get any previous query results or linked queries
      const followUpContext = await this.workingMemoryService.getContextForFollowUp(sessionId, queryId);
      
      // Get knowledge retrieval context for this session
      const knowledgeContext = await this.workingMemoryService.getKnowledgeRetrievalContext(
        sessionId, 
        queryId, 
        {
          entityLimit: options.entityLimit || 5,
          historyLimit: options.historyLimit || 3
        }
      );
      
      return {
        sessionContext,
        followUpContext,
        knowledgeContext,
        previousQueries: sessionContext.previousQueries || [],
        userPreferences: sessionContext.userPreferences || {},
        recentEntities: knowledgeContext.recentEntities || []
      };
    } catch (error) {
      logger.error(`Error retrieving context for response: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Store response in working memory
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {string} response - Generated response
   * @param {Object} metadata - Response metadata
   * @returns {Promise<boolean>} - Success status
   */
  async storeResponseInMemory(sessionId, queryId, response, metadata = {}) {
    try {
      if (!this.workingMemoryService) {
        return false;
      }
      
      // Store as final result
      await this.workingMemoryService.storeFinalResult(
        sessionId,
        queryId,
        {
          response,
          metadata,
          timestamp: Date.now()
        },
        this.options.defaultTTL
      );
      
      // Update session context with the latest query
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      const previousQueries = sessionContext.previousQueries || [];
      
      // Add this query to the list of previous queries (keep last 5)
      previousQueries.unshift({
        queryId,
        intent: metadata.intent,
        entities: metadata.entities,
        timestamp: Date.now()
      });
      
      if (previousQueries.length > 5) {
        previousQueries.pop();
      }
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'previousQueries',
        previousQueries
      );
      
      return true;
    } catch (error) {
      logger.error(`Error storing response in memory: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate a system interaction response
   * @param {string} type - System interaction type
   * @param {Object} params - Parameters for template filling
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Generated system response
   */
  async generateSystemResponse(type, params, options = {}) {
    try {
      if (!this.systemTemplates[type]) {
        logger.warn(`No system template found for type: ${type}`);
        return `System message: ${JSON.stringify(params)}`;
      }
      
      // Get template and fill in parameters
      const template = this.systemTemplates[type];
      const response = await this._fillTemplate(template, {}, params, options);
      
      // Apply output formatting if needed
      return this._applyOutputFormat(response, options.format || 'text');
    } catch (error) {
      logger.error(`System response generation error: ${error.message}`);
      return `System message: ${JSON.stringify(params)}`;
    }
  }

  /**
   * Generate description for visualization
   * @param {Object} visualization - Visualization data
   * @param {Object} context - Additional context information
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Generated description
   */
  async generateVisualizationDescription(visualization, context = {}, options = {}) {
    try {
      const templateKey = visualization.type === 'chart' ? 
        'chart_description' : 'data_summary';
      
      if (!this.visualizationTemplates[templateKey]) {
        return "";
      }
      
      // Generate chart description using OpenAI
      const chartDescription = await this.openAIService.generateChartDescription(
        visualization.data,
        visualization.title,
        context
      );
      
      // Fill template with description
      const template = this.visualizationTemplates[templateKey];
      const description = await this._fillTemplate(
        template, 
        {}, 
        {
          chart_description: chartDescription.main || "the data trends",
          key_insight: chartDescription.insight || "",
          summary_description: chartDescription.main || "key metrics",
          highlight: chartDescription.highlight || ""
        },
        options
      );
      
      // Apply output formatting if needed
      return this._applyOutputFormat(description, options.format || 'text');
    } catch (error) {
      logger.error(`Visualization description error: ${error.message}`);
      return "";
    }
  }
  
  /**
   * Generate a response from knowledge and reasoning results
   * @param {string} query - User query
   * @param {Object} knowledgeItems - Retrieved knowledge
   * @param {Object} reasoningResult - Multi-step reasoning results
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated response
   */
  async generateKnowledgeBasedResponse(query, knowledgeItems, reasoningResult, options = {}) {
    try {
      // Prepare knowledge sources summary
      const knowledgeSources = knowledgeItems.map((item, index) => 
        this.reasoningTemplates.knowledge_source
          .replace('{source_index}', index + 1)
          .replace('{source_name}', item.source || 'Unknown')
          .replace('{source_content}', item.content || JSON.stringify(item.data || {}))
      ).join('\n');
      
      // Select template based on detail level
      const templateType = options.detail === 'comprehensive' ? 'detailed' : 'default';
      const template = this.responseTemplates.knowledge_based[templateType];
      
      // Use reasoning result if available, otherwise generate with LLM
      let knowledgeResult;
      if (reasoningResult && reasoningResult.answer) {
        knowledgeResult = reasoningResult.answer;
      } else {
        // Generate response using OpenAI
        const response = await this.openAIService.processQuery(
          `Based on this knowledge, answer the question: "${query}"\n\nKnowledge:\n${knowledgeSources}`
        );
        knowledgeResult = response.text;
      }
      
      // Fill template with knowledge and reasoning
      const filledTemplate = template
        .replace('{knowledge_result}', knowledgeResult)
        .replace('{knowledge_sources}', knowledgeSources);
      
      return filledTemplate;
    } catch (error) {
      logger.error(`Knowledge-based response generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill a template with entity and data values
   * @private
   * @param {string} template - Response template
   * @param {Object} entities - Extracted entities
   * @param {Object} data - Result data
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Filled template
   */
  async _fillTemplate(template, entities = {}, data = {}, options = {}) {
    try {
      // Create a merged parameter object with entities and data
      const params = {
        ...entities,
        ...(data || {})
      };
      
      // Add context parameters if available
      if (options.context) {
        // Add user-specific parameters
        if (options.context.userPreferences) {
          params.user_preferences = options.context.userPreferences;
        }
        
        // Add session-specific parameters
        if (options.context.sessionContext) {
          params.session_context = options.context.sessionContext;
        }
        
        // Add recent entities for reference
        if (options.context.recentEntities) {
          params.recent_entities = options.context.recentEntities;
        }
      }
      
      // Add reasoning result parameters if available
      if (options.reasoning) {
        params.reasoning_result = options.reasoning.answer;
        params.reasoning_confidence = options.reasoning.confidence;
        params.reasoning_steps = options.reasoning.steps;
      }
      
      // Replace template placeholders with values
      let filledTemplate = template;
      
      // Replace {placeholder} with actual values
      const placeholders = template.match(/{([^{}]+)}/g) || [];
      
      for (const placeholder of placeholders) {
        // Extract placeholder name (without braces)
        const name = placeholder.substring(1, placeholder.length - 1);
        
        // Get value for placeholder
        const value = params[name] || this._getDefaultFor(name, entities, data);
        
        // Replace placeholder with value if available
        if (value !== undefined) {
          filledTemplate = filledTemplate.replace(placeholder, value);
        }
      }
      
      // If there are still unfilled placeholders, generate content for them using OpenAI
      if (filledTemplate.includes('{') && filledTemplate.includes('}') && options.useLLM !== false) {
        filledTemplate = await this._generateMissingPlaceholders(
          filledTemplate, 
          entities, 
          data,
          options.context
        );
      }
      
      return filledTemplate;
    } catch (error) {
      logger.error(`Template filling error: ${error.message}`);
      // Return original template if filling fails
      return template;
    }
  }
  
  /**
   * Generate content for missing placeholders
   * @private
   * @param {string} partialTemplate - Partially filled template
   * @param {Object} entities - Extracted entities
   * @param {Object} data - Result data
   * @param {Object} context - Additional context
   * @returns {Promise<string>} - Fully filled template
   */
  async _generateMissingPlaceholders(partialTemplate, entities, data, context = {}) {
    try {
      // Extract remaining placeholders
      const remainingPlaceholders = partialTemplate.match(/{([^{}]+)}/g) || [];
      
      if (remainingPlaceholders.length === 0) {
        return partialTemplate;
      }
      
      // Generate content for missing placeholders using OpenAI
      const response = await this.openAIService.generateContent({
        template: partialTemplate,
        missingFields: remainingPlaceholders.map(p => p.substring(1, p.length - 1)),
        entities,
        data,
        context
      });
      
      // Replace remaining placeholders with generated content
      let filledTemplate = partialTemplate;
      
      for (const field of Object.keys(response.fields || {})) {
        const placeholder = `{${field}}`;
        filledTemplate = filledTemplate.replace(placeholder, response.fields[field]);
      }
      
      // Remove any remaining placeholders
      filledTemplate = filledTemplate.replace(/{([^{}]+)}/g, '');
      
      return filledTemplate;
    } catch (error) {
      logger.error(`Placeholder generation error: ${error.message}`);
      // Remove any remaining placeholders
      return partialTemplate.replace(/{([^{}]+)}/g, '');
    }
  }
  
  /**
   * Get default value for common placeholders
   * @private
   * @param {string} placeholder - Placeholder name
   * @param {Object} entities - Available entities
   * @param {Object} data - Available data
   * @returns {string|undefined} - Default value or undefined
   */
  _getDefaultFor(placeholder, entities, data) {
    switch (placeholder) {
      case 'is_are':
        return (data.count === 1) ? 'is' : 'are';
        
      case 'request_plural':
        return (data.count === 1) ? 'request' : 'requests';
        
      case 'terminal':
        return entities.terminal || 'the terminal';
        
      case 'stand':
        return entities.stand || 'the stand';
        
      case 'time_period':
        return entities.time_period || 'the current period';
        
      case 'entities':
        const entityList = [];
        if (entities.terminal) entityList.push(`terminal ${entities.terminal}`);
        if (entities.stand) entityList.push(`stand ${entities.stand}`);
        if (entities.aircraft_type) entityList.push(`aircraft type ${entities.aircraft_type}`);
        if (entities.time_period) entityList.push(`time period ${entities.time_period}`);
        return entityList.length > 0 ? entityList.join(', ') : 'the specified criteria';
        
      case 'capabilities':
        return 'capacity monitoring, maintenance scheduling, infrastructure queries, and scenario planning';
        
      default:
        return undefined;
    }
  }
  
  /**
   * Enhance data with context information for personalization
   * @private
   * @param {Object} data - Original data
   * @param {Object} context - Context information
   * @returns {Object} - Enhanced data with context
   */
  _enhanceDataWithContext(data = {}, context = {}) {
    const enhancedData = { ...data };
    
    // Add context-specific information
    if (context.userPreferences) {
      enhancedData.userPreferences = context.userPreferences;
    }
    
    if (context.recentEntities) {
      // Group entities by type
      const entitiesByType = {};
      for (const entity of context.recentEntities) {
        if (!entitiesByType[entity.type]) {
          entitiesByType[entity.type] = [];
        }
        entitiesByType[entity.type].push(entity.value);
      }
      
      // Add to enhanced data
      enhancedData.recentEntities = entitiesByType;
    }
    
    // Add previous queries if available
    if (context.previousQueries) {
      enhancedData.previousQueries = context.previousQueries;
    }
    
    // Add retrieved knowledge if available
    if (context.knowledgeContext && context.knowledgeContext.priorKnowledge) {
      enhancedData.retrievedKnowledge = context.knowledgeContext.priorKnowledge;
    }
    
    return enhancedData;
  }

  /**
   * Generate a response using OpenAI
   * @private
   * @param {string} query - User query
   * @param {string} intent - Detected intent
   * @param {Object} entities - Extracted entities
   * @param {Object} data - Result data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated response
   */
  async _generateResponseWithLLM(query, intent, entities, data, options = {}) {
    try {
      this.metrics.llmBasedGeneration++;
      
      // Prepare custom format instructions if needed
      let formatInstructions = '';
      if (options.format === 'json') {
        formatInstructions = 'Return response as a JSON object.';
      } else if (options.format === 'markdown') {
        formatInstructions = 'Format response using Markdown for readability.';
      } else if (options.format === 'html') {
        formatInstructions = 'Format response using HTML for display.';
      } else if (options.format === 'bullet_points') {
        formatInstructions = 'Format response as a bulleted list for clarity.';
      }
      
      // Prepare tone instructions
      let toneInstructions = '';
      switch (options.tone) {
        case 'professional':
          toneInstructions = 'Use a professional, informative tone.';
          break;
        case 'friendly':
          toneInstructions = 'Use a friendly, conversational tone.';
          break;
        case 'technical':
          toneInstructions = 'Use a technical, precise tone with domain-specific terminology.';
          break;
        case 'simple':
          toneInstructions = 'Use simple language avoiding technical terms.';
          break;
      }
      
      // Prepare detail level instructions
      let detailInstructions = '';
      switch (options.detail) {
        case 'brief':
          detailInstructions = 'Keep the response concise and to the point.';
          break;
        case 'medium':
          detailInstructions = 'Provide a balanced amount of detail.';
          break;
        case 'comprehensive':
          detailInstructions = 'Provide comprehensive details and context.';
          break;
      }
      
      // Prepare personalization instructions if context available
      let personalizationInstructions = '';
      if (options.context && this.options.enablePersonalization) {
        if (options.context.userPreferences) {
          personalizationInstructions += `Consider user preferences: ${JSON.stringify(options.context.userPreferences)}. `;
        }
        
        if (options.context.recentEntities && options.context.recentEntities.length > 0) {
          personalizationInstructions += `Reference relevant recent entities: ${JSON.stringify(options.context.recentEntities.slice(0, 3))}. `;
        }
      }
      
      // Call OpenAI to generate response
      const response = await this.openAIService.generateResponse(query, intent, {
        ...data,
        entities,
        formatInstructions,
        toneInstructions,
        detailInstructions,
        personalizationInstructions
      });
      
      return {
        text: response.text,
        suggestedActions: response.suggestedActions || []
      };
    } catch (error) {
      logger.error(`LLM response generation error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Apply output formatting to response
   * @private
   * @param {string} text - Response text
   * @param {string} format - Desired format (text, json, html, markdown)
   * @returns {string} - Formatted response
   */
  _applyOutputFormat(text, format = 'text') {
    if (!format || format === 'text') {
      return text;
    }
    
    const formatTemplate = this.formatTemplates[format];
    if (!formatTemplate) {
      logger.warn(`Unknown output format: ${format}, using text`);
      return text;
    }
    
    // If the text is already in the target format, return as is
    if (format === 'json' && text.trim().startsWith('{') && text.trim().endsWith('}')) {
      return text;
    }
    
    if (format === 'html' && text.trim().startsWith('<') && text.trim().endsWith('>')) {
      return text;
    }
    
    // Apply format transformation
    if (format === 'json') {
      try {
        // Try to create a valid JSON
        const sections = text.split('\n\n').filter(Boolean);
        let jsonObject = {};
        
        sections.forEach((section, index) => {
          jsonObject[`section${index + 1}`] = section;
        });
        
        return JSON.stringify(jsonObject, null, 2);
      } catch (error) {
        logger.warn(`Error formatting as JSON: ${error.message}`);
        // Return a simple JSON object with the text as a single property
        return `{"response": ${JSON.stringify(text)}}`;
      }
    }
    
    // For HTML and markdown, apply the wrapper and section formatting
    if (format === 'html' || format === 'markdown') {
      const sections = text.split('\n\n').filter(Boolean);
      const formattedSections = sections.map(section => {
        // Check if it's a list
        if (section.trim().match(/^[-•*]\s/m)) {
          const listItems = section.split(/\n[-•*]\s/).filter(Boolean);
          return `${formatTemplate.sectionStart}${listItems.map(item => 
            `${formatTemplate.listItemPrefix}${item}`
          ).join('\n')}${formatTemplate.sectionEnd}`;
        } else {
          return `${formatTemplate.sectionStart}${section}${formatTemplate.sectionEnd}`;
        }
      });
      
      return `${formatTemplate.wrapperStart}${formattedSections.join('')}${formatTemplate.wrapperEnd}`;
    }
    
    // Default: return unmodified text
    return text;
  }
  
  /**
   * Generate an error response
   * @private
   * @param {Error|string} error - Error object or message
   * @param {string} intent - Original intent
   * @param {Object} entities - Extracted entities
   * @returns {Promise<string>} - Error response
   */
  async _generateErrorResponse(error, intent, entities) {
    try {
      // Determine error type
      let errorType = 'generic';
      const errorMessage = error instanceof Error ? error.message : error;
      
      if (errorMessage.includes('not found') || errorMessage.includes("couldn't find")) {
        errorType = 'not_found';
      } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        errorType = 'access_denied';
      } else if (errorMessage.includes('parameter') || errorMessage.includes('invalid')) {
        errorType = 'invalid_parameters';
      } else if (errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('server') || errorMessage.includes('system')) {
        errorType = 'server_error';
      }
      
      // Get error template
      const template = this.errorResponses[errorType];
      
      // Determine entity type and name
      let entityType = 'information';
      let entityName = '';
      
      if (entities.terminal) {
        entityType = 'terminal';
        entityName = entities.terminal;
      } else if (entities.stand) {
        entityType = 'stand';
        entityName = entities.stand;
      } else if (entities.aircraft_type) {
        entityType = 'aircraft type';
        entityName = entities.aircraft_type;
      } else if (entities.scenario_name) {
        entityType = 'scenario';
        entityName = entities.scenario_name;
      }
      
      // Fill error template
      return this._fillTemplate(template, {}, {
        entity_type: entityType,
        entity_name: entityName,
        resource_type: entityType,
        resource_name: entityName,
        error_details: errorMessage
      });
    } catch (err) {
      logger.error(`Error response generation error: ${err.message}`);
      return `I'm sorry, I encountered an error processing your request. Please try a different query or contact support.`;
    }
  }
  
  /**
   * Format response for speech output
   * @private
   * @param {string} text - Response text
   * @returns {string} - Speech-friendly version
   */
  _formatForSpeech(text) {
    // Clean up text for speech by removing markdown, URLs, etc.
    let speech = text;
    
    // Remove markdown formatting
    speech = speech.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    speech = speech.replace(/\*(.*?)\*/g, '$1');     // Italic
    speech = speech.replace(/\[(.*?)\]\((.*?)\)/g, '$1'); // Links
    speech = speech.replace(/#{1,6}\s+(.*?)$/gm, '$1'); // Headers
    
    // Remove HTML tags
    speech = speech.replace(/<[^>]*>/g, '');
    
    // Replace common abbreviations
    speech = speech.replace(/(\b)e\.g\.(\b)/g, '$1for example$2');
    speech = speech.replace(/(\b)i\.e\.(\b)/g, '$1that is$2');
    
    // Format numbers for better speech
    speech = speech.replace(/(\d+)\.(\d+)/g, '$1 point $2'); // Decimals
    
    // Replace special characters
    speech = speech.replace(/&/g, 'and');
    speech = speech.replace(/\//g, ' or ');
    
    return speech;
  }
  
  /**
   * Generate a fallback response
   * @private
   * @param {string} intent - Original intent
   * @returns {string} - Fallback response
   */
  _generateFallbackResponse(intent) {
    const fallbackResponses = {
      capacity_query: "I'm sorry, I couldn't retrieve the capacity information you requested. Please try a more specific query or check if the data exists.",
      maintenance_query: "I apologize, but I couldn't find the maintenance information you're looking for. Please verify the details and try again.",
      infrastructure_query: "I'm having trouble accessing the infrastructure information you requested. Please try a different query.",
      stand_status_query: "I couldn't determine the status of the stand you specified. Please check the stand identifier and try again.",
      scenario_query: "I'm sorry, I couldn't retrieve the scenario information. Please check that the scenario exists or try a different query.",
      help_request: "I'm here to help with airport capacity planning. You can ask about capacity, maintenance, infrastructure, stands, and scenarios."
    };
    
    return fallbackResponses[intent] || "I'm sorry, I couldn't process your request. Please try again with a different query.";
  }
  
  /**
   * Generate suggested follow-up actions based on context
   * @private
   * @param {string} intent - Current intent
   * @param {Object} entities - Extracted entities
   * @param {Object} data - Result data
   * @returns {Array<Object>} - Suggested actions
   */
  _generateSuggestedActions(intent, entities, data) {
    const actions = [];
    
    switch (intent) {
      case 'capacity_query':
        // Suggest related capacity queries
        if (entities.terminal) {
          actions.push({
            type: 'suggestion',
            text: `Show capacity breakdown by aircraft type for ${entities.terminal}`,
            intent: 'capacity_query',
            entities: { terminal: entities.terminal, capacity_metric: 'breakdown' }
          });
        }
        
        if (entities.time_period) {
          actions.push({
            type: 'suggestion',
            text: `Compare with previous ${entities.time_period}`,
            intent: 'capacity_query',
            entities: { time_period: entities.time_period, comparison_metric: 'previous' }
          });
        }
        
        // Suggest visualization
        actions.push({
          type: 'action',
          text: 'Show capacity chart',
          action: 'generate_visualization',
          parameters: { type: 'capacity', format: 'chart' }
        });
        break;
        
      case 'maintenance_query':
        // Suggest related maintenance queries
        if (entities.stand) {
          actions.push({
            type: 'suggestion',
            text: `Show capacity impact of maintenance on ${entities.stand}`,
            intent: 'maintenance_query',
            entities: { stand: entities.stand, impact_analysis: true }
          });
        }
        
        // Suggest creating maintenance request
        actions.push({
          type: 'action',
          text: 'Create maintenance request',
          action: 'create_maintenance',
          parameters: { stand: entities.stand }
        });
        break;
        
      case 'infrastructure_query':
        // Suggest related infrastructure queries
        if (entities.terminal) {
          actions.push({
            type: 'suggestion',
            text: `Show all stands in ${entities.terminal}`,
            intent: 'infrastructure_query',
            entities: { terminal: entities.terminal, entity_type: 'stands' }
          });
        }
        
        // Suggest map view
        actions.push({
          type: 'action',
          text: 'View terminal map',
          action: 'show_map',
          parameters: { terminal: entities.terminal }
        });
        break;
        
      case 'scenario_query':
        // Suggest scenario comparison
        if (data.scenarios && data.scenarios.length > 1) {
          actions.push({
            type: 'suggestion',
            text: `Compare scenarios`,
            intent: 'scenario_compare',
            entities: { scenarios: data.scenarios.map(s => s.name).slice(0, 2) }
          });
        }
        
        // Suggest what-if analysis
        actions.push({
          type: 'action',
          text: 'Create what-if scenario',
          action: 'create_scenario',
          parameters: { based_on: entities.scenario_name }
        });
        break;
        
      case 'complex_reasoning':
        // Suggest related analyses or explanations
        actions.push({
          type: 'suggestion',
          text: 'Explain the reasoning process',
          intent: 'explanation',
          entities: { explanation_type: 'reasoning_process' }
        });
        
        actions.push({
          type: 'suggestion',
          text: 'Show evidence used in analysis',
          intent: 'explanation',
          entities: { explanation_type: 'evidence' }
        });
        break;
    }
    
    // Add help action for all intents
    actions.push({
      type: 'action',
      text: 'Help with this topic',
      action: 'show_help',
      parameters: { topic: intent.replace('_', ' ') }
    });
    
    return actions;
  }
  
  /**
   * Generate a unique request ID
   * @private
   * @returns {string} - Unique request ID
   */
  _generateRequestId() {
    return `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  
  /**
   * Update performance metrics
   * @private
   * @param {Object} result - Processing result
   */
  _updateMetrics(result) {
    this.metrics.totalGenerated++;
    this.metrics.totalLatency += result.processingTime;
    
    if (result.success) {
      this.metrics.successfulGeneration++;
    } else {
      this.metrics.failedGeneration++;
    }
    
    // Update method-specific metrics
    if (result.method === 'template') {
      this.metrics.templateBasedGeneration++;
    } else if (result.method === 'llm') {
      this.metrics.llmBasedGeneration++;
    } else if (result.method === 'reasoning') {
      this.metrics.reasoningBasedGeneration++;
    }
    
    this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.totalGenerated;
  }
  
  /**
   * Get current metrics
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    return { 
      ...this.metrics,
      multiStepReasoningMetrics: this.multiStepReasoningService ? 
        this.multiStepReasoningService.getMetrics() : null
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalGenerated: 0,
      successfulGeneration: 0,
      failedGeneration: 0,
      templateBasedGeneration: 0,
      llmBasedGeneration: 0,
      reasoningBasedGeneration: 0,
      totalLatency: 0,
      averageLatency: 0
    };
    
    if (this.multiStepReasoningService && 
        typeof this.multiStepReasoningService.resetMetrics === 'function') {
      this.multiStepReasoningService.resetMetrics();
    }
  }
  
  /**
   * Add or update a response template
   * @param {string} intent - Intent name
   * @param {string} templateType - Template type
   * @param {string} template - Template string
   */
  updateTemplate(intent, templateType, template) {
    if (!this.responseTemplates[intent]) {
      this.responseTemplates[intent] = {};
    }
    
    this.responseTemplates[intent][templateType] = template;
    logger.info(`Updated template for intent ${intent}, type ${templateType}`);
  }
  
  /**
   * Add or update a format template
   * @param {string} formatName - Format name
   * @param {Object} formatTemplate - Format template configuration
   */
  updateFormatTemplate(formatName, formatTemplate) {
    this.formatTemplates[formatName] = formatTemplate;
    logger.info(`Updated format template for ${formatName}`);
  }
}

module.exports = new ResponseGeneratorService();