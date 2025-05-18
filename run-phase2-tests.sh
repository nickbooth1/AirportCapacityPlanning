#\!/bin/bash
# Master script to run Phase 2 AirportAI tests

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AirportAI Phase 2 Tests${NC}"
echo "=================================="

# Check if OpenAI API key is available
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}Warning: OPENAI_API_KEY not found in environment. Using mock tests only.${NC}"
  export RUN_LIVE_OPENAI_TESTS=false
else
  echo -e "${GREEN}Found OPENAI_API_KEY in environment. Will run live OpenAI tests.${NC}"
  export RUN_LIVE_OPENAI_TESTS=true
fi

# Create log directory if it doesn't exist
mkdir -p logs/tests

# Run unit tests
echo ""
echo -e "${GREEN}Running Unit Tests${NC}"
echo "----------------"
node scripts/simple-test-runner.js
UNIT_RESULT=$?

# Run integration tests with OpenAI
echo ""
echo -e "${GREEN}Running Integration Tests with OpenAI${NC}"
echo "--------------------------------"
node scripts/run-integration-tests-with-openai.js
OPENAI_RESULT=$?

# Run all integration tests
echo ""
echo -e "${GREEN}Running All Integration Tests${NC}"
echo "-------------------------"
node scripts/run-integration-tests.js
INTEGRATION_RESULT=$?

# Run E2E tests
echo ""
echo -e "${GREEN}Running E2E Tests${NC}"
echo "----------------"
node scripts/run-e2e-tests.js
E2E_RESULT=$?

# Run performance tests
echo ""
echo -e "${GREEN}Running Performance Tests${NC}"
echo "----------------------"
node scripts/run-performance-tests.js
PERFORMANCE_RESULT=$?

# Print summary
echo ""
echo -e "${GREEN}AirportAI Phase 2 Test Results${NC}"
echo "==============================="
echo "Unit Tests: $([ $UNIT_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "OpenAI Integration Tests: $([ $OPENAI_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "All Integration Tests: $([ $INTEGRATION_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "E2E Tests: $([ $E2E_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "Performance Tests: $([ $PERFORMANCE_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"

# Calculate overall result
if [ $UNIT_RESULT -eq 0 ] && [ $OPENAI_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ] && [ $PERFORMANCE_RESULT -eq 0 ]; then
  echo -e "${GREEN}All tests passed successfully\!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the logs for details.${NC}"
  exit 1
fi
