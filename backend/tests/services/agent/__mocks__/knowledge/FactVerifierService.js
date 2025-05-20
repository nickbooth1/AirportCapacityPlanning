/**
 * Mock implementation of FactVerifierService for testing
 */

const FactVerifierService = jest.fn().mockImplementation(() => ({
  verifyResponse: jest.fn().mockResolvedValue({
    verified: true,
    confidence: 0.8,
    correctedResponse: "This is a fact-checked response that is verified to be accurate.",
    statements: [
      { 
        text: "Stand A12 is under maintenance until October 15th.", 
        lineNumber: 1,
        accurate: true,
        confidence: 0.95,
        status: 'verified',
        supporting: ['Stand A12 is under maintenance until October 15th.']
      },
      {
        text: "Terminal 1 has 20 stands in total.",
        lineNumber: 2,
        accurate: true,
        confidence: 0.9,
        status: 'verified',
        supporting: ['T1 has 20 stands in total.']
      }
    ]
  }),
  verifyFact: jest.fn().mockResolvedValue({
    isVerified: true,
    confidence: 0.85,
    correction: null
  }),
  getMetrics: jest.fn().mockReturnValue({
    verificationCount: 12,
    averageAccuracy: 0.92
  })
}));

module.exports = FactVerifierService;