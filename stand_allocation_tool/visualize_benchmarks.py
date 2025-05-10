#!/usr/bin/env python3
"""
Visualize benchmark results for the stand allocation algorithm.
Creates charts showing performance metrics for different dataset sizes.
"""

import json
import argparse
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import FuncFormatter

def load_benchmark_results(file_path):
    """Load benchmark results from a JSON file"""
    with open(file_path, 'r') as f:
        results = json.load(f)
    return results

def format_time(seconds):
    """Format time in a human-readable way"""
    if seconds < 60:
        return f"{seconds:.2f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.2f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.2f}h"

def plot_allocation_time(results, output_file=None):
    """Plot allocation time vs number of flights"""
    # Sort results by number of flights
    results.sort(key=lambda x: x["total_flights"])
    
    # Extract data
    flight_counts = [r["total_flights"] for r in results]
    allocation_times = [r["allocation_time"] for r in results]
    solver_used = [r["using_solver"] for r in results]
    
    # Split data by solver type
    solver_flights = [fc for fc, su in zip(flight_counts, solver_used) if su]
    solver_times = [at for at, su in zip(allocation_times, solver_used) if su]
    
    greedy_flights = [fc for fc, su in zip(flight_counts, solver_used) if not su]
    greedy_times = [at for at, su in zip(allocation_times, solver_used) if not su]
    
    # Create the plot
    plt.figure(figsize=(12, 8))
    
    if solver_flights:
        plt.scatter(solver_flights, solver_times, label="CP Solver", color="blue", s=100, marker="o")
        # Add fit line
        if len(solver_flights) > 1:
            z = np.polyfit(solver_flights, solver_times, 2)
            p = np.poly1d(z)
            x_range = np.linspace(min(solver_flights), max(solver_flights), 100)
            plt.plot(x_range, p(x_range), "b--", alpha=0.7)
    
    if greedy_flights:
        plt.scatter(greedy_flights, greedy_times, label="Greedy Algorithm", color="green", s=100, marker="^")
        # Add fit line
        if len(greedy_flights) > 1:
            z = np.polyfit(greedy_flights, greedy_times, 2)
            p = np.poly1d(z)
            x_range = np.linspace(min(greedy_flights), max(greedy_flights), 100)
            plt.plot(x_range, p(x_range), "g--", alpha=0.7)
    
    # Add data labels
    for i, txt in enumerate(flight_counts):
        label = format_time(allocation_times[i])
        plt.annotate(
            label, 
            (flight_counts[i], allocation_times[i]),
            textcoords="offset points",
            xytext=(0, 10),
            ha='center'
        )
    
    plt.title("Stand Allocation Performance: Processing Time vs. Flight Count", fontsize=16)
    plt.xlabel("Number of Flights", fontsize=14)
    plt.ylabel("Allocation Time (seconds)", fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(fontsize=12)
    
    # Use log scale if there's a wide range of values
    if max(flight_counts) / min(flight_counts) > 10:
        plt.xscale('log', base=10)
    
    if max(allocation_times) / min(allocation_times) > 10:
        plt.yscale('log', base=10)
    
    plt.tight_layout()
    
    if output_file:
        plt.savefig(output_file)
    else:
        plt.show()

def plot_memory_usage(results, output_file=None):
    """Plot memory usage vs number of flights"""
    # Sort results by number of flights
    results.sort(key=lambda x: x["total_flights"])
    
    # Extract data
    flight_counts = [r["total_flights"] for r in results]
    memory_used = [r["memory_used"] for r in results]
    solver_used = [r["using_solver"] for r in results]
    
    # Split data by solver type
    solver_flights = [fc for fc, su in zip(flight_counts, solver_used) if su]
    solver_memory = [mu for mu, su in zip(memory_used, solver_used) if su]
    
    greedy_flights = [fc for fc, su in zip(flight_counts, solver_used) if not su]
    greedy_memory = [mu for mu, su in zip(memory_used, solver_used) if not su]
    
    # Create the plot
    plt.figure(figsize=(12, 8))
    
    if solver_flights:
        plt.scatter(solver_flights, solver_memory, label="CP Solver", color="blue", s=100, marker="o")
        # Add fit line
        if len(solver_flights) > 1:
            z = np.polyfit(solver_flights, solver_memory, 1)
            p = np.poly1d(z)
            x_range = np.linspace(min(solver_flights), max(solver_flights), 100)
            plt.plot(x_range, p(x_range), "b--", alpha=0.7)
    
    if greedy_flights:
        plt.scatter(greedy_flights, greedy_memory, label="Greedy Algorithm", color="green", s=100, marker="^")
        # Add fit line
        if len(greedy_flights) > 1:
            z = np.polyfit(greedy_flights, greedy_memory, 1)
            p = np.poly1d(z)
            x_range = np.linspace(min(greedy_flights), max(greedy_flights), 100)
            plt.plot(x_range, p(x_range), "g--", alpha=0.7)
    
    # Add data labels
    for i, txt in enumerate(flight_counts):
        label = f"{memory_used[i]:.1f} MB"
        plt.annotate(
            label, 
            (flight_counts[i], memory_used[i]),
            textcoords="offset points",
            xytext=(0, 10),
            ha='center'
        )
    
    plt.title("Stand Allocation Performance: Memory Usage vs. Flight Count", fontsize=16)
    plt.xlabel("Number of Flights", fontsize=14)
    plt.ylabel("Memory Used (MB)", fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(fontsize=12)
    
    # Use log scale if there's a wide range of values
    if max(flight_counts) / min(flight_counts) > 10:
        plt.xscale('log', base=10)
    
    if max(memory_used) / min(memory_used) > 10:
        plt.yscale('log', base=10)
    
    plt.tight_layout()
    
    if output_file:
        plt.savefig(output_file)
    else:
        plt.show()

def plot_allocation_rate(results, output_file=None):
    """Plot allocation rate vs number of flights"""
    # Sort results by number of flights
    results.sort(key=lambda x: x["total_flights"])
    
    # Extract data
    flight_counts = [r["total_flights"] for r in results]
    allocation_rates = [r["allocation_rate"] for r in results]
    solver_used = [r["using_solver"] for r in results]
    
    # Split data by solver type
    solver_flights = [fc for fc, su in zip(flight_counts, solver_used) if su]
    solver_rates = [ar for ar, su in zip(allocation_rates, solver_used) if su]
    
    greedy_flights = [fc for fc, su in zip(flight_counts, solver_used) if not su]
    greedy_rates = [ar for ar, su in zip(allocation_rates, solver_used) if not su]
    
    # Create the plot
    plt.figure(figsize=(12, 8))
    
    if solver_flights:
        plt.scatter(solver_flights, solver_rates, label="CP Solver", color="blue", s=100, marker="o")
    
    if greedy_flights:
        plt.scatter(greedy_flights, greedy_rates, label="Greedy Algorithm", color="green", s=100, marker="^")
    
    # Add data labels
    for i, txt in enumerate(flight_counts):
        label = f"{allocation_rates[i]:.1f}%"
        plt.annotate(
            label, 
            (flight_counts[i], allocation_rates[i]),
            textcoords="offset points",
            xytext=(0, 10),
            ha='center'
        )
    
    plt.title("Stand Allocation Performance: Allocation Success Rate vs. Flight Count", fontsize=16)
    plt.xlabel("Number of Flights", fontsize=14)
    plt.ylabel("Allocation Rate (%)", fontsize=14)
    plt.ylim(0, 105)  # Leave room for annotations
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(fontsize=12)
    
    # Use log scale for x-axis if there's a wide range of values
    if max(flight_counts) / min(flight_counts) > 10:
        plt.xscale('log', base=10)
    
    plt.tight_layout()
    
    if output_file:
        plt.savefig(output_file)
    else:
        plt.show()

def create_summary_table(results):
    """Create a summary table of the benchmark results"""
    # Sort results by number of flights
    results.sort(key=lambda x: x["total_flights"])
    
    print("\n=== Stand Allocation Benchmark Summary ===")
    print(f"{'Flights':>10} | {'Algorithm':>12} | {'Allocation Time':>16} | {'Memory (MB)':>12} | {'Success Rate':>12}")
    print(f"{'-'*10} | {'-'*12} | {'-'*16} | {'-'*12} | {'-'*12}")
    
    for result in results:
        flights = result["total_flights"]
        algorithm = "CP Solver" if result["using_solver"] else "Greedy"
        alloc_time = format_time(result["allocation_time"])
        memory = f"{result['memory_used']:.1f}"
        success = f"{result['allocation_rate']:.1f}%"
        
        print(f"{flights:>10} | {algorithm:>12} | {alloc_time:>16} | {memory:>12} | {success:>12}")

def main():
    parser = argparse.ArgumentParser(description="Visualize benchmark results")
    parser.add_argument("--results", type=str, default="benchmark_results.json",
                      help="Path to benchmark results JSON file")
    parser.add_argument("--time-plot", type=str, 
                      help="Output file for time plot (if not specified, plot is displayed)")
    parser.add_argument("--memory-plot", type=str, 
                      help="Output file for memory plot (if not specified, plot is displayed)")
    parser.add_argument("--rate-plot", type=str, 
                      help="Output file for allocation rate plot (if not specified, plot is displayed)")
    parser.add_argument("--no-plots", action="store_true",
                      help="Don't display any plots, just print the summary table")
    
    args = parser.parse_args()
    
    # Load benchmark results
    results = load_benchmark_results(args.results)
    
    # Create summary table
    create_summary_table(results)
    
    if not args.no_plots:
        # Plot allocation time
        plot_allocation_time(results, args.time_plot)
        
        # Plot memory usage
        plot_memory_usage(results, args.memory_plot)
        
        # Plot allocation rate
        plot_allocation_rate(results, args.rate_plot)

if __name__ == "__main__":
    main() 