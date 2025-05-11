#!/bin/bash

# Stand Capacity Tool: Standard Case Test Shell Script
# This script ensures the test directory exists and runs the test script

# Get the script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../.." || exit 1

echo "=== STAND CAPACITY TOOL: STANDARD CASE TEST ==="
echo "Current directory: $(pwd)"
echo "Script directory: $SCRIPT_DIR"

# Ensure test directory exists
TEST_DIR="docs/plans/tests"
if [ ! -d "$TEST_DIR" ]; then
  echo "Creating test directory: $TEST_DIR"
  mkdir -p "$TEST_DIR"
fi

# Run the test script
echo "Running test script..."
node "$SCRIPT_DIR/run-standard-case-test.js"

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Test completed successfully!"
else
  echo "❌ Test failed! Check the logs for details."
  exit 1
fi 