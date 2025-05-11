#!/bin/bash

# Stand Capacity Tool: Standard Case Database Test Script
# This script runs the test-standard-case-with-db.js test which uses real database data

# Get the script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../.." || exit 1

echo "=== STAND CAPACITY TOOL: STANDARD CASE DATABASE TEST ==="
echo "Current directory: $(pwd)"
echo "Script directory: $SCRIPT_DIR"

# Check if database is available
echo "Checking database connectivity..."
if ! npx knex migrate:status --knexfile backend/knexfile.js; then
  echo "❌ Database connection failed. Please check your database configuration."
  exit 1
fi

# Run the test script
echo "Running database test script..."
node "$SCRIPT_DIR/test-standard-case-with-db.js"

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Database test completed successfully!"
else
  echo "❌ Database test failed! Check the logs for details."
  exit 1
fi 