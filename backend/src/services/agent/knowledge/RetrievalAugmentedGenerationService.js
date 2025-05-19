/**
 * RetrievalAugmentedGenerationService.js
 * 
 * This service combines knowledge retrieval with generative AI to produce
 * accurate and contextually relevant responses based on specific knowledge items.
 * 
 * Key features:
 * - Integrates with KnowledgeRetrievalService to get relevant knowledge
 * - Uses WorkingMemoryService for context management
 * - Structures prompts to guide the LLM's response generation
 * - Ensures factuality by grounding responses in retrieved knowledge
 * - Handles context window limitations through smart chunking
 * - Provides fallback mechanisms when knowledge is insufficient
 */

const logger = require('../../../utils/logger');
const OpenAIService = require('../OpenAIService');
const KnowledgeRetrievalService = require('./KnowledgeRetrievalService');
const { performance } = require('perf_hooks');

class RetrievalAugmentedGenerationService {
  /**
   * Initialize the RAG service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.knowledgeRetrievalService = services.knowledgeRetrievalService || new KnowledgeRetrievalService(services);
    this.workingMemoryService = services.workingMemoryService;
    
    // Configure options
    this.options = {
      maxKnowledgeItemsPerPrompt: options.maxKnowledgeItemsPerPrompt || 15,
      maxTokensPerKnowledgeChunk: options.maxTokensPerKnowledgeChunk || 1500,
      defaultModel: options.defaultModel || 'gpt-4o',
      factCheckingEnabled: options.factCheckingEnabled !== undefined ? options.factCheckingEnabled : true,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Performance metrics
    this.metrics = {
      totalQueries: 0,
      totalRetrievalTimeMs: 0,
      totalGenerationTimeMs: 0,
      factCheckedResponses: 0,
      fallbackResponses: 0
    };
    
    this.logger.info('RetrievalAugmentedGenerationService initialized');
  }
  
  /**
   * Generate a response to a query based on retrieved knowledge
   * 
   * @param {Object} query - The query object
   * @param {string} query.text - Raw query text
   * @param {Object} query.parsedQuery - Structured parsed query
   * @param {string} query.queryId - Unique query identifier
   * @param {Object} context - Context information 
   * @param {string} context.sessionId - Session identifier
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated response with source attribution
   */
  async generateResponse(query, context = {}, options = {}) {
    const startTime = performance.now();
    const sessionId = context.sessionId;
    const queryId = query.queryId || `query-${Date.now()}`;
    
    try {
      this.metrics.totalQueries++;
      
      // Retrieve relevant knowledge
      const retrievalStartTime = performance.now();
      let knowledgeResult;
      
      if (options.preRetrievedKnowledge) {
        knowledgeResult = options.preRetrievedKnowledge;
      } else {
        // Get knowledge using the knowledge retrieval service
        knowledgeResult = await this.knowledgeRetrievalService.retrieveKnowledge(
          query, 
          { ...context, sessionId }, 
          options.retrievalOptions || {}
        );
      }
      
      const retrievalTime = performance.now() - retrievalStartTime;
      this.metrics.totalRetrievalTimeMs += retrievalTime;
      
      // Prepare knowledge for generation
      const preparedKnowledge = this._prepareKnowledgeForGeneration(knowledgeResult, options);
      
      // If knowledge is insufficient, use generative fallback
      if (this._isKnowledgeInsufficient(preparedKnowledge, query)) {
        this.logger.info(`Using generative fallback for query: ${query.text}`);
        return this._generateFallbackResponse(query, context, options);
      }
      
      // Generate response with retrieved knowledge
      const generationStartTime = performance.now();
      const response = await this._generateFromKnowledge(query, preparedKnowledge, context, options);
      this.metrics.totalGenerationTimeMs += (performance.now() - generationStartTime);
      
      // Store response in working memory if available
      if (this.workingMemoryService && sessionId && queryId) {
        this.workingMemoryService.storeFinalResult(sessionId, queryId, response);
      }
      
      return {
        ...response,
        metadata: {
          knowledgeUsed: this._summarizeKnowledgeUsed(preparedKnowledge),
          generationTime: performance.now() - startTime,
          retrievalTime
        }
      };
    } catch (error) {
      this.logger.error(`Error in RAG response generation: ${error.message}`, error);
      // Fall back to direct generation as a last resort
      return this._generateFallbackResponse(query, context, { ...options, isFallback: true });
    }
  }
  
  /**
   * Prepare retrieved knowledge for generation
   * 
   * @private
   * @param {Object} knowledgeResult - Raw knowledge retrieval result
   * @param {Object} options - Preparation options
   * @returns {Object} - Prepared knowledge for generation
   */
  _prepareKnowledgeForGeneration(knowledgeResult, options = {}) {
    // Extract facts and contextual knowledge
    const facts = knowledgeResult.facts || [];
    const contextual = knowledgeResult.contextual || [];
    
    // Determine max items to include based on options or defaults
    const maxItems = options.maxKnowledgeItems || this.options.maxKnowledgeItemsPerPrompt;
    
    // Prioritize facts over contextual knowledge
    let prioritizedKnowledge = [
      ...facts.map(item => ({ ...item, type: 'fact' })),
      ...contextual.map(item => ({ ...item, type: 'contextual' }))
    ];
    
    // Apply confidence filtering if configured
    if (options.minConfidence) {
      prioritizedKnowledge = prioritizedKnowledge.filter(item => 
        (item.confidence || 0) >= options.minConfidence
      );
    }
    
    // Sort by relevance/confidence if available
    prioritizedKnowledge.sort((a, b) => {
      // Facts take priority over contextual
      if (a.type === 'fact' && b.type !== 'fact') return -1;
      if (a.type !== 'fact' && b.type === 'fact') return 1;
      
      // Then sort by confidence/similarity
      const aScore = a.confidence || a.similarity || 0;
      const bScore = b.confidence || b.similarity || 0;
      return bScore - aScore;
    });
    
    // Limit to max items
    const limitedKnowledge = prioritizedKnowledge.slice(0, maxItems);
    
    // Check if we need to chunk by tokens
    if (options.chunkByTokens !== false) {
      return this._chunkKnowledgeByTokens(limitedKnowledge);
    }
    
    return { items: limitedKnowledge, chunks: [limitedKnowledge] };
  }
  
  /**
   * Chunk knowledge items to fit within token limits
   * 
   * @private
   * @param {Array} knowledgeItems - Knowledge items to chunk
   * @returns {Object} - Chunked knowledge
   */
  _chunkKnowledgeByTokens(knowledgeItems) {
    // Simple chunking approximation - assumes average of 4 chars per token
    const maxTokens = this.options.maxTokensPerKnowledgeChunk;
    const chunks = [];
    let currentChunk = [];
    let currentTokens = 0;
    
    // Hard-code estimates for token counting
    const approximateTokenLength = (item) => {
      const textContent = (typeof item.content === 'string') 
        ? item.content 
        : (typeof item.data === 'object') 
            ? JSON.stringify(item.data)
            : String(item.content || item.data || '');
      
      return Math.ceil(textContent.length / 4); // Rough estimate: 4 chars per token
    };
    
    // Create chunks
    for (const item of knowledgeItems) {
      const itemTokens = approximateTokenLength(item);
      
      // If this item would exceed the max, start a new chunk
      if (currentTokens + itemTokens > maxTokens && currentChunk.length > 0) {
        chunks.push([...currentChunk]);
        currentChunk = [];
        currentTokens = 0;
      }
      
      // Add the item to the current chunk
      currentChunk.push(item);
      currentTokens += itemTokens;
    }
    
    // Add the last chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return { items: knowledgeItems, chunks };
  }
  
  /**
   * Check if retrieved knowledge is insufficient to answer the query
   * 
   * @private
   * @param {Object} preparedKnowledge - Prepared knowledge
   * @param {Object} query - The query object
   * @returns {boolean} - True if knowledge is insufficient
   */
  _isKnowledgeInsufficient(preparedKnowledge, query) {
    // No knowledge items at all
    if (!preparedKnowledge.items || preparedKnowledge.items.length === 0) {
      return true;
    }
    
    // No factual knowledge for factual queries
    const isFactualQuery = query.parsedQuery?.intent?.includes('query') ||
                           query.text.includes('what') || 
                           query.text.includes('where') ||
                           query.text.includes('when') ||
                           query.text.includes('how many') ||
                           query.text.includes('which');
                           
    if (isFactualQuery && !preparedKnowledge.items.some(item => item.type === 'fact')) {
      return true;
    }
    
    // Specific entities mentioned but not found in knowledge
    if (query.parsedQuery?.entities) {
      const mentionedEntities = Object.entries(query.parsedQuery.entities)
        .filter(([key]) => ['stand', 'terminal', 'airline', 'aircraft_type'].includes(key))
        .map(([_, value]) => String(value).toLowerCase());
      
      if (mentionedEntities.length > 0) {
        // Check if any knowledge items contain the mentioned entities
        const knowledgeText = preparedKnowledge.items
          .map(item => JSON.stringify(item).toLowerCase());
        
        const foundEntities = mentionedEntities.filter(entity => 
          knowledgeText.some(text => text.includes(entity))
        );
        
        // If no entities were found in the knowledge
        if (foundEntities.length === 0) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate a response using retrieved knowledge
   * 
   * @private
   * @param {Object} query - The query object
   * @param {Object} preparedKnowledge - Prepared knowledge
   * @param {Object} context - Context information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated response
   */
  async _generateFromKnowledge(query, preparedKnowledge, context, options = {}) {
    // If we have multiple chunks, generate from each and combine
    if (preparedKnowledge.chunks && preparedKnowledge.chunks.length > 1) {
      return this._generateFromMultipleChunks(query, preparedKnowledge.chunks, context, options);
    }
    
    // Single knowledge chunk generation
    const knowledgeItems = preparedKnowledge.chunks?.[0] || preparedKnowledge.items;
    
    // Create system prompt with knowledge
    const systemPrompt = this._createSystemPromptWithKnowledge(knowledgeItems, options);
    
    // Create user prompt with query
    const userPrompt = this._createUserPrompt(query, context, options);
    
    // Generate response
    const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
    
    // Apply fact checking if enabled
    if (this.options.factCheckingEnabled && options.factCheck !== false) {
      return this._factCheckResponse(completion.text, knowledgeItems, query, context);
    }
    
    return {
      text: completion.text,
      sources: this._extractSourcesFromKnowledge(knowledgeItems),
      usage: completion.usage
    };
  }
  
  /**
   * Generate a response from multiple knowledge chunks
   * 
   * @private
   * @param {Object} query - The query object
   * @param {Array} chunks - Chunks of knowledge items
   * @param {Object} context - Context information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Combined response
   */
  async _generateFromMultipleChunks(query, chunks, context, options = {}) {
    // Generate from each chunk in parallel
    const chunkResponses = await Promise.all(
      chunks.map(chunk => 
        this._generateFromKnowledge(
          query, 
          { items: chunk }, 
          context, 
          { ...options, factCheck: false } // Disable per-chunk fact checking
        )
      )
    );
    
    // Extract and combine response texts
    const combinedText = chunkResponses.map(response => response.text).join('\n\n');
    
    // Combine sources from all chunks
    const combinedSources = this._combineSourcesFromResponses(chunkResponses);
    
    // Synthesize a coherent response from the chunk responses
    const synthesizedResponse = await this._synthesizeChunkResponses(combinedText, query, context, options);
    
    // Apply fact checking to the synthesized response if enabled
    if (this.options.factCheckingEnabled && options.factCheck !== false) {
      const allKnowledge = chunks.flat();
      return this._factCheckResponse(synthesizedResponse.text, allKnowledge, query, context);
    }
    
    return {
      text: synthesizedResponse.text,
      sources: combinedSources,
      usage: synthesizedResponse.usage
    };
  }
  
  /**
   * Synthesize a coherent response from multiple chunk responses
   * 
   * @private
   * @param {string} combinedText - Combined text from all chunks
   * @param {Object} query - The original query
   * @param {Object} context - Context information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Synthesized response
   */
  async _synthesizeChunkResponses(combinedText, query, context, options = {}) {
    const systemPrompt = `You are an AI assistant for airport capacity planning.
Your task is to synthesize multiple response fragments into a coherent, non-repetitive response.
The fragments may contain overlapping or contradictory information.
Eliminate redundancies, resolve contradictions, and create a unified response that directly answers the user's query.
Use a professional, concise tone appropriate for airport operations staff.
Focus on factual information and key insights without unnecessary elaboration.`;

    const userPrompt = `Original Query: ${query.text}
    
Response Fragments:
${combinedText}

Synthesize these fragments into a coherent, non-repetitive response that directly answers the original query.`;

    const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
    
    return {
      text: completion.text,
      usage: completion.usage
    };
  }
  
  /**
   * Fact check a generated response against knowledge
   * 
   * @private
   * @param {string} responseText - Generated response text
   * @param {Array} knowledgeItems - Knowledge items used for generation
   * @param {Object} query - The original query
   * @param {Object} context - Context information
   * @returns {Promise<Object>} - Fact-checked response
   */
  async _factCheckResponse(responseText, knowledgeItems, query, context) {
    this.metrics.factCheckedResponses++;
    
    const systemPrompt = `You are a fact-checking assistant for airport capacity planning.
Your task is to verify that the provided response is factually consistent with the knowledge items.
If you find any inconsistencies or statements not supported by the knowledge, correct them.
Focus on factual accuracy, not style or tone.
You should preserve the original response as much as possible, only making changes necessary for factual accuracy.
If the response requires significant corrections, maintain the same structure and tone.`;

    const knowledgeString = knowledgeItems.map(item => {
      const content = item.data || item.content;
      const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
      return `[${item.type}] ${contentStr}`;
    }).join('\n\n');

    const userPrompt = `Query: ${query.text}
    
Knowledge Items:
${knowledgeString}

Response to Verify:
${responseText}

Please verify the response against the knowledge items and provide a corrected version if necessary.`;

    const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
    
    return {
      text: completion.text,
      sources: this._extractSourcesFromKnowledge(knowledgeItems),
      isFactChecked: true,
      usage: completion.usage
    };
  }
  
  /**
   * Generate a fallback response when knowledge is insufficient
   * 
   * @private
   * @param {Object} query - The query object
   * @param {Object} context - Context information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Fallback response
   */
  async _generateFallbackResponse(query, context, options = {}) {
    this.metrics.fallbackResponses++;
    
    // Determine if this is a last-resort fallback (error occurred)
    const isLastResort = options.isFallback === true;
    const systemPrompt = isLastResort
      ? `You are an AI assistant for airport capacity planning.
Respond to the user's query in a helpful way, but be clear about limitations.
If asked about specific airport data that you don't have access to, apologize and explain you don't have that specific information.
Provide general information about the topic if possible, but don't make up specific data.
Suggest alternative questions the user might ask that you could answer more effectively.`
      : `You are an AI assistant for airport capacity planning.
I don't have the specific information needed to answer this query with confidence.
Inform the user that you don't have the specific data requested, but provide general information about the topic if possible.
Be honest about limitations while remaining helpful.
Suggest ways the user could refine their query or alternative questions they could ask.
Do not make up specific facts about the airport, stands, terminals, or operations.`;

    // Use any conversation context we might have
    const conversationHistory = [];
    if (this.workingMemoryService && context.sessionId) {
      const sessionContext = this.workingMemoryService.getSessionContext(context.sessionId);
      if (sessionContext && sessionContext.recentMessages) {
        conversationHistory.push(...sessionContext.recentMessages.slice(-3));
      }
    }
    
    const completion = await this.openAIService.processQuery(
      query.text, 
      conversationHistory, 
      systemPrompt
    );
    
    return {
      text: completion.text,
      sources: [],
      isFallback: true,
      usage: completion.usage
    };
  }
  
  /**
   * Create a system prompt with knowledge items
   * 
   * @private
   * @param {Array} knowledgeItems - Knowledge items to include
   * @param {Object} options - Generation options
   * @returns {string} - System prompt with knowledge
   */
  _createSystemPromptWithKnowledge(knowledgeItems, options = {}) {
    const knowledgeString = knowledgeItems.map(item => {
      const content = item.data || item.content;
      const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
      const source = item.source || 'unknown';
      return `[${item.type} from ${source}] ${contentStr}`;
    }).join('\n\n');

    // Base system prompt
    const basePrompt = `You are an AI assistant for airport capacity planning.
Your task is to answer user queries based on the specific knowledge provided below.
You must ground your response in ONLY the provided knowledge items.
Do not reference information outside of what is provided.
Provide clear, concise answers that directly address the user's query.

## Knowledge Items:
${knowledgeString}

## Guidelines:
1. Use ONLY the provided knowledge to answer the query
2. If the knowledge is insufficient to fully answer the query, be honest about limitations
3. Do not make up facts or details not present in the provided knowledge
4. Answer in a clear, professional tone appropriate for airport operations staff
5. Organize information logically and prioritize the most relevant details
6. If numerical data is present, include it accurately in your response
7. Do not mention that you are using "knowledge items" or "provided information" in your response`;

    // Add custom tone/style instructions if provided
    const styleInstructions = options.toneInstructions || options.styleInstructions || '';
    
    return styleInstructions ? `${basePrompt}\n\n${styleInstructions}` : basePrompt;
  }
  
  /**
   * Create user prompt from query and context
   * 
   * @private
   * @param {Object} query - The query object
   * @param {Object} context - Context information
   * @param {Object} options - Generation options
   * @returns {string} - User prompt
   */
  _createUserPrompt(query, context, options = {}) {
    // Include any additional context or instructions
    const additionalPrompt = options.additionalPrompt || '';
    
    // Format based on whether we have a parsed query
    if (query.parsedQuery) {
      return `${query.text}
      
Intent: ${query.parsedQuery.intent || 'unknown'}
Entities: ${JSON.stringify(query.parsedQuery.entities || {})}
${additionalPrompt}`;
    }
    
    return `${query.text}${additionalPrompt ? '\n\n' + additionalPrompt : ''}`;
  }
  
  /**
   * Extract sources from knowledge items
   * 
   * @private
   * @param {Array} knowledgeItems - Knowledge items
   * @returns {Array} - Source details
   */
  _extractSourcesFromKnowledge(knowledgeItems) {
    const sources = new Map();
    
    for (const item of knowledgeItems) {
      const source = item.source || 'unknown';
      if (!sources.has(source)) {
        sources.set(source, {
          source,
          type: item.type,
          count: 1
        });
      } else {
        sources.get(source).count++;
      }
    }
    
    return Array.from(sources.values());
  }
  
  /**
   * Combine sources from multiple responses
   * 
   * @private
   * @param {Array} responses - Response objects with sources
   * @returns {Array} - Combined source details
   */
  _combineSourcesFromResponses(responses) {
    const sourcesMap = new Map();
    
    for (const response of responses) {
      if (response.sources && Array.isArray(response.sources)) {
        for (const source of response.sources) {
          const key = source.source || 'unknown';
          if (!sourcesMap.has(key)) {
            sourcesMap.set(key, { ...source });
          } else {
            sourcesMap.get(key).count += source.count || 1;
          }
        }
      }
    }
    
    return Array.from(sourcesMap.values());
  }
  
  /**
   * Summarize knowledge used for generation
   * 
   * @private
   * @param {Object} preparedKnowledge - Prepared knowledge
   * @returns {Object} - Knowledge summary
   */
  _summarizeKnowledgeUsed(preparedKnowledge) {
    const items = preparedKnowledge.items || [];
    
    // Count items by type
    const typeCount = {};
    for (const item of items) {
      const type = item.type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    }
    
    // Count items by source
    const sourceCount = {};
    for (const item of items) {
      const source = item.source || 'unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    }
    
    // Count entities if available
    const entities = new Set();
    for (const item of items) {
      if (item.data && item.data.id) {
        entities.add(item.data.id);
      }
    }
    
    return {
      totalItems: items.length,
      byType: typeCount,
      bySource: sourceCount,
      uniqueEntities: entities.size,
      chunkCount: (preparedKnowledge.chunks || []).length
    };
  }
  
  /**
   * Generate an evidence-based answer to a specific factual question
   * 
   * @param {string} question - The specific factual question
   * @param {Array} evidence - Array of evidence texts/documents
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated answer with confidence and sources
   */
  async generateEvidenceBasedAnswer(question, evidence, options = {}) {
    const systemPrompt = `You are an AI assistant for airport capacity planning.
Your task is to answer a factual question based solely on the provided evidence.
Please follow these guidelines:

1. Only use information explicitly stated in the evidence provided
2. If the evidence doesn't contain the answer, say "I don't have enough information to answer this question"
3. Do not use any outside knowledge or make assumptions beyond what's in the evidence
4. Cite the specific piece of evidence used for each part of your answer (Evidence 1, Evidence 2, etc.)
5. Include a confidence score (1-5) reflecting how well the evidence supports your answer
   1 = Completely uncertain/No supporting evidence
   5 = Absolutely certain/Clear explicit evidence

Return your answer with supporting evidence citations and confidence score.`;

    const evidenceString = evidence.map((item, index) => 
      `Evidence ${index + 1}: ${typeof item === 'string' ? item : JSON.stringify(item)}`
    ).join('\n\n');

    const userPrompt = `Question: ${question}

Evidence:
${evidenceString}

Please provide:
1. Your answer based solely on the evidence
2. Citations to the specific evidence used
3. Your confidence score (1-5)`;

    const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
    
    // Extract confidence from response
    const confidenceMatch = completion.text.match(/confidence(\s+score)?:\s*(\d)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[2], 10) / 5 : null;
    
    return {
      answer: completion.text,
      confidence,
      usage: completion.usage
    };
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    const avgGenerationTime = this.metrics.totalQueries > 0
      ? this.metrics.totalGenerationTimeMs / this.metrics.totalQueries
      : 0;
    
    const avgRetrievalTime = this.metrics.totalQueries > 0
      ? this.metrics.totalRetrievalTimeMs / this.metrics.totalQueries
      : 0;
    
    return {
      ...this.metrics,
      averageGenerationTimeMs: avgGenerationTime,
      averageRetrievalTimeMs: avgRetrievalTime,
      fallbackPercentage: this.metrics.totalQueries > 0
        ? (this.metrics.fallbackResponses / this.metrics.totalQueries) * 100
        : 0,
      factCheckedPercentage: this.metrics.totalQueries > 0
        ? (this.metrics.factCheckedResponses / this.metrics.totalQueries) * 100
        : 0
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      totalRetrievalTimeMs: 0,
      totalGenerationTimeMs: 0,
      factCheckedResponses: 0,
      fallbackResponses: 0
    };
  }
}

module.exports = RetrievalAugmentedGenerationService;