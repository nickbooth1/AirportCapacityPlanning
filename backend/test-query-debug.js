/**
 * Script to debug the query processing flow with detailed logging
 */

const logger = require('./src/utils/logger');
const nlpService = require('./src/services/agent/StubNLPService');
const toolOrchestratorService = require('./src/services/agent/ToolOrchestratorService');

// Enable debug level logging
logger.level = 'debug';

async function testQueryProcessing() {
  try {
    console.log("=== Testing Query Processing Flow ===");
    
    // Test query
    const query = "What's the current capacity of Terminal 1 for A380 aircraft?";
    
    console.log(`\nTesting query: "${query}"`);
    
    // Step 1: Process with NLP service
    console.log("\n1. NLP Processing:");
    const nlpResult = await nlpService.processQuery(query);
    console.log("NLP Result:", JSON.stringify(nlpResult, null, 2));
    
    if (!nlpResult.success) {
      console.log("❌ NLP processing failed");
      return;
    }
    
    const { intent, confidence, entities } = nlpResult.data;
    
    // Step 2: Check intent mapping
    console.log("\n2. Intent Mapping:");
    const actionMapping = nlpService.mapIntentToAction(intent);
    console.log(`Intent: ${intent} -> Service: ${actionMapping.service}, Method: ${actionMapping.method}`);
    
    // Step 3: Check if the service exists
    console.log("\n3. Service Availability:");
    const availableServices = Object.keys(toolOrchestratorService.services);
    console.log("Available services:", availableServices.join(", "));
    console.log(`Is ${actionMapping.service} available:`, availableServices.includes(actionMapping.service));
    
    // Get the service
    const service = toolOrchestratorService.services[actionMapping.service];
    
    // Step 4: Check if the method exists
    console.log("\n4. Method Availability:");
    if (service) {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(name => typeof service[name] === 'function' && name !== 'constructor');
      
      console.log(`Available methods on ${actionMapping.service}:`, methods.join(", "));
      console.log(`Is ${actionMapping.method} available:`, methods.includes(actionMapping.method));
      
      // If method not found, check for a similar method
      if (!methods.includes(actionMapping.method)) {
        console.log("Looking for similar methods:");
        const similarMethods = methods.filter(m => m.toLowerCase().includes(actionMapping.method.toLowerCase().replace(/^get/, "")));
        console.log("Potential matches:", similarMethods.join(", "));
      }
    } else {
      console.log(`❌ Service ${actionMapping.service} not found`);
    }
    
    // Step 5: Execute the tool using ToolOrchestratorService
    console.log("\n5. Tool Execution:");
    const toolResult = await toolOrchestratorService.executeTool(intent, entities);
    console.log("Tool execution result:", JSON.stringify(toolResult, null, 2));
    
    // Summary
    console.log("\n=== Summary ===");
    if (toolResult.success) {
      console.log("✅ Tool execution succeeded");
    } else {
      console.log(`❌ Tool execution failed: ${toolResult.error}`);
    }
    
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

// Run the test
testQueryProcessing()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });