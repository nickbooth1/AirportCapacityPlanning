# Standard Case Capacity: User Guide

## Introduction

The NEW Stand Capacity Tool now offers three different capacity calculation scenarios to help you better understand your airport's stand capacity:

1. **Best Case Capacity**: Shows the theoretical maximum capacity without any restrictions.
2. **Standard Case Capacity**: Shows a simple count of stand capacity, ignoring stand adjacency information.
3. **Worst Case Capacity**: Shows the most restrictive scenario where all adjacency rules are applied.

This guide explains how to interpret each scenario and use them for planning purposes.

## Understanding the Three Capacity Scenarios

### Best Case Capacity

This scenario represents the theoretical maximum stand capacity if there were no restrictions between adjacent stands. It assumes:

- All stands can be used simultaneously
- All compatible aircraft types can use their designated stands
- No adjacency restrictions apply

Use this scenario to understand the theoretical upper limit of your airport's capacity.

### Standard Case Capacity

This scenario provides a simple count of how many flights all stands can accommodate per time slot, ignoring adjacency information. It's identical to the best case in the current implementation, but has been separated to allow for future enhancements.

Use this scenario for:
- Basic capacity planning without complex constraints
- Comparison baseline for understanding the impact of adjacency restrictions

### Worst Case Capacity

This scenario shows the capacity when all possible adjacency restrictions are applied. It represents the minimum guaranteed capacity considering:

- All adjacency rules are active
- The most restrictive scenario is assumed
- All stands that would be affected by adjacency are restricted accordingly

Use this scenario for conservative planning when you need to ensure capacity even with all restrictions in place.

## How to Interpret the Results

When viewing the capacity results, you'll see three tabs showing each scenario. For each time slot, the capacity is broken down by aircraft type, allowing you to see:

1. How many aircraft of each type can be accommodated
2. The total capacity across all aircraft types
3. How the capacity changes between scenarios

![Example capacity view](example-capacity-view.png)

### Interpreting the Differences

- If **Standard Case = Best Case** and both are significantly higher than **Worst Case**, this indicates that adjacency restrictions are severely limiting your capacity.
- If all three scenarios show similar values, this suggests adjacency restrictions have minimal impact on overall capacity.

## Example Analysis

### Example 1: High Impact of Adjacency Restrictions

**Time Slot: Morning Peak (6:00-9:00)**
- Best Case: 15 aircraft total
- Standard Case: 15 aircraft total
- Worst Case: 8 aircraft total

**Analysis**: Adjacency restrictions reduce capacity by almost 50%. Consider reviewing stand layouts or adjacency rules to improve capacity.

### Example 2: Low Impact of Adjacency Restrictions

**Time Slot: Evening (18:00-21:00)**
- Best Case: 12 aircraft total
- Standard Case: 12 aircraft total
- Worst Case: 11 aircraft total

**Analysis**: Adjacency restrictions have minimal impact during this time period, reducing capacity by only about 8%.

## Validation and Testing

The Standard Case capacity calculation has been rigorously tested to ensure accuracy and reliability:

- **Testing Against Real Data**: The capability has been tested using actual airport data to ensure it works with real-world stand layouts, aircraft types, and adjacency restrictions.

- **Automated Testing**: Comprehensive test scripts verify that standard case capacity equals best case capacity (since both ignore adjacency restrictions) and that worst case capacity is always less than or equal to standard case.

- **Consistency Verification**: The system has been tested to ensure consistent results across different time periods, stand configurations, and aircraft type mixes.

These tests provide confidence that the capacity numbers you see are accurate and can be reliably used for planning purposes.

## Exporting and Sharing Results

You can export the capacity results for all three scenarios by clicking the "Export as CSV" button. This creates a CSV file containing:

1. Best Case Capacity table
2. Standard Case Capacity table
3. Worst Case Capacity table

This file can be opened in spreadsheet programs like Excel for further analysis or sharing with colleagues.

## Using Results for Planning

- Use **Worst Case** for critical operational planning to ensure minimum capacity is available
- Use **Standard Case** for typical planning scenarios without complex constraints
- Use **Best Case** to identify potential capacity improvements if adjacency restrictions could be reduced

## Future Enhancements

In future versions, the Standard Case may incorporate additional constraints beyond adjacency information, such as:

- Operational staff availability
- Ground handling equipment limitations
- Passenger processing capacity

These enhancements will make the Standard Case a distinct middle ground between the theoretical maximum (Best Case) and the most restrictive scenario (Worst Case). 