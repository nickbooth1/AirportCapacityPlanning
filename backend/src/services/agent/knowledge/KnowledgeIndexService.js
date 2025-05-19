/**
 * KnowledgeIndexService.js
 * 
 * Service for indexing and retrieving knowledge efficiently.
 * This service implements an in-memory index for fast knowledge retrieval,
 * supporting various indexing strategies and retrieval methods.
 */

const crypto = require('crypto');
const logger = require('../../../utils/logger');

class KnowledgeIndexService {
  /**
   * Initialize the knowledge index service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxIndexSize: options.maxIndexSize || 10000, // Maximum number of indexed items
      enableTermFrequencyWeighting: options.enableTermFrequencyWeighting !== false,
      stemming: options.stemming !== false,
      stopWords: options.stopWords || this._getDefaultStopWords(),
      minTermLength: options.minTermLength || 2,
      enableSynonyms: options.enableSynonyms !== false,
      maxSearchResults: options.maxSearchResults || 50,
      ...options
    };
    
    // Initialize the indexes
    this.termIndex = new Map(); // Maps terms to document IDs and weights
    this.documentIndex = new Map(); // Maps document IDs to documents
    this.metadataIndex = new Map(); // Maps metadata fields to document IDs
    
    // Domain-specific knowledge graphs
    this.entityRelationships = new Map(); // Maps entities to related entities
    this.termSynonyms = new Map(); // Maps terms to their synonyms
    
    // Index performance metrics
    this.metrics = {
      totalDocuments: 0,
      uniqueTerms: 0,
      averageTermsPerDocument: 0,
      totalIndexSize: 0,
      searchCount: 0,
      totalSearchTime: 0,
      averageSearchTime: 0
    };
    
    logger.info(`KnowledgeIndexService initialized with maxIndexSize: ${this.options.maxIndexSize}`);
  }
  
  /**
   * Add a document to the index
   * 
   * @param {Object} document - The document to index
   * @param {Object} options - Indexing options
   * @returns {string} - The document ID
   */
  addDocument(document, options = {}) {
    const {
      id = this._generateDocumentId(document),
      fields = ['title', 'content', 'description'],
      metadata = {}
    } = options;
    
    // Check if we need to evict documents before adding a new one
    if (this.documentIndex.size >= this.options.maxIndexSize && !this.documentIndex.has(id)) {
      this._evictOldestDocument();
    }
    
    // Extract text from specified fields
    let documentText = '';
    for (const field of fields) {
      if (document[field]) {
        documentText += ' ' + document[field];
      }
    }
    
    // Process the document text
    const terms = this._processText(documentText);
    
    // Calculate term frequencies for this document
    const termFrequencies = this._calculateTermFrequencies(terms);
    
    // Store the document
    this.documentIndex.set(id, {
      ...document,
      _id: id,
      _indexed: Date.now(),
      _terms: Array.from(termFrequencies.keys())
    });
    
    // Update the term index
    termFrequencies.forEach((frequency, term) => {
      if (!this.termIndex.has(term)) {
        this.termIndex.set(term, new Map());
      }
      
      const termDocuments = this.termIndex.get(term);
      termDocuments.set(id, {
        frequency,
        weight: this._calculateTermWeight(term, frequency, documentText.length)
      });
    });
    
    // Index metadata fields
    Object.entries(metadata).forEach(([key, value]) => {
      const metadataKey = `${key}:${value}`;
      
      if (!this.metadataIndex.has(metadataKey)) {
        this.metadataIndex.set(metadataKey, new Set());
      }
      
      this.metadataIndex.get(metadataKey).add(id);
    });
    
    // Update metrics
    this.metrics.totalDocuments = this.documentIndex.size;
    this.metrics.uniqueTerms = this.termIndex.size;
    this.metrics.averageTermsPerDocument = this._calculateAverageTermsPerDocument();
    this.metrics.totalIndexSize = this._estimateIndexSize();
    
    logger.debug(`Indexed document: ${id}, terms: ${termFrequencies.size}`);
    return id;
  }
  
  /**
   * Search the index for documents matching a query
   * 
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Array} - Matching documents with scores
   */
  search(query, options = {}) {
    const startTime = Date.now();
    
    const {
      limit = this.options.maxSearchResults,
      threshold = 0.1,
      includeScore = true,
      metadata = {},
      fuzzyMatch = true,
      boostFields = []
    } = options;
    
    // Process the query
    const queryTerms = this._processText(query);
    
    // Get candidate documents based on metadata filters
    let candidateIds = this._getCandidateDocumentsByMetadata(metadata);
    
    // Calculate scores for each candidate document
    const scores = new Map();
    
    queryTerms.forEach(term => {
      // Handle fuzzy matching
      let matchedTerms = [term];
      if (fuzzyMatch) {
        matchedTerms = this._getFuzzyMatches(term);
      }
      
      matchedTerms.forEach(matchedTerm => {
        if (!this.termIndex.has(matchedTerm)) return;
        
        const termDocuments = this.termIndex.get(matchedTerm);
        
        termDocuments.forEach((docInfo, docId) => {
          // If we're filtering by candidate IDs and this document isn't included, skip it
          if (candidateIds && !candidateIds.has(docId)) return;
          
          // Calculate the score for this term-document pair
          const termScore = docInfo.weight;
          
          // Apply field boosting if the document has the specified fields
          let boostFactor = 1.0;
          if (boostFields.length > 0) {
            const document = this.documentIndex.get(docId);
            for (const fieldInfo of boostFields) {
              const { field, factor } = fieldInfo;
              if (document[field] && document[field].includes(term)) {
                boostFactor *= factor;
              }
            }
          }
          
          // Apply the boosting and update the document's score
          const finalScore = termScore * boostFactor;
          scores.set(docId, (scores.get(docId) || 0) + finalScore);
        });
      });
    });
    
    // Sort documents by score and apply the threshold
    const results = Array.from(scores.entries())
      .filter(([, score]) => score >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => {
        const document = this.documentIndex.get(docId);
        return includeScore ? 
          { ...document, _score: score } : 
          document;
      });
    
    // Update search metrics
    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    this.metrics.searchCount++;
    this.metrics.totalSearchTime += searchTime;
    this.metrics.averageSearchTime = this.metrics.totalSearchTime / this.metrics.searchCount;
    
    logger.debug(`Search completed in ${searchTime}ms, found ${results.length} results for "${query}"`);
    
    return results;
  }
  
  /**
   * Remove a document from the index
   * 
   * @param {string} id - The document ID to remove
   * @returns {boolean} - Whether the document was removed
   */
  removeDocument(id) {
    if (!this.documentIndex.has(id)) {
      return false;
    }
    
    // Get the document terms
    const document = this.documentIndex.get(id);
    const terms = document._terms || [];
    
    // Remove the document from the term index
    terms.forEach(term => {
      if (this.termIndex.has(term)) {
        const termDocuments = this.termIndex.get(term);
        termDocuments.delete(id);
        
        // If no documents left for this term, remove it from the index
        if (termDocuments.size === 0) {
          this.termIndex.delete(term);
        }
      }
    });
    
    // Remove the document from metadata index
    this.metadataIndex.forEach((docIds, metadataKey) => {
      if (docIds.has(id)) {
        docIds.delete(id);
        
        // If no documents left for this metadata, remove it from the index
        if (docIds.size === 0) {
          this.metadataIndex.delete(metadataKey);
        }
      }
    });
    
    // Remove the document from document index
    this.documentIndex.delete(id);
    
    // Update metrics
    this.metrics.totalDocuments = this.documentIndex.size;
    this.metrics.uniqueTerms = this.termIndex.size;
    this.metrics.averageTermsPerDocument = this._calculateAverageTermsPerDocument();
    this.metrics.totalIndexSize = this._estimateIndexSize();
    
    logger.debug(`Removed document from index: ${id}`);
    return true;
  }
  
  /**
   * Update a document in the index
   * 
   * @param {string} id - The document ID to update
   * @param {Object} document - The updated document
   * @param {Object} options - Update options
   * @returns {boolean} - Whether the document was updated
   */
  updateDocument(id, document, options = {}) {
    // Remove the old document
    const removed = this.removeDocument(id);
    
    // Add the updated document with the same ID
    this.addDocument(document, { ...options, id });
    
    return removed;
  }
  
  /**
   * Get a document by ID
   * 
   * @param {string} id - The document ID
   * @returns {Object|null} - The document or null if not found
   */
  getDocument(id) {
    return this.documentIndex.get(id) || null;
  }
  
  /**
   * Clear the entire index
   */
  clearIndex() {
    this.termIndex.clear();
    this.documentIndex.clear();
    this.metadataIndex.clear();
    
    // Reset metrics
    this.metrics.totalDocuments = 0;
    this.metrics.uniqueTerms = 0;
    this.metrics.averageTermsPerDocument = 0;
    this.metrics.totalIndexSize = 0;
    
    logger.info('Knowledge index cleared');
  }
  
  /**
   * Get statistics about the index
   * 
   * @returns {Object} - Index statistics
   */
  getStats() {
    return {
      ...this.metrics,
      documentCount: this.documentIndex.size,
      termCount: this.termIndex.size,
      metadataKeyCount: this.metadataIndex.size
    };
  }
  
  /**
   * Add knowledge graph entity relationships
   * 
   * @param {string} entity - The entity to add relationships for
   * @param {Array} relatedEntities - Related entities with relationship types
   */
  addEntityRelationships(entity, relatedEntities) {
    if (!this.entityRelationships.has(entity)) {
      this.entityRelationships.set(entity, []);
    }
    
    const currentRelationships = this.entityRelationships.get(entity);
    const newRelationships = relatedEntities.filter(rel => 
      !currentRelationships.some(existing => 
        existing.entity === rel.entity && existing.type === rel.type
      )
    );
    
    this.entityRelationships.set(entity, [...currentRelationships, ...newRelationships]);
    logger.debug(`Added ${newRelationships.length} relationships for entity: ${entity}`);
  }
  
  /**
   * Get related entities for an entity
   * 
   * @param {string} entity - The entity to get relationships for
   * @param {Object} options - Retrieval options
   * @returns {Array} - Related entities
   */
  getRelatedEntities(entity, options = {}) {
    const {
      types = null,
      limit = 10,
      includeTransitive = false,
      maxDepth = 1
    } = options;
    
    if (!this.entityRelationships.has(entity)) {
      return [];
    }
    
    let relationships = this.entityRelationships.get(entity);
    
    // Filter by relationship types if specified
    if (types) {
      relationships = relationships.filter(rel => types.includes(rel.type));
    }
    
    if (!includeTransitive || maxDepth <= 1) {
      return relationships.slice(0, limit);
    }
    
    // Include transitive relationships up to maxDepth
    const visited = new Set([entity]);
    const result = [...relationships];
    
    let currentDepth = 1;
    let currentEntities = relationships.map(rel => rel.entity);
    
    while (currentDepth < maxDepth && currentEntities.length > 0) {
      const nextEntities = [];
      
      for (const currentEntity of currentEntities) {
        if (visited.has(currentEntity)) continue;
        visited.add(currentEntity);
        
        if (this.entityRelationships.has(currentEntity)) {
          const nextRelationships = this.entityRelationships.get(currentEntity);
          
          for (const rel of nextRelationships) {
            if (!visited.has(rel.entity)) {
              result.push({
                ...rel,
                via: currentEntity,
                depth: currentDepth + 1
              });
              
              nextEntities.push(rel.entity);
            }
          }
        }
      }
      
      currentEntities = nextEntities;
      currentDepth++;
    }
    
    return result.slice(0, limit);
  }
  
  /**
   * Add synonyms for a term
   * 
   * @param {string} term - The term to add synonyms for
   * @param {Array} synonyms - Synonym terms
   */
  addTermSynonyms(term, synonyms) {
    const normalizedTerm = term.toLowerCase();
    
    if (!this.termSynonyms.has(normalizedTerm)) {
      this.termSynonyms.set(normalizedTerm, new Set());
    }
    
    const synonymSet = this.termSynonyms.get(normalizedTerm);
    
    for (const synonym of synonyms) {
      const normalizedSynonym = synonym.toLowerCase();
      synonymSet.add(normalizedSynonym);
      
      // Add bidirectional relationship
      if (!this.termSynonyms.has(normalizedSynonym)) {
        this.termSynonyms.set(normalizedSynonym, new Set([normalizedTerm]));
      } else {
        this.termSynonyms.get(normalizedSynonym).add(normalizedTerm);
      }
    }
    
    logger.debug(`Added ${synonyms.length} synonyms for term: ${term}`);
  }
  
  /**
   * Get synonyms for a term
   * 
   * @param {string} term - The term to get synonyms for
   * @returns {Array} - Synonym terms
   */
  getTermSynonyms(term) {
    const normalizedTerm = term.toLowerCase();
    
    if (!this.termSynonyms.has(normalizedTerm)) {
      return [];
    }
    
    return Array.from(this.termSynonyms.get(normalizedTerm));
  }
  
  /**
   * Process text into terms for indexing or searching
   * 
   * @private
   * @param {string} text - The text to process
   * @returns {Array} - Processed terms
   */
  _processText(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Convert to lowercase and split into words
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
      .split(/\s+/)
      .filter(word => word.length >= this.options.minTermLength);
    
    // Remove stop words
    const filteredWords = words.filter(word => !this.options.stopWords.has(word));
    
    // Apply stemming if enabled
    let terms = filteredWords;
    if (this.options.stemming) {
      terms = filteredWords.map(word => this._stemWord(word));
    }
    
    // Add synonyms if enabled
    if (this.options.enableSynonyms) {
      const synonyms = [];
      terms.forEach(term => {
        const termSynonyms = this.getTermSynonyms(term);
        synonyms.push(...termSynonyms);
      });
      
      terms = [...new Set([...terms, ...synonyms])];
    }
    
    return terms;
  }
  
  /**
   * Calculate term frequencies for a list of terms
   * 
   * @private
   * @param {Array} terms - The terms to count
   * @returns {Map} - Map of terms to their frequencies
   */
  _calculateTermFrequencies(terms) {
    const frequencies = new Map();
    
    for (const term of terms) {
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    }
    
    return frequencies;
  }
  
  /**
   * Calculate the weight for a term in a document
   * 
   * @private
   * @param {string} term - The term
   * @param {number} frequency - The term frequency in the document
   * @param {number} documentLength - The document length
   * @returns {number} - The calculated weight
   */
  _calculateTermWeight(term, frequency, documentLength) {
    // Simple TF-IDF-like weighting
    if (!this.options.enableTermFrequencyWeighting) {
      return 1.0;
    }
    
    // Term frequency component
    const tf = frequency / documentLength;
    
    // Inverse document frequency component
    const termDocuments = this.termIndex.get(term);
    const termDocumentCount = termDocuments ? termDocuments.size : 0;
    const documentCount = this.documentIndex.size || 1;
    const idf = Math.log(documentCount / (termDocumentCount + 1));
    
    return tf * idf;
  }
  
  /**
   * Generate a unique ID for a document
   * 
   * @private
   * @param {Object} document - The document
   * @returns {string} - Generated document ID
   */
  _generateDocumentId(document) {
    // Use provided ID if available
    if (document.id) {
      return String(document.id);
    }
    
    // Generate a hash of document content
    const content = document.content || document.text || JSON.stringify(document);
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * Get fuzzy matches for a term
   * 
   * @private
   * @param {string} term - The term to match
   * @returns {Array} - Matching terms
   */
  _getFuzzyMatches(term) {
    const result = [term];
    
    // Add exact synonyms
    const synonyms = this.getTermSynonyms(term);
    result.push(...synonyms);
    
    // Add terms that match with common errors (simple edit distance = 1)
    // This is a simplified approach - for production, consider a proper fuzzy matching library
    this.termIndex.forEach((_, indexedTerm) => {
      if (indexedTerm.length === term.length) {
        let differences = 0;
        for (let i = 0; i < indexedTerm.length; i++) {
          if (indexedTerm[i] !== term[i]) {
            differences++;
          }
          if (differences > 1) break;
        }
        
        if (differences === 1) {
          result.push(indexedTerm);
        }
      } else if (Math.abs(indexedTerm.length - term.length) === 1) {
        // Handle insertion/deletion
        if (indexedTerm.includes(term) || term.includes(indexedTerm)) {
          result.push(indexedTerm);
        }
      }
    });
    
    return result;
  }
  
  /**
   * Get candidate document IDs based on metadata filters
   * 
   * @private
   * @param {Object} metadata - Metadata filters
   * @returns {Set|null} - Set of document IDs or null for no filtering
   */
  _getCandidateDocumentsByMetadata(metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
      return null; // No metadata filtering
    }
    
    let candidateIds = null;
    
    Object.entries(metadata).forEach(([key, value]) => {
      const metadataKey = `${key}:${value}`;
      
      if (this.metadataIndex.has(metadataKey)) {
        const matchingIds = this.metadataIndex.get(metadataKey);
        
        if (candidateIds === null) {
          // First metadata filter - use all matching IDs
          candidateIds = new Set(matchingIds);
        } else {
          // Intersection with previous filters (AND logic)
          candidateIds = new Set(
            [...candidateIds].filter(id => matchingIds.has(id))
          );
        }
      } else {
        // No documents match this metadata filter
        candidateIds = new Set();
      }
    });
    
    return candidateIds;
  }
  
  /**
   * Calculate the average number of terms per document
   * 
   * @private
   * @returns {number} - Average terms per document
   */
  _calculateAverageTermsPerDocument() {
    if (this.documentIndex.size === 0) {
      return 0;
    }
    
    let totalTerms = 0;
    this.documentIndex.forEach(doc => {
      totalTerms += (doc._terms ? doc._terms.length : 0);
    });
    
    return totalTerms / this.documentIndex.size;
  }
  
  /**
   * Estimate the size of the index in memory
   * 
   * @private
   * @returns {number} - Estimated size in bytes
   */
  _estimateIndexSize() {
    // This is a rough estimate - actual memory usage will vary
    let size = 0;
    
    // Estimate term index size
    this.termIndex.forEach((documents, term) => {
      size += term.length * 2; // String size (2 bytes per char)
      size += 8; // Map overhead
      
      documents.forEach(() => {
        size += 16; // Map entry + numeric values
      });
    });
    
    // Estimate document index size (very rough)
    this.documentIndex.forEach(doc => {
      size += JSON.stringify(doc).length;
    });
    
    // Estimate metadata index size
    this.metadataIndex.forEach((docIds, key) => {
      size += key.length * 2; // String size
      size += 8; // Map overhead
      size += docIds.size * 8; // Set of IDs
    });
    
    return size;
  }
  
  /**
   * Evict the oldest document from the index
   * 
   * @private
   * @returns {boolean} - Whether a document was evicted
   */
  _evictOldestDocument() {
    if (this.documentIndex.size === 0) {
      return false;
    }
    
    // Find the oldest document
    let oldestId = null;
    let oldestTimestamp = Infinity;
    
    this.documentIndex.forEach((doc, id) => {
      if (doc._indexed < oldestTimestamp) {
        oldestTimestamp = doc._indexed;
        oldestId = id;
      }
    });
    
    if (oldestId) {
      this.removeDocument(oldestId);
      logger.debug(`Evicted oldest document: ${oldestId}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Simple stemming function (Porter stemmer approximation)
   * 
   * @private
   * @param {string} word - Word to stem
   * @returns {string} - Stemmed word
   */
  _stemWord(word) {
    // This is a simplified stemmer - for production, use a proper stemming library
    
    // Handle some common endings
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    } else if (word.endsWith('es')) {
      return word.slice(0, -2);
    } else if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    } else if (word.endsWith('ing')) {
      return word.slice(0, -3);
    } else if (word.endsWith('ed')) {
      return word.slice(0, -2);
    }
    
    return word;
  }
  
  /**
   * Get default English stop words
   * 
   * @private
   * @returns {Set} - Set of stop words
   */
  _getDefaultStopWords() {
    return new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 
      'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 
      'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 
      'these', 'they', 'this', 'to', 'was', 'will', 'with'
    ]);
  }
}

module.exports = KnowledgeIndexService;