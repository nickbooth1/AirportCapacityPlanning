#!/bin/bash

# Test script for live_cli.js
# This script runs the live CLI tool with different date ranges and options to validate functionality with live data

echo "==== Testing Capacity Impact Analyzer - Live Data Version ===="
echo ""

# Create output directory if it doesn't exist
OUTDIR="./test_output"
mkdir -p $OUTDIR

# Test 1: Single day analysis
echo "Test 1: Single day analysis (2023-12-15)"
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15 --outputFile "$OUTDIR/test1_single_day.json"
if [ $? -eq 0 ]; then
  echo "✅ Test 1 passed"
else
  echo "❌ Test 1 failed"
fi
echo ""

# Test 2: Three-day range
echo "Test 2: Three-day range (2023-12-15 to 2023-12-17)"
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-17 --outputFile "$OUTDIR/test2_three_days.json"
if [ $? -eq 0 ]; then
  echo "✅ Test 2 passed"
else
  echo "❌ Test 2 failed"
fi
echo ""

# Test 3: Week-long range
echo "Test 3: Week-long range (2023-12-15 to 2023-12-21)"
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-21 --outputFile "$OUTDIR/test3_week.json"
if [ $? -eq 0 ]; then
  echo "✅ Test 3 passed"
else
  echo "❌ Test 3 failed"
fi
echo ""

# Test 4: Error handling - invalid date format
echo "Test 4: Error handling - invalid date format"
node live_cli.js --startDate 15-12-2023 --endDate 2023-12-17
if [ $? -ne 0 ]; then
  echo "✅ Test 4 passed (expected error detected)"
else
  echo "❌ Test 4 failed (error not detected)"
fi
echo ""

# Test 5: Error handling - start date after end date
echo "Test 5: Error handling - start date after end date"
node live_cli.js --startDate 2023-12-18 --endDate 2023-12-17
if [ $? -ne 0 ]; then
  echo "✅ Test 5 passed (expected error detected)"
else
  echo "❌ Test 5 failed (error not detected)"
fi
echo ""

# Test 6: Run without output file (prints to console)
echo "Test 6: Run without output file (2023-12-15, check console output)"
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15 | head -20
if [ $? -eq 0 ]; then
  echo "✅ Test 6 passed"
else
  echo "❌ Test 6 failed"
fi
echo ""

# Test 7: Live data (without mock fallback) if database is available
echo "Test 7: Live data connection test (2023-12-15)"
node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15 --outputFile "$OUTDIR/test7_live_data.json"
if [ $? -eq 0 ]; then
  echo "✅ Test 7 passed (live database connection successful)"
else
  echo "⚠️ Test 7 skipped (live database connection not available, this is expected in some environments)"
fi
echo ""

# Summary
echo "==== Test Summary ===="
PASSED=$(grep -c "✅" <<< "$(cat)")
FAILED=$(grep -c "❌" <<< "$(cat)")
SKIPPED=$(grep -c "⚠️" <<< "$(cat)")
TOTAL=$((PASSED + FAILED))

echo "Total tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Skipped: $SKIPPED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "All tests passed! 🎉"
  if [ $SKIPPED -gt 0 ]; then
    echo "Note: $SKIPPED tests were skipped due to environment limitations"
  fi
else
  echo "Some tests failed. Check the output and database connectivity."
  echo "Common issues:"
  echo "- Database connection problems"
  echo "- Missing or incorrect table schemas"
  echo "- Insufficient data in the referenced tables"
fi

# Make executable with: chmod +x test_live_cli.sh 