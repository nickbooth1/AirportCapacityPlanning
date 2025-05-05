# Flight Upload Tool Documentation

The Flight Upload Tool is a comprehensive solution for uploading, validating, and importing flight schedule data to the Airport Capacity Planner. This document explains how to use the tool effectively.

## Overview

The Flight Upload Tool provides a step-by-step workflow:

1. **Select File**: Choose a CSV file containing flight schedule data
2. **Process Data**: Upload and process the selected file
3. **Review & Validate**: Review validation results, filter invalid entries, export reports
4. **Complete**: Approve valid flights for import to the system

## Supported File Format

The tool accepts CSV files with the following columns:

- **airline_iata**: IATA code for the airline (e.g., "BA", "LH")
- **flight_number**: Flight number (e.g., "1234")
- **scheduled_datetime**: Scheduled date and time (ISO format preferred: YYYY-MM-DD HH:MM:SS)
- **estimated_datetime**: Estimated date and time (optional)
- **flight_nature**: "A" for arrival, "D" for departure
- **origin_destination_iata**: IATA code for origin (for arrivals) or destination (for departures)
- **aircraft_type_iata**: IATA code for aircraft type (e.g., "B738", "A320")
- **flight_type_iata**: Flight type code (e.g., "J" for scheduled, "C" for charter)
- **terminal**: Terminal number or letter (optional)
- **country**: Country code (optional)
- **seat_capacity**: Number of seats on the aircraft (optional)
- **expected_passengers**: Expected number of passengers (optional)

## Usage Instructions

### Step 1: Select File

1. Navigate to the Flight Upload page
2. Either click on the upload area or drag and drop your CSV file
3. The system validates the file type (must be CSV) and size (up to 50MB)
4. For files larger than 10MB, the system automatically uses chunked uploads for improved reliability

### Step 2: Process Data

1. Once a file is selected, click the "Upload" button to begin
2. A progress bar indicates the upload status
3. For large files, individual chunks are uploaded and their progress is tracked
4. After the upload completes, the system processes the file (parsing CSV, validating format)
5. When processing is complete, the system automatically proceeds to validation

### Step 3: Review & Validate

1. Validation statistics are displayed at the top of the page, showing:
   - Total number of flights
   - Number of valid flights
   - Number of invalid flights
   - Validation rate
2. Flight data is displayed in a table with the following options:
   - Filter by validation status (All, Valid, Invalid)
   - Filter by flight type (Arrivals, Departures)
   - Sort by any column by clicking the column header
   - Navigate between pages of results
3. Invalid flights show validation errors directly in the table
4. Export validation reports as CSV, XLSX, or JSON by clicking the export button

### Step 4: Complete

1. After reviewing validation results, click "Approve Valid Flights" to import them
2. The system will import only valid flights, excluding any invalid entries
3. After approval, you can view the imported flights in the main flights section of the application

## Advanced Features

### Chunked Uploads

For files larger than 10MB, the system uses chunked uploading:

- Files are split into smaller chunks (1MB by default)
- Each chunk is uploaded separately
- If a chunk fails to upload, the system retries automatically
- Progress is tracked per chunk and for the overall upload
- If the upload is interrupted, it can be resumed later

### Validation Rules

Flights are validated against the following rules:

1. **Required Fields**: All required fields must be present and non-empty
2. **IATA Codes**: Airline, origin/destination, and aircraft type codes must be valid IATA codes
3. **Date/Time Format**: Dates and times must be in a valid format
4. **Flight Number**: Must follow the correct format (1-4 digits)
5. **Seat Capacity**: Must be a positive integer if provided
6. **Expected Passengers**: Must be a positive integer and not exceed seat capacity if provided

### Report Export

Validation reports can be exported in three formats:

1. **CSV**: For easy viewing in spreadsheet applications
2. **XLSX**: For advanced Excel features
3. **JSON**: For programmatic use

Reports include all flight data along with validation status and detailed error messages.

## Troubleshooting

### Common Issues

1. **File Upload Fails**: 
   - Check your internet connection
   - Ensure the file is under 50MB
   - Try refreshing the page and uploading again

2. **Validation Shows Many Errors**:
   - Check CSV column headers match expected format
   - Verify dates are in correct format (YYYY-MM-DD HH:MM:SS)
   - Ensure IATA codes are valid

3. **Browser Freezes During Upload**:
   - For very large files, try using a more powerful computer
   - Close other tabs and applications to free up memory
   - Split the CSV into smaller files if possible

### Getting Help

For additional assistance with the Flight Upload Tool, please contact technical support at support@airportcapacityplanner.com. 