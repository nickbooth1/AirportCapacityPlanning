# Stand Capacity Tool User Guide

## Overview

The Stand Capacity Tool calculates the theoretical maximum capacity of stands at your airport based on:
- The physical capabilities of each stand (compatible aircraft types)
- Turnaround times for various aircraft types
- Gap time requirements between consecutive flights
- Stand adjacency constraints and restrictions

This guide explains how to use the tool and interpret the results.

## Accessing the Tool

1. Navigate to the "Capacity Planning" section from the main menu
2. The Stand Capacity Calculator will be displayed on the page

## Setting Up Your Calculation

The Stand Capacity Calculator offers two main configuration options:

### Option 1: Use Defined Time Slots

1. Enable the "Use defined time slots" toggle (on by default)
2. Select one or more time slots from the dropdown menu
   - These time slots must be pre-configured in the Time Slots settings
   - The calculation will be performed for each selected time slot

### Option 2: Use Generated Time Slots

1. Disable the "Use defined time slots" toggle
2. The system will automatically generate time slots based on your operational settings
   - The slot duration, operating hours, and other parameters are taken from your operational settings

### Filtering by Stands

1. Optionally, select specific stands to include in the calculation
2. If no stands are selected, all active stands will be included

## Running the Calculation

1. Click the "Calculate Capacity" button
2. The system will process your request, which may take a few moments depending on the complexity of your data
3. Results will be displayed below the form when the calculation completes

## Understanding the Results

The capacity results are presented in two main views:

### Best Case Capacity

This calculation assumes optimal conditions with no restrictions from adjacent stands. It represents the theoretical maximum capacity if all stands could be used independently.

### Worst Case Capacity

This calculation takes into account stand adjacency restrictions. When certain stands are occupied by large aircraft, nearby stands may be restricted in the types or sizes of aircraft they can accommodate. This results in a more realistic but lower capacity estimate.

### Table View

- Each row represents an aircraft type
- Each column represents a time slot
- The cell values indicate how many aircraft of that type can be accommodated during that time slot
- Green cells (best case) and orange cells (worst case) highlight non-zero capacity

### Chart View

- The bar chart visualizes the same data as the table view
- It allows for easier comparison between different time slots
- Hover over the bars to see detailed capacity numbers

## Exporting Results

To save or share your results:
1. Click the "Export CSV" button at the top of the results section
2. A CSV file will be downloaded containing the capacity data
3. This file can be opened in Excel or other spreadsheet software for further analysis

## Calculation Metadata

The bottom of the results displays useful metadata about your calculation:
- Calculation timestamp
- Number of stands included
- Number of aircraft types
- Other relevant parameters

## Factors That Impact Capacity

The following factors can significantly impact your capacity results:

1. **Turnaround Times** - Longer turnaround times reduce capacity
2. **Gap Between Flights** - Longer gaps reduce capacity
3. **Stand Adjacency Rules** - More restrictions reduce worst-case capacity
4. **Aircraft Mix** - The types of aircraft you accommodate affect overall capacity
5. **Operating Hours** - Longer operating hours increase daily capacity

## Troubleshooting

If you encounter any issues with the Stand Capacity Tool:

1. **No results** - Ensure you have selected at least one time slot if using defined time slots
2. **Zero capacity** - Check if your stands have compatible aircraft types defined
3. **Unexpected results** - Verify your turnaround times and gap settings
4. **Error messages** - Contact your system administrator for assistance 