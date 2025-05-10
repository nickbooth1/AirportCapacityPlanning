# Stand Capacity Tool

A command-line tool to calculate airport stand capacity by aircraft type and time slot, considering:
- Aircraft turnaround times
- Gap requirements between flights
- Stand compatibility with different aircraft types
- Stand adjacency restrictions

The tool provides both best-case capacity (no adjacency restrictions) and worst-case capacity (most restrictive adjacency rules in effect).

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd stand-capacity-tool

# Install dependencies
npm install

# Link the package globally (optional)
npm link
```

## Usage

### Basic Usage

```bash
# Calculate capacity using provided data files
stand-capacity-tool calculate --stands stands.json --aircraft aircraft_types.json

# Specify all data files
stand-capacity-tool calculate \
  --stands stands.json \
  --aircraft aircraft_types.json \
  --settings operational_settings.json \
  --adjacency-rules adjacency_rules.json

# Output in different formats
stand-capacity-tool calculate --stands stands.json --aircraft aircraft_types.json --output json
stand-capacity-tool calculate --stands stands.json --aircraft aircraft_types.json --output csv
```

### Generate Sample Data

```bash
# Generate sample data files
stand-capacity-tool init --sample-data
```

## Data Files

The tool requires the following JSON files:

- `operational_settings.json`: Defines time slots and operational parameters
- `aircraft_types.json`: List of aircraft types and their turnaround times
- `stands.json`: Information about stands and their compatible aircraft types
- `adjacency_rules.json`: Rules describing how aircraft at one stand affect adjacent stands

Sample templates for these files are included in the `data/` directory.

## Output

The tool produces a capacity report showing:

1. Best-case capacity: Maximum aircraft per type per slot with no adjacency restrictions
2. Worst-case capacity: Maximum aircraft per type per slot with most restrictive adjacency rules

Output can be formatted as plain text tables, JSON, or CSV.

## License

MIT 