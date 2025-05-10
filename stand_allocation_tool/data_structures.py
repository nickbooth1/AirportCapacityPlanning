from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional

@dataclass
class Flight:
    """Flight class to represent an arrival or departure"""
    FlightID: str
    FlightNumber: str
    AirlineCode: str
    AircraftType: str
    Origin: str
    Destination: str
    ScheduledTime: str  # Format: "HH:MM" or "YYYY-MM-DDTHH:MM"
    Terminal: str
    IsArrival: bool
    LinkID: Optional[str] = None  # If None, single operation; otherwise linked to another flight
    is_critical_connection: bool = False  # Whether this flight is a critical connection
    base_priority_score: int = 0  # Base priority score for this flight
    
    def __post_init__(self):
        # Parse time with date support
        self.parsed_time = parse_time(self.ScheduledTime)
        
        # Default criticality score (will be recalculated by the engine)
        self.criticality_score = 0.0

@dataclass
class Stand:
    """Stand class to represent an aircraft parking position"""
    StandName: str
    Terminal: str  # Which terminal this stand belongs to
    IsContactStand: bool  # True if this is a contact stand (at terminal); False if remote
    SizeLimit: str  # "Narrow", "Wide", "Super" - maximum aircraft size that can use this stand
    AdjacencyRules: Optional[Dict[str, List[str]]] = field(default_factory=dict)  # {RuleType: [StandNames]}

@dataclass
class Airline:
    """Airline class to represent specific airline operations and preferences"""
    AirlineCode: str
    AirlineName: str
    BaseTerminal: str  # Preferred terminal for operations
    RequiresContactStand: bool  # True if airline requires contact stands for its flights
    priority_tier: int = 1  # Priority tier (1 = standard, higher values = higher priority)

@dataclass
class Settings:
    """Settings class to hold configuration parameters for the allocation engine"""
    GapBetweenFlights: int  # Minimum gap (in minutes) between two different flights using the same stand
    TurnaroundTimeSettings: Dict[str, int]  # {"Default": minutes, "Narrow": minutes, "Wide": minutes, "Super": minutes}
    prioritization_weights: Dict[str, float] = field(default_factory=lambda: {
        "aircraft_type_A380": 10.0,  # Weight for A380 aircraft
        "aircraft_type_B747": 8.0,   # Weight for B747 aircraft
        "aircraft_type_wide": 5.0,   # Weight for wide-body aircraft
        "airline_tier": 2.0,         # Multiplier for airline tier
        "requires_contact_stand": 3.0,  # Weight for flights needing contact stands
        "critical_connection": 5.0,   # Weight for critical connections
        "base_score": 1.0            # Multiplier for base priority score
    })
    solver_parameters: Dict[str, any] = field(default_factory=lambda: {
        "use_solver": False,             # Whether to use the CP solver
        "solver_time_limit_seconds": 30, # Time limit for the solver
        "optimality_gap": 0.05,          # Acceptable optimality gap
        "max_solutions": 1               # Number of solutions to generate
    })

@dataclass
class MaintenanceEntry:
    """MaintenanceEntry class to represent stand maintenance periods"""
    StandName: str  # Name of the stand undergoing maintenance
    StartTime: str  # Format: "HH:MM" or "YYYY-MM-DDTHH:MM"
    EndTime: str  # Format: "HH:MM" or "YYYY-MM-DDTHH:MM"
    
    def __post_init__(self):
        # Parse times with date support
        self.parsed_start_time = parse_time(self.StartTime)
        self.parsed_end_time = parse_time(self.EndTime)

def parse_time(time_str):
    """
    Parse a time string that could be in one of two formats:
    - "HH:MM" (legacy format, assumes current date)
    - "YYYY-MM-DDTHH:MM" (ISO format with date)
    
    Returns a datetime object.
    """
    try:
        if 'T' in time_str:
            # ISO format with date
            return datetime.fromisoformat(time_str)
        else:
            # Legacy format
            return datetime.strptime(time_str, "%H:%M")
    except ValueError:
        # If any parsing fails, fall back to legacy format
        return datetime.strptime(time_str, "%H:%M")

@dataclass
class FlightOperationUnit:
    """
    FlightOperationUnit class to represent either:
    - A single flight operation (arrival or departure)
    - A linked pair (arrival followed by departure with the same aircraft)
    """
    arrival: Optional[Flight] = None
    departure: Optional[Flight] = None
    
    @property
    def is_linked_pair(self):
        """Check if this is a linked pair of arrival and departure"""
        return self.arrival is not None and self.departure is not None
    
    @property
    def earliest_time(self):
        """Get the earliest time of this unit (for sorting)"""
        if self.arrival:
            return self.arrival.parsed_time
        return self.departure.parsed_time
    
    @property
    def airline_code(self):
        """Get the airline code for this unit"""
        if self.arrival:
            return self.arrival.AirlineCode
        return self.departure.AirlineCode 

@dataclass
class TransferWindow:
    """
    TransferWindow class to represent minimum and maximum transfer times between flights
    """
    min_transfer_minutes: int  # Minimum time needed for passengers to transfer
    max_transfer_minutes: int  # Maximum reasonable time for a connection
    is_critical: bool = False  # Whether this is a critical connection (e.g. last connection of the day)
    
class FlightConnectionTracker:
    """
    Class to track potential connecting flights and critical connections
    """
    
    def __init__(self):
        """Initialize the flight connection tracker"""
        self.connections = {}  # Dict mapping (arrival_flight_id, departure_flight_id) to TransferWindow
        
    def add_connection(self, arrival_flight, departure_flight, transfer_window):
        """
        Add a potential connection between an arrival and departure flight
        
        Parameters:
        - arrival_flight: Flight object (arrival)
        - departure_flight: Flight object (departure)
        - transfer_window: TransferWindow object
        """
        if arrival_flight.IsArrival and not departure_flight.IsArrival:
            key = (arrival_flight.FlightID, departure_flight.FlightID)
            self.connections[key] = transfer_window
            
            # Mark the flights as critical connections if the transfer window is critical
            if transfer_window.is_critical:
                arrival_flight.is_critical_connection = True
                departure_flight.is_critical_connection = True
    
    def get_transfer_window(self, arrival_flight, departure_flight):
        """
        Get the transfer window for a connection if it exists
        
        Parameters:
        - arrival_flight: Flight object (arrival)
        - departure_flight: Flight object (departure)
        
        Returns:
        - TransferWindow object or None if no connection exists
        """
        key = (arrival_flight.FlightID, departure_flight.FlightID)
        return self.connections.get(key, None)
    
    def is_valid_connection_time(self, arrival_flight, departure_flight):
        """
        Check if the time between flights is within the valid transfer window
        
        Parameters:
        - arrival_flight: Flight object (arrival)
        - departure_flight: Flight object (departure)
        
        Returns:
        - True if valid, False otherwise
        """
        transfer_window = self.get_transfer_window(arrival_flight, departure_flight)
        if not transfer_window:
            return False
        
        # Calculate minutes between flights
        arrival_time = arrival_flight.parsed_time
        departure_time = departure_flight.parsed_time
        
        # Calculate time difference in minutes, handling date transitions correctly
        time_diff_minutes = calculate_time_difference_minutes(arrival_time, departure_time)
        
        return (transfer_window.min_transfer_minutes <= time_diff_minutes <= 
                transfer_window.max_transfer_minutes)

def calculate_time_difference_minutes(start_time, end_time):
    """
    Calculate the time difference in minutes between two datetime objects,
    correctly handling overnight transitions.
    
    Parameters:
    - start_time: datetime object representing the start time
    - end_time: datetime object representing the end time
    
    Returns:
    - Time difference in minutes (positive)
    """
    # If dates are specified and end_time is before start_time, we assume it's the next day
    if end_time < start_time:
        # Check if dates are the same (only time values were used)
        if start_time.date() == end_time.date():
            # Add one day to end_time for legacy format
            end_time = end_time + timedelta(days=1)
    
    # Calculate difference in minutes
    diff = end_time - start_time
    return diff.total_seconds() / 60 