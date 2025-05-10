Stand Allocation Problem Statement

I need a simple stand allocation tool that takes a flight schedule and allocates each flight to a stand. Following a consistent allocation method, based upon stand capability, airline attributes and stand availability.

Algorythum:
- Get Flight Schedule.
- Sort/Prioritize Flights:
    - Primary sort: Chronological by Date & Time of Flight.
    - Secondary sort (for conflicting demands): Prioritize flights for airlines with contractual contact stand requirements.
- For each flight (or linked pair if `LinkID` exists and its corresponding flight is found):
    - Determine Stand Occupancy Time:
        - If `LinkID` is present and paired flight found: Occupancy is from first flight's scheduled time to second flight's scheduled time. Validate this duration against `Settings.TurnaroundTimeSettings` for the aircraft type. If insufficient, flag for unallocation.
        - If `LinkID` is present but paired flight is missing, or `LinkID` is blank:
            - Arrival: Occupancy from `Arrival Time` to `Arrival Time + TurnaroundTimeSetting`.
            - Departure: Occupancy from `Departure Time - TurnaroundTimeSetting` to `Departure Time`.
- Identify Airline attributes (from `Airlines` data):
    - Base Terminal.
    - Contractual Contact Stand Requirement (true/false).
- Identify Aircraft Size from `Flight Schedule.AircraftType`.
- Identify Possible Stands:
    - Filter stands by the airline's `BaseTerminal`.
    - Filter stands by compatibility with `AircraftType` (using `Stands.SizeLimit`).
    - If airline `RequiresContactStand`, filter stands based on `Stands.IsContactStand` (true for contact, false for remote).
    - For each remaining potential stand, evaluate `Stands.Adjacency` rules:
        - Check if its use by the current flight/aircraft size is restricted by current or imminent usage of surrounding stands.
        - Check if its use would impose unacceptable restrictions on adjacent stands.
- Check on Stand Availability (for the chosen potential stand and calculated occupancy duration):
    - Check Maintenance Tracker: Confirm the stand is not under an approved maintenance period that overlaps with the required occupancy duration.
    - Check Current Usage: Confirm stand is not already allocated to another flight for the required period.
- Allocate Stand:
    - If a suitable, available stand is found through the above filters:
        - Allocate the flight (or linked pair) to the stand.
        - Log stand utilization details (flight, stand, allocated times) for reporting purposes.
- Handle Unallocated Flights:
    - If no suitable stand is found (due to failed validation, no availability, or adjacency conflicts):
        - Add the flight (or pair) to an "Unallocated Flight List."
        - Call AI for support:
            - AI to analyze the unallocated flight and its constraints.
            - AI to propose potential mitigation options to the user (e.g., suggest reducing turnaround time, adjusting gap between flights – within predefined guardrails).
- Repeat for all flights in the prioritized list.

Data Structures:
Flight Schedule (Selected by the user)
- Airline (references `Airlines.Name`)
- Date & Time of Flight (arrival or departure time)
- DepartureOrArrival (enum: 'Departure', 'Arrival')
- AircraftType (e.g., B738, A320 - for matching with `Stands.SizeLimit` and `Settings.TurnaroundTimeSettings`)
- LinkID (to link an arrival flight to its subsequent departure flight if it's the same aircraft turning around)
- Origin (Actual origin for arrivals; base airport for departures)
- Destination (Base airport for arrivals; actual destination for departures)
- FlightNumber

Stands
- Name (unique stand identifier)
- Terminal (e.g., T1, T2)
- Pier (e.g., A, B)
- SizeLimit (defines aircraft compatibility, e.g., ICAO code like 'Code C', max wingspan/length, or list of compatible `AircraftType`s)
- Maintenance (boolean: Conceptually, default false. Its effective status for a given time period is determined by approved requests in the Maintenance Tracker. The stand is considered under maintenance if an approved request covers the queried time.)
- IsContactStand (boolean: true if a contact stand/pier-served, false if remote. Aligns with codebase `stands.is_contact_stand`)
- Adjacency (describes restrictions or impacts related to surrounding stands when this stand is in use, or when specific aircraft sizes use it. E.g., "Stand 102 unusable if 101 has Code E aircraft").

Airlines
- Name (unique airline identifier, e.g., "Airline X")
- BaseTerminal (preferred or contractually obligated terminal)
- RequiresContactStand (boolean: True if airline has a contractual requirement for contact stands. To be added as a simple boolean attribute to the airline attributes/record.)
- IsContactStand (boolean: true if a contact stand/pier-served, false if remote. Aligns with codebase `stands.is_contact_stand`)
- AdjacencyRules (Represents a set of rules or linked data, not a single field. Describes restrictions or impacts related to surrounding stands. Sourced from data like `stand_aircraft_constraints` or derived adjacency graph. E.g., "Stand 102 unusable if 101 has Code E aircraft").
- Maintenance (boolean: true if under maintenance/unavailable - *Codebase source TBC; may be operational status rather than direct stand field*)

Settings
- TurnaroundTimeSettings (per `AircraftType`: defines standard/minimum turnaround time. Sourced from configuration like `turnaroundRules`. Used for validating linked flights' ground time and as default occupancy for unlinked/single flights)
- GapBetweenFlights (minimum time a stand must be free. Sourced from configuration like `airport_configuration.default_gap_minutes`)
- RequiresContactStand (boolean: true if airline has a contractual requirement for contact stands - *Codebase source TBC; may be business rule or part of airline profile*)
