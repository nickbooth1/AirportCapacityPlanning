# Airport Configuration User Guide

## Introduction

The Airport Configuration tool allows you to specify your operational base airport and manage airline terminal allocations, including optional ground handling agent (GHA) assignments. This configuration supports capacity planning and stand allocation by establishing the relationships between airlines, terminals, and GHAs at your airport.

## Accessing the Configuration

1. Navigate to the main menu and select **Configuration**
2. On the Configuration page, click the **Configure Airport** button in the Airport Configuration card

## Setting Your Base Airport

The base airport is the primary airport for which you'll be managing capacity and operations. All terminal and stand allocations are assumed to be for this airport.

To set your base airport:

1. In the **Base Airport** section, click on the dropdown field
2. Begin typing the airport name or code to filter the results
3. Select your desired airport from the dropdown list
4. Confirm your selection when prompted

![Base Airport Selection](../images/airport-config-base-selection.png)

**Note:** Changing your base airport affects all other configuration components that rely on airport-specific data.

## Managing Airline Terminal Allocations

The Airline Terminal Allocations section allows you to specify which airlines operate from which terminals at your base airport, and optionally assign ground handling agents to these operations.

### Viewing Existing Allocations

All current airline terminal allocations are displayed in the table, showing:
- Airline (code and name)
- Terminal (code and name)
- Ground Handling Agent (if assigned)
- Action buttons for editing or deleting each allocation

### Adding a New Allocation

To add a new airline terminal allocation:

1. Click the **Add Allocation** button above the allocations table
2. In the dialog that appears:
   - Select an airline from the dropdown (required)
   - Select a terminal from the dropdown (required)
   - Optionally select a ground handling agent from the dropdown
3. Click **Save** to create the allocation
4. The new allocation will appear in the table

![Add Allocation Dialog](../images/airport-config-add-allocation.png)

### Editing an Existing Allocation

To modify an existing allocation:

1. Click the edit icon (pencil) in the Actions column for the allocation you want to update
2. In the edit dialog, modify any of the fields:
   - Change the airline
   - Change the terminal
   - Add, change, or remove the ground handling agent
3. Click **Save** to apply your changes
4. The updated allocation will be reflected in the table

### Deleting an Allocation

To remove an allocation:

1. Click the delete icon (trash) in the Actions column for the allocation you want to remove
2. Confirm your intention to delete when prompted
3. The allocation will be removed from the table

## How This Configuration Is Used

The airport configuration data you set here is used by other components in the system:

### 1. Stand Allocator Tool
- Uses airline-terminal mappings to inform stand allocation decisions
- Considers terminal proximity for more efficient operations

### 2. Capacity Analysis
- Incorporates airline distribution across terminals for demand analysis
- Identifies potential terminal capacity constraints

### 3. GHA Workforce Planning
- Uses airline-GHA associations to determine staffing requirements
- Helps optimize GHA resource allocation

## Tips and Best Practices

- **Base Airport:** Choose the primary airport where you manage operations. If you manage multiple airports, select the one with the most complex operations.

- **Complete Allocations:** For the most accurate capacity planning, ensure all airlines operating at your airport have terminal allocations.

- **GHA Assignments:** While optional, assigning ground handling agents to airlines provides valuable data for workforce planning and operational efficiency analysis.

- **Regular Updates:** Keep your airline terminal allocations up to date as airlines change terminals or new airlines begin operations at your airport.

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Cannot find an airport | Try searching by IATA code, ICAO code, or partial name |
| Cannot find an airline | Verify the airline exists in the system. You may need to add it first from the Airlines configuration page |
| Cannot find a terminal | Ensure terminals are correctly configured for your airport. You may need to add it first from the Terminals configuration page |
| Changes not saving | Check your network connection and try again. If the problem persists, refresh the page and retry |

### Getting Help

If you encounter any issues or have questions about the Airport Configuration tool, please contact the system administrator or refer to the main documentation portal for additional resources. 