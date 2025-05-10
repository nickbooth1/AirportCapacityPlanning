from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from data_structures import Flight, Stand, Airline, Settings, FlightOperationUnit, MaintenanceEntry, TransferWindow, FlightConnectionTracker, calculate_time_difference_minutes
from intervaltree import IntervalTree, Interval
try:
    from tqdm import tqdm
except ImportError:
    # Fallback if tqdm is not installed
    tqdm = lambda x, **kwargs: x
import time

class StandAllocationEngine:
    """
    Stand Allocation Engine that allocates flights to stands based on various constraints
    """
    
    def __init__(self, flights, stands, airlines, settings, maintenance_tracker, ai_support, 
                 connection_tracker=None, verbose=False):
        """
        Initialize the stand allocation engine
        
        Parameters:
        - flights: List of Flight objects
        - stands: List of Stand objects
        - airlines: List of Airline objects
        - settings: Settings object
        - maintenance_tracker: MockMaintenanceTracker object
        - ai_support: MockAISupport object
        - connection_tracker: FlightConnectionTracker object (optional)
        - verbose: Whether to print progress information
        """
        self.flights = flights
        self.stands = stands
        self.airlines = airlines
        self.settings = settings
        self.maintenance_tracker = maintenance_tracker
        self.ai_support = ai_support
        self.connection_tracker = connection_tracker or FlightConnectionTracker()
        self.verbose = verbose
        
        # Dictionary to map airline codes to Airline objects
        self.airline_map = {airline.AirlineCode: airline for airline in airlines}
        
        # Dictionary to store stand occupancy using interval trees
        self.stand_occupancy_log = {stand.StandName: IntervalTree() for stand in stands}
        
        # Find the earliest and latest flight times to establish a global time reference
        all_times = [flight.parsed_time for flight in flights]
        self.earliest_time = min(all_times) if all_times else datetime(2000, 1, 1)
        
        # Integrate maintenance schedules directly into interval trees
        if hasattr(maintenance_tracker, 'maintenance_schedules'):
            if self.verbose:
                print(f"Integrating {len(maintenance_tracker.maintenance_schedules)} maintenance entries into interval trees...")
                
            for entry in maintenance_tracker.maintenance_schedules:
                # Convert datetime to timestamp for interval tree
                start_timestamp = self._datetime_to_timestamp(entry.parsed_start_time)
                end_timestamp = self._datetime_to_timestamp(entry.parsed_end_time)
                
                # Ensure end time is greater than start time
                if end_timestamp <= start_timestamp:
                    end_timestamp = start_timestamp + 1  # Ensure valid interval
                
                # Add maintenance entry to the interval tree
                if entry.StandName in self.stand_occupancy_log:
                    self.stand_occupancy_log[entry.StandName].add(
                        Interval(start_timestamp, end_timestamp, {'type': 'maintenance', 'entry': entry})
                    )
        
        # Reports for allocated and unallocated flights
        self.allocated_flights_report = []
        self.unallocated_flights_report = []
        
        # Track allocation decisions for flights (FlightID -> StandName)
        self.flight_allocations = {}
        
        # Track terminals for connecting flights
        self.flight_terminals = {}  # FlightID -> Terminal
        
        if self.verbose:
            print(f"Allocation engine initialized with {len(flights)} flights and {len(stands)} stands")
            
    def _datetime_to_timestamp(self, dt):
        """
        Convert datetime to a unique timestamp that preserves date information
        
        Parameters:
        - dt: datetime object
        
        Returns:
        - Integer timestamp that uniquely identifies the datetime
        """
        # Calculate minutes since the earliest flight time
        if dt.year == 1900 and dt.month == 1 and dt.day == 1:
            # For simple time objects (no date info), use hours and minutes
            # Add a base day value to ensure all timestamps are positive and sequential
            # Day 0 = midnight to 23:59, Day 1 = midnight to 23:59 of next day, etc.
            day_part = 0  # Assume all times are on the same day if no date specified
            time_part = dt.hour * 60 + dt.minute
        else:
            # For full datetime objects, calculate days difference from a reference date
            ref_date = self.earliest_time.date()
            if ref_date.year == 1900:  # If earliest is also a simple time
                ref_date = datetime(2000, 1, 1).date()
                
            day_part = (dt.date() - ref_date).days
            time_part = dt.hour * 60 + dt.minute
        
        # Combine day and time parts (day part * minutes in a day + minutes since midnight)
        return (day_part * 24 * 60) + time_part
    
    def _datetime_to_seconds(self, dt):
        """
        Legacy method maintained for compatibility
        Convert datetime to integer seconds since midnight for interval tree
        
        Parameters:
        - dt: datetime object
        
        Returns:
        - Integer representing seconds since midnight
        """
        return self._datetime_to_timestamp(dt)
    
    def run_allocation(self):
        """
        Run the stand allocation algorithm
        
        Returns:
        - Tuple of (allocated_flights_report, unallocated_flights_report)
        """
        # Check if we should use the CP solver
        use_solver = self.settings.solver_parameters.get("use_solver", False)
        
        # For very large problems (>25k flights), automatically use greedy algorithm
        # unless explicitly specified to use the solver
        auto_use_greedy = len(self.flights) > 25000 and not self.settings.solver_parameters.get("force_solver", False)
        
        if auto_use_greedy and use_solver:
            if self.verbose:
                print(f"Problem size ({len(self.flights)} flights) exceeds threshold for CP solver.")
                print("Automatically using greedy algorithm for better performance.")
                print("Set 'force_solver' to true in settings to override this behavior.")
            use_solver = False
        
        if use_solver:
            try:
                # Import the CP solver at runtime to avoid import errors if OR-Tools is not installed
                from cp_solver import StandAllocationCPSolver
                import time
                import logging
                
                # Configure logging
                logging_level = logging.INFO if self.verbose else logging.WARNING
                logging.basicConfig(level=logging_level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
                logger = logging.getLogger('stand_allocation_engine')
                
                # Create and run the CP solver
                if self.verbose:
                    print("Using CP solver for allocation...")
                start_time = time.time()
                
                try:
                    cp_solver = StandAllocationCPSolver(
                        self.flights, self.stands, self.airlines, self.settings, 
                        self.maintenance_tracker, self.ai_support, verbose=self.verbose
                    )
                    solver_allocated_report, solver_unallocated_report = cp_solver.solve()
                    
                    if solver_allocated_report:  # If the solver found a solution
                        # Return the solution
                        self.allocated_flights_report = solver_allocated_report
                        self.unallocated_flights_report = solver_unallocated_report
                        
                        if self.verbose:
                            end_time = time.time()
                            time_diff = end_time - start_time
                            print(f"CP solver completed in {time_diff:.2f} seconds")
                            print(f"Allocated {len(solver_allocated_report)} flights, Unallocated {len(solver_unallocated_report)} flights")
                        
                        return solver_allocated_report, solver_unallocated_report
                    else:
                        if self.verbose:
                            print("CP solver could not find a solution. Falling back to greedy algorithm.")
                except Exception as e:
                    import traceback
                    print(f"Error using CP solver: {str(e)}. Falling back to greedy algorithm.")
                    if self.verbose:
                        print("Detailed error:")
                        traceback.print_exc()
            
            except Exception as e:
                # Log the error and fall back to the greedy algorithm
                if self.verbose:
                    print(f"Error using CP solver: {str(e)}. Falling back to greedy algorithm.")
        elif self.verbose:
            print("Using greedy algorithm for allocation...")
        
        # Fall back to the greedy algorithm if the CP solver was not used or failed
        return self._run_greedy_allocation()
        
    def _run_greedy_allocation(self):
        """
        Run the greedy stand allocation algorithm (original algorithm)
        
        Returns:
        - Tuple of (allocated_flights_report, unallocated_flights_report)
        """
        # Step 1: Prepare flight processing order
        if self.verbose:
            print("Preparing flight processing order...")
        flight_units = self._prepare_flight_processing_order()
        
        if self.verbose:
            print(f"Processing {len(flight_units)} flight operations...")
            # Use tqdm for progress bar
            flight_units_iter = tqdm(flight_units, desc="Allocating flights", unit="flights")
        else:
            flight_units_iter = flight_units
        
        # Step 2: Process each flight unit
        for unit in flight_units_iter:
            # If this is a linked arrival/departure pair
            if unit.is_linked_pair:
                flight = unit.arrival  # Start with the arrival
                airline = self._get_airline(flight.AirlineCode)
                
                # Calculate stand occupancy duration for the linked pair
                start_time, end_time = self._calculate_stand_occupancy_duration(unit)
                
                # Identify candidate stands
                candidate_stands = self._identify_candidate_stands(flight, airline)
                
                # Check each candidate stand for availability
                stand_found = False
                for stand in candidate_stands:
                    if self._check_stand_availability(stand.StandName, start_time, end_time):
                        # Allocate the stand to both flights in the linked pair
                        self._allocate_stand_to_flight(stand, unit.arrival, unit.departure, start_time, end_time)
                        stand_found = True
                        break
                
                if not stand_found:
                    # Could not allocate the linked pair
                    reason = "No suitable stand available for linked pair"
                    self.unallocated_flights_report.append({
                        'flight': unit.arrival,
                        'reason': reason
                    })
                    self.ai_support.log_unallocated_flight(unit.arrival, reason)
                    
                    # Also log the departure as unallocated
                    self.unallocated_flights_report.append({
                        'flight': unit.departure,
                        'reason': reason
                    })
            
            # If this is a single flight (arrival or departure)
            else:
                flight = unit.arrival if unit.arrival else unit.departure
                airline = self._get_airline(flight.AirlineCode)
                
                # Calculate stand occupancy duration for the single flight
                start_time, end_time = self._calculate_stand_occupancy_duration(unit)
                
                # Identify candidate stands
                candidate_stands = self._identify_candidate_stands(flight, airline)
                
                # Check each candidate stand for availability
                stand_found = False
                for stand in candidate_stands:
                    if self._check_stand_availability(stand.StandName, start_time, end_time):
                        # Allocate the stand to the flight
                        self._allocate_stand_to_flight(stand, flight, None, start_time, end_time)
                        stand_found = True
                        break
                
                if not stand_found:
                    # Could not allocate the flight
                    reason = "No suitable stand available"
                    self.unallocated_flights_report.append({
                        'flight': flight,
                        'reason': reason
                    })
                    self.ai_support.log_unallocated_flight(flight, reason)
        
        if self.verbose:
            print(f"Allocation complete: {len(self.allocated_flights_report)} allocated, {len(self.unallocated_flights_report)} unallocated")
        
        return self.allocated_flights_report, self.unallocated_flights_report
    
    def _calculate_criticality_score(self, flight_unit):
        """
        Calculate a comprehensive criticality score for a flight operation unit
        
        Parameters:
        - flight_unit: FlightOperationUnit object
        
        Returns:
        - Float representing the criticality score
        """
        flight = flight_unit.arrival if flight_unit.arrival else flight_unit.departure
        airline = self._get_airline(flight.AirlineCode)
        weights = self.settings.prioritization_weights
        score = 0.0
        
        # Start with base score from flight
        score += flight.base_priority_score * weights.get("base_score", 1.0)
        
        # Add score based on aircraft type
        aircraft_type = flight.AircraftType
        if "A380" in aircraft_type:
            score += weights.get("aircraft_type_A380", 10.0)
        elif "B747" in aircraft_type:
            score += weights.get("aircraft_type_B747", 8.0)
        elif any(wide in aircraft_type for wide in ["B777", "B787", "A330", "A350"]):
            score += weights.get("aircraft_type_wide", 5.0)
        
        # Add score for airline priority tier
        if airline:
            score += airline.priority_tier * weights.get("airline_tier", 2.0)
            
            # Add score for contact stand requirement
            if airline.RequiresContactStand:
                score += weights.get("requires_contact_stand", 3.0)
        
        # Add score for critical connections
        if flight.is_critical_connection:
            score += weights.get("critical_connection", 5.0)
        
        # Update the flight criticality score directly
        flight.criticality_score = score
        
        return score
        
    def _prepare_flight_processing_order(self):
        """
        Prepare the order in which flights will be processed
        - Group linked arrivals and departures
        - Calculate criticality scores
        - Sort by criticality and chronological order
        
        Returns:
        - List of FlightOperationUnit objects
        """
        # Step 1: Group flights by LinkID
        flights_by_link_id = {}
        single_flights = []
        
        for flight in self.flights:
            if flight.LinkID:
                if flight.LinkID not in flights_by_link_id:
                    flights_by_link_id[flight.LinkID] = []
                flights_by_link_id[flight.LinkID].append(flight)
            else:
                single_flights.append(flight)
        
        # Step 2: Create FlightOperationUnits
        flight_units = []
        
        # Create units for linked flights
        for link_id, linked_flights in flights_by_link_id.items():
            arrival = None
            departure = None
            
            for flight in linked_flights:
                if flight.IsArrival:
                    arrival = flight
                else:
                    departure = flight
            
            # If we have both arrival and departure, create a linked pair
            if arrival and departure:
                flight_units.append(FlightOperationUnit(arrival=arrival, departure=departure))
            # If we only have one of them, treat it as a single flight
            elif arrival:
                flight_units.append(FlightOperationUnit(arrival=arrival))
            elif departure:
                flight_units.append(FlightOperationUnit(departure=departure))
        
        # Create units for single flights
        for flight in single_flights:
            if flight.IsArrival:
                flight_units.append(FlightOperationUnit(arrival=flight))
            else:
                flight_units.append(FlightOperationUnit(departure=flight))
        
        # Step 3: Calculate criticality scores for all units
        for unit in flight_units:
            self._calculate_criticality_score(unit)
        
        # Step 4: Sort units by criticality score (descending) and then by time (ascending)
        def sort_key(unit):
            # Get the primary flight
            flight = unit.arrival if unit.arrival else unit.departure
            # Return as tuple: (negative criticality score for descending order, time for ascending order)
            return (-flight.criticality_score, unit.earliest_time)
        
        flight_units.sort(key=sort_key)
        
        return flight_units
    
    def _calculate_stand_occupancy_duration(self, flight_unit):
        """
        Calculate the start and end times for stand occupancy
        
        Parameters:
        - flight_unit: FlightOperationUnit object
        
        Returns:
        - Tuple of (start_time, end_time) as datetime objects
        """
        if flight_unit.is_linked_pair:
            # For linked pairs, use the arrival time as start and departure time as end
            start_time = flight_unit.arrival.parsed_time
            end_time = flight_unit.departure.parsed_time
            
            # Handle overnight stays by checking if end_time is before start_time
            if end_time <= start_time:
                # Calculate the proper time difference using our helper function
                time_diff = calculate_time_difference_minutes(start_time, end_time)
                
                # If the dates aren't specified explicitly (legacy format)
                if start_time.date() == end_time.date() == datetime(1900, 1, 1).date():
                    # It's a legacy time-only format, assume next day for end_time
                    end_time = end_time + timedelta(days=1)
            
            return start_time, end_time
        
        elif flight_unit.arrival:
            # For arrivals, use the turnaround time from settings
            flight = flight_unit.arrival
            start_time = flight.parsed_time
            
            # Determine aircraft category for turnaround time lookup
            aircraft_category = self._get_aircraft_category(flight.AircraftType)
            
            # Get turnaround time from settings
            turnaround_minutes = self.settings.TurnaroundTimeSettings.get(
                aircraft_category,
                self.settings.TurnaroundTimeSettings.get("Default", 45)
            )
            
            end_time = start_time + timedelta(minutes=turnaround_minutes)
            return start_time, end_time
            
        else:  # departure
            # For departures, assume a standard preparation time before departure
            flight = flight_unit.departure
            end_time = flight.parsed_time
            
            # Determine aircraft category for turnaround time lookup
            aircraft_category = self._get_aircraft_category(flight.AircraftType)
            
            # Get turnaround time from settings
            turnaround_minutes = self.settings.TurnaroundTimeSettings.get(
                aircraft_category,
                self.settings.TurnaroundTimeSettings.get("Default", 45)
            )
            
            start_time = end_time - timedelta(minutes=turnaround_minutes)
            return start_time, end_time
    
    def _get_aircraft_category(self, aircraft_type):
        """
        Map an aircraft type to a size category
        
        Parameters:
        - aircraft_type: String representing the aircraft type
        
        Returns:
        - String representing the aircraft category ("Narrow", "Wide", "Super")
        """
        # This is a simplified implementation for the prototype
        # In a real system, this would be a comprehensive lookup table
        narrow_types = ["A320", "B737", "E190", "CRJ", "A220", "B717", "A319"]
        wide_types = ["B777", "B787", "A330", "A350", "B767", "B757"]
        super_types = ["A380", "B747", "AN225"]
        
        for narrow in narrow_types:
            if narrow in aircraft_type:
                return "Narrow"
        
        for wide in wide_types:
            if wide in aircraft_type:
                return "Wide"
        
        for super_type in super_types:
            if super_type in aircraft_type:
                return "Super"
        
        # Default to "Narrow" if unknown
        return "Narrow"
    
    def _is_aircraft_compatible(self, aircraft_type, stand_size_limit):
        """
        Check if an aircraft is compatible with a stand's size limit
        
        Parameters:
        - aircraft_type: String representing the aircraft type
        - stand_size_limit: String representing the stand's size limit
        
        Returns:
        - Boolean indicating if the aircraft is compatible with the stand
        """
        aircraft_category = self._get_aircraft_category(aircraft_type)
        
        # Size compatibility matrix
        compatibility = {
            "Narrow": ["Narrow", "Wide", "Super"],  # Narrow aircraft can use any stand
            "Wide": ["Wide", "Super"],             # Wide aircraft can use Wide or Super stands
            "Super": ["Super"]                     # Super aircraft can only use Super stands
        }
        
        return stand_size_limit in compatibility.get(aircraft_category, [])
    
    def _identify_candidate_stands(self, flight, airline):
        """
        Identify candidate stands for a flight
        
        Parameters:
        - flight: Flight object
        - airline: Airline object
        
        Returns:
        - List of Stand objects that are candidates for the flight
        """
        candidates = []
        
        # Basic compatibility checks
        for stand in self.stands:
            # Check terminal compatibility (airline base terminal)
            if airline and airline.BaseTerminal != stand.Terminal:
                continue
            
            # Check aircraft size compatibility
            if not self._is_aircraft_compatible(flight.AircraftType, stand.SizeLimit):
                continue
            
            # Check contact stand requirement
            if airline and airline.RequiresContactStand and not stand.IsContactStand:
                continue
            
            # Check adjacency rules
            if not self._passes_adjacency_rules(stand):
                continue
            
            candidates.append(stand)
        
        # Check for any connecting flights and their terminal allocations
        connecting_flight_terminals = self._get_connecting_flight_terminals(flight)
        
        if connecting_flight_terminals:
            # Score candidates based on terminal proximity
            scored_candidates = []
            
            for stand in candidates:
                # Calculate a score based on terminal proximity
                score = self._calculate_terminal_proximity_score(stand.Terminal, connecting_flight_terminals)
                scored_candidates.append((stand, score))
            
            # Sort candidates by score (higher is better)
            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            
            # Return stands in order of score
            return [stand for stand, _ in scored_candidates]
        
        return candidates
    
    def _get_connecting_flight_terminals(self, flight):
        """
        Find terminals of flights that connect with this flight
        
        Parameters:
        - flight: Flight object
        
        Returns:
        - List of terminals for connected flights
        """
        connecting_terminals = []
        
        if not self.connection_tracker:
            return connecting_terminals
        
        # For arrivals, look for departures that passengers may connect to
        if flight.IsArrival:
            for potential_departure in self.flights:
                if (not potential_departure.IsArrival and 
                    self.connection_tracker.is_valid_connection_time(flight, potential_departure)):
                    # Check if the departure has already been allocated
                    if potential_departure.FlightID in self.flight_terminals:
                        connecting_terminals.append(self.flight_terminals[potential_departure.FlightID])
        
        # For departures, look for arrivals that passengers may connect from
        else:
            for potential_arrival in self.flights:
                if (potential_arrival.IsArrival and 
                    self.connection_tracker.is_valid_connection_time(potential_arrival, flight)):
                    # Check if the arrival has already been allocated
                    if potential_arrival.FlightID in self.flight_terminals:
                        connecting_terminals.append(self.flight_terminals[potential_arrival.FlightID])
        
        return connecting_terminals
    
    def _calculate_terminal_proximity_score(self, stand_terminal, connecting_terminals):
        """
        Calculate a score for a stand based on proximity to connecting flight terminals
        
        Parameters:
        - stand_terminal: Terminal of the candidate stand
        - connecting_terminals: List of terminals for connecting flights
        
        Returns:
        - Score (higher is better)
        """
        if not connecting_terminals:
            return 0
        
        # Count matching terminals (same terminal is best for connections)
        matching_terminals = sum(1 for terminal in connecting_terminals if terminal == stand_terminal)
        
        # Calculate percentage of matching terminals
        return matching_terminals / len(connecting_terminals) * 100
    
    def _passes_adjacency_rules(self, stand):
        """
        Check if a stand passes adjacency rules
        
        Parameters:
        - stand: Stand object
        
        Returns:
        - Boolean indicating if the stand passes adjacency rules
        """
        # Placeholder for future implementation
        # In a real system, this would check for conflicting adjacency rules
        return True
    
    def _check_stand_availability(self, stand_name, query_start_time, query_end_time):
        """
        Check if a stand is available during the specified time period using interval tree
        
        Parameters:
        - stand_name: Name of the stand to check
        - query_start_time: Start time of the period to check
        - query_end_time: End time of the period to check
        
        Returns:
        - Boolean indicating if the stand is available
        """
        # Convert times to timestamp for interval tree
        start_timestamp = self._datetime_to_timestamp(query_start_time)
        end_timestamp = self._datetime_to_timestamp(query_end_time)
        
        # Ensure end time is greater than start time
        if end_timestamp <= start_timestamp:
            # If dates are specified, calculate actual difference
            if query_start_time.year != 1900 or query_end_time.year != 1900:
                # Calculate actual minutes between times
                minutes_diff = calculate_time_difference_minutes(query_start_time, query_end_time)
                end_timestamp = start_timestamp + minutes_diff
            else:
                # Add 24 hours (in minutes) to end time for legacy format
                end_timestamp = start_timestamp + (24 * 60)
        
        # Calculate gap in seconds
        gap_seconds = self.settings.GapBetweenFlights * 60
        
        # Expand the query interval to include required gap between flights
        expanded_start = start_timestamp - gap_seconds
        expanded_end = end_timestamp + gap_seconds
        
        # Check for any overlapping intervals in the stand's interval tree
        if stand_name in self.stand_occupancy_log:
            overlaps = self.stand_occupancy_log[stand_name].overlap(expanded_start, expanded_end)
            return len(list(overlaps)) == 0
        
        return True
    
    def _allocate_stand_to_flight(self, stand, arrival_flight, departure_flight, start_time, end_time):
        """
        Allocate a stand to a flight (or linked pair) using interval tree
        
        Parameters:
        - stand: Stand object
        - arrival_flight: Arrival Flight object (or None)
        - departure_flight: Departure Flight object (or None)
        - start_time: Start time of the allocation
        - end_time: End time of the allocation
        """
        # Convert times to timestamp for interval tree
        start_timestamp = self._datetime_to_timestamp(start_time)
        end_timestamp = self._datetime_to_timestamp(end_time)
        
        # Ensure end time is greater than start time
        if end_timestamp <= start_timestamp:
            # If dates are specified, calculate actual difference
            if start_time.year != 1900 or end_time.year != 1900:
                # Calculate actual minutes between times
                minutes_diff = calculate_time_difference_minutes(start_time, end_time)
                end_timestamp = start_timestamp + minutes_diff
            else:
                # Add 24 hours (in minutes) to end time for legacy format
                end_timestamp = start_timestamp + (24 * 60)
        
        # Determine the primary flight (arrival or departure)
        flight = arrival_flight or departure_flight
        
        # Add the allocation to the stand's interval tree
        self.stand_occupancy_log[stand.StandName].add(
            Interval(start_timestamp, end_timestamp, {
                'type': 'flight',
                'flight': flight,
                'arrival': arrival_flight,
                'departure': departure_flight
            })
        )
        
        # Track the allocation decision for each flight
        if arrival_flight:
            self.flight_allocations[arrival_flight.FlightID] = stand.StandName
            self.flight_terminals[arrival_flight.FlightID] = stand.Terminal
            
        if departure_flight:
            self.flight_allocations[departure_flight.FlightID] = stand.StandName
            self.flight_terminals[departure_flight.FlightID] = stand.Terminal
        
        # Format times for report, including date if present
        if hasattr(start_time, 'date') and start_time.date() != datetime(1900, 1, 1).date():
            start_time_str = start_time.strftime("%Y-%m-%d %H:%M")
        else:
            start_time_str = start_time.strftime("%H:%M")
            
        if hasattr(end_time, 'date') and end_time.date() != datetime(1900, 1, 1).date():
            end_time_str = end_time.strftime("%Y-%m-%d %H:%M")
        else:
            end_time_str = end_time.strftime("%H:%M")
        
        # Add to the allocated flights report
        allocation = {
            'flight': flight,
            'stand': stand,
            'start_time': start_time_str,
            'end_time': end_time_str
        }
        
        self.allocated_flights_report.append(allocation)
        
        # If this is a linked pair, add the departure to the allocated flights report too
        if arrival_flight and departure_flight:
            # Format arrival time
            if hasattr(arrival_flight.parsed_time, 'date') and arrival_flight.parsed_time.date() != datetime(1900, 1, 1).date():
                arrival_time_str = arrival_flight.parsed_time.strftime("%Y-%m-%d %H:%M")
            else:
                arrival_time_str = arrival_flight.parsed_time.strftime("%H:%M")
                
            # Format departure time
            if hasattr(departure_flight.parsed_time, 'date') and departure_flight.parsed_time.date() != datetime(1900, 1, 1).date():
                departure_time_str = departure_flight.parsed_time.strftime("%Y-%m-%d %H:%M")
            else:
                departure_time_str = departure_flight.parsed_time.strftime("%H:%M")
            
            self.allocated_flights_report.append({
                'flight': departure_flight,
                'stand': stand,
                'start_time': arrival_time_str,
                'end_time': departure_time_str
            })
    
    def _get_airline(self, airline_code):
        """
        Get the Airline object for an airline code
        
        Parameters:
        - airline_code: Airline code string
        
        Returns:
        - Airline object or None if not found
        """
        return self.airline_map.get(airline_code, None) 