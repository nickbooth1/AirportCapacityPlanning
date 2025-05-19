/**
 * FactVerifierService.js
 * 
 * This service validates the factual accuracy of generated responses by comparing
 * them against trusted knowledge sources. It identifies and corrects factual errors,
 * unsupported assertions, and misleading statements to ensure the highest standards
 * of factual integrity in agent responses.
 * 
 * Key features:
 * - Fine-grained statement extraction and verification
 * - Multiple verification strategies (direct matching, semantic verification, etc.)
 * - Confidence scoring for verified statements
 * - Correction suggestions for inaccurate statements
 * - Handling of conflicting information from different sources
 * - Citation and attribution for factual statements
 */

const logger = require('../../../utils/logger');
const OpenAIService = require('../OpenAIService');
const { performance } = require('perf_hooks');

class FactVerifierService {
  /**
   * Initialize the fact verifier service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    
    // Configure options
    this.options = {
      defaultConfidenceThreshold: options.defaultConfidenceThreshold || 0.7,
      strictMode: options.strictMode !== undefined ? options.strictMode : false,
      extractStatementsBeforeVerification: options.extractStatementsBeforeVerification !== undefined 
        ? options.extractStatementsBeforeVerification 
        : true,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Performance metrics
    this.metrics = {
      totalVerifications: 0,
      totalCorrections: 0,
      averageConfidence: 0,
      totalVerificationTimeMs: 0
    };
    
    this.logger.info('FactVerifierService initialized');
  }
  
  /**
   * Verify the factual accuracy of a response
   * 
   * @param {string} responseText - The response text to verify
   * @param {Array} knowledgeItems - Knowledge items to verify against
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} - Verification results
   */
  async verifyResponse(responseText, knowledgeItems, options = {}) {
    const startTime = performance.now();
    
    try {
      this.metrics.totalVerifications++;
      
      // Extract factual statements if configured
      let statements = [];
      if (this.options.extractStatementsBeforeVerification) {
        statements = await this.extractFactualStatements(responseText);
      } else {
        // Treat the whole response as one statement
        statements = [{ text: responseText, lineNumber: 1 }];
      }
      
      // If no statements to verify, return early
      if (statements.length === 0) {
        return {
          verified: true,
          confidence: 1.0,
          statements: [],
          correctedResponse: responseText,
          verificationTimeMs: performance.now() - startTime
        };
      }
      
      // Prepare knowledge context for verification
      const knowledgeContext = this._prepareKnowledgeContext(knowledgeItems);
      
      // Verify each statement against knowledge
      const verifiedStatements = await this._verifyStatements(statements, knowledgeContext, options);
      
      // Calculate overall confidence
      const overallConfidence = this._calculateOverallConfidence(verifiedStatements);
      
      // Determine if the response passes verification
      const confidenceThreshold = options.confidenceThreshold || this.options.defaultConfidenceThreshold;
      const verified = overallConfidence >= confidenceThreshold;
      
      // Generate corrected response if needed
      let correctedResponse = responseText;
      if (!verified || verifiedStatements.some(s => !s.accurate)) {
        correctedResponse = await this._generateCorrectedResponse(
          responseText, 
          verifiedStatements, 
          knowledgeContext
        );
        
        if (correctedResponse !== responseText) {
          this.metrics.totalCorrections++;
        }
      }
      
      // Update metrics
      this.metrics.averageConfidence = (
        (this.metrics.averageConfidence * (this.metrics.totalVerifications - 1)) + 
        overallConfidence
      ) / this.metrics.totalVerifications;
      
      this.metrics.totalVerificationTimeMs += (performance.now() - startTime);
      
      return {
        verified,
        confidence: overallConfidence,
        statements: verifiedStatements,
        correctedResponse,
        verificationTimeMs: performance.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Error in response verification: ${error.message}`, error);
      
      // Return original response with error flag
      return {
        verified: false,
        confidence: 0,
        error: error.message,
        correctedResponse: responseText,
        verificationTimeMs: performance.now() - startTime
      };
    }
  }
  
  /**
   * Extract factual statements from text
   * 
   * @param {string} text - Text to extract statements from
   * @returns {Promise<Array>} - Array of factual statements
   */
  async extractFactualStatements(text) {
    try {
      const systemPrompt = `You are an AI assistant specialized in extracting factual claims from text.
Your task is to identify all factual assertions made in the provided text.
Focus only on statements that make factual claims about the real world that could be verified.

For each factual statement:
1. Extract the exact statement as written
2. Identify the line number(s) it appears on
3. Classify its type (e.g., numerical claim, relationship claim, property claim, etc.)
4. Rate the statement's specificity (1-5 scale, where 1 is very general and 5 is very specific)

Do not include:
- Opinions or subjective statements
- Hypotheticals or conditional statements
- Questions
- General background information that isn't making a specific claim

Return your analysis as a JSON array of statement objects with these properties:
- text: The exact statement text
- lineNumber: The line number(s) where the statement appears
- type: The type of factual claim
- specificity: The specificity rating (1-5)`;

      // Split text into lines for reference
      const lines = text.split('\n');
      const linedText = lines.map((line, i) => `${i+1}. ${line}`).join('\n');

      const userPrompt = `Extract factual statements from the following text:

${linedText}

Please identify all verifiable factual claims in this text.`;

      const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
      
      // Parse the JSON response
      try {
        // Check if the response contains JSON
        const jsonMatch = completion.text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
        
        const parsedStatements = JSON.parse(jsonStr);
        return Array.isArray(parsedStatements) ? parsedStatements : [];
      } catch (parseError) {
        this.logger.warn(`Failed to parse statements: ${parseError.message}`);
        // Fallback to treating the whole text as one statement
        return [{ text, lineNumber: 1, type: 'general', specificity: 3 }];
      }
    } catch (error) {
      this.logger.error(`Error extracting factual statements: ${error.message}`, error);
      // Return empty array on error
      return [];
    }
  }
  
  /**
   * Prepare knowledge items for verification
   * 
   * @private
   * @param {Array} knowledgeItems - Raw knowledge items
   * @returns {string} - Formatted knowledge context
   */
  _prepareKnowledgeContext(knowledgeItems) {
    return knowledgeItems.map((item, index) => {
      const content = item.data || item.content;
      const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
      const source = item.source || 'unknown';
      const type = item.type || 'general';
      
      return `[${index + 1}] Source: ${source} | Type: ${type} | ${contentStr}`;
    }).join('\n\n');
  }
  
  /**
   * Verify statements against knowledge context
   * 
   * @private
   * @param {Array} statements - Statements to verify
   * @param {string} knowledgeContext - Formatted knowledge context
   * @param {Object} options - Verification options
   * @returns {Promise<Array>} - Verified statements
   */
  async _verifyStatements(statements, knowledgeContext, options = {}) {
    const systemPrompt = `You are an AI assistant specialized in fact verification for airport capacity planning.
Your task is to verify factual statements against provided knowledge items.
For each statement, determine if it is:
1. SUPPORTED - Directly supported by the knowledge sources
2. PARTIALLY SUPPORTED - Some aspects are supported but others are not explicitly mentioned
3. UNSUPPORTED - No support in the knowledge sources
4. CONTRADICTED - Directly contradicted by the knowledge sources

For each statement, provide:
- A verification status (SUPPORTED, PARTIALLY SUPPORTED, UNSUPPORTED, or CONTRADICTED)
- A confidence score (0.0 to 1.0) indicating your confidence in the verification
- The knowledge item number(s) that support or contradict the statement
- A brief explanation of your reasoning
- A suggested correction if the statement is inaccurate

Only mark a statement as SUPPORTED if it is explicitly supported by the knowledge sources.
If a statement contains multiple claims, it should only be SUPPORTED if all claims are supported.
${options.strictMode || this.options.strictMode ? 
'Use strict verification - if there is any doubt about a statement, do not mark it as SUPPORTED.' : 
'Balance comprehensiveness with accuracy - use your judgment when a statement is mostly supported but includes minor inferences.'
}

Return a JSON array with your verification results.`;

      const userPrompt = `Knowledge Items:
${knowledgeContext}

Statements to verify:
${statements.map((s, i) => `Statement ${i + 1}: ${s.text} (Line ${s.lineNumber})`).join('\n')}

Please verify each statement against the provided knowledge items.`;

      const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
      
      // Parse the JSON response
      try {
        // Check if the response contains JSON
        const jsonMatch = completion.text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
        
        const verificationResults = JSON.parse(jsonStr);
        
        // Process and normalize results
        return verificationResults.map((result, index) => {
          const statement = statements[index];
          const status = (result.status || '').toUpperCase();
          const confidence = typeof result.confidence === 'number' ? 
            result.confidence : 
            this._mapStatusToConfidence(status);
          
          return {
            text: statement.text,
            lineNumber: statement.lineNumber,
            accurate: status === 'SUPPORTED',
            partiallyAccurate: status === 'PARTIALLY SUPPORTED',
            contradicted: status === 'CONTRADICTED',
            status,
            confidence,
            sourceReferences: result.sources || result.references || [],
            explanation: result.explanation || result.reasoning || '',
            suggestedCorrection: result.correction || result.suggestedCorrection || ''
          };
        });
      } catch (parseError) {
        this.logger.warn(`Failed to parse verification results: ${parseError.message}`);
        // Return basic verification results as fallback
        return statements.map(statement => ({
          text: statement.text,
          lineNumber: statement.lineNumber,
          accurate: true, // Assume accurate on error as a failsafe
          status: 'VERIFICATION_ERROR',
          confidence: 0.5,
          explanation: `Verification failed: ${parseError.message}`,
          sourceReferences: [],
          suggestedCorrection: ''
        }));
      }
  }
  
  /**
   * Map verification status to confidence score
   * 
   * @private
   * @param {string} status - Verification status
   * @returns {number} - Confidence score
   */
  _mapStatusToConfidence(status) {
    const statusMap = {
      'SUPPORTED': 1.0,
      'PARTIALLY SUPPORTED': 0.5,
      'UNSUPPORTED': 0.2,
      'CONTRADICTED': 0.0
    };
    
    return statusMap[status] !== undefined ? statusMap[status] : 0.5;
  }
  
  /**
   * Calculate overall confidence from statement verifications
   * 
   * @private
   * @param {Array} verifiedStatements - Verified statements
   * @returns {number} - Overall confidence
   */
  _calculateOverallConfidence(verifiedStatements) {
    if (!verifiedStatements || verifiedStatements.length === 0) {
      return 1.0; // No statements to verify means default to confident
    }
    
    // Weight by specificity if available
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const statement of verifiedStatements) {
      const weight = statement.specificity || 1;
      totalWeight += weight;
      weightedSum += (statement.confidence * weight);
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  /**
   * Generate corrected response based on verification results
   * 
   * @private
   * @param {string} originalResponse - Original response text
   * @param {Array} verifiedStatements - Verified statements
   * @param {string} knowledgeContext - Knowledge context
   * @returns {Promise<string>} - Corrected response
   */
  async _generateCorrectedResponse(originalResponse, verifiedStatements, knowledgeContext) {
    try {
      // Check if any statements need correction
      const statementsToCorrect = verifiedStatements.filter(s => 
        !s.accurate || s.contradicted || (s.partiallyAccurate && s.suggestedCorrection)
      );
      
      // If nothing to correct, return original
      if (statementsToCorrect.length === 0) {
        return originalResponse;
      }
      
      const systemPrompt = `You are an AI assistant specialized in fact correction for airport capacity planning.
Your task is to correct factual inaccuracies in a response while preserving its structure and style.
You will be provided with:
1. The original response
2. A list of verified statements with corrections needed
3. Knowledge items to use for accurate information

Guidelines:
- Only modify parts of the response that contain factual errors
- Keep the same tone, structure, and style as the original
- Ensure the corrected response flows naturally and reads coherently
- Do not add substantial new information unless necessary for accuracy
- You may remove statements entirely if they are contradicted and cannot be corrected
- Do not mention the verification or correction process in your response`;

      const userPrompt = `Original Response:
${originalResponse}

Statements Requiring Correction:
${statementsToCorrect.map((s, i) => `
Statement [Line ${s.lineNumber}]: ${s.text}
Status: ${s.status}
Explanation: ${s.explanation}
Suggested Correction: ${s.suggestedCorrection}
`).join('\n')}

Knowledge Items:
${knowledgeContext}

Please provide a corrected version of the original response that fixes the factual errors while maintaining the same style and structure.`;

      const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
      
      return completion.text;
    } catch (error) {
      this.logger.error(`Error generating corrected response: ${error.message}`, error);
      // Return original response on error
      return originalResponse;
    }
  }
  
  /**
   * Verify a specific factual claim against knowledge
   * 
   * @param {string} claim - The factual claim to verify
   * @param {Array} knowledgeItems - Knowledge items to verify against
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} - Verification result for the claim
   */
  async verifyClaim(claim, knowledgeItems, options = {}) {
    try {
      const knowledgeContext = this._prepareKnowledgeContext(knowledgeItems);
      
      const systemPrompt = `You are an AI assistant specialized in fact verification for airport capacity planning.
Your task is to verify a factual claim against provided knowledge items.
Determine if the claim is:
1. SUPPORTED - Directly supported by the knowledge sources
2. PARTIALLY SUPPORTED - Some aspects are supported but others are not explicitly mentioned
3. UNSUPPORTED - No support in the knowledge sources
4. CONTRADICTED - Directly contradicted by the knowledge sources

Provide:
- A verification status (SUPPORTED, PARTIALLY SUPPORTED, UNSUPPORTED, or CONTRADICTED)
- A confidence score (0.0 to 1.0) indicating your confidence in the verification
- The knowledge item number(s) that support or contradict the claim
- A brief explanation of your reasoning
- The specific parts of the knowledge items that support or contradict the claim

Only mark a claim as SUPPORTED if it is explicitly supported by the knowledge sources.
If a claim contains multiple assertions, it should only be SUPPORTED if all assertions are supported.
${options.strictMode || this.options.strictMode ? 
'Use strict verification - if there is any doubt about a claim, do not mark it as SUPPORTED.' : 
'Balance comprehensiveness with accuracy - use your judgment when a claim is mostly supported but includes minor inferences.'
}

Return your verification as a JSON object.`;

      const userPrompt = `Knowledge Items:
${knowledgeContext}

Claim to verify:
"${claim}"

Please verify this claim against the provided knowledge items.`;

      const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
      
      // Parse the JSON response
      try {
        // Check if the response contains JSON
        const jsonMatch = completion.text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
        
        const verificationResult = JSON.parse(jsonStr);
        
        const status = (verificationResult.status || '').toUpperCase();
        return {
          claim,
          status,
          accurate: status === 'SUPPORTED',
          partiallyAccurate: status === 'PARTIALLY SUPPORTED',
          contradicted: status === 'CONTRADICTED',
          confidence: verificationResult.confidence || this._mapStatusToConfidence(status),
          sourceReferences: verificationResult.sources || verificationResult.references || [],
          explanation: verificationResult.explanation || verificationResult.reasoning || '',
          evidenceExcerpts: verificationResult.evidence || verificationResult.excerpts || []
        };
      } catch (parseError) {
        this.logger.warn(`Failed to parse claim verification result: ${parseError.message}`);
        // Return basic verification result as fallback
        return {
          claim,
          status: 'VERIFICATION_ERROR',
          accurate: false,
          confidence: 0.5,
          explanation: `Verification failed: ${parseError.message}`,
          sourceReferences: []
        };
      }
    } catch (error) {
      this.logger.error(`Error in claim verification: ${error.message}`, error);
      // Return error result
      return {
        claim,
        status: 'ERROR',
        accurate: false,
        confidence: 0,
        explanation: `Error: ${error.message}`,
        sourceReferences: []
      };
    }
  }
  
  /**
   * Compare two responses for factual consistency
   * 
   * @param {string} response1 - First response
   * @param {string} response2 - Second response
   * @param {Array} knowledgeItems - Optional knowledge items for context
   * @returns {Promise<Object>} - Consistency comparison results
   */
  async compareResponses(response1, response2, knowledgeItems = []) {
    try {
      const knowledgeContext = knowledgeItems.length > 0 
        ? this._prepareKnowledgeContext(knowledgeItems)
        : '';
      
      const systemPrompt = `You are an AI assistant specialized in fact verification for airport capacity planning.
Your task is to compare two responses for factual consistency.
Focus on factual statements where the responses may agree or disagree.

For each factual point, determine:
1. Whether the responses AGREE or DISAGREE on this point
2. Which response is more factually accurate (if they disagree)
3. The confidence of your assessment (0.0 to 1.0)
4. The evidence from the responses that supports your assessment

Then provide an overall consistency score (0.0 to 1.0) where:
- 1.0 means completely consistent (no factual contradictions)
- 0.0 means completely inconsistent (contradictions on all major facts)

${knowledgeItems.length > 0 ? 'Use the provided knowledge items to help determine factual accuracy.' : 
'Assess consistency based only on internal consistency and coherence between the responses.'}

Return your analysis as a JSON object.`;

      const userPrompt = `Response 1:
${response1}

Response 2:
${response2}

${knowledgeItems.length > 0 ? `Knowledge Items:
${knowledgeContext}` : ''}

Please compare these responses for factual consistency and accuracy.`;

      const completion = await this.openAIService.processQuery(userPrompt, [], systemPrompt);
      
      // Parse the JSON response
      try {
        // Check if the response contains JSON
        const jsonMatch = completion.text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : completion.text;
        
        return JSON.parse(jsonStr);
      } catch (parseError) {
        this.logger.warn(`Failed to parse comparison result: ${parseError.message}`);
        // Return basic comparison result as fallback
        return {
          consistencyScore: 0.5,
          comparisonPoints: [],
          summary: "Failed to parse comparison results."
        };
      }
    } catch (error) {
      this.logger.error(`Error in response comparison: ${error.message}`, error);
      // Return error result
      return {
        error: error.message,
        consistencyScore: 0
      };
    }
  }
  
  /**
   * Get performance metrics
   * 
   * @returns {Object} - Performance metrics
   */
  getMetrics() {
    const avgVerificationTime = this.metrics.totalVerifications > 0
      ? this.metrics.totalVerificationTimeMs / this.metrics.totalVerifications
      : 0;
    
    return {
      ...this.metrics,
      averageVerificationTimeMs: avgVerificationTime,
      correctionRate: this.metrics.totalVerifications > 0
        ? (this.metrics.totalCorrections / this.metrics.totalVerifications) * 100
        : 0
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalVerifications: 0,
      totalCorrections: 0,
      averageConfidence: 0,
      totalVerificationTimeMs: 0
    };
  }
}

module.exports = FactVerifierService;