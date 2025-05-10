#!/usr/bin/env python3
import argparse
import os
import json
import sys
from data_loader import (
    load_flights, 
    load_stands, 
    load_airlines, 
    load_settings, 
    load_maintenance_schedules,
    load_connections
)
from maintenance_tracker import MockMaintenanceTracker
from ai_support import MockAISupport
from stand_allocation_engine import StandAllocationEngine
import time

# Try to import tqdm, install if not available
try:
    from tqdm import tqdm
except ImportError:
    print("tqdm library not found. Installing...")
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tqdm"])
        print("tqdm installed successfully.")
        from tqdm import tqdm
    except Exception as e:
        print(f"Failed to install tqdm: {e}")
        # Fallback if tqdm can't be installed
        tqdm = lambda x, **kwargs: x

def run_scenario(scenario_path, verbose=True):
    """
    Run a stand allocation scenario
    
    Parameters:
    - scenario_path: Path to the scenario directory
    - verbose: Whether to print progress information
    
    Returns:
    - Tuple of (allocated_flights_report, unallocated_flights_report)
    """
    if verbose:
        print(f"Loading scenario from: {scenario_path}")
        
    # Load data from the scenario with progress indicators
    if verbose:
        print("Loading flights data...")
    flights = load_flights(os.path.join(scenario_path, 'flights.json'))
    if verbose:
        print(f"Loaded {len(flights)} flights")
        
    if verbose:
        print("Loading stands data...")
    stands = load_stands(os.path.join(scenario_path, 'stands.json'))
    if verbose:
        print(f"Loaded {len(stands)} stands")
        
    if verbose:
        print("Loading airlines data...")
    airlines = load_airlines(os.path.join(scenario_path, 'airlines.json'))
    if verbose:
        print(f"Loaded {len(airlines)} airlines")
        
    if verbose:
        print("Loading settings...")
    settings = load_settings(os.path.join(scenario_path, 'settings.json'))
    
    if verbose:
        print("Loading maintenance schedules...")
    maintenance_schedules = load_maintenance_schedules(os.path.join(scenario_path, 'maintenance_schedule.json'))
    if verbose:
        print(f"Loaded {len(maintenance_schedules)} maintenance entries")
    
    # Create helper objects
    maintenance_tracker = MockMaintenanceTracker(maintenance_schedules)
    ai_support = MockAISupport()
    
    # Check if connections file exists
    connections_path = os.path.join(scenario_path, 'connections.json')
    connection_tracker = None
    if os.path.exists(connections_path):
        if verbose:
            print("Loading flight connections...")
        connection_tracker = load_connections(connections_path, flights)
        if verbose and connection_tracker:
            print(f"Loaded connections for {len(connection_tracker.connections)} flights")
    
    # Create and run the allocation engine
    if verbose:
        print("\nInitializing stand allocation engine...")
    engine = StandAllocationEngine(
        flights, stands, airlines, settings, maintenance_tracker, ai_support, 
        connection_tracker, verbose=verbose
    )
    
    if verbose:
        print("\nRunning allocation algorithm...")
    allocated, unallocated = engine.run_allocation()
    
    if verbose:
        print(f"\nAllocation complete: {len(allocated)} flights allocated, {len(unallocated)} flights unallocated")
    
    return allocated, unallocated

def print_report(allocated_report, unallocated_report):
    """
    Print a formatted report of the allocation results
    
    Parameters:
    - allocated_report: List of allocated flight reports
    - unallocated_report: List of unallocated flight reports
    """
    print("\n===== ALLOCATED FLIGHTS =====")
    if allocated_report:
        print(f"Total allocated flights: {len(allocated_report)}")
        for allocation in allocated_report:
            flight = allocation['flight']
            stand = allocation['stand']
            start_time = allocation['start_time']
            end_time = allocation['end_time']
            
            print(f"Flight {flight.FlightNumber} ({flight.AircraftType}) allocated to stand {stand.StandName} from {start_time} to {end_time}")
    else:
        print("No flights were allocated.")
    
    print("\n===== UNALLOCATED FLIGHTS =====")
    if unallocated_report:
        print(f"Total unallocated flights: {len(unallocated_report)}")
        for unallocation in unallocated_report:
            flight = unallocation['flight']
            reason = unallocation['reason']
            
            print(f"Flight {flight.FlightNumber} ({flight.AircraftType}) not allocated: {reason}")
    else:
        print("All flights were allocated successfully.")

def compare_with_expected(scenario_path, allocated_report, unallocated_report):
    """
    Compare the allocation results with the expected output
    
    Parameters:
    - scenario_path: Path to the scenario directory
    - allocated_report: List of allocated flight reports
    - unallocated_report: List of unallocated flight reports
    
    Returns:
    - Boolean indicating if the results match the expected output
    """
    expected_output_path = os.path.join(scenario_path, 'expected_output.txt')
    if not os.path.exists(expected_output_path):
        return True  # No expected output to compare with
    
    # Generate the actual output
    actual_output = []
    actual_output.append("===== ALLOCATED FLIGHTS =====")
    if allocated_report:
        for allocation in allocated_report:
            flight = allocation['flight']
            stand = allocation['stand']
            start_time = allocation['start_time']
            end_time = allocation['end_time']
            
            actual_output.append(f"Flight {flight.FlightNumber} ({flight.AircraftType}) allocated to stand {stand.StandName} from {start_time} to {end_time}")
    else:
        actual_output.append("No flights were allocated.")
    
    actual_output.append("\n===== UNALLOCATED FLIGHTS =====")
    if unallocated_report:
        for unallocation in unallocated_report:
            flight = unallocation['flight']
            reason = unallocation['reason']
            
            actual_output.append(f"Flight {flight.FlightNumber} ({flight.AircraftType}) not allocated: {reason}")
    else:
        actual_output.append("All flights were allocated successfully.")
    
    # Read the expected output
    with open(expected_output_path, 'r') as f:
        expected_output = f.read().strip().split('\n')
    
    # Compare the actual and expected outputs
    return actual_output == expected_output

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Run a stand allocation scenario')
    parser.add_argument('scenario_path', help='Path to the scenario directory')
    parser.add_argument('--compare', action='store_true', help='Compare with expected output')
    parser.add_argument('--quiet', action='store_true', help='Suppress progress output')
    parser.add_argument('--summary', action='store_true', help='Print only a summary of results')
    args = parser.parse_args()
    
    # Run the scenario
    allocated_report, unallocated_report = run_scenario(args.scenario_path, verbose=not args.quiet)
    
    # Print the report
    if args.summary:
        print(f"\nSummary: {len(allocated_report)} flights allocated, {len(unallocated_report)} flights unallocated")
    else:
        print_report(allocated_report, unallocated_report)
    
    # Compare with expected output (optional)
    if args.compare:
        matches = compare_with_expected(args.scenario_path, allocated_report, unallocated_report)
        if matches:
            print("\nResults match expected output.")
        else:
            print("\nResults DO NOT match expected output!")

if __name__ == "__main__":
    main() 