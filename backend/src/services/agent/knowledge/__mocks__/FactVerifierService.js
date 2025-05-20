/**
 * FactVerifierService.js mock for testing
 */

class FactVerifierService {
  async verifyResponse(text, knowledgeItems, options) {
    return {
      verified: true,
      confidence: 0.9,
      statements: [
        {
          text: 'Example statement',
          lineNumber: 1,
          accurate: true,
          status: 'VERIFIED',
          sourceReference: 'Mock Source'
        }
      ],
      correctedResponse: text
    };
  }
}

module.exports = FactVerifierService;