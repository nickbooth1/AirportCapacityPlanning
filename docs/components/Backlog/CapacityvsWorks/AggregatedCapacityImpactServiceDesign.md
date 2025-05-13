# Design Document: AggregatedCapacityImpactService

## 1. Overview

The `AggregatedCapacityImpactService` is a backend service responsible for calculating and providing data on how approved and potential maintenance requests affect airport stand capacity over a given period. It contrasts the theoretical daily stand capacity (best-case scenario) with the net capacity after considering stand unavailability due to maintenance.

The service will output a daily breakdown of capacity, detailing the original capacity, the capacity reduced due to different categories of maintenance (definite vs. potential), and the final net capacity. This data is intended for frontend components, such as dashboards and maintenance pages, to visualize capacity impacts, for example, using stacked bar charts.

## 2. Service Details

### 2.1. Location

This service will reside in the backend, likely under a path such as `backend/src/services/AggregatedCapacityImpactService.js`.

### 2.2. Main Method

`async getDailyImpactedCapacity(options)`

#### 2.2.1. Input Options:

*   `options.startDate` (string): The start date for the analysis period (e.g., "YYYY-MM-DD").
*   `options.endDate` (string): The end date for the analysis period (e.g., "YYYY-MM-DD").
*   `options.capacityScenario` (string): Specifies which capacity data to use. **Currently fixed to 'bestCaseCapacity'**.
*   `options.maintenanceStatusIdsToInclude` (object): Specifies which maintenance status IDs to consider for different impact types.
    *   Example: `{ definite: [2, 4, 5], potential: [1] }`
        *   ID 1: 'Requested'
        *   ID 2: 'Approved'
        *   ID 3: 'Rejected' (Excluded)
        *   ID 4: 'In Progress'
        *   ID 5: 'Completed'
        *   ID 6: 'Cancelled' (Excluded)

#### 2.2.2. Output Structure:

The method will return a `Promise<Array<Object>>`. Each object in the array represents a single day's capacity impact analysis:

```json
[
  {
    "date": "YYYY-MM-DD",
    "originalDailyCapacity": {
      "narrowBody": 100, // Total original narrow-body movements for the day
      "wideBody": 50,    // Total original wide-body movements for the day
      "total": 150       // Total original movements for the day
    },
    "capacityAfterDefiniteImpact": { // Original - definite maintenance (Approved, In Progress, Completed)
      "narrowBody": 95,
      "wideBody": 48,
      "total": 143
    },
    "finalNetCapacity": { // After definite AND potential maintenance (Requested)
      "narrowBody": 90,
      "wideBody": 47,
      "total": 137
    },
    "maintenanceImpacts": {
      "definite": { // Impacts from 'Approved', 'In Progress', 'Completed' statuses
        "reduction": { "narrowBody": 5, "wideBody": 2, "total": 7 },
        "requests": [
          { "id": "req_uuid_1", "title": "Engine Check Stand A1", "standCode": "A1", "statusName": "Approved", "startTime": "YYYY-MM-DDTHH:mm:ssZ", "endTime": "YYYY-MM-DDTHH:mm:ssZ" }
          // ... other definite requests for this day
        ]
      },
      "potential": { // Impacts from 'Requested' status
        "reduction": { "narrowBody": 5, "wideBody": 1, "total": 6 },
        "requests": [
          { "id": "req_uuid_2", "title": "Pavement Repair Stand B2", "standCode": "B2", "statusName": "Requested", "startTime": "YYYY-MM-DDTHH:mm:ssZ", "endTime": "YYYY-MM-DDTHH:mm:ssZ" }
          // ... other potential requests for this day
        ]
      }
    }
  }
  // ... more objects for each day in the range
]
```

## 3. Internal Logic & Data Flow

### 3.1. Initialization (Service Constructor or Setup Method)

1.  **Load Reference Data:**
    *   **Stands:** Fetch all active stands. For each stand, determine its `code` (e.g., "S101") and its `baseCompatibleAircraftTypeIDs` (ICAO codes). This logic should mirror `standCapacityToolService.convertStandsData()` (i.e., check `stand_aircraft_constraints` first, then fallback to `max_aircraft_size_code`). Store as `Map<standCode, { dbId: number, compatibleAircraftICAOs: string[] }>`.
    *   **Aircraft Types:** Fetch all active aircraft types. For each, store its `icao_code`, `size_category_code`, and `averageTurnaroundMinutes`. Implement a mapping from `size_category_code` to "narrowBody" or "wideBody" (e.g., A-D = narrow, E-F = wide). Store as `Map<icaoCode, { sizeCategory: string, averageTurnaroundMinutes: number, bodyType: 'narrowBody' | 'wideBody' }>`.
    *   **Operational Settings:** Fetch general operational settings, especially `default_gap_minutes` and `slot_duration_minutes` from `OperationalSettingsModel`.
    *   **Maintenance Status Types:** Cache mapping from status ID to status name.

### 3.2. Fetching Gross Daily Capacity Template

1.  Invoke `standCapacityToolService.calculateCapacity({ useDefinedTimeSlots: false, standIds: [/*all active stand DB IDs*/] })`.
    *   This is assumed to return a daily capacity template based on general operating hours, providing `bestCaseCapacity` per time slot and per aircraft type ICAO code. The `timeSlots` in this template will be generic (e.g., "06:00:00"-"06:59:00").

### 3.3. Processing (within `getDailyImpactedCapacity`)

1.  **Fetch Maintenance Requests:**
    *   Call `maintenanceRequestService.getAllRequests()` to retrieve all maintenance requests (with statuses matching those in `options.maintenanceStatusIdsToInclude.definite` and `options.maintenanceStatusIdsToInclude.potential`) that overlap with the overall `options.startDate` and `options.endDate`.

2.  **Iterate Through Each Day in the Requested Range (`currentDate`):**
    *   **a. Calculate Original Daily Totals:**
        *   From the `dailyGrossCapacityTemplate.bestCaseCapacity`, sum up the capacities for all time slots and all aircraft types. Categorize these sums into `narrowBody` and `wideBody` totals for the `originalDailyCapacity` field of the daily output object.
    *   **b. Initialize Daily Impact Accumulators:**
        *   `dailyDefiniteReduction = { narrowBody: 0, wideBody: 0, total: 0 }`
        *   `dailyPotentialReduction = { narrowBody: 0, wideBody: 0, total: 0 }`
        *   `contributingDefiniteRequests = []`
        *   `contributingPotentialRequests = []`
        *   `currentDayNetSlotCapacities = deepCopy(dailyGrossCapacityTemplate.bestCaseCapacity)` (this stores capacity per slot per aircraft ICAO code).
    *   **c. Process Each Time Slot in the Daily Template:**
        *   For each `templateSlot` (e.g., "06:00:00"-"06:59:00") in `dailyGrossCapacityTemplate.timeSlots`:
            *   Construct absolute `slotStartDateTime` and `slotEndDateTime` by combining `currentDate` with `templateSlot.startTime` and `templateSlot.endTime`.
            *   Filter the fetched maintenance requests to find those active during this specific `slotStartDateTime` to `slotEndDateTime` on `currentDate`.
            *   For each active `maintenanceRequest` affecting a `standCode`:
                *   Retrieve the `compatibleAircraftICAOs` for the `standCode`.
                *   For each `aircraftTypeICAO` compatible with the stand:
                    *   Get `aircraftDetails = aircraftTypeMap.get(aircraftTypeICAO)`.
                    *   Calculate `totalOccupationMinutes = aircraftDetails.averageTurnaroundMinutes + operationalSettings.default_gap_minutes`.
                    *   Get `slotDurationMinutes` from `operationalSettings.slot_duration_minutes` (or from the templateSlot if it varies).
                    *   Calculate `singleStandSlotContribution = Math.max(1, Math.floor(slotDurationMinutes / totalOccupationMinutes))`. This is the capacity units this stand would have provided for this aircraft type in this slot.
                    *   Determine `bodyType = aircraftDetails.bodyType`.
                    *   **Apply Reduction:**
                        *   Identify the target reduction accumulator (`dailyDefiniteReduction` or `dailyPotentialReduction`) and contributing request list based on `maintenanceRequest.status_id`.
                        *   The actual reduction for *this specific slot and aircraft type* is `Math.min(currentDayNetSlotCapacities[templateSlot.label][aircraftTypeICAO], singleStandSlotContribution)`. This ensures we don't subtract more capacity than available in the slot for that type.
                        *   Decrement `currentDayNetSlotCapacities[templateSlot.label][aircraftTypeICAO]` by this actual reduction.
                        *   Add the actual reduction to the appropriate `dailyDefiniteReduction` or `dailyPotentialReduction` accumulator (categorized by `bodyType`).
                        *   Add relevant details of the `maintenanceRequest` (id, title, standCode, statusName, start/end times) to the corresponding `contributingDefiniteRequests` or `contributingPotentialRequests` list (ensure uniqueness if a request spans multiple slots).
    *   **d. Calculate Final Daily Totals for Output:**
        *   `capacityAfterDefiniteImpact.narrowBody = originalDailyCapacity.narrowBody - dailyDefiniteReduction.narrowBody`. Similarly for `wideBody` and `total`.
        *   `finalNetCapacity.narrowBody = capacityAfterDefiniteImpact.narrowBody - dailyPotentialReduction.narrowBody`. Similarly for `wideBody` and `total`.
    *   **e.Assemble and Store Daily Result:**
        *   Create the JSON object for `currentDate` as per the output structure, populating all fields including the lists of contributing maintenance requests.
        *   Add this object to an array of daily results.

3.  **Return the array of daily results.**

## 4. Mermaid Diagram (Data Flow)

```mermaid
flowchart TD
    A[Client Request: Date Range] --> B{AggregatedCapacityImpactService};

    subgraph B [AggregatedCapacityImpactService]
        direction LR
        C1[Initialize: Load Stand Details, Aircraft Types, OpSettings]
        
        C2{Get Daily Gross Capacity Template}
        C2 --> C2a[Call StandCapacityToolService.calculateCapacity()];
        C2a --> C2b["Daily Template (Slots, BestCaseCapacity by AircraftType)"];
        
        C3{Fetch Maintenance Data}
        C3 --> C3a["Call MaintenanceRequestService.getAllRequests(DateRange, RelevantStatuses)"];
        C3a --> C3b[All Relevant Maintenance Requests];

        C1 --> C4; C2b --> C4; C3b --> C4;

        C4{Process Each Day in Range};
        subgraph C4 [Daily Processing Loop]
            direction TB
            D1[Get Original Daily Totals from Template];
            D2[Initialize Daily Net Slot Capacities (copy of Template)];
            D3[Filter Maintenance for Current Day];
            D4{For each TimeSlot in Template};
            subgraph D4 [Slot Processing]
                direction TB
                E1[Construct Absolute Slot DateTime];
                E2[Identify Active Maintenance for this Slot];
                E3{For each Active Maintenance Request};
                subgraph E3 [Maintenance Request Impact]
                    direction TB
                    F1[Get Stand's Compatible Aircraft];
                    F2{For each Compatible Aircraft Type};
                    subgraph F2 [Aircraft Type Impact]
                       G1[Calculate SingleStandSlotContribution];
                       G2[Determine Impact Type (Definite/Potential)];
                       G3[Decrement Net Slot Capacity for this AircraftType];
                       G4[Accumulate Daily Reduction (Narrow/Wide, Definite/Potential)];
                       G5[Store Contributing Maintenance Request Details];
                    end
                end
            end
            D5[Calculate Final Daily Net Totals (from impacted slots)];
            D6[Assemble Daily Output Object];
        end
        C4 --> C5[Array of Daily Impact Objects];
    end
    
    B --> Z[Output: Array of Daily Impact Data];
```

## 5. Key Assumptions & Considerations

*   **Daily Capacity Template:** The `StandCapacityToolService` provides a consistent daily template for `bestCaseCapacity` that can be applied to any day. The `timeSlots` in this template are relative (e.g., "06:00-07:00") and need to be combined with a specific calendar date for maintenance overlap checks.
*   **Aircraft Body Type Mapping:** A clear mapping from `aircraft_types.size_category_code` to "narrowBody" or "wideBody" must be implemented.
*   **`singleStandSlotContribution`:** The logic `Math.max(1, Math.floor(slotDurationMinutes / totalOccupationMinutes))` is assumed to correctly represent the capacity units one stand contributes for one aircraft type in one slot, aligning with how the `StandCapacityToolService` calculates total capacity.
*   **Performance:** For very long date ranges, fetching all maintenance requests upfront and then filtering daily is generally efficient. The main computation is the daily slot-by-slot analysis.
*   **Error Handling:** Standard error handling for service calls and data processing should be implemented.
*   **Dependencies:** This service relies on `StandCapacityToolService`, `MaintenanceRequestService`, and various database models (`Stand`, `AircraftType`, `OperationalSettings`, `MaintenanceRequest`, `MaintenanceStatusType`).
*   **Configuration:** Maintenance status IDs for definite and potential impacts should be easily configurable. 