/**
 * ReasoningExplainer.js
 * 
 * Service for generating human-readable explanations of reasoning steps
 */

const OpenAIService = require('./OpenAIService');
const logger = require('../../utils/logger');

class ReasoningExplainer {
  /**
   * Generate a human-readable explanation for a reasoning step
   * @param {Object} step - The reasoning step to explain
   * @param {Array} previousSteps - Previous steps for context (optional)
   * @returns {Promise<string>} - Human-readable explanation
   */
  async explainStep(step, previousSteps = []) {
    try {
      logger.info(`Generating explanation for step: ${step.description}`);
      
      // Basic explanation templates based on step type
      const templates = {
        calculation: "I'll perform a calculation to determine {target}. This involves {operations}.",
        parameter_extraction: "I need to identify the key parameters from the information provided, specifically looking for {parameters}.",
        data_retrieval: "I'll retrieve data about {subject} to gather the necessary information.",
        validation: "I'll check if {condition} to ensure the results are reliable.",
        comparison: "I'll compare {items} based on {criteria} to find the best option.",
        recommendation: "Based on the analysis, I'll recommend the most suitable {targetType} for your needs."
      };
      
      const stepType = step.type || 'generic';
      
      // For simple steps, use a template-based approach
      if (step.parameters && Object.keys(step.parameters).length < 3) {
        const template = templates[stepType] || "I'll analyze the {subject} to proceed with the request.";
        
        return this.fillTemplate(template, step.parameters, step.description);
      }
      
      // For more complex steps, use OpenAI to generate a natural explanation
      const contextSteps = previousSteps.slice(-3); // Include up to 3 previous steps for context
      
      const prompt = `
      Generate a clear, concise explanation of this reasoning step in plain language that a non-technical user would understand.
      
      Step type: ${stepType}
      Step description: ${step.description}
      Parameters: ${JSON.stringify(step.parameters || {})}
      
      ${contextSteps.length > 0 ? `Previous steps context:
      ${contextSteps.map((s, i) => `Step ${i+1}: ${s.description}`).join('\n')}` : ''}
      
      Write a first-person explanation (using "I" form) that explains:
      1. What this step aims to accomplish
      2. Why it's necessary in the reasoning process
      3. How it relates to the user's original question

      Keep the explanation under 3 sentences and avoid technical jargon.
      `;
      
      const response = await OpenAIService.processQuery(prompt);
      return response.text;
      
    } catch (error) {
      logger.error(`Step explanation error: ${error.message}`);
      // Fallback to simple description if explanation generation fails
      return `I'll ${step.description.toLowerCase()}`;
    }
  }
  
  /**
   * Generate a summary explanation for the entire reasoning process
   * @param {Array} steps - The complete set of reasoning steps
   * @param {string} originalQuery - The original user query
   * @returns {Promise<string>} - Human-readable reasoning summary
   */
  async explainReasoning(steps, originalQuery) {
    try {
      logger.info(`Generating reasoning explanation for query: ${originalQuery}`);
      
      // For a small number of steps, we can just combine the individual explanations
      if (steps.length <= 3) {
        const explanations = await Promise.all(
          steps.map((step, index) => this.explainStep(step, steps.slice(0, index)))
        );
        
        return `To answer your question about ${this.extractSubject(originalQuery)}, I'll take the following approach:\n\n${
          explanations.map((exp, i) => `${i+1}. ${exp}`).join('\n\n')
        }`;
      }
      
      // For longer reasoning chains, use OpenAI to create a concise summary
      const stepsDescription = steps.map((step, i) => 
        `Step ${i+1}: ${step.description}`
      ).join('\n');
      
      const prompt = `
      Create a concise summary of my problem-solving approach for the user's question. 
      
      User query: ${originalQuery}
      
      My reasoning steps:
      ${stepsDescription}
      
      Write a first-person explanation that summarizes:
      1. The overall approach I'm taking to answer the question
      2. The key steps in the reasoning process (group similar steps)
      3. Why this approach makes sense for their question
      
      Keep the explanation conversational and focused on 3-5 main points, avoiding technical jargon.
      `;
      
      const response = await OpenAIService.processQuery(prompt);
      return response.text;
      
    } catch (error) {
      logger.error(`Reasoning explanation error: ${error.message}`);
      // Fallback to simple description if explanation generation fails
      return `To answer your question, I'll analyze the data through ${steps.length} steps including ${
        steps.slice(0, 3).map(s => s.description.toLowerCase()).join(', ')
      }${steps.length > 3 ? ', and more.' : '.'}`;
    }
  }
  
  /**
   * Fill a template with values from parameters and description
   * @param {string} template - The template string
   * @param {Object} parameters - Parameters to fill in the template
   * @param {string} description - Step description for fallback values
   * @returns {string} - Filled template
   */
  fillTemplate(template, parameters, description) {
    // Extract potential placeholder values from parameters and description
    const values = {
      subject: this.extractSubject(description),
      target: this.extractTarget(description),
      operations: this.extractOperations(description),
      parameters: this.formatParameters(parameters),
      condition: this.extractCondition(description),
      items: parameters.items || 'the available options',
      criteria: parameters.criteria || 'relevant criteria',
      targetType: this.extractTargetType(description)
    };
    
    // Fill in the template
    return template.replace(/{(\w+)}/g, (match, key) => {
      return values[key] || match;
    });
  }
  
  /**
   * Extract the subject from a description
   * @param {string} description - The step description
   * @returns {string} - Extracted subject
   */
  extractSubject(description) {
    // Simple extraction logic - can be enhanced with NLP in future
    const subjectPatterns = [
      /analyze\s+(?:the\s+)?([^.]+)/i,
      /calculate\s+(?:the\s+)?([^.]+)/i,
      /for\s+(?:the\s+)?([^.]+)/i,
      /of\s+(?:the\s+)?([^.]+)/i
    ];
    
    for (const pattern of subjectPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback to the first noun phrase
    const nounPhraseMatch = description.match(/(?:the\s+)?(\w+(?:\s+\w+){0,3}?)(?:\s+\w+){0,2}?$/i);
    return nounPhraseMatch ? nounPhraseMatch[1] : 'the request';
  }
  
  /**
   * Extract the target from a description
   * @param {string} description - The step description
   * @returns {string} - Extracted target
   */
  extractTarget(description) {
    const targetPatterns = [
      /calculate\s+(?:the\s+)?([^.]+)/i,
      /determine\s+(?:the\s+)?([^.]+)/i,
      /find\s+(?:the\s+)?([^.]+)/i,
      /identify\s+(?:the\s+)?([^.]+)/i
    ];
    
    for (const pattern of targetPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'the required values';
  }
  
  /**
   * Extract operations from a description
   * @param {string} description - The step description
   * @returns {string} - Extracted operations
   */
  extractOperations(description) {
    const operationPatterns = [
      /by\s+([^.]+)/i,
      /using\s+([^.]+)/i,
      /through\s+([^.]+)/i
    ];
    
    for (const pattern of operationPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'mathematical analysis';
  }
  
  /**
   * Format parameters as a readable string
   * @param {Object} parameters - Parameters object
   * @returns {string} - Formatted parameter string
   */
  formatParameters(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 'key information';
    }
    
    return Object.keys(parameters)
      .filter(key => !key.includes('Id') && !key.includes('data') && !key.startsWith('_'))
      .map(key => {
        const value = parameters[key];
        if (typeof value === 'string') {
          return value;
        }
        return key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
      })
      .join(', ');
  }
  
  /**
   * Extract condition from a description
   * @param {string} description - The step description
   * @returns {string} - Extracted condition
   */
  extractCondition(description) {
    const conditionPatterns = [
      /if\s+([^.]+)/i,
      /whether\s+([^.]+)/i,
      /validate\s+(?:that\s+)?([^.]+)/i,
      /verify\s+(?:that\s+)?([^.]+)/i
    ];
    
    for (const pattern of conditionPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'the conditions are met';
  }
  
  /**
   * Extract target type from a description
   * @param {string} description - The step description
   * @returns {string} - Extracted target type
   */
  extractTargetType(description) {
    const typePatterns = [
      /recommend\s+(?:the\s+best\s+)?(\w+(?:\s+\w+){0,2})/i,
      /suggest\s+(?:the\s+best\s+)?(\w+(?:\s+\w+){0,2})/i,
      /optimal\s+(\w+(?:\s+\w+){0,2})/i,
      /best\s+(\w+(?:\s+\w+){0,2})/i
    ];
    
    for (const pattern of typePatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'solution';
  }
}

module.exports = new ReasoningExplainer();