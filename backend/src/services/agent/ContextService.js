/**
 * ContextService.js
 * 
 * Service for managing conversation context, context tracking, summarization,
 * and long-term memory integration.
 * 
 * This service is responsible for:
 * - Managing active conversation contexts
 * - Handling context size limitations through summarization
 * - Extracting and storing long-term memories from conversations
 * - Retrieving relevant context information for queries
 * - Maintaining conversation history with intelligent retrieval
 */

const ConversationContext = require('../../models/agent/ConversationContext');
const LongTermMemory = require('../../models/agent/LongTermMemory');
const OpenAIService = require('./OpenAIService');
const VectorSearchService = require('./VectorSearchService');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Configuration constants with environment variable overrides
const MAX_CONTEXT_MESSAGES = parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10);
const SUMMARIZATION_WINDOW = parseInt(process.env.SUMMARIZATION_WINDOW || '15', 10);
const RELEVANCE_THRESHOLD = parseFloat(process.env.RELEVANCE_THRESHOLD || '0.7');
const MAX_MEMORY_EXTRACTION_RETRIES = parseInt(process.env.MAX_MEMORY_EXTRACTION_RETRIES || '3', 10);
const CONTEXT_CACHE_TTL = parseInt(process.env.CONTEXT_CACHE_TTL || (5 * 60 * 1000), 10); // 5 minutes in ms

/**
 * Service for managing conversation context
 */
class ContextService {
  constructor() {
    // In-memory cache for frequently accessed contexts
    this.contextCache = new Map();
    
    // Performance metrics tracking
    this.metrics = {
      contextsCreated: 0,
      messagesAdded: 0,
      summarizationRuns: 0,
      memoriesExtracted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
    
    // Set up cache cleaning interval (every hour)
    this.cacheCleanInterval = setInterval(() => {
      this.cleanCache();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Create a new conversation context
   * @param {string} userId - The user ID
   * @returns {Promise<ConversationContext>} - The created context
   */
  async createContext(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to create a context');
      }
      
      logger.info(`Creating new conversation context for user: ${userId}`);
      
      const context = await ConversationContext.query().insert({
        userId
      });
      
      // Cache the new context
      this.cacheContext(context);
      this.metrics.contextsCreated++;
      
      return context;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error creating conversation context: ${error.message}`);
      throw new Error(`Failed to create conversation context: ${error.message}`);
    }
  }

  /**
   * Get a conversation context by ID
   * @param {string} contextId - The context ID
   * @param {boolean} bypassCache - Whether to bypass the cache and force a database lookup
   * @returns {Promise<ConversationContext>} - The conversation context
   */
  async getContext(contextId, bypassCache = false) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      // Try to get from cache first if not bypassing
      if (!bypassCache) {
        const cachedContext = this.getCachedContext(contextId);
        if (cachedContext) {
          this.metrics.cacheHits++;
          return cachedContext;
        }
      }
      
      this.metrics.cacheMisses++;
      
      const context = await ConversationContext.query().findById(contextId);
      
      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }
      
      // Cache for future use
      this.cacheContext(context);
      
      return context;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error retrieving conversation context: ${error.message}`);
      throw new Error(`Failed to retrieve conversation context: ${error.message}`);
    }
  }

  /**
   * Get recent conversation contexts for a user
   * @param {string} userId - The user ID
   * @param {number} limit - Maximum number of contexts to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array<ConversationContext>>} - The conversation contexts
   */
  async getUserContexts(userId, limit = 10, offset = 0) {
    try {
      if (!userId) {
        throw new Error('User ID is required to get contexts');
      }
      
      // Input validation
      limit = Math.min(Math.max(parseInt(limit) || 10, 1), 50); // Between 1 and 50
      offset = Math.max(parseInt(offset) || 0, 0); // Non-negative
      
      const contexts = await ConversationContext.query()
        .where('userId', userId)
        .orderBy('lastUpdateTime', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Cache all retrieved contexts
      contexts.forEach(context => this.cacheContext(context));
      
      return contexts;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error retrieving user conversation contexts: ${error.message}`);
      throw new Error(`Failed to retrieve user conversation contexts: ${error.message}`);
    }
  }

  /**
   * Add a user message to a conversation context
   * @param {string} contextId - The context ID
   * @param {string} content - The message content
   * @returns {Promise<ConversationContext>} - The updated context
   */
  async addUserMessage(contextId, content) {
    try {
      if (!contextId || !content) {
        throw new Error('Context ID and content are required to add a user message');
      }
      
      // Sanitize input
      const sanitizedContent = this.sanitizeMessageContent(content);
      
      // Add the user message
      const context = await this.getContext(contextId);
      await context.addMessage('user', sanitizedContent);
      this.metrics.messagesAdded++;
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      // Check if we need to manage context size
      if (context.messages && context.messages.length > MAX_CONTEXT_MESSAGES) {
        // Run in background to not block the message addition
        this.manageContextSize(contextId).catch(error => {
          logger.warn(`Background context management failed: ${error.message}`);
        });
      }
      
      return await this.getContext(contextId, true);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error adding user message to context: ${error.message}`);
      throw new Error(`Failed to add user message to context: ${error.message}`);
    }
  }

  /**
   * Add an agent message to a conversation context
   * @param {string} contextId - The context ID
   * @param {string} content - The message content
   * @param {string} responseId - The response ID
   * @returns {Promise<ConversationContext>} - The updated context
   */
  async addAgentMessage(contextId, content, responseId = null) {
    try {
      if (!contextId || !content) {
        throw new Error('Context ID and content are required to add an agent message');
      }
      
      // Sanitize input
      const sanitizedContent = this.sanitizeMessageContent(content);
      
      // Use a generated UUID if responseId is not provided
      const finalResponseId = responseId || uuidv4();
      
      const context = await this.getContext(contextId);
      await context.addMessage('agent', sanitizedContent, finalResponseId);
      this.metrics.messagesAdded++;
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      // Check if we need to manage context size
      if (context.messages && context.messages.length > MAX_CONTEXT_MESSAGES) {
        // Run in background to not block the message addition
        this.manageContextSize(contextId).catch(error => {
          logger.warn(`Background context management failed: ${error.message}`);
        });
      }
      
      // Every few responses, check if we should store information in long-term memory
      if (context.messages && context.messages.filter(m => m.role === 'agent').length % 5 === 0) {
        // Run in background to not block the message addition
        this.extractAndStoreLongTermMemories(contextId).catch(error => {
          logger.warn(`Background memory extraction failed: ${error.message}`);
        });
      }
      
      return await this.getContext(contextId, true);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error adding agent message to context: ${error.message}`);
      throw new Error(`Failed to add agent message to context: ${error.message}`);
    }
  }

  /**
   * Update entities in a conversation context
   * @param {string} contextId - The context ID
   * @param {Object} entities - The entities to add/update
   * @returns {Promise<ConversationContext>} - The updated context
   */
  async updateEntities(contextId, entities) {
    try {
      if (!contextId || !entities || typeof entities !== 'object') {
        throw new Error('Context ID and entities object are required');
      }
      
      const context = await this.getContext(contextId);
      
      // Validate entities to ensure they're serializable
      try {
        // Test serialization
        JSON.stringify(entities);
      } catch (err) {
        throw new Error(`Entities must be serializable: ${err.message}`);
      }
      
      await context.updateEntities(entities);
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      return await this.getContext(contextId, true);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error updating entities in context: ${error.message}`);
      throw new Error(`Failed to update entities in context: ${error.message}`);
    }
  }

  /**
   * Add an intent to a conversation context
   * @param {string} contextId - The context ID
   * @param {string} intentType - The intent type
   * @param {number} confidence - The confidence score
   * @returns {Promise<ConversationContext>} - The updated context
   */
  async addIntent(contextId, intentType, confidence) {
    try {
      if (!contextId || !intentType) {
        throw new Error('Context ID and intent type are required');
      }
      
      // Validate confidence
      const validConfidence = Math.min(Math.max(parseFloat(confidence) || 0, 0), 1);
      
      const context = await this.getContext(contextId);
      await context.addIntent(intentType, validConfidence);
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      return await this.getContext(contextId, true);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error adding intent to context: ${error.message}`);
      throw new Error(`Failed to add intent to context: ${error.message}`);
    }
  }

  /**
   * Add or update topic tags for a conversation context
   * @param {string} contextId - The context ID
   * @param {Array<string>} tags - The topic tags to add/update
   * @returns {Promise<ConversationContext>} - The updated context
   */
  async updateTopicTags(contextId, tags) {
    try {
      if (!contextId || !Array.isArray(tags)) {
        throw new Error('Context ID and tags array are required');
      }
      
      // Sanitize tags
      const validTags = tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim())
        .slice(0, 10); // Limit to 10 tags max
      
      const context = await this.getContext(contextId);
      
      // Update the tags
      await context.$query().patch({
        topicTags: validTags,
        lastUpdateTime: new Date().toISOString()
      });
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      return await this.getContext(contextId, true);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error updating topic tags: ${error.message}`);
      throw new Error(`Failed to update topic tags: ${error.message}`);
    }
  }

  /**
   * Get conversation messages
   * @param {string} contextId - The context ID
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Promise<Array>} - The conversation messages
   */
  async getMessages(contextId, limit = 10) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      // Validate limit
      limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // Between 1 and 100
      
      const context = await this.getContext(contextId);
      const messages = context.messages || [];
      
      // Return the most recent messages up to the limit
      return messages.slice(-limit);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error retrieving conversation messages: ${error.message}`);
      throw new Error(`Failed to retrieve conversation messages: ${error.message}`);
    }
  }
  
  /**
   * Get full conversation history with optional context enrichment
   * @param {string} contextId - The context ID
   * @param {boolean} enrichWithMemories - Whether to enrich with relevant long-term memories
   * @param {string} currentQuery - Current query for relevance matching (if enriching)
   * @param {Object} options - Additional options for history retrieval
   * @returns {Promise<Array>} - The conversation history
   */
  async getConversationHistory(contextId, enrichWithMemories = false, currentQuery = null, options = {}) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      const {
        maxMessages = MAX_CONTEXT_MESSAGES,
        includeSystemMessages = true,
        formatForLLM = true
      } = options;
      
      const context = await this.getContext(contextId);
      let history = context.messages || [];
      
      // Apply message limit if there are a lot of messages
      if (history.length > maxMessages) {
        history = history.slice(-maxMessages);
      }
      
      // Filter out system messages if not requested
      if (!includeSystemMessages) {
        history = history.filter(msg => msg.role !== 'system');
      }
      
      // Format history for LLM consumption if requested
      if (formatForLLM) {
        history = history.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
      
      // If context includes summary and we include system messages, add it at the beginning
      if (context.summary && includeSystemMessages) {
        history = [
          {
            role: 'system',
            content: `Previous conversation summary: ${context.summary}`,
            timestamp: context.startTime
          },
          ...history
        ];
      }
      
      // If requested, enrich with relevant information
      if (enrichWithMemories && currentQuery) {
        await this.enrichHistoryWithRelevantInfo(history, context, currentQuery);
      }
      
      return history;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error retrieving conversation history: ${error.message}`);
      throw new Error(`Failed to retrieve conversation history: ${error.message}`);
    }
  }

  /**
   * Enrich conversation history with relevant information from memory and context
   * @param {Array} history - The conversation history to enrich (modified in place)
   * @param {Object} context - The conversation context
   * @param {string} currentQuery - The current query for relevance matching
   * @returns {Promise<void>}
   * @private
   */
  async enrichHistoryWithRelevantInfo(history, context, currentQuery) {
    try {
      // Find relevant information using vector search
      const relevantInfo = await VectorSearchService.searchRelevantInformation(
        context.userId,
        context.id,
        currentQuery,
        {
          topK: 5,
          threshold: RELEVANCE_THRESHOLD
        }
      );
      
      // Add relevant memories if any
      if (relevantInfo.memories && relevantInfo.memories.length > 0) {
        const memoriesContent = relevantInfo.memories
          .map(mem => `- ${mem.content} [${mem.category}, Importance: ${mem.importance}/10]`)
          .join('\n');
        
        history.unshift({
          role: 'system',
          content: `Relevant memories from previous conversations:\n${memoriesContent}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Add relevant messages from earlier in the conversation if any
      // Only include messages from earlier than the last 10 messages
      if (relevantInfo.messages && relevantInfo.messages.length > 0) {
        const recentMessageIds = new Set(
          history.slice(-10).map(msg => msg.id)
        );
        
        const earlierRelevantMessages = relevantInfo.messages
          .filter(msg => !recentMessageIds.has(msg.id))
          .slice(0, 3);
        
        if (earlierRelevantMessages.length > 0) {
          const messagesContent = earlierRelevantMessages
            .map(msg => `- ${msg.role.toUpperCase()}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`)
            .join('\n');
          
          history.unshift({
            role: 'system',
            content: `Related information from earlier in this conversation:\n${messagesContent}`,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Add entity context if available
      if (context.entities && Object.keys(context.entities).length > 0) {
        // Filter to only include entities relevant to the current query
        const relevantEntityTypes = this.getRelevantEntityTypes(currentQuery);
        
        if (relevantEntityTypes.length > 0) {
          const relevantEntities = {};
          
          for (const type of relevantEntityTypes) {
            if (context.entities[type]) {
              relevantEntities[type] = context.entities[type];
            }
          }
          
          if (Object.keys(relevantEntities).length > 0) {
            history.unshift({
              role: 'system',
              content: `Current context information:\n${JSON.stringify(relevantEntities, null, 2)}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Error enriching history with relevant info: ${error.message}`);
      // Continue without enrichment if it fails
    }
  }

  /**
   * Get context entities
   * @param {string} contextId - The context ID
   * @returns {Promise<Object>} - The context entities
   */
  async getEntities(contextId) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      const context = await this.getContext(contextId);
      return context.entities || {};
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error retrieving context entities: ${error.message}`);
      throw new Error(`Failed to retrieve context entities: ${error.message}`);
    }
  }
  
  /**
   * Manage context size by summarizing older messages
   * @param {string} contextId - The context ID 
   * @returns {Promise<void>}
   */
  async manageContextSize(contextId) {
    try {
      const context = await this.getContext(contextId, true); // Bypass cache to get latest
      const messages = context.messages || [];
      
      // If we're over the max context size, summarize older messages
      if (messages.length > MAX_CONTEXT_MESSAGES) {
        logger.info(`Managing context size for conversation ${contextId}`);
        
        // Keep the most recent messages intact
        const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
        
        // Summarize older messages if there are any
        const olderMessages = messages.slice(0, messages.length - MAX_CONTEXT_MESSAGES);
        
        if (olderMessages.length > 0) {
          // If we already have a summary, include it with the older messages
          if (context.summary) {
            olderMessages.unshift({
              role: 'system',
              content: `Previous summary: ${context.summary}`,
              timestamp: context.startTime
            });
          }
          
          // Generate a new summary
          const newSummary = await this.summarizeMessages(olderMessages);
          this.metrics.summarizationRuns++;
          
          // Update the context with the summary and reduced message set
          await context.$query().patch({
            messages: recentMessages,
            summary: newSummary,
            lastUpdateTime: new Date().toISOString()
          });
          
          // Invalidate cache
          this.contextCache.delete(contextId);
          
          logger.info(`Summarized ${olderMessages.length} messages for conversation ${contextId}`);
        }
      }
    } catch (error) {
      logger.error(`Error managing context size: ${error.message}`);
      // Don't throw, as this is an enhancement and shouldn't break the main flow
    }
  }
  
  /**
   * Summarize a set of messages using OpenAI
   * @param {Array} messages - The messages to summarize
   * @returns {Promise<string>} - A summary of the messages
   */
  async summarizeMessages(messages) {
    try {
      if (!messages || messages.length === 0) {
        return '';
      }
      
      // Format messages for summarization
      const formattedConversation = messages.map(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`;
      }).join('\n\n');
      
      // Create a prompt for summarization
      const prompt = `
      Summarize the key points from this conversation segment, focusing on:
      1. Important facts mentioned about airport operations and capacity
      2. User requests and agent responses
      3. Any important data points, dates, or figures discussed
      4. Decisions made or actions taken
      
      Format your summary as a concise paragraph focusing only on the most important information.
      
      Conversation to summarize:
      ${formattedConversation}
      `;
      
      // Use OpenAI to generate the summary
      const { text: summary } = await OpenAIService.processQuery(prompt);
      
      return summary.trim();
    } catch (error) {
      logger.error(`Error summarizing messages: ${error.message}`);
      // Return a basic fallback summary in case of errors
      return `Conversation about airport capacity planning. Includes ${messages.length} messages discussing airport operations.`;
    }
  }
  
  /**
   * Extract important information from conversation and store in long-term memory
   * @param {string} contextId - The context ID
   * @returns {Promise<Array>} - Extracted memories
   */
  async extractAndStoreLongTermMemories(contextId) {
    try {
      const context = await this.getContext(contextId, true); // Bypass cache to get latest
      const recentMessages = context.messages.slice(-SUMMARIZATION_WINDOW);
      
      if (recentMessages.length < 3) {
        // Not enough context to extract meaningful memories
        return [];
      }
      
      // Format recent conversation for extraction
      const formattedConversation = recentMessages.map(msg => {
        return `${msg.role.toUpperCase()}: ${msg.content}`;
      }).join('\n\n');
      
      // Create a prompt for memory extraction
      const prompt = `
      Extract 1-3 important facts or pieces of information from this conversation segment that would be useful to remember for future interactions.
      Focus on:
      
      1. Specific preferences expressed by the user
      2. Important airport configurations or constraints mentioned
      3. Key decisions made or actions taken
      4. Critical data points about capacity, maintenance, or scheduling
      
      For each memory, assign one of these categories: PREFERENCE, CONSTRAINT, ACTION, DATA
      
      Return a JSON array where each item contains:
      - content: The specific fact or information (1-2 sentences max)
      - category: The category from the list above
      - importance: A number from 1-10 indicating importance (10 being highest)
      
      Only extract truly important information that would be useful in future conversations.
      If there are no important facts to extract, return an empty array.
      
      Conversation segment:
      ${formattedConversation}
      `;
      
      // Extract memories with retry logic
      let memories = [];
      let retries = 0;
      
      while (retries < MAX_MEMORY_EXTRACTION_RETRIES) {
        try {
          // Use OpenAI to extract memories
          const response = await OpenAIService.processQuery(prompt);
          
          // Parse the response to get the memories
          try {
            // Look for a JSON array in the response
            const jsonMatch = response.text.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
              memories = JSON.parse(jsonMatch[0]);
            } else if (response.text.trim().startsWith('[') && response.text.trim().endsWith(']')) {
              // Try direct parsing if it looks like JSON
              memories = JSON.parse(response.text);
            }
            
            // Validate the memories format
            if (Array.isArray(memories)) {
              // Filtering valid memories
              memories = memories.filter(memory => 
                memory && 
                typeof memory.content === 'string' && 
                memory.content.trim() !== '' &&
                typeof memory.category === 'string' &&
                ['PREFERENCE', 'CONSTRAINT', 'ACTION', 'DATA', 'OTHER'].includes(memory.category.toUpperCase())
              );
              
              // If we got valid memories, break out of the retry loop
              if (memories.length > 0) {
                break;
              }
            }
          } catch (parseError) {
            logger.warn(`Failed to parse memories, retrying: ${parseError.message}`);
          }
        } catch (extractError) {
          logger.warn(`Memory extraction failed, retrying: ${extractError.message}`);
        }
        
        retries++;
        
        // Wait before retrying (exponential backoff)
        if (retries < MAX_MEMORY_EXTRACTION_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries)));
        }
      }
      
      if (!Array.isArray(memories) || memories.length === 0) {
        // No memories extracted
        return [];
      }
      
      // Store each memory in the database
      const timestamp = new Date().toISOString();
      const storedMemories = [];
      
      for (const memory of memories) {
        // Ensure memory has proper format
        const formattedMemory = {
          userId: context.userId,
          contextId,
          content: memory.content,
          category: memory.category.toUpperCase(),
          importance: Math.min(Math.max(parseInt(memory.importance) || 5, 1), 10),
          timestamp
        };
        
        const storedMemory = await LongTermMemory.query().insert(formattedMemory);
        storedMemories.push(storedMemory);
      }
      
      this.metrics.memoriesExtracted += storedMemories.length;
      logger.info(`Stored ${storedMemories.length} memories for conversation ${contextId}`);
      
      return storedMemories;
    } catch (error) {
      logger.error(`Error extracting long-term memories: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Retrieve relevant memories based on a query
   * @param {string} contextId - The conversation context ID
   * @param {string} query - The user query to match against
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} - Relevant memories
   */
  async retrieveRelevantMemories(contextId, query, options = {}) {
    try {
      if (!contextId || !query) {
        return [];
      }
      
      const context = await this.getContext(contextId);
      
      const searchOptions = {
        topK: options.limit || 5,
        threshold: options.threshold || RELEVANCE_THRESHOLD,
        minImportance: options.minImportance || 3,
        categories: options.categories || null,
        maxAgeDays: options.maxAgeDays || null,
        similarityMetric: options.similarityMetric || 'cosine'
      };
      
      // Use vector search for more accurate semantic matching
      const memories = await VectorSearchService.findSimilarMemories(
        context.userId,
        query,
        searchOptions
      );
      
      return memories;
    } catch (error) {
      logger.error(`Error retrieving relevant memories: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Find information relevant to a query across context and memory
   * @param {string} contextId - Context ID 
   * @param {string} query - Query to match against
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Relevant information
   */
  async findRelevantInformation(contextId, query, options = {}) {
    try {
      if (!contextId || !query) {
        return {
          memories: [],
          messages: []
        };
      }
      
      const context = await this.getContext(contextId);
      
      // Define search options
      const searchOptions = {
        topK: options.limit || 5,
        threshold: options.threshold || RELEVANCE_THRESHOLD,
        similarityMetric: options.similarityMetric || 'cosine'
      };
      
      return await VectorSearchService.searchRelevantInformation(
        context.userId,
        contextId,
        query,
        searchOptions
      );
    } catch (error) {
      logger.error(`Error finding relevant information: ${error.message}`);
      return {
        memories: [],
        messages: []
      };
    }
  }
  
  /**
   * Mark a conversation context as completed/ended
   * @param {string} contextId - The context ID to mark as completed
   * @returns {Promise<void>}
   */
  async markContextAsCompleted(contextId) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      // Set the endTime field 
      await ConversationContext.query()
        .findById(contextId)
        .patch({
          endTime: new Date().toISOString(),
          lastUpdateTime: new Date().toISOString()
        });
      
      // Invalidate cache
      this.contextCache.delete(contextId);
      
      // Extract any final memories
      try {
        await this.extractAndStoreLongTermMemories(contextId);
      } catch (memoryError) {
        logger.warn(`Failed to extract final memories: ${memoryError.message}`);
      }
      
      logger.info(`Marked context ${contextId} as completed`);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error marking context as completed: ${error.message}`);
      throw new Error(`Failed to mark context as completed: ${error.message}`);
    }
  }
  
  /**
   * Delete a conversation context and all related data
   * @param {string} contextId - The context ID to delete
   * @returns {Promise<void>}
   */
  async deleteContext(contextId) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      // Delete the context
      const deleted = await ConversationContext.query()
        .deleteById(contextId);
      
      if (!deleted) {
        throw new Error(`Context not found: ${contextId}`);
      }
      
      // Clean up related memories
      await LongTermMemory.query()
        .where('contextId', contextId)
        .delete();
      
      // Remove from cache
      this.contextCache.delete(contextId);
      
      logger.info(`Deleted context ${contextId} and related data`);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error deleting context: ${error.message}`);
      throw new Error(`Failed to delete context: ${error.message}`);
    }
  }
  
  // Cache management methods
  
  /**
   * Get a context from cache
   * @param {string} contextId - The context ID
   * @returns {Object|null} - Cached context or null
   * @private
   */
  getCachedContext(contextId) {
    const cached = this.contextCache.get(contextId);
    
    if (cached && Date.now() - cached.timestamp < CONTEXT_CACHE_TTL) {
      return cached.context;
    }
    
    return null;
  }
  
  /**
   * Cache a context
   * @param {Object} context - The context to cache
   * @private
   */
  cacheContext(context) {
    if (!context || !context.id) return;
    
    this.contextCache.set(context.id, {
      context,
      timestamp: Date.now()
    });
    
    // Clean cache if it gets too large (over 100 entries)
    if (this.contextCache.size > 100) {
      this.cleanCache();
    }
  }
  
  /**
   * Clean old entries from the cache
   * @private
   */
  cleanCache() {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, value] of this.contextCache.entries()) {
      if (now - value.timestamp > CONTEXT_CACHE_TTL) {
        this.contextCache.delete(key);
      }
    }
    
    // If still too many entries, remove oldest ones
    if (this.contextCache.size > 50) {
      const entries = Array.from(this.contextCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove the oldest half
      const toRemove = Math.floor(entries.length / 2);
      for (let i = 0; i < toRemove; i++) {
        this.contextCache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Get relevant entity types based on a query
   * @param {string} query - The query to analyze
   * @returns {Array<string>} - Array of relevant entity types
   * @private
   */
  getRelevantEntityTypes(query) {
    const queryLower = query.toLowerCase();
    const entityTypes = [];
    
    // Check for airport-related entities
    if (
      queryLower.includes('airport') ||
      queryLower.includes('terminal') ||
      queryLower.includes('capacity') ||
      queryLower.includes('operations')
    ) {
      entityTypes.push('airport', 'terminals');
    }
    
    // Check for stand-related queries
    if (
      queryLower.includes('stand') ||
      queryLower.includes('gate') ||
      queryLower.includes('position')
    ) {
      entityTypes.push('stands', 'gates');
    }
    
    // Check for aircraft-related queries
    if (
      queryLower.includes('aircraft') ||
      queryLower.includes('plane') ||
      queryLower.includes('flight')
    ) {
      entityTypes.push('aircraft', 'flights');
    }
    
    // Check for maintenance-related queries
    if (
      queryLower.includes('maintenance') ||
      queryLower.includes('repair') ||
      queryLower.includes('scheduled work')
    ) {
      entityTypes.push('maintenance');
    }
    
    // Check for airline-related queries
    if (
      queryLower.includes('airline') ||
      queryLower.includes('carrier')
    ) {
      entityTypes.push('airlines');
    }
    
    // Check for schedule-related queries
    if (
      queryLower.includes('schedule') ||
      queryLower.includes('timetable') ||
      queryLower.includes('slot')
    ) {
      entityTypes.push('schedule', 'slots');
    }
    
    return entityTypes;
  }
  
  /**
   * Sanitize message content for storage
   * @param {string} content - The message content to sanitize
   * @returns {string} - Sanitized content
   * @private
   */
  sanitizeMessageContent(content) {
    if (!content) return '';
    
    let sanitized = String(content);
    
    // Trim and limit length if needed
    sanitized = sanitized.trim();
    
    // Limit to a reasonable length (50KB)
    const maxLength = 50 * 1024; 
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + ' [content truncated]';
    }
    
    return sanitized;
  }
  
  /**
   * Get metrics for the service
   * @returns {Object} - The metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      contextsCreated: 0,
      messagesAdded: 0,
      summarizationRuns: 0,
      memoriesExtracted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }
}

// Clean up resources when the process exits
// Create the singleton instance
const contextServiceInstance = new ContextService();

// Clean up resources when the process exits
process.on('exit', () => {
  if (contextServiceInstance.cacheCleanInterval) {
    clearInterval(contextServiceInstance.cacheCleanInterval);
  }
});

// Export both the class and the instance
module.exports = contextServiceInstance;
module.exports.ContextService = ContextService;