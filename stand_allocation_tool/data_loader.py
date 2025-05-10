import json
from data_structures import Flight, Stand, Airline, Settings, MaintenanceEntry, TransferWindow, FlightConnectionTracker

def load_flights(file_path):
    """
    Load flight data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    
    Returns:
    - List of Flight objects
    """
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    flights = []
    for flight_data in data:
        # Set default values for new fields if they don't exist
        if 'is_critical_connection' not in flight_data:
            flight_data['is_critical_connection'] = False
        if 'base_priority_score' not in flight_data:
            flight_data['base_priority_score'] = 0
        
        flights.append(Flight(**flight_data))
    
    return flights

def load_stands(file_path):
    """
    Load stand data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    
    Returns:
    - List of Stand objects
    """
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    stands = []
    for stand_data in data:
        stands.append(Stand(**stand_data))
    
    return stands

def load_airlines(file_path):
    """
    Load airline data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    
    Returns:
    - List of Airline objects
    """
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    airlines = []
    for airline_data in data:
        # Set default value for priority_tier if it doesn't exist
        if 'priority_tier' not in airline_data:
            airline_data['priority_tier'] = 1
        
        airlines.append(Airline(**airline_data))
    
    return airlines

def load_settings(file_path):
    """
    Load settings data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    
    Returns:
    - Settings object
    """
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    # Set default values for new fields if they don't exist
    if 'prioritization_weights' not in data:
        data['prioritization_weights'] = {
            "aircraft_type_A380": 10.0,
            "aircraft_type_B747": 8.0,
            "airline_tier": 2.0,
            "requires_contact_stand": 3.0,
            "critical_connection": 5.0,
            "base_score": 1.0
        }
    
    if 'solver_parameters' not in data:
        data['solver_parameters'] = {
            "use_solver": False,
            "solver_time_limit_seconds": 30,
            "optimality_gap": 0.05,
            "max_solutions": 1,
            "force_solver": False  # Force the solver on very large problems
        }
    
    return Settings(**data)

def load_maintenance_schedules(file_path):
    """
    Load maintenance schedule data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    
    Returns:
    - List of MaintenanceEntry objects
    """
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    entries = []
    for entry_data in data:
        entries.append(MaintenanceEntry(**entry_data))
    
    return entries

def load_connections(file_path, flights):
    """
    Load connection data from a JSON file
    
    Parameters:
    - file_path: Path to the JSON file
    - flights: List of Flight objects to reference
    
    Returns:
    - FlightConnectionTracker object
    """
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return empty tracker if file doesn't exist or is invalid
        return FlightConnectionTracker()
    
    # Create a map of FlightIDs to Flight objects for quick lookup
    flight_map = {flight.FlightID: flight for flight in flights}
    
    # Create the connection tracker
    tracker = FlightConnectionTracker()
    
    for connection_data in data:
        arrival_id = connection_data.get('arrival_flight_id')
        departure_id = connection_data.get('departure_flight_id')
        
        # Skip if either flight is not found
        if arrival_id not in flight_map or departure_id not in flight_map:
            continue
        
        arrival_flight = flight_map[arrival_id]
        departure_flight = flight_map[departure_id]
        
        # Create transfer window
        transfer_window = TransferWindow(
            min_transfer_minutes=connection_data.get('min_transfer_minutes', 30),
            max_transfer_minutes=connection_data.get('max_transfer_minutes', 180),
            is_critical=connection_data.get('is_critical', False)
        )
        
        # Add to tracker
        tracker.add_connection(arrival_flight, departure_flight, transfer_window)
    
    return tracker 