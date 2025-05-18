/**
 * VectorSearchService.js
 * 
 * Service for vector-based similarity search of context information
 * Uses OpenAI embeddings to convert text to vectors for semantic similarity search
 * Production-ready implementation with proper error handling, batching, caching, and fallbacks
 */

const OpenAIService = require('./OpenAIService');
const LongTermMemory = require('../../models/agent/LongTermMemory');
const ConversationContext = require('../../models/agent/ConversationContext');
const logger = require('../../utils/logger');
const { chunk } = require('lodash');

class VectorSearchService {
  constructor() {
    // Default settings for vector search
    this.defaultTopK = 5;
    this.defaultSimilarityThreshold = 0.7;
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.embeddingDimension = 1536; // default dimension for embedding models
    
    // In-memory cache for embeddings to reduce API calls
    this.embeddingCache = new Map();
    
    // Cache TTL in milliseconds (1 hour by default)
    this.cacheTTL = parseInt(process.env.EMBEDDING_CACHE_TTL || (60 * 60 * 1000), 10);
    
    // Configuration for batch processing
    this.maxBatchSize = parseInt(process.env.EMBEDDING_MAX_BATCH_SIZE || 20, 10);
    
    // Rate limiting management
    this.retryDelay = 1000; // milliseconds
    this.maxRetries = 3;
    
    // Performance metrics
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      vectorsGenerated: 0,
      searchesPerformed: 0,
      errors: 0,
      averageLatency: 0,
      totalLatency: 0,
      requestCount: 0
    };
  }
  
  /**
   * Get text embedding from OpenAI
   * @param {string} text - The text to get embedding for
   * @returns {Promise<Array<number>>} - Vector embedding
   */
  async getEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
      }
      
      // Sanitize and standardize input
      const sanitizedText = this._sanitizeText(text);
      
      // Check cache first
      const cachedEmbedding = this._getCachedEmbedding(sanitizedText);
      if (cachedEmbedding) {
        this.metrics.cacheHits++;
        return cachedEmbedding;
      }
      
      this.metrics.cacheMisses++;
      
      // Measure latency
      const startTime = Date.now();
      
      // Try to get embedding with retries
      let embedding = null;
      let retries = 0;
      let error = null;
      
      while (!embedding && retries <= this.maxRetries) {
        try {
          const response = await OpenAIService.client.embeddings.create({
            model: this.embeddingModel,
            input: sanitizedText,
            dimensions: this.embeddingDimension
          });
          
          // OpenAI v4 API structure
          embedding = response.data[0]?.embedding;
          
          // Fallback for different API versions or structures
          if (!embedding && response.data?.[0]?.embedding) {
            embedding = response.data[0].embedding;
          } else if (!embedding && response.data?.embedding) {
            embedding = response.data.embedding;
          }
          
          // Final fallback in case the API structure changes
          if (!embedding) {
            logger.warn(`Unexpected embedding response structure: ${JSON.stringify(response)}`);
            // Try to extract embedding from any available format
            const possibleEmbedding = this._extractEmbeddingFromResponse(response);
            if (possibleEmbedding) {
              embedding = possibleEmbedding;
            }
          }
          
          this.metrics.apiCalls++;
          this.metrics.vectorsGenerated++;
        } catch (err) {
          retries++;
          error = err;
          
          // Handle rate limiting
          if (err.status === 429 || (err.error?.type === 'rate_limit_exceeded')) {
            logger.warn(`Rate limit hit for embeddings API. Retrying in ${this.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
          } else if (retries < this.maxRetries) {
            // Other errors, wait a bit and retry
            logger.warn(`Error getting embedding: ${err.message}. Retry ${retries}/${this.maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          } else {
            // Max retries reached
            break;
          }
        }
      }
      
      // Track latency 
      const latency = Date.now() - startTime;
      this.metrics.totalLatency += latency;
      this.metrics.requestCount++;
      this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.requestCount;
      
      if (!embedding) {
        this.metrics.errors++;
        logger.error(`Failed to get embedding after ${retries} retries: ${error?.message}`);
        throw new Error(`Failed to get embedding after ${retries} retries: ${error?.message}`);
      }
      
      // Validate embedding dimensionality
      if (!Array.isArray(embedding) || embedding.length === 0) {
        this.metrics.errors++;
        throw new Error('Invalid embedding: expected non-empty array');
      }
      
      // Cache the valid embedding
      this._cacheEmbedding(sanitizedText, embedding);
      
      return embedding;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error getting embedding: ${error.message}`);
      
      // In production, we should return a fallback embedding rather than fail
      if (process.env.NODE_ENV === 'production') {
        return this._generateFallbackEmbedding(text);
      }
      
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }
  
  /**
   * Get embeddings for multiple texts in an optimized batch
   * @param {Array<string>} texts - Array of texts to get embeddings for
   * @returns {Promise<Array<Array<number>>>} - Array of vector embeddings
   */
  async getBatchEmbeddings(texts) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        return [];
      }
      
      // Filter out empty/invalid texts and sanitize
      const validTexts = texts
        .filter(text => text && typeof text === 'string')
        .map(text => this._sanitizeText(text));
      
      if (validTexts.length === 0) {
        return [];
      }
      
      // Check cache for all texts
      const embeddings = new Array(validTexts.length);
      const uncachedIndices = [];
      const uncachedTexts = [];
      
      // First try to get from cache
      validTexts.forEach((text, index) => {
        const cachedEmbedding = this._getCachedEmbedding(text);
        if (cachedEmbedding) {
          embeddings[index] = cachedEmbedding;
          this.metrics.cacheHits++;
        } else {
          uncachedIndices.push(index);
          uncachedTexts.push(text);
          this.metrics.cacheMisses++;
        }
      });
      
      // If all were cached, return immediately
      if (uncachedTexts.length === 0) {
        return embeddings;
      }
      
      // Process uncached texts in batches to avoid hitting API limits
      const batches = chunk(uncachedTexts, this.maxBatchSize);
      const batchIndices = chunk(uncachedIndices, this.maxBatchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const indices = batchIndices[i];
        
        try {
          // Measure latency
          const startTime = Date.now();
          
          const response = await OpenAIService.client.embeddings.create({
            model: this.embeddingModel,
            input: batch
          });
          
          const latency = Date.now() - startTime;
          this.metrics.totalLatency += latency;
          this.metrics.requestCount += batch.length;
          this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.requestCount;
          
          // Handle response based on API version
          if (response.data && Array.isArray(response.data)) {
            // Match each result back to its original index
            response.data.forEach((item, batchIndex) => {
              const originalIndex = indices[batchIndex];
              const embedding = item.embedding;
              
              if (embedding && Array.isArray(embedding)) {
                embeddings[originalIndex] = embedding;
                this._cacheEmbedding(validTexts[originalIndex], embedding);
                this.metrics.vectorsGenerated++;
              } else {
                logger.warn(`Missing embedding in batch response for index ${batchIndex}`);
                embeddings[originalIndex] = this._generateFallbackEmbedding(validTexts[originalIndex]);
              }
            });
          } else {
            logger.warn(`Unexpected batch embedding response structure: ${JSON.stringify(response)}`);
            // Handle fallback for each uncached text
            for (let j = 0; j < indices.length; j++) {
              embeddings[indices[j]] = this._generateFallbackEmbedding(validTexts[indices[j]]);
            }
          }
          
          this.metrics.apiCalls++;
        } catch (error) {
          this.metrics.errors++;
          logger.error(`Error getting batch embeddings: ${error.message}`);
          
          // Generate fallback embeddings for any that failed
          for (let j = 0; j < indices.length; j++) {
            if (!embeddings[indices[j]]) {
              embeddings[indices[j]] = this._generateFallbackEmbedding(validTexts[indices[j]]);
            }
          }
        }
        
        // Small delay between batches to avoid rate limits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return embeddings;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error in batch embeddings: ${error.message}`);
      
      // In production, return fallback embeddings rather than fail
      if (process.env.NODE_ENV === 'production') {
        return texts.map(text => text ? this._generateFallbackEmbedding(text) : this._generateFallbackEmbedding(''));
      }
      
      throw new Error(`Failed to get batch embeddings: ${error.message}`);
    }
  }
  
  /**
   * Calculate cosine similarity between two vector embeddings
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} - Cosine similarity (-1 to 1, higher means more similar)
   */
  calculateCosineSimilarity(vec1, vec2) {
    // Check if vectors are valid
    if (!vec1 || !vec2 || !vec1.length || !vec2.length) {
      return 0;
    }
    
    // Handle vectors of different dimensions by using only the common dimensions
    const minLength = Math.min(vec1.length, vec2.length);
    const v1 = vec1.slice(0, minLength);
    const v2 = vec2.slice(0, minLength);
    
    try {
      // Calculate dot product
      const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
      
      // Calculate magnitudes
      const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
      
      // Avoid division by zero
      if (mag1 === 0 || mag2 === 0) {
        return 0;
      }
      
      // Return cosine similarity
      return dotProduct / (mag1 * mag2);
    } catch (error) {
      logger.error(`Error calculating cosine similarity: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Calculate Euclidean distance between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} - Euclidean distance (lower means more similar)
   */
  calculateEuclideanDistance(vec1, vec2) {
    // Check if vectors are valid
    if (!vec1 || !vec2 || !vec1.length || !vec2.length) {
      return Number.MAX_SAFE_INTEGER;
    }
    
    // Handle vectors of different dimensions
    const minLength = Math.min(vec1.length, vec2.length);
    const v1 = vec1.slice(0, minLength);
    const v2 = vec2.slice(0, minLength);
    
    try {
      // Calculate Euclidean distance
      let sumOfSquares = 0;
      for (let i = 0; i < minLength; i++) {
        const diff = v1[i] - v2[i];
        sumOfSquares += diff * diff;
      }
      
      return Math.sqrt(sumOfSquares);
    } catch (error) {
      logger.error(`Error calculating Euclidean distance: ${error.message}`);
      return Number.MAX_SAFE_INTEGER;
    }
  }
  
  /**
   * Find memories similar to a query using vector search
   * @param {string} userId - The user ID to search memories for
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Ranked similar memories
   */
  async findSimilarMemories(userId, query, options = {}) {
    try {
      if (!userId || !query) {
        return [];
      }
      
      this.metrics.searchesPerformed++;
      
      // Get embedding for the query
      const queryEmbedding = await this.getEmbedding(query);
      
      // Get options with defaults
      const {
        topK = this.defaultTopK,
        threshold = this.defaultSimilarityThreshold,
        categories = null,
        minImportance = 0,
        similarityMetric = 'cosine',
        maxAgeDays = null
      } = options;
      
      // Get all memories for the user
      let memoriesQuery = LongTermMemory.query().where('userId', userId);
      
      // Filter by categories if provided
      if (categories && Array.isArray(categories) && categories.length > 0) {
        memoriesQuery = memoriesQuery.whereIn('category', categories);
      }
      
      // Filter by minimum importance
      if (minImportance > 0) {
        memoriesQuery = memoriesQuery.where('importance', '>=', minImportance);
      }
      
      // Filter by age if provided
      if (maxAgeDays !== null && !isNaN(maxAgeDays)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
        memoriesQuery = memoriesQuery.where('timestamp', '>=', cutoffDate.toISOString());
      }
      
      const memories = await memoriesQuery;
      
      if (memories.length === 0) {
        return [];
      }
      
      // Extract all memory contents for batch processing
      const memoryContents = memories.map(memory => memory.content);
      
      // Get embeddings for all memories in a batch
      const memoryEmbeddings = await this.getBatchEmbeddings(memoryContents);
      
      // Calculate similarity and prepare results
      const memoryItems = memories.map((memory, index) => {
        const embedding = memoryEmbeddings[index];
        let similarity;
        
        if (similarityMetric === 'euclidean') {
          // For Euclidean distance, we need to convert to a similarity score (0-1)
          // We use an exponential decay formula: similarity = exp(-distance)
          const distance = this.calculateEuclideanDistance(queryEmbedding, embedding);
          similarity = Math.exp(-distance);
        } else {
          // Default to cosine similarity
          similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        }
        
        return {
          ...memory,
          similarity
        };
      });
      
      // Filter by similarity threshold and sort by similarity
      const filteredMemories = memoryItems
        .filter(memory => memory.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      // Update access count for retrieved memories (in background)
      this._updateMemoryAccessCounts(filteredMemories).catch(error => {
        logger.warn(`Error updating memory access counts: ${error.message}`);
      });
      
      return filteredMemories;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error finding similar memories: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Find relevant conversation context messages
   * @param {string} contextId - The conversation context ID
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Ranked relevant messages
   */
  async findRelevantMessages(contextId, query, options = {}) {
    try {
      if (!contextId || !query) {
        return [];
      }
      
      this.metrics.searchesPerformed++;
      
      // Get embedding for the query
      const queryEmbedding = await this.getEmbedding(query);
      
      // Get options with defaults
      const {
        topK = this.defaultTopK,
        threshold = this.defaultSimilarityThreshold,
        roles = null,
        maxDaysAgo = null,
        similarityMetric = 'cosine'
      } = options;
      
      // Get the context
      const context = await ConversationContext.query().findById(contextId);
      
      if (!context || !context.messages || context.messages.length === 0) {
        return [];
      }
      
      // Filter messages by role if needed
      let messages = context.messages;
      
      if (roles && Array.isArray(roles) && roles.length > 0) {
        messages = messages.filter(msg => roles.includes(msg.role));
      }
      
      // Filter by date if needed
      if (maxDaysAgo) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxDaysAgo);
        const cutoffIso = cutoffDate.toISOString();
        
        messages = messages.filter(msg => msg.timestamp >= cutoffIso);
      }
      
      if (messages.length === 0) {
        return [];
      }
      
      // Extract message contents for batch processing
      const messageContents = messages.map(message => message.content);
      
      // Get embeddings for all messages in a batch
      const messageEmbeddings = await this.getBatchEmbeddings(messageContents);
      
      // Calculate similarity for each message
      const messageItems = messages.map((message, index) => {
        const embedding = messageEmbeddings[index];
        let similarity;
        
        if (similarityMetric === 'euclidean') {
          const distance = this.calculateEuclideanDistance(queryEmbedding, embedding);
          similarity = Math.exp(-distance);
        } else {
          similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        }
        
        return {
          ...message,
          similarity
        };
      });
      
      // Filter by similarity threshold and sort by similarity
      return messageItems
        .filter(message => message.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error finding relevant messages: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Search for relevant information across all information sources
   * @param {string} userId - The user ID
   * @param {string} contextId - The current conversation context ID
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Combined search results
   */
  async searchRelevantInformation(userId, contextId, query, options = {}) {
    try {
      if (!query) {
        return {
          memories: [],
          messages: []
        };
      }
      
      // Run searches in parallel
      const [relevantMemories, relevantMessages] = await Promise.all([
        this.findSimilarMemories(userId, query, options),
        contextId ? this.findRelevantMessages(contextId, query, options) : []
      ]);
      
      return {
        memories: relevantMemories,
        messages: relevantMessages
      };
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error searching relevant information: ${error.message}`);
      return {
        memories: [],
        messages: []
      };
    }
  }
  
  // Cache management methods
  
  /**
   * Get embedding from cache
   * @param {string} text - The text to get embedding for
   * @returns {Array<number>|null} - Cached embedding or null
   * @private
   */
  _getCachedEmbedding(text) {
    const cacheKey = this._getCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.embedding;
    }
    
    return null;
  }
  
  /**
   * Cache an embedding
   * @param {string} text - The text the embedding is for
   * @param {Array<number>} embedding - The embedding to cache
   * @private
   */
  _cacheEmbedding(text, embedding) {
    const cacheKey = this._getCacheKey(text);
    this.embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });
    
    // Clean cache if it gets too large (over 1000 entries)
    if (this.embeddingCache.size > 1000) {
      this._cleanCache();
    }
  }
  
  /**
   * Clean old entries from the cache
   * @private
   */
  _cleanCache() {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, value] of this.embeddingCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.embeddingCache.delete(key);
      }
    }
    
    // If still too many entries, remove oldest ones
    if (this.embeddingCache.size > 500) {
      const entries = Array.from(this.embeddingCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove the oldest half
      const toRemove = Math.floor(entries.length / 2);
      for (let i = 0; i < toRemove; i++) {
        this.embeddingCache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Generate a cache key for text
   * @param {string} text - The text to generate key for
   * @returns {string} - Cache key
   * @private
   */
  _getCacheKey(text) {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${hash}`;
  }
  
  /**
   * Update access counts for retrieved memories (runs in background)
   * @param {Array} memories - The memories to update
   * @returns {Promise<void>}
   * @private
   */
  async _updateMemoryAccessCounts(memories) {
    try {
      const updates = memories.map(memory => 
        LongTermMemory.query().findById(memory.id).patch({
          accessCount: memory.accessCount + 1,
          lastAccessedAt: new Date().toISOString()
        })
      );
      
      await Promise.all(updates);
    } catch (error) {
      logger.warn(`Error updating memory access counts: ${error.message}`);
    }
  }
  
  /**
   * Extract embedding from various possible response structures
   * @param {Object} response - The API response
   * @returns {Array<number>|null} - Extracted embedding or null
   * @private
   */
  _extractEmbeddingFromResponse(response) {
    try {
      // Try various possible response structures
      if (response.data?.[0]?.embedding) {
        return response.data[0].embedding;
      } else if (response.data?.embedding) {
        return response.data.embedding;
      } else if (response.embedding) {
        return response.embedding;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        const firstItem = response.data[0];
        if (Array.isArray(firstItem)) {
          return firstItem; // In case the embedding is directly in the data array
        } else if (firstItem.values || firstItem.vector) {
          return firstItem.values || firstItem.vector;
        }
      }
      // If we get here, we couldn't find a valid embedding structure
      return null;
    } catch (error) {
      logger.error(`Error extracting embedding from response: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Generate a deterministic fallback embedding when API fails
   * @param {string} text - The text to generate fallback for
   * @returns {Array<number>} - Fallback embedding
   * @private
   */
  _generateFallbackEmbedding(text) {
    // Create a simple hash-based embedding that will at least be consistent
    // This is a last resort fallback so searches still return something
    const vector = new Array(this.embeddingDimension).fill(0);
    
    if (!text) {
      return vector;
    }
    
    // Create a simple deterministic vector based on the text hash
    // Not semantically meaningful, but consistent for the same input
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const position = i % this.embeddingDimension;
      vector[position] += charCode / 1000; // Scale to be between 0 and 0.127 for ascii
    }
    
    // Normalize the vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }
    
    return vector;
  }
  
  /**
   * Sanitize and standardize text for embedding
   * @param {string} text - The text to sanitize
   * @returns {string} - Sanitized text
   * @private
   */
  _sanitizeText(text) {
    if (!text) return '';
    
    // Convert to string if not already
    const str = String(text);
    
    // Remove excessive whitespace
    let sanitized = str.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long (most embedding APIs have token limits)
    // A rough approximation is 4 chars per token, and 8192 is a common token limit
    const maxLength = 32000; // ~8k tokens
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }
  
  /**
   * Get performance metrics for this service
   * @returns {Object} - Current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      vectorsGenerated: 0,
      searchesPerformed: 0,
      errors: 0,
      averageLatency: 0,
      totalLatency: 0,
      requestCount: 0
    };
  }
  
  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
    logger.info('Embedding cache cleared');
  }
}

module.exports = new VectorSearchService();