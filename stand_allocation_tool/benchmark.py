#!/usr/bin/env python3
"""
Benchmark script for the stand allocation algorithm.
Tests the algorithm with different dataset sizes and reports performance metrics.
"""

import os
import time
import json
import argparse
import subprocess
import psutil
from datetime import datetime

from data_loader import DataLoader
from stand_allocation_engine import StandAllocationEngine
from ai_support import MockAISupport
from maintenance_tracker import MockMaintenanceTracker

def run_benchmark(scenario_dir, use_solver=True):
    """
    Run the stand allocation algorithm on a scenario and measure performance metrics.
    
    Parameters:
    - scenario_dir: Path to the scenario directory
    - use_solver: Whether to use the CP solver or greedy algorithm
    
    Returns:
    - Dict containing performance metrics
    """
    print(f"\n=== Benchmarking {scenario_dir} ===")
    print(f"Using CP solver: {use_solver}")
    
    # Load data
    data_loader = DataLoader()
    
    print("Loading data...")
    start_load = time.time()
    flights = data_loader.load_flights(os.path.join(scenario_dir, "flights.json"))
    stands = data_loader.load_stands(os.path.join(scenario_dir, "stands.json"))
    airlines = data_loader.load_airlines(os.path.join(scenario_dir, "airlines.json"))
    settings = data_loader.load_settings(os.path.join(scenario_dir, "settings.json"))
    maintenance_schedules = data_loader.load_maintenance_schedules(os.path.join(scenario_dir, "maintenance_schedule.json"))
    load_time = time.time() - start_load
    
    # Update solver settings
    settings.solver_parameters["use_solver"] = use_solver
    
    # Create trackers
    maintenance_tracker = MockMaintenanceTracker(maintenance_schedules)
    ai_support = MockAISupport()
    
    print(f"Loaded {len(flights)} flights, {len(stands)} stands, {len(airlines)} airlines")
    
    # Record process memory before allocation
    process = psutil.Process(os.getpid())
    memory_before = process.memory_info().rss / (1024 * 1024)  # MB
    
    # Run allocation
    print("Running allocation...")
    start_allocation = time.time()
    
    engine = StandAllocationEngine(
        flights, stands, airlines, settings, maintenance_tracker, ai_support
    )
    
    allocated, unallocated = engine.run_allocation()
    
    allocation_time = time.time() - start_allocation
    
    # Record process memory after allocation
    memory_after = process.memory_info().rss / (1024 * 1024)  # MB
    memory_used = memory_after - memory_before
    
    # Calculate statistics
    total_flights = len(flights)
    allocated_count = len(allocated)
    unallocated_count = len(unallocated)
    allocation_rate = allocated_count / total_flights * 100 if total_flights > 0 else 0
    
    # Print results
    print(f"\nResults for {scenario_dir}:")
    print(f"Total flights: {total_flights}")
    print(f"Allocated flights: {allocated_count} ({allocation_rate:.2f}%)")
    print(f"Unallocated flights: {unallocated_count} ({100 - allocation_rate:.2f}%)")
    print(f"Load time: {load_time:.2f} seconds")
    print(f"Allocation time: {allocation_time:.2f} seconds")
    print(f"Memory used: {memory_used:.2f} MB")
    
    # Return performance metrics
    return {
        "scenario": os.path.basename(scenario_dir),
        "total_flights": total_flights,
        "allocated_flights": allocated_count,
        "unallocated_flights": unallocated_count,
        "allocation_rate": allocation_rate,
        "load_time": load_time,
        "allocation_time": allocation_time,
        "memory_used": memory_used,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "using_solver": use_solver
    }

def generate_test_data(num_flights, output_dir):
    """Generate test data using the generate_large_flight_data.py script"""
    print(f"Generating test data with {num_flights} flights...")
    cmd = [
        "python", "generate_large_flight_data.py",
        "--num-flights", str(num_flights),
        "--output", output_dir
    ]
    subprocess.run(cmd, check=True)

def main():
    parser = argparse.ArgumentParser(description="Benchmark the stand allocation algorithm")
    parser.add_argument("--scenarios", type=str, nargs="+", 
                      help="List of scenario directories to benchmark")
    parser.add_argument("--generate", action="store_true",
                      help="Generate test datasets")
    parser.add_argument("--flight-counts", type=int, nargs="+", default=[1000, 5000, 10000, 50000],
                      help="Number of flights to generate for each test dataset")
    parser.add_argument("--no-solver", action="store_true",
                      help="Use greedy algorithm instead of CP solver")
    parser.add_argument("--output", type=str, default="benchmark_results.json",
                      help="Output file for benchmark results")
    
    args = parser.parse_args()
    
    # Generate test datasets if requested
    if args.generate:
        for count in args.flight_counts:
            output_dir = f"test_scenarios/benchmark_{count}"
            generate_test_data(count, output_dir)
            
        # Update the scenarios list to include the generated datasets
        if not args.scenarios:
            args.scenarios = [f"test_scenarios/benchmark_{count}" for count in args.flight_counts]
    
    # If no scenarios specified, use all test_scenarios directories
    if not args.scenarios:
        args.scenarios = [
            os.path.join("test_scenarios", d) 
            for d in os.listdir("test_scenarios") 
            if os.path.isdir(os.path.join("test_scenarios", d))
        ]
    
    # Run benchmarks
    results = []
    for scenario in args.scenarios:
        try:
            result = run_benchmark(scenario, not args.no_solver)
            results.append(result)
        except Exception as e:
            print(f"Error benchmarking {scenario}: {e}")
    
    # Write results to file
    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\nBenchmark results written to {args.output}")

if __name__ == "__main__":
    main() 