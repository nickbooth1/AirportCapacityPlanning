# Flight Upload Process Troubleshooting Guide

This guide addresses common issues encountered during the flight upload and processing pipeline.

## Process Overview

The flight upload process follows these steps:
1. File upload via API
2. Column mapping
3. Data validation
4. Approval
5. Flight schedule creation
6. Stand allocation

## Common Issues and Solutions

### 1. CSV Column Mapping Issues

**Symptoms:**
- Column mapping UI doesn't show correct fields
- Error messages about missing required fields
- Data appearing in wrong columns after processing

**Possible Causes:**
- Column names in CSV don't match expected format (camelCase vs snake_case)
- CSV file has BOM markers
- CSV encoding issues (not UTF-8)

**Solutions:**
- The system now supports both camelCase and snake_case field names
- Ensure your CSV file uses UTF-8 encoding without BOM
- Verify column headers match one of these formats:
  ```
  // snake_case format
  airline_iata, flight_number, scheduled_datetime, estimated_datetime, flight_nature, origin_destination_iata, aircraft_type_iata, terminal, seat_capacity
  
  // camelCase format
  airlineIata, flightNumber, scheduledDatetime, estimatedDatetime, flightNature, originDestinationIata, aircraftTypeIata, terminal, seatCapacity
  ```

### 2. Base Airport Configuration Issues

**Symptoms:**
- Origin/destination showing incorrectly in flight allocations
- Missing or incorrect origin/destination values
- All flights showing as departing from or arriving to "UNKN" or default value

**Possible Causes:**
- Base airport not configured in system settings
- Database record for airport configuration missing

**Solutions:**
- Configure your base airport in the Airport Configuration settings
- The system will use your configured base airport code as:
  - Origin for departure flights
  - Destination for arrival flights
- If no base airport is configured, the system will use "BASE" as the default code

### 3. Validation Failures

**Symptoms:**
- Many flights showing as invalid
- Airlines, airports, or aircraft types showing as "UNKN"
- Error messages about invalid reference data

**Possible Causes:**
- Missing reference data in database
- Incorrect format of codes (e.g., wrong IATA format)
- Case sensitivity issues

**Solutions:**
- Verify that the reference data exists in the database
- Use the API to check available airlines, airports, and aircraft types
- Ensure IATA codes are correctly formatted and in the right case
- For aircraft types, note that the system will try to normalize some values (e.g., "777" → "B777")

### 4. Database Constraint Violations

**Symptoms:**
- Errors with messages about constraint violations
- Uploads get stuck in certain statuses

**Possible Causes:**
- Invalid values for enum fields like `upload_status`
- Missing required fields
- Duplicate entries

**Solutions:**
- For `upload_status`, use only valid enum values: 'pending', 'processing', 'completed', 'failed', 'approved'
- Check database schema for required fields and constraints
- Verify the upload process isn't creating duplicate entries

### 5. Stand Allocation Issues

**Symptoms:**
- Low allocation rate
- Many unallocated flights
- Unexpected allocation patterns

**Possible Causes:**
- Missing or incorrect stand data
- Flight times that don't align with available stands
- Conflicts with existing allocations or maintenance
- Invalid aircraft size category mappings

**Solutions:**
- Check stand data in the database for completeness
- Verify aircraft size categories are correctly mapped
- Review allocation logs for specific unallocation reasons
- Check for stand restrictions or airline preferences that may be limiting options

## Testing and Debugging

### Direct Testing Script

To test the entire process directly (bypassing the API), use:
```
node test-direct-flight-flow.js
```

### API Testing Script

To test through the API endpoints, use:
```
node api-test-flight-upload.js
```

### Common Debug Endpoints

- Get upload status: `GET /api/flights/upload/{uploadId}`
- View validation results: `GET /api/flights/upload/{uploadId}/validation`
- Get allocation results: `GET /api/flight-schedules/{scheduleId}/allocation-results`

## Reference Data Requirements

For successful validation, ensure these reference tables are populated:
- `airlines` - Must contain all airline IATA codes used in the CSV
- `airports` - Must contain all origin/destination IATA codes
- `aircraft_types` - Must contain mappings for all aircraft type codes
- `airport_configuration` - Must have a base airport configured

## Log Diagnostics

Important log patterns to look for:
- `[DEBUG] Processing row` - Shows raw CSV data processing
- `[DEBUG] Flight record for database` - Shows normalized flight data
- `[DEBUG] Validation completed with results` - Summary of validation
- `[DEBUG] Using base airport: XXX for flight normalization` - Shows which base airport is being used
- `[DEBUG] Allocation input prepared with` - Shows input to allocation algorithm
- `[DEBUG] Allocation completed with` - Shows allocation results 