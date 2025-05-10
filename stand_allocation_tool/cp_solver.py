"""
Constraint Programming (CP) Solver for Stand Allocation
Uses Google OR-Tools CP-SAT solver to optimize stand allocation
"""

from ortools.sat.python import cp_model
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging
import time
import sys
try:
    from tqdm import tqdm
except ImportError:
    # Fallback if tqdm is not installed
    tqdm = lambda x, **kwargs: x

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('cp_solver')

class SolutionCallback(cp_model.CpSolverSolutionCallback):
    """
    Custom solution callback to display progress during the solving process
    """
    
    def __init__(self, flight_allocated_vars, total_flights, verbose, display_interval=2.0):
        """
        Initialize the callback
        
        Parameters:
        - flight_allocated_vars: Dict of flight_idx -> Boolean variable indicating if flight is allocated
        - total_flights: Total number of flights being processed
        - verbose: Whether to display progress updates
        - display_interval: How often to display progress (in seconds)
        """
        cp_model.CpSolverSolutionCallback.__init__(self)
        self._flight_allocated_vars = flight_allocated_vars
        self._total_flights = total_flights
        self._verbose = verbose
        self._display_interval = display_interval
        self._start_time = time.time()
        self._last_display_time = self._start_time
        self._solution_count = 0
        self._best_objective = None
        self._progress_bar = None
        
        # Initialize progress bar if verbose
        if self._verbose:
            self._progress_bar = tqdm(total=total_flights, desc="CP solver allocation", 
                                     unit="flights", leave=True)
            self._last_allocated_count = 0
        
    def on_solution_callback(self):
        """
        Called when a new solution is found
        """
        current_time = time.time()
        self._solution_count += 1
        
        # Calculate allocated flights
        allocated_count = sum(1 for idx in self._flight_allocated_vars if self.Value(self._flight_allocated_vars[idx]))
        objective = self.ObjectiveValue()
        
        if self._best_objective is None or objective > self._best_objective:
            self._best_objective = objective
        
        # Display progress updates at regular intervals or on every new solution if requested
        display_now = (current_time - self._last_display_time >= self._display_interval)
        
        if self._verbose and display_now:
            if self._progress_bar:
                # Update the progress bar with the new allocated count
                progress_diff = allocated_count - self._last_allocated_count
                if progress_diff > 0:
                    self._progress_bar.update(progress_diff)
                
                # Update progress bar description with solution info
                elapsed_time = current_time - self._start_time
                percentage = (allocated_count / self._total_flights) * 100
                self._progress_bar.set_postfix_str(
                    f"Solution #{self._solution_count} - {percentage:.1f}% - Time: {elapsed_time:.1f}s"
                )
                
                self._last_allocated_count = allocated_count
            else:
                # Fallback to print if progress bar couldn't be created
                elapsed_time = current_time - self._start_time
                percentage = (allocated_count / self._total_flights) * 100
                print(f"\rCP solver progress: {allocated_count}/{self._total_flights} flights allocated ({percentage:.1f}%) - "
                    f"Solution #{self._solution_count} - Time: {elapsed_time:.1f}s", end="", flush=True)
            
            self._last_display_time = current_time
            
    def solution_count(self):
        """
        Return the number of solutions found
        """
        return self._solution_count
        
    def close(self):
        """
        Close the progress bar properly
        """
        if self._progress_bar:
            self._progress_bar.close()

class StandAllocationCPSolver:
    """
    CP solver implementation for stand allocation optimization
    """
    
    def __init__(self, flights, stands, airlines, settings, maintenance_tracker, ai_support, verbose=False):
        """
        Initialize the CP solver
        
        Parameters:
        - flights: List of Flight objects
        - stands: List of Stand objects
        - airlines: List of Airline objects
        - settings: Settings object
        - maintenance_tracker: MockMaintenanceTracker object
        - ai_support: MockAISupport object
        - verbose: Whether to show detailed progress information
        """
        self.flights = flights
        self.stands = stands
        self.airlines = airlines
        self.settings = settings
        self.maintenance_tracker = maintenance_tracker
        self.ai_support = ai_support
        self.airline_map = {airline.AirlineCode: airline for airline in airlines}
        self.verbose = verbose
        
        # Constants for the CP model
        self.UNALLOCATED_STAND = -1  # Special value for unallocated flights
        
        # Calculate the time horizon dynamically based on the flight data
        self.calculate_time_horizon()
        
        # Convert datetime objects to minutes since epoch
        self.flights_data = []
        
        if self.verbose:
            print(f"Preparing data for {len(flights)} flights and {len(stands)} stands...")
            
        self.prepare_flights_data()
        
        # Map stands to indices for the CP model
        self.stand_indices = {stand.StandName: idx for idx, stand in enumerate(stands)}
        
        # Map flights to indices for the CP model
        self.flight_indices = {flight.FlightID: idx for idx, flight in enumerate(flights)}
        
        # For retrieving linked flight pairs
        self.link_id_to_flights = {}
        for flight in flights:
            if flight.LinkID:
                if flight.LinkID not in self.link_id_to_flights:
                    self.link_id_to_flights[flight.LinkID] = []
                self.link_id_to_flights[flight.LinkID].append(flight)
                
        if self.verbose:
            print(f"CP solver initialization complete")
    
    def calculate_time_horizon(self):
        """
        Calculate the time horizon dynamically based on flight data
        """
        # Get all flight times
        all_times = [flight.parsed_time for flight in self.flights]
        
        if not all_times:
            # Default to a year if no flights (should never happen)
            self.time_horizon = 365 * 24 * 60  # Minutes in a year
            self.earliest_time = datetime(2000, 1, 1)
            self.latest_time = datetime(2001, 1, 1)
            return
        
        # Find the earliest and latest flight times
        self.earliest_time = min(all_times)
        self.latest_time = max(all_times)
        
        # Handle legacy time format (no date)
        if self.earliest_time.year == 1900 and self.latest_time.year == 1900:
            # For time-only format, assume a 24-hour period + buffer
            self.time_horizon = 24 * 60 * 2  # Two days worth of minutes as buffer
            logger.info(f"Using default time horizon for time-only data: {self.time_horizon} minutes")
            return
        
        # Calculate the time difference in minutes
        time_diff = (self.latest_time - self.earliest_time).total_seconds() / 60
        
        # Add a buffer (30 days worth of minutes)
        buffer = 30 * 24 * 60
        self.time_horizon = int(time_diff + buffer)
        
        logger.info(f"Calculated time horizon: {self.time_horizon} minutes")
        logger.info(f"Date range: {self.earliest_time.strftime('%Y-%m-%d')} to {self.latest_time.strftime('%Y-%m-%d')}")
    
    def _datetime_to_minutes(self, dt):
        """
        Convert a datetime to minutes since a reference point
        
        Parameters:
        - dt: datetime object
        
        Returns:
        - Integer representing minutes since reference
        """
        # For simple time objects (no date info)
        if dt.year == 1900 and dt.month == 1 and dt.day == 1:
            # Return minutes since midnight
            return dt.hour * 60 + dt.minute
        else:
            # Return minutes since the earliest date
            # Calculate minutes since reference date
            days_diff = (dt.date() - self.earliest_time.date()).days
            minutes_diff = days_diff * 24 * 60 + dt.hour * 60 + dt.minute
            return minutes_diff
    
    def prepare_flights_data(self):
        """
        Convert flight data into a format suitable for the CP model
        """
        if self.verbose:
            flights_pbar = tqdm(self.flights, desc="Preparing flight data", unit="flights")
            flight_iter = flights_pbar
        else:
            flight_iter = self.flights
            
        for flight in flight_iter:
            # Convert parsed_time to minutes since reference point
            minutes = self._datetime_to_minutes(flight.parsed_time)
            
            # Get aircraft category
            aircraft_category = self._get_aircraft_category(flight.AircraftType)
            
            # Get compatible stands
            compatible_stands = []
            airline = self.airline_map.get(flight.AirlineCode)
            for stand_idx, stand in enumerate(self.stands):
                # Check terminal compatibility
                if airline and airline.BaseTerminal != stand.Terminal:
                    continue
                
                # Check aircraft size compatibility
                if not self._is_aircraft_compatible(flight.AircraftType, stand.SizeLimit):
                    continue
                
                # Check contact stand requirement
                if airline and airline.RequiresContactStand and not stand.IsContactStand:
                    continue
                
                compatible_stands.append(stand_idx)
            
            # Calculate default duration (for single flights)
            turnaround_minutes = self.settings.TurnaroundTimeSettings.get(
                aircraft_category, self.settings.TurnaroundTimeSettings.get("Default", 45)
            )
            
            # Store the flight data
            self.flights_data.append({
                "flight": flight,
                "minutes": minutes,
                "aircraft_category": aircraft_category,
                "compatible_stands": compatible_stands,
                "turnaround_minutes": turnaround_minutes,
                "airline": airline
            })
    
    def _get_aircraft_category(self, aircraft_type):
        """
        Map an aircraft type to a size category (same as in StandAllocationEngine)
        """
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
        Check if an aircraft is compatible with a stand's size limit (same as in StandAllocationEngine)
        """
        aircraft_category = self._get_aircraft_category(aircraft_type)
        
        # Size compatibility matrix
        compatibility = {
            "Narrow": ["Narrow", "Wide", "Super"],  # Narrow aircraft can use any stand
            "Wide": ["Wide", "Super"],             # Wide aircraft can use Wide or Super stands
            "Super": ["Super"]                     # Super aircraft can only use Super stands
        }
        
        return stand_size_limit in compatibility.get(aircraft_category, [])
    
    def _get_maintenance_intervals(self):
        """
        Get all maintenance intervals as (stand_idx, start_time, end_time) tuples
        """
        maintenance_intervals = []
        
        if hasattr(self.maintenance_tracker, 'maintenance_schedules'):
            for entry in self.maintenance_tracker.maintenance_schedules:
                if entry.StandName in self.stand_indices:
                    stand_idx = self.stand_indices[entry.StandName]
                    
                    # Convert maintenance times to minutes since reference
                    start_minutes = self._datetime_to_minutes(entry.parsed_start_time)
                    end_minutes = self._datetime_to_minutes(entry.parsed_end_time)
                    
                    # Handle overnight maintenance (only for legacy time format)
                    if entry.parsed_start_time.year == 1900 and entry.parsed_end_time.year == 1900:
                        if end_minutes <= start_minutes:
                            end_minutes += 24 * 60  # Add a day
                    
                    maintenance_intervals.append((stand_idx, start_minutes, end_minutes))
        
        return maintenance_intervals
    
    def solve(self):
        """
        Create and solve the CP model for stand allocation
        
        Returns:
        - Tuple of (allocated_flights_report, unallocated_flights_report)
        """
        allocated_flights_report = []
        unallocated_flights_report = []
        
        # Get timing parameters from settings
        time_limit = self.settings.solver_parameters.get("solver_time_limit_seconds", 30)
        
        # Get gap between flights in minutes
        gap_between_flights = self.settings.GapBetweenFlights
        
        if self.verbose:
            print(f"Creating constraint programming model for {len(self.flights)} flights and {len(self.stands)} stands...")
            model_start_time = time.time()
            
        # Create the CP model
        model = cp_model.CpModel()
        
        # Create variables for stand assignment and time intervals
        flight_stand_vars = {}  # flight_idx -> stand_idx variable
        flight_start_vars = {}  # flight_idx -> start_time variable
        flight_end_vars = {}   # flight_idx -> end_time variable
        
        # Get maintenance intervals
        maintenance_intervals = self._get_maintenance_intervals()
        
        # Create variables and initial constraints
        for flight_idx, flight_data in enumerate(self.flights_data):
            flight = flight_data["flight"]
            
            # Create stand assignment variable
            # Domain is compatible stands plus UNALLOCATED_STAND
            stand_var = model.NewIntVar(
                self.UNALLOCATED_STAND, 
                len(self.stands) - 1, 
                f'stand_{flight.FlightID}'
            )
            flight_stand_vars[flight_idx] = stand_var
            
            # Add constraint: stand must be compatible or UNALLOCATED_STAND
            compatible_stands = flight_data["compatible_stands"] + [self.UNALLOCATED_STAND]
            
            # For each value, create a Boolean constraint
            for value in range(self.UNALLOCATED_STAND, len(self.stands)):
                if value not in compatible_stands:
                    # If a value is not in compatible_stands, add constraint that stand_var != value
                    model.Add(stand_var != value)
            
            # For arrival and departure times
            is_arrival = flight.IsArrival
            scheduled_minutes = flight_data["minutes"]
            
            if is_arrival:
                # For arrivals, start time is fixed at scheduled time
                start_var = model.NewConstant(scheduled_minutes)
                # End time can vary based on turnaround or linked departure
                end_var = model.NewIntVar(
                    scheduled_minutes, 
                    scheduled_minutes + self.time_horizon, 
                    f'end_{flight.FlightID}'
                )
            else:  # departure
                # For departures, end time is fixed at scheduled time
                end_var = model.NewConstant(scheduled_minutes)
                # Start time can vary based on turnaround or linked arrival
                start_var = model.NewIntVar(
                    0, 
                    scheduled_minutes, 
                    f'start_{flight.FlightID}'
                )
            
            flight_start_vars[flight_idx] = start_var
            flight_end_vars[flight_idx] = end_var
            
            # Add constraint: minimum duration for stand occupation based on turnaround time
            if not flight.LinkID:  # Only for single flights, linked pairs handled separately
                turnaround_minutes = flight_data["turnaround_minutes"]
                # Only enforce this constraint if the flight is allocated
                b = model.NewBoolVar(f'enforce_turnaround_{flight_idx}')
                model.Add(stand_var != self.UNALLOCATED_STAND).OnlyEnforceIf(b)
                model.Add(stand_var == self.UNALLOCATED_STAND).OnlyEnforceIf(b.Not())
                model.Add(end_var - start_var >= turnaround_minutes).OnlyEnforceIf(b)
        
        # Progress update for model creation
        if self.verbose:
            print(f"Adding constraints for {len(self.link_id_to_flights)} linked flight pairs...")
            
        # Add constraints for linked flights
        for link_id, linked_flights in self.link_id_to_flights.items():
            if len(linked_flights) == 2:
                arrival = next((f for f in linked_flights if f.IsArrival), None)
                departure = next((f for f in linked_flights if not f.IsArrival), None)
                
                if arrival and departure:
                    arrival_idx = self.flight_indices[arrival.FlightID]
                    departure_idx = self.flight_indices[departure.FlightID]
                    
                    # 1. Same stand constraint (only if both are allocated)
                    b_same_stand = model.NewBoolVar(f'linked_same_stand_{link_id}')
                    model.Add(flight_stand_vars[arrival_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_same_stand)
                    model.Add(flight_stand_vars[departure_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_same_stand)
                    model.Add(flight_stand_vars[arrival_idx] == flight_stand_vars[departure_idx]).OnlyEnforceIf(b_same_stand)
                    
                    # 2. If one is allocated, both must be allocated
                    b_arrival_allocated = model.NewBoolVar(f'arrival_allocated_{link_id}')
                    b_departure_allocated = model.NewBoolVar(f'departure_allocated_{link_id}')
                    
                    model.Add(flight_stand_vars[arrival_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_arrival_allocated)
                    model.Add(flight_stand_vars[arrival_idx] == self.UNALLOCATED_STAND).OnlyEnforceIf(b_arrival_allocated.Not())
                    
                    model.Add(flight_stand_vars[departure_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_departure_allocated)
                    model.Add(flight_stand_vars[departure_idx] == self.UNALLOCATED_STAND).OnlyEnforceIf(b_departure_allocated.Not())
                    
                    # Use AddBoolOr to implement implications
                    model.AddBoolOr([b_arrival_allocated.Not(), b_departure_allocated])
                    model.AddBoolOr([b_departure_allocated.Not(), b_arrival_allocated])
                    
                    # 3. Linked flights timing constraint (if both are allocated)
                    b_linked_timing = model.NewBoolVar(f'linked_timing_{link_id}')
                    model.Add(flight_stand_vars[arrival_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_linked_timing)
                    model.Add(flight_stand_vars[departure_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_linked_timing)
                    model.Add(flight_end_vars[arrival_idx] == flight_start_vars[departure_idx]).OnlyEnforceIf(b_linked_timing)
        
        # Progress update
        if self.verbose:
            print(f"Adding non-overlap constraints for {len(self.stands)} stands...")
            constraints_start_time = time.time()
            stands_processed = 0
            stands_pbar = tqdm(total=len(self.stands), desc="Adding stand constraints", unit="stands")
            
        # Add no-overlap constraints for all flights that might use this stand
        for stand_idx in range(len(self.stands)):
            # Collect all flight indices that might use this stand
            stand_flights = []
            
            for flight_idx, flight_data in enumerate(self.flights_data):
                if stand_idx in flight_data["compatible_stands"]:
                    stand_flights.append(flight_idx)
            
            # Show progress with tqdm
            if self.verbose:
                stands_processed += 1
                stands_pbar.update(1)
                
                # Update progress bar description occasionally
                if stands_processed % 10 == 0 or stands_processed == len(self.stands):
                    elapsed = time.time() - constraints_start_time
                    stands_pbar.set_postfix_str(f"Elapsed: {elapsed:.1f}s")
            
            # Add no-overlap constraints for all flights that might use this stand
            if stand_flights:
                # Instead of pairwise constraints, use the more efficient NoOverlap1D global constraint
                # Create interval variables for all flights that might use this stand
                interval_vars = []
                optional_interval_vars = []
                
                # Show progress on large stand_flights
                if self.verbose and len(stand_flights) > 1000:
                    print(f"\nStand {stand_idx+1}/{len(self.stands)}: Processing {len(stand_flights)} possible flights")
                
                for flight_idx in stand_flights:
                    # Create a Boolean variable for "flight uses this stand"
                    b_flight_uses_stand = model.NewBoolVar(f'flight_{flight_idx}_uses_{stand_idx}')
                    
                    # Link boolean variable to stand assignment
                    model.Add(flight_stand_vars[flight_idx] == stand_idx).OnlyEnforceIf(b_flight_uses_stand)
                    model.Add(flight_stand_vars[flight_idx] != stand_idx).OnlyEnforceIf(b_flight_uses_stand.Not())
                    
                    # Get start and end times for this flight
                    start_var = flight_start_vars[flight_idx]
                    end_var = flight_end_vars[flight_idx]
                    
                    # Calculate duration (need a fixed value, not an expression)
                    min_duration = 1  # Minimum duration of 1 minute
                    
                    # Create an optional interval variable
                    interval_var = model.NewOptionalIntervalVar(
                        start_var,
                        model.NewIntVar(min_duration, self.time_horizon, f'duration_{flight_idx}_{stand_idx}'),
                        end_var,
                        b_flight_uses_stand,
                        f'interval_{flight_idx}_{stand_idx}'
                    )
                    
                    optional_interval_vars.append(interval_var)
                
                # Add a NoOverlap constraint for all intervals with a minimum gap
                if gap_between_flights > 0:
                    # If we need gaps between flights, we need to account for that in the interval creation
                    # by extending the end times of the intervals
                    for idx, interval_var in enumerate(optional_interval_vars):
                        # Create a new optional interval with gap included
                        flight_idx = stand_flights[idx]
                        # Get this flight's Boolean variable for using this stand
                        # We need to create this again since we need to reference the existing one
                        b_flight_uses_stand = model.NewBoolVar(f'flight_{flight_idx}_uses_{stand_idx}_gap')
                        model.Add(flight_stand_vars[flight_idx] == stand_idx).OnlyEnforceIf(b_flight_uses_stand)
                        model.Add(flight_stand_vars[flight_idx] != stand_idx).OnlyEnforceIf(b_flight_uses_stand.Not())
                        
                        start_var = flight_start_vars[flight_idx]
                        # Add gap to the end time for non-overlap purposes
                        end_var_with_gap = model.NewIntVar(
                            0, self.time_horizon, f'end_with_gap_{flight_idx}_{stand_idx}'
                        )
                        model.Add(end_var_with_gap == flight_end_vars[flight_idx] + gap_between_flights)
                        
                        # Replace the interval with one that includes the gap
                        optional_interval_vars[idx] = model.NewOptionalIntervalVar(
                            start_var,
                            model.NewIntVar(min_duration, self.time_horizon, f'duration_gap_{flight_idx}_{stand_idx}'),
                            end_var_with_gap,
                            b_flight_uses_stand,
                            f'interval_gap_{flight_idx}_{stand_idx}'
                        )
                    
                    model.AddNoOverlap(optional_interval_vars)
                else:
                    model.AddNoOverlap(optional_interval_vars)
            
            # Add maintenance constraints
            for maint_stand_idx, start_minutes, end_minutes in maintenance_intervals:
                if maint_stand_idx == stand_idx:
                    # Create a fixed interval for the maintenance
                    maint_interval = model.NewIntervalVar(
                        start_minutes,  # fixed start
                        end_minutes - start_minutes,  # fixed duration
                        end_minutes,  # fixed end
                        f'maint_{stand_idx}_{start_minutes}_{end_minutes}'
                    )
                    
                    # Add maintenance to the no-overlap constraint
                    # For each flight that might use this stand, ensure it doesn't overlap with maintenance
                    for flight_idx in stand_flights:
                        # Reuse the existing Boolean variable for "flight uses this stand"
                        b_flight_uses_stand = model.NewBoolVar(f'flight_{flight_idx}_uses_{stand_idx}_maint')
                        
                        # Link boolean variable to stand assignment
                        model.Add(flight_stand_vars[flight_idx] == stand_idx).OnlyEnforceIf(b_flight_uses_stand)
                        model.Add(flight_stand_vars[flight_idx] != stand_idx).OnlyEnforceIf(b_flight_uses_stand.Not())
                        
                        # Get start and end vars for the flight
                        flight_start_var = flight_start_vars[flight_idx]
                        flight_end_var = flight_end_vars[flight_idx]
                        
                        # Create flight interval
                        flight_interval = model.NewOptionalIntervalVar(
                            flight_start_var,
                            model.NewIntVar(1, self.time_horizon, f'maint_duration_{flight_idx}_{stand_idx}'),
                            flight_end_var,
                            b_flight_uses_stand,
                            f'maint_interval_{flight_idx}_{stand_idx}'
                        )
                        
                        # Make sure flight doesn't overlap with maintenance
                        model.AddNoOverlap([maint_interval, flight_interval])
        
        # Close the progress bar if it was created
        if self.verbose:
            stands_pbar.close()
        
        if self.verbose:
            print("\nSetting up objective function...")
            
        # Objective: maximize allocated flights, with priority weights
        objective_terms = []
        
        # Create Boolean variables for "flight is allocated"
        flight_allocated_vars = {}
        
        for flight_idx, flight_data in enumerate(self.flights_data):
            flight = flight_data["flight"]
            b_allocated = model.NewBoolVar(f'is_allocated_{flight_idx}')
            
            model.Add(flight_stand_vars[flight_idx] != self.UNALLOCATED_STAND).OnlyEnforceIf(b_allocated)
            model.Add(flight_stand_vars[flight_idx] == self.UNALLOCATED_STAND).OnlyEnforceIf(b_allocated.Not())
            
            flight_allocated_vars[flight_idx] = b_allocated
            
            # Weight by criticality score (convert to integer by multiplying by 100)
            weight = int(flight.criticality_score * 100) + 1  # ensure positive weight
            objective_terms.append(weight * b_allocated)
        
        # Set the objective
        model.Maximize(sum(objective_terms))
        
        # Show model creation time
        if self.verbose:
            model_creation_time = time.time() - model_start_time
            print(f"Model creation complete in {model_creation_time:.2f} seconds")
            print(f"Starting CP solver with {len(self.flights)} flights...")
        
        # Create solver and solve
        solver = cp_model.CpSolver()
        
        # Configure solver parameters for large-scale problems
        solver.parameters.max_time_in_seconds = time_limit
        solver.parameters.log_search_progress = True
        
        # Configure for large problem instances
        if len(self.flights) > 1000:
            if self.verbose:
                print("Configuring solver for large-scale problem...")
            
            # Limit time on the first solution (help with feasibility)
            solver.parameters.max_time_in_seconds = time_limit
            
            # Set heuristic with more focus on feasibility
            solver.parameters.search_branching = cp_model.AUTOMATIC_SEARCH
            
            # For very large problems, add constraints progressively
            if len(self.flights) > 10000:
                if self.verbose:
                    print("Using large-scale search strategy for 10k+ flights")
                
                # Optimize for memory usage
                solver.parameters.num_search_workers = 1
                solver.parameters.log_search_progress = True
                
                # Focus on finding feasible solutions
                solver.parameters.linearization_level = 0  # Less pre-solving
                
                # Adjust time limit to avoid out-of-memory
                solver.parameters.max_time_in_seconds = min(time_limit, 300)  # 5 minutes max for 10k+ flights
        
        logger.info("Starting CP solver with dynamically calculated time horizon: %d minutes", self.time_horizon)
        logger.info("Date range: %s to %s", self.earliest_time.strftime('%Y-%m-%d %H:%M'), 
                                            self.latest_time.strftime('%Y-%m-%d %H:%M'))
        logger.info("Time limit: %d seconds", time_limit)
        
        # Create and attach solution callback
        solution_callback = None
        if self.verbose:
            solution_callback = SolutionCallback(flight_allocated_vars, len(self.flights), self.verbose)
            solver.parameters.enumerate_all_solutions = True
            
        start_time = time.time()
        
        try:
            if solution_callback:
                status = solver.Solve(model, solution_callback)
            else:
                status = solver.Solve(model)
        finally:
            # Ensure progress bar is closed
            if solution_callback:
                solution_callback.close()
                
        solve_time = time.time() - start_time
        
        # Print newline after progress updates
        if self.verbose:
            print()  # Ensure we move to a new line after progress updates
            
        logger.info("CP solver completed in %.2f seconds with status %s", solve_time, solver.StatusName(status))
        
        if self.verbose:
            solution_count = solution_callback.solution_count() if solution_callback else 0
            print(f"CP solver completed in {solve_time:.2f} seconds (found {solution_count} solutions)")
        
        # Process results if optimal or feasible solution found
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            # Process the solution
            allocated_count = 0
            for flight_idx, flight_data in enumerate(self.flights_data):
                flight = flight_data["flight"]
                is_allocated = solver.Value(flight_allocated_vars[flight_idx])
                
                if is_allocated:
                    allocated_count += 1
                    assigned_stand_idx = solver.Value(flight_stand_vars[flight_idx])
                    stand = self.stands[assigned_stand_idx]
                    start_minutes = solver.Value(flight_start_vars[flight_idx])
                    end_minutes = solver.Value(flight_end_vars[flight_idx])
                    
                    # Convert minutes back to datetime, handling multi-day scenarios
                    if flight.parsed_time.year == 1900:  # Legacy time format
                        # Just use the time portion
                        start_time = datetime(2000, 1, 1, start_minutes // 60, start_minutes % 60)
                        end_time = datetime(2000, 1, 1, end_minutes // 60, end_minutes % 60)
                        
                        # Format as time only
                        start_time_str = start_time.strftime("%H:%M")
                        end_time_str = end_time.strftime("%H:%M")
                    else:
                        # Use proper date handling
                        start_days = start_minutes // (24 * 60)
                        start_hour = (start_minutes % (24 * 60)) // 60
                        start_minute = start_minutes % 60
                        
                        end_days = end_minutes // (24 * 60)
                        end_hour = (end_minutes % (24 * 60)) // 60
                        end_minute = end_minutes % 60
                        
                        start_time = datetime.combine(
                            self.earliest_time.date() + timedelta(days=start_days),
                            datetime.min.time().replace(hour=start_hour, minute=start_minute)
                        )
                        
                        end_time = datetime.combine(
                            self.earliest_time.date() + timedelta(days=end_days),
                            datetime.min.time().replace(hour=end_hour, minute=end_minute)
                        )
                        
                        # Format with date and time
                        start_time_str = start_time.strftime("%Y-%m-%d %H:%M")
                        end_time_str = end_time.strftime("%Y-%m-%d %H:%M")
                    
                    # Add to allocated flights report
                    allocation = {
                        'flight': flight,
                        'stand': stand,
                        'start_time': start_time_str,
                        'end_time': end_time_str
                    }
                    allocated_flights_report.append(allocation)
                else:
                    # Flight was not allocated
                    reason = "No suitable stand available (CP solver)"
                    self.ai_support.log_unallocated_flight(flight, reason)
                    unallocated_flights_report.append({
                        'flight': flight,
                        'reason': reason
                    })
            
            if self.verbose:
                print(f"Final allocation: {allocated_count}/{len(self.flights)} flights allocated "
                      f"({allocated_count/len(self.flights)*100:.1f}%)")
                
            return allocated_flights_report, unallocated_flights_report
        else:
            # No solution found
            logger.warning("CP solver could not find a solution in the time limit. Reason: %s", 
                           solver.StatusName(status))
                           
            if self.verbose:
                print(f"CP solver could not find a solution: {solver.StatusName(status)}")
                
            return [], []  # Return empty lists to trigger fallback to greedy algorithm 