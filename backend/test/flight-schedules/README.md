# Flight Schedule Test Files

This directory contains CSV files for testing flight upload functionality at various scales. The files are designed to support incremental testing from small samples to larger datasets.

## File Structure

All CSV files follow the standard format with snake_case field names:
```
airline_iata,flight_number,scheduled_datetime,estimated_datetime,flight_nature,origin_destination_iata,aircraft_type_iata,terminal,seat_capacity
```

## Available Test Files

The test files are organized by complexity and scale:

### 1. Basic Test Files
Located in `/basic/` directory:
- **sample.csv**: 16 flights over 2 days (baseline test)
- **peak-hour.csv**: ~45 flights concentrated in a 2-hour window (morning peak)
- **full-day.csv**: ~200 flights across a 24-hour period

### 2. Weekly Test Files
Located in `/weekly/` directory:
- **weekly-schedule.csv**: ~150 flights across a full week with day-of-week patterns
  - Monday-Wednesday: Regular weekday patterns
  - Thursday: Business travel peak
  - Friday: Business/leisure mix with evening peak
  - Saturday: Leisure travel peak
  - Sunday: Return leisure peak

### 3. Monthly Test Files
Located in `/monthly/` directory:
- **monthly-schedule.csv**: ~140 flights showing 4 Mondays across a month
  - Week 1: Regular operations
  - Week 2: Increased mid-month business travel
  - Week 3: Summer travel peak begins
  - Week 4: Summer peak with school holidays

### 4. Quarterly Test Files
Located in `/quarterly/` directory:
- **quarterly-schedule.csv**: ~180 flights showing traffic evolution across summer months
  - June: Early summer with gradual increase
  - July: Peak summer with school holidays
  - August: Maximum summer capacity and late holiday peaks

## Testing Upload Functionality

These files enable structured testing of upload functionality:

1. **Basic Upload Testing**: Start with `sample.csv` to verify upload mechanics
2. **Peak Period Testing**: Use `peak-hour.csv` to test handling of concentrated traffic
3. **Full Day Operations**: Use `full-day.csv` to test a complete operational cycle
4. **Weekly Pattern Testing**: Use `weekly-schedule.csv` to verify handling of day-of-week variations
5. **Monthly Trend Testing**: Use `monthly-schedule.csv` to test handling of monthly growth patterns
6. **Quarterly Seasonal Testing**: Use `quarterly-schedule.csv` to test seasonal growth across a quarter

## Expected Results

When testing, these files should produce predictable stand allocation patterns:
- Increasing utilization rates from basic to more complex files
- Terminal-specific patterns based on airline preferences
- Different unallocated flight profiles at various scales

## Using with Upload Testing

To test upload functionality:
1. Select appropriate test file based on desired test scale
2. Upload through the system's flight upload interface
3. Process the allocation algorithm
4. Verify results against expected patterns

The graduated scale allows for identifying performance thresholds and system limitations. 