/**
 * Query Variation Handler Service
 * 
 * This service is responsible for normalizing different query variations to handle
 * the many ways users might phrase similar questions. It preprocesses queries
 * before they reach the intent classification stage to improve understanding.
 */

const logger = require('../../utils/logger');

class QueryVariationHandlerService {
  /**
   * Initialize query variation handler service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Configure options
    this.options = {
      enableSynonymReplacement: options.enableSynonymReplacement !== false,
      enablePhrasingNormalization: options.enablePhrasingNormalization !== false,
      enableColloquialTranslation: options.enableColloquialTranslation !== false,
      enableAbbreviationExpansion: options.enableAbbreviationExpansion !== false,
      ...options
    };
    
    // Initialize common domain-specific synonyms
    this.synonymMap = {
      // Infrastructure terms
      'gate': 'stand',
      'bay': 'stand',
      'parking position': 'stand',
      'stance': 'stand',
      'jetway': 'stand',
      'position': 'stand',
      'terminal building': 'terminal',
      'concourse': 'pier',
      'jetbridge': 'pier',
      'satellite': 'pier',
      
      // Time period terms
      'now': 'current time',
      'at the moment': 'current time',
      'currently': 'current time',
      'at present': 'current time',
      'today': 'current day',
      'this week': 'current week',
      'this month': 'current month',
      'right now': 'current time',
      'at this time': 'current time',
      
      // Capacity terms
      'usage': 'utilization',
      'occupancy': 'utilization',
      'use rate': 'utilization',
      'throughput': 'capacity',
      'handling capacity': 'capacity',
      'max capacity': 'capacity',
      'maximum': 'capacity',
      'capability': 'capacity',
      'full': 'at capacity',
      
      // Maintenance terms
      'repair': 'maintenance',
      'fix': 'maintenance',
      'service': 'maintenance',
      'upkeep': 'maintenance',
      'work on': 'maintenance',
      'renovate': 'maintenance',
      'rehabilitation': 'maintenance',
      'overhaul': 'maintenance',
      'upgrade': 'maintenance',
      
      // Query intent terms
      'tell me about': 'show',
      'i want to know': 'show',
      'give me': 'show',
      'display': 'show',
      'find': 'show',
      'locate': 'show',
      'get': 'show',
      'check': 'show',
      'please show': 'show',
      'can you show': 'show',
      'could you show': 'show',
      'would you show': 'show',
      'i need to see': 'show',
      'i\'d like to see': 'show',
      'i want to see': 'show'
    };
    
    // Initialize common abbreviations
    this.abbreviationMap = {
      'T1': 'Terminal 1',
      'T2': 'Terminal 2',
      'T3': 'Terminal 3',
      'T4': 'Terminal 4',
      'T5': 'Terminal 5',
      'maint': 'maintenance',
      'cap': 'capacity',
      'util': 'utilization',
      'max': 'maximum',
      'int': 'international',
      'dom': 'domestic',
      'arr': 'arrival',
      'dep': 'departure',
      'pax': 'passenger',
      'ops': 'operations',
      'a/c': 'aircraft',
      'mins': 'minutes',
      'hrs': 'hours'
    };
    
    // Initialize common phrasings that need normalization
    this.phrasingPatterns = [
      // Question transformation patterns
      { pattern: /^what('s| is) the (.+)(\?)?$/i, replacement: 'show $2' },
      { pattern: /^how (many|much) (.+)(\?)?$/i, replacement: 'count $2' },
      { pattern: /^where (is|are) (.+)(\?)?$/i, replacement: 'locate $2' },
      { pattern: /^when (is|are|will) (.+)(\?)?$/i, replacement: 'schedule $2' },
      { pattern: /^why (is|are) (.+)(\?)?$/i, replacement: 'explain $2' },
      { pattern: /^can (you|i|we) (.+)(\?)?$/i, replacement: '$2' },
      { pattern: /^would (you|it be possible to) (.+)(\?)?$/i, replacement: '$2' },
      { pattern: /^could (you|i|we) (.+)(\?)?$/i, replacement: '$2' },
      { pattern: /^please (.+)$/i, replacement: '$1' },
      { pattern: /^I('d| would) like to (.+)$/i, replacement: '$2' },
      { pattern: /^I want to (.+)$/i, replacement: '$1' },
      { pattern: /^I need to (.+)$/i, replacement: '$1' },
      
      // Specific airport domain phrasings
      { pattern: /stands (that are |)(available|free|open|vacant)/i, replacement: 'available stands' },
      { pattern: /stands (that are |)(occupied|in use|busy|taken)/i, replacement: 'occupied stands' },
      { pattern: /stands (that are |)(under|in|scheduled for) maintenance/i, replacement: 'maintenance stands' },
      { pattern: /(calculate|determine|figure out|compute) capacity/i, replacement: 'calculate capacity' },
      { pattern: /(impact|effect|influence|consequence) of maintenance/i, replacement: 'maintenance impact' },
      { pattern: /(usage|utilization|occupancy) rate/i, replacement: 'utilization' },
      { pattern: /(busy|peak|high-traffic|congested) (period|hour|time)/i, replacement: 'peak period' }
    ];
    
    // Initialize colloquial expressions map
    this.colloquialMap = {
      "what's going on with": "status of",
      "how's": "status of",
      "what's the deal with": "status of",
      "what's up with": "status of",
      "what's happening with": "status of",
      "how are things looking": "status of",
      "keeping an eye on": "monitor",
      "heads up on": "alert about",
      "give me the lowdown on": "summarize",
      "fill me in on": "summarize",
      "break it down for": "analyze",
      "dive into": "analyze in detail",
      "drill down on": "analyze in detail",
      "crunch the numbers for": "calculate statistics for",
      "get a handle on": "understand",
      "in the loop about": "informed about",
      "touch base on": "update on",
      "game plan for": "strategy for",
      "sort out": "resolve",
      "get to the bottom of": "investigate"
    };

    logger.info('QueryVariationHandlerService initialized');
  }

  /**
   * Process a query to handle different variations 
   * 
   * @param {string} query - The original user query
   * @param {Object} options - Processing options
   * @returns {Object} - Processed query results
   */
  processQuery(query, options = {}) {
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        originalQuery: query,
        normalizedQuery: null,
        error: 'Invalid query: must be a non-empty string'
      };
    }

    try {
      // Start with basic preprocessing (trimming, case normalization for processing)
      let normalizedQuery = this._preprocessQuery(query);
      const processingSteps = [];
      
      // Track original vs transformed query
      let currentQuery = normalizedQuery;
      
      // Apply abbreviation expansion if enabled
      if (this.options.enableAbbreviationExpansion !== false) {
        const expandedQuery = this._expandAbbreviations(currentQuery);
        if (expandedQuery !== currentQuery) {
          processingSteps.push({
            step: 'abbreviation_expansion',
            before: currentQuery,
            after: expandedQuery
          });
          currentQuery = expandedQuery;
        }
      }
      
      // Apply synonym replacement if enabled
      if (this.options.enableSynonymReplacement !== false) {
        const synonymProcessed = this._replaceSynonyms(currentQuery);
        if (synonymProcessed !== currentQuery) {
          processingSteps.push({
            step: 'synonym_replacement',
            before: currentQuery,
            after: synonymProcessed
          });
          currentQuery = synonymProcessed;
        }
      }
      
      // Apply phrasing normalization if enabled
      if (this.options.enablePhrasingNormalization !== false) {
        const phrasedQuery = this._normalizePhrasing(currentQuery);
        if (phrasedQuery !== currentQuery) {
          processingSteps.push({
            step: 'phrasing_normalization',
            before: currentQuery,
            after: phrasedQuery
          });
          currentQuery = phrasedQuery;
        }
      }
      
      // Apply colloquial translation if enabled
      if (this.options.enableColloquialTranslation !== false) {
        const formalQuery = this._translateColloquialisms(currentQuery);
        if (formalQuery !== currentQuery) {
          processingSteps.push({
            step: 'colloquial_translation',
            before: currentQuery,
            after: formalQuery
          });
          currentQuery = formalQuery;
        }
      }
      
      // Format output
      normalizedQuery = currentQuery;
      
      // Only log if there were actual changes
      if (normalizedQuery !== query) {
        logger.debug(`Query normalized: "${query}" -> "${normalizedQuery}"`);
      }
      
      return {
        success: true,
        originalQuery: query,
        normalizedQuery,
        processingSteps,
        wasTransformed: normalizedQuery !== query,
        confidence: this._calculateConfidence(processingSteps)
      };
    } catch (error) {
      logger.error(`Error normalizing query: ${error.message}`);
      return {
        success: false,
        originalQuery: query,
        normalizedQuery: query,
        processingSteps: [],
        error: `Normalization error: ${error.message}`
      };
    }
  }
  
  /**
   * Initial preprocessing of query text
   * @private
   * @param {string} query - Raw query text
   * @returns {string} - Preprocessed query
   */
  _preprocessQuery(query) {
    // Trim whitespace
    let processed = query.trim();
    
    // Remove multiple spaces
    processed = processed.replace(/\s+/g, ' ');
    
    // Remove trailing punctuation like ? ! .
    processed = processed.replace(/[?.!]+$/, '');
    
    return processed;
  }
  
  /**
   * Replace domain-specific synonyms for standardization
   * @private
   * @param {string} query - Preprocessed query
   * @returns {string} - Query with synonyms normalized
   */
  _replaceSynonyms(query) {
    let processedQuery = query;
    
    // For each synonym, replace it with the standardized form
    for (const [synonym, standardTerm] of Object.entries(this.synonymMap)) {
      // Use word boundary to avoid partial word matches
      const regex = new RegExp(`\\b${this._escapeRegExp(synonym)}\\b`, 'gi');
      processedQuery = processedQuery.replace(regex, standardTerm);
    }
    
    return processedQuery;
  }
  
  /**
   * Expand common abbreviations to full form
   * @private
   * @param {string} query - Preprocessed query
   * @returns {string} - Query with abbreviations expanded
   */
  _expandAbbreviations(query) {
    let processed = query;
    
    // For each abbreviation, replace it with the full form
    for (const [abbr, fullForm] of Object.entries(this.abbreviationMap)) {
      // Use word boundary to avoid partial word matches
      const regex = new RegExp(`\\b${this._escapeRegExp(abbr)}\\b`, 'gi');
      processed = processed.replace(regex, fullForm);
    }
    
    return processed;
  }
  
  /**
   * Normalize query phrasing to standardized forms
   * @private
   * @param {string} query - Preprocessed query
   * @returns {string} - Query with phrasing normalized
   */
  _normalizePhrasing(query) {
    let processed = query;
    
    // Apply each phrasing pattern
    for (const pattern of this.phrasingPatterns) {
      processed = processed.replace(pattern.pattern, pattern.replacement);
    }
    
    return processed;
  }
  
  /**
   * Translate colloquial expressions to formal equivalents
   * @private
   * @param {string} query - Preprocessed query
   * @returns {string} - Formalized query
   */
  _translateColloquialisms(query) {
    let processed = query;
    
    // Apply colloquial translations
    for (const [colloquial, formal] of Object.entries(this.colloquialMap)) {
      // Use word boundary to avoid partial word matches
      const regex = new RegExp(`\\b${this._escapeRegExp(colloquial)}\\b`, 'gi');
      processed = processed.replace(regex, formal);
    }
    
    return processed;
  }
  
  /**
   * Calculate confidence score for the normalization
   * @private
   * @param {Array} processingSteps - Steps applied during processing
   * @returns {number} - Confidence score (0-1)
   */
  _calculateConfidence(processingSteps) {
    if (processingSteps.length === 0) {
      return 1.0; // No changes made, full confidence
    }
    
    // Base confidence starts high and reduces with each transformation
    let confidence = 1.0;
    
    // Each transformation type reduces confidence by a different amount
    for (const step of processingSteps) {
      switch (step.step) {
        case 'abbreviation_expansion':
          confidence *= 0.99; // Very minor reduction - abbreviations are usually unambiguous
          break;
        case 'synonym_replacement':
          confidence *= 0.95; // Moderate reduction - synonyms could change meaning slightly
          break;
        case 'phrasing_normalization':
          confidence *= 0.90; // Larger reduction - restructuring phrases can change intent
          break;
        case 'colloquial_translation':
          confidence *= 0.85; // Largest reduction - colloquialisms are often ambiguous
          break;
        default:
          confidence *= 0.98; // Default minor reduction
      }
    }
    
    return confidence;
  }
  
  /**
   * Escape special regex characters in a string
   * @private
   * @param {string} string - String to escape
   * @returns {string} - Escaped string for regex use
   */
  _escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Add a new synonym mapping
   * @param {string} synonym - The synonym to map
   * @param {string} standardTerm - The standard term to map to
   */
  addSynonym(synonym, standardTerm) {
    if (!synonym || !standardTerm) {
      throw new Error('Both synonym and standardTerm must be provided');
    }
    
    this.synonymMap[synonym.toLowerCase()] = standardTerm.toLowerCase();
    logger.info(`Added synonym mapping: ${synonym} -> ${standardTerm}`);
  }
  
  /**
   * Add a new abbreviation mapping
   * @param {string} abbreviation - The abbreviation to expand
   * @param {string} fullForm - The full form of the abbreviation
   */
  addAbbreviation(abbreviation, fullForm) {
    if (!abbreviation || !fullForm) {
      throw new Error('Both abbreviation and fullForm must be provided');
    }
    
    this.abbreviationMap[abbreviation.toUpperCase()] = fullForm;
    logger.info(`Added abbreviation mapping: ${abbreviation} -> ${fullForm}`);
  }
  
  /**
   * Add a new phrasing pattern
   * @param {RegExp} pattern - The regex pattern to match
   * @param {string} replacement - The replacement template
   */
  addPhrasingPattern(pattern, replacement) {
    if (!pattern || !replacement) {
      throw new Error('Both pattern and replacement must be provided');
    }
    
    this.phrasingPatterns.push({ pattern, replacement });
    logger.info(`Added phrasing pattern: ${pattern} -> ${replacement}`);
  }
  
  /**
   * Add a new colloquial expression mapping
   * @param {string} colloquial - The colloquial expression
   * @param {string} formal - The formal equivalent
   */
  addColloquialMapping(colloquial, formal) {
    if (!colloquial || !formal) {
      throw new Error('Both colloquial and formal expressions must be provided');
    }
    
    this.colloquialMap[colloquial.toLowerCase()] = formal.toLowerCase();
    logger.info(`Added colloquial mapping: ${colloquial} -> ${formal}`);
  }
  
  /**
   * Update service configuration
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    logger.info('QueryVariationHandlerService configuration updated', this.options);
  }
}

module.exports = new QueryVariationHandlerService();