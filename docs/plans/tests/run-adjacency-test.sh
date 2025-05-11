#!/bin/bash

# Script to run the adjacency test

echo "Running Stand Adjacency Test..."
cd ../../..
node docs/plans/tests/test-adjacency-rules.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Test completed successfully!"
else
  echo "Test failed. See errors above."
  exit 1
fi 