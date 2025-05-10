#!/usr/bin/env python3
"""
Generate a large flight dataset for testing the stand allocation algorithm's performance.
This creates a dataset with 50,000 flights spread across a full year.
"""

import json
import random
import argparse
from datetime import datetime, timedelta
import os
from typing import List, Dict

# Configuration
DEFAULT_NUM_FLIGHTS = 50000
DEFAULT_START_DATE = "2023-01-01"
DEFAULT_END_DATE = "2023-12-31"
DEFAULT_NUM_STANDS = 100
DEFAULT_NUM_AIRLINES = 20
DEFAULT_LINKED_PAIRS_PERCENTAGE = 80  # Percentage of flights that are linked pairs

# Aircraft types with proportions
AIRCRAFT_TYPES = {
    "Narrow": ["A320", "B737", "E190", "CRJ", "A220", "B717", "A319"],
    "Wide": ["B777", "B787", "A330", "A350", "B767", "B757"],
    "Super": ["A380", "B747", "AN225"]
}

AIRCRAFT_TYPE_WEIGHTS = {
    "Narrow": 70,  # 70% narrow body
    "Wide": 25,    # 25% wide body
    "Super": 5     # 5% super jumbo
}

def random_time_between(start_date: datetime, end_date: datetime) -> datetime:
    """Generate a random datetime between start_date and end_date"""
    delta = end_date - start_date
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start_date + timedelta(seconds=random_seconds)

def generate_flight_id(index: int) -> str:
    """Generate a unique flight ID"""
    return f"F{index:06d}"

def generate_flight_number(airline_code: str) -> str:
    """Generate a flight number for an airline"""
    return f"{airline_code}{random.randint(100, 9999)}"

def select_aircraft_type() -> str:
    """Select an aircraft type based on weighted distribution"""
    category = random.choices(
        list(AIRCRAFT_TYPE_WEIGHTS.keys()),
        weights=list(AIRCRAFT_TYPE_WEIGHTS.values()),
        k=1
    )[0]
    
    return random.choice(AIRCRAFT_TYPES[category])

def generate_linked_flights(
    flight_id: str, 
    airline_code: str, 
    aircraft_type: str,
    arrival_time: datetime, 
    turnaround_time: int,
    terminals: List[str]
) -> tuple:
    """Generate a linked pair of flights (arrival and departure)"""
    link_id = f"LINK{flight_id[1:]}"
    departure_time = arrival_time + timedelta(minutes=turnaround_time)
    
    terminal = random.choice(terminals)
    origin = f"ORIG{random.randint(1, 100)}"
    destination = f"DEST{random.randint(1, 100)}"
    
    # Ensure origin and destination are different
    while destination == origin:
        destination = f"DEST{random.randint(1, 100)}"
    
    arrival = {
        "FlightID": flight_id,
        "FlightNumber": generate_flight_number(airline_code),
        "AirlineCode": airline_code,
        "AircraftType": aircraft_type,
        "Origin": origin,
        "Destination": terminal,
        "ScheduledTime": arrival_time.strftime("%Y-%m-%dT%H:%M"),
        "Terminal": terminal,
        "IsArrival": True,
        "LinkID": link_id,
        "is_critical_connection": random.random() < 0.1,  # 10% are critical connections
        "base_priority_score": random.randint(0, 5)
    }
    
    departure = {
        "FlightID": f"D{flight_id[1:]}",
        "FlightNumber": generate_flight_number(airline_code),
        "AirlineCode": airline_code,
        "AircraftType": aircraft_type,
        "Origin": terminal,
        "Destination": destination,
        "ScheduledTime": departure_time.strftime("%Y-%m-%dT%H:%M"),
        "Terminal": terminal,
        "IsArrival": False,
        "LinkID": link_id,
        "is_critical_connection": random.random() < 0.1,
        "base_priority_score": random.randint(0, 5)
    }
    
    return arrival, departure

def generate_single_flight(
    flight_id: str, 
    airline_code: str, 
    aircraft_type: str,
    flight_time: datetime,
    terminals: List[str],
    is_arrival: bool
) -> dict:
    """Generate a single flight (either arrival or departure)"""
    terminal = random.choice(terminals)
    
    if is_arrival:
        origin = f"ORIG{random.randint(1, 100)}"
        destination = terminal
    else:
        origin = terminal
        destination = f"DEST{random.randint(1, 100)}"
    
    return {
        "FlightID": flight_id,
        "FlightNumber": generate_flight_number(airline_code),
        "AirlineCode": airline_code,
        "AircraftType": aircraft_type,
        "Origin": origin,
        "Destination": destination,
        "ScheduledTime": flight_time.strftime("%Y-%m-%dT%H:%M"),
        "Terminal": terminal,
        "IsArrival": is_arrival,
        "LinkID": None,
        "is_critical_connection": random.random() < 0.1,
        "base_priority_score": random.randint(0, 5)
    }

def generate_stands(num_stands: int, terminals: List[str]) -> List[Dict]:
    """Generate stands for testing"""
    stands = []
    
    # Distribution of stand types
    contact_percentage = 0.7  # 70% contact stands
    
    # Distribution of size limits
    size_distribution = {
        "Narrow": 0.6,  # 60% narrow-only stands
        "Wide": 0.3,    # 30% wide-capable stands
        "Super": 0.1    # 10% super-capable stands
    }
    
    for i in range(num_stands):
        stand_name = f"STAND{i+1:03d}"
        terminal = random.choice(terminals)
        is_contact = random.random() < contact_percentage
        
        # Select size limit based on distribution
        size_rand = random.random()
        if size_rand < size_distribution["Narrow"]:
            size_limit = "Narrow"
        elif size_rand < size_distribution["Narrow"] + size_distribution["Wide"]:
            size_limit = "Wide"
        else:
            size_limit = "Super"
        
        # Simple adjacency rules for 20% of stands
        adjacency_rules = {}
        if random.random() < 0.2:
            adjacent_stand = f"STAND{random.randint(1, num_stands):03d}"
            while adjacent_stand == stand_name:
                adjacent_stand = f"STAND{random.randint(1, num_stands):03d}"
            adjacency_rules = {"Incompatible": [adjacent_stand]}
        
        stands.append({
            "StandName": stand_name,
            "Terminal": terminal,
            "IsContactStand": is_contact,
            "SizeLimit": size_limit,
            "AdjacencyRules": adjacency_rules
        })
    
    return stands

def generate_airlines(num_airlines: int, terminals: List[str]) -> List[Dict]:
    """Generate airlines for testing"""
    airlines = []
    
    # Airline codes (two letters)
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    used_codes = set()
    
    for i in range(num_airlines):
        # Generate unique airline code
        while True:
            code = random.choice(letters) + random.choice(letters)
            if code not in used_codes:
                used_codes.add(code)
                break
        
        airlines.append({
            "AirlineCode": code,
            "AirlineName": f"Airline {code}",
            "BaseTerminal": random.choice(terminals),
            "RequiresContactStand": random.random() < 0.5,  # 50% require contact stands
            "priority_tier": random.randint(1, 3)  # Priority tiers 1-3
        })
    
    return airlines

def generate_settings() -> Dict:
    """Generate settings for testing"""
    return {
        "GapBetweenFlights": 15,  # 15 minutes between flights
        "TurnaroundTimeSettings": {
            "Default": 60,
            "Narrow": 45,
            "Wide": 90,
            "Super": 120
        },
        "prioritization_weights": {
            "aircraft_type_A380": 10.0,
            "aircraft_type_B747": 8.0,
            "aircraft_type_wide": 5.0,
            "airline_tier": 2.0,
            "requires_contact_stand": 3.0,
            "critical_connection": 5.0,
            "base_score": 1.0
        },
        "solver_parameters": {
            "use_solver": True,
            "solver_time_limit_seconds": 300,  # 5 minutes max
            "optimality_gap": 0.1,
            "max_solutions": 1
        }
    }

def generate_maintenance_schedules(stands: List[Dict], start_date: datetime, end_date: datetime) -> List[Dict]:
    """Generate maintenance schedules for testing"""
    maintenance = []
    
    # Randomly select 10% of stands for maintenance
    maintenance_stands = random.sample(stands, int(len(stands) * 0.1))
    
    for stand in maintenance_stands:
        # Generate 1-3 maintenance periods for each selected stand
        for _ in range(random.randint(1, 3)):
            # Maintenance periods between 2 hours and 2 days
            maintenance_start = random_time_between(start_date, end_date - timedelta(days=2))
            duration_hours = random.randint(2, 48)
            maintenance_end = maintenance_start + timedelta(hours=duration_hours)
            
            maintenance.append({
                "StandName": stand["StandName"],
                "StartTime": maintenance_start.strftime("%Y-%m-%dT%H:%M"),
                "EndTime": maintenance_end.strftime("%Y-%m-%dT%H:%M")
            })
    
    return maintenance

def generate_data(args):
    """Generate the complete test dataset"""
    # Parse dates
    start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    end_date = datetime.strptime(args.end_date, "%Y-%m-%d")
    
    # Define terminals
    terminals = ["T1", "T2", "T3", "T4"]
    
    # Generate airlines
    airlines = generate_airlines(args.num_airlines, terminals)
    airline_codes = [airline["AirlineCode"] for airline in airlines]
    
    # Generate stands
    stands = generate_stands(args.num_stands, terminals)
    
    # Generate flights
    flights = []
    flight_count = 0
    
    # Calculate how many linked pairs we need
    num_linked_pairs = int((args.num_flights * args.linked_pairs_percentage) / 200)
    num_single_flights = args.num_flights - (num_linked_pairs * 2)
    
    print(f"Generating {num_linked_pairs} linked pairs ({num_linked_pairs * 2} flights)")
    
    # Generate linked pairs
    for i in range(num_linked_pairs):
        flight_id = generate_flight_id(flight_count)
        flight_count += 1
        
        airline_code = random.choice(airline_codes)
        aircraft_type = select_aircraft_type()
        arrival_time = random_time_between(start_date, end_date - timedelta(hours=24))
        
        # Get appropriate turnaround time based on aircraft type
        if "A380" in aircraft_type or "B747" in aircraft_type or "AN225" in aircraft_type:
            turnaround_time = 120
        elif any(wide in aircraft_type for wide in ["B777", "B787", "A330", "A350"]):
            turnaround_time = 90
        else:
            turnaround_time = 45
        
        arrival, departure = generate_linked_flights(
            flight_id, airline_code, aircraft_type, arrival_time, turnaround_time, terminals
        )
        
        flights.append(arrival)
        flights.append(departure)
    
    print(f"Generating {num_single_flights} single flights")
    
    # Generate single flights
    for i in range(num_single_flights):
        flight_id = generate_flight_id(flight_count)
        flight_count += 1
        
        airline_code = random.choice(airline_codes)
        aircraft_type = select_aircraft_type()
        flight_time = random_time_between(start_date, end_date)
        is_arrival = random.random() < 0.5  # 50% arrivals, 50% departures
        
        flight = generate_single_flight(
            flight_id, airline_code, aircraft_type, flight_time, terminals, is_arrival
        )
        
        flights.append(flight)
    
    # Generate maintenance schedules
    maintenance = generate_maintenance_schedules(stands, start_date, end_date)
    
    # Generate settings
    settings = generate_settings()
    
    # Write to files
    output_dir = args.output
    os.makedirs(output_dir, exist_ok=True)
    
    with open(os.path.join(output_dir, "flights.json"), "w") as f:
        json.dump(flights, f, indent=2)
    
    with open(os.path.join(output_dir, "stands.json"), "w") as f:
        json.dump(stands, f, indent=2)
    
    with open(os.path.join(output_dir, "airlines.json"), "w") as f:
        json.dump(airlines, f, indent=2)
    
    with open(os.path.join(output_dir, "settings.json"), "w") as f:
        json.dump(settings, f, indent=2)
    
    with open(os.path.join(output_dir, "maintenance_schedule.json"), "w") as f:
        json.dump(maintenance, f, indent=2)
    
    print(f"Generated {len(flights)} flights, {len(stands)} stands, {len(airlines)} airlines")
    print(f"Output written to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate large flight dataset for testing")
    parser.add_argument("--num-flights", type=int, default=DEFAULT_NUM_FLIGHTS, 
                        help=f"Number of flights to generate (default: {DEFAULT_NUM_FLIGHTS})")
    parser.add_argument("--start-date", type=str, default=DEFAULT_START_DATE,
                        help=f"Start date in YYYY-MM-DD format (default: {DEFAULT_START_DATE})")
    parser.add_argument("--end-date", type=str, default=DEFAULT_END_DATE,
                        help=f"End date in YYYY-MM-DD format (default: {DEFAULT_END_DATE})")
    parser.add_argument("--num-stands", type=int, default=DEFAULT_NUM_STANDS,
                        help=f"Number of stands to generate (default: {DEFAULT_NUM_STANDS})")
    parser.add_argument("--num-airlines", type=int, default=DEFAULT_NUM_AIRLINES,
                        help=f"Number of airlines to generate (default: {DEFAULT_NUM_AIRLINES})")
    parser.add_argument("--linked-pairs-percentage", type=int, default=DEFAULT_LINKED_PAIRS_PERCENTAGE,
                        help=f"Percentage of flights that are linked pairs (default: {DEFAULT_LINKED_PAIRS_PERCENTAGE}%)")
    parser.add_argument("--output", type=str, default="test_scenarios/large_scale_test",
                        help="Output directory for generated files")
    
    args = parser.parse_args()
    generate_data(args) 