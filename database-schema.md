# Database Schema: Airport Capacity Planner

This document provides an overview of the database schema for the Airport Capacity Planner application.

## Table Descriptions

### `terminals`
Stores information about airport terminals.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the terminal |
| name | VARCHAR | Terminal name |
| code | VARCHAR | Terminal code (must be unique) |
| description | TEXT | Terminal description |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### `piers`
Stores information about terminal piers (also known as concourses).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the pier |
| name | VARCHAR | Pier name |
| code | VARCHAR | Pier code |
| terminal_id | INTEGER (FK) | Reference to terminals.id |
| description | TEXT | Pier description |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

Constraints:
- Composite unique constraint on (code, terminal_id)
- Foreign key constraint on terminal_id referencing terminals.id with CASCADE delete

### `aircraft_types`
Stores information about different aircraft types.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the aircraft type |
| iata_code | VARCHAR | IATA aircraft type code (must be unique) |
| icao_code | VARCHAR | ICAO aircraft type code (must be unique) |
| name | VARCHAR | Aircraft type name |
| manufacturer | VARCHAR | Aircraft manufacturer |
| model | VARCHAR | Aircraft model |
| wingspan_meters | INTEGER | Aircraft wingspan in meters |
| length_meters | INTEGER | Aircraft length in meters |
| size_category | VARCHAR | Aircraft size category (A, B, C, D, E, F) |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### `stands`
Stores information about aircraft stands.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the stand |
| name | VARCHAR | Stand name |
| code | VARCHAR | Stand code |
| pier_id | INTEGER (FK) | Reference to piers.id |
| is_active | BOOLEAN | Whether the stand is active |
| stand_type | VARCHAR | Stand type (contact, remote) |
| has_jetbridge | BOOLEAN | Whether the stand has a jetbridge |
| max_wingspan_meters | INTEGER | Maximum wingspan in meters |
| max_length_meters | INTEGER | Maximum aircraft length in meters |
| max_aircraft_size | VARCHAR | Maximum aircraft size category |
| description | TEXT | Stand description |
| latitude | FLOAT | Stand latitude for map display |
| longitude | FLOAT | Stand longitude for map display |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

Constraints:
- Composite unique constraint on (code, pier_id)
- Foreign key constraint on pier_id referencing piers.id with CASCADE delete

### `stand_aircraft_constraints`
Defines which aircraft types are allowed at specific stands.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the constraint |
| stand_id | INTEGER (FK) | Reference to stands.id |
| aircraft_type_id | INTEGER (FK) | Reference to aircraft_types.id |
| is_allowed | BOOLEAN | Whether the aircraft type is allowed at the stand |
| constraint_reason | TEXT | Reason for the constraint |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

Constraints:
- Composite unique constraint on (stand_id, aircraft_type_id)
- Foreign key constraint on stand_id referencing stands.id with CASCADE delete
- Foreign key constraint on aircraft_type_id referencing aircraft_types.id with CASCADE delete

### `operational_settings`
Stores global operational settings for the application.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the setting |
| key | VARCHAR | Setting key (must be unique) |
| value | TEXT | Setting value |
| data_type | VARCHAR | Data type of the value (string, integer, boolean, etc.) |
| description | TEXT | Setting description |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### `turnaround_rules`
Defines turnaround times for different aircraft types and stand types.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the rule |
| name | VARCHAR | Rule name |
| aircraft_type_id | INTEGER (FK) | Reference to aircraft_types.id |
| stand_type | VARCHAR | Stand type (contact, remote) |
| minimum_turnaround_minutes | INTEGER | Minimum turnaround time in minutes |
| optimal_turnaround_minutes | INTEGER | Optimal turnaround time in minutes |
| description | TEXT | Rule description |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

Constraints:
- Foreign key constraint on aircraft_type_id referencing aircraft_types.id with CASCADE delete

### `stand_adjacencies`
Defines relationships between adjacent stands and their operational impacts on each other.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Unique identifier for the adjacency relationship |
| stand_id | INTEGER (FK) | Reference to stands.id (the affected stand) |
| adjacent_stand_id | INTEGER (FK) | Reference to stands.id (the stand causing the impact) |
| impact_direction | ENUM | Direction of impact (left, right, behind, front, other) |
| restriction_type | ENUM | Type of restriction (no_use, size_limited, aircraft_type_limited, operational_limit, other) |
| max_aircraft_size_code | VARCHAR | Maximum aircraft size code allowed when adjacent stand is in use |
| restriction_details | TEXT | Detailed description of the restriction |
| is_active | BOOLEAN | Whether this adjacency restriction is active |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

Constraints:
- Composite unique constraint on (stand_id, adjacent_stand_id, impact_direction)
- Foreign key constraint on stand_id referencing stands.id with CASCADE delete
- Foreign key constraint on adjacent_stand_id referencing stands.id with CASCADE delete

## Entity Relationship Diagram

```
terminals 1:N piers 1:N stands N:M aircraft_types
                             (via stand_aircraft_constraints)
stands N:M stands (via stand_adjacencies)
```

## Relationships

- A terminal has many piers
- A pier has many stands
- A stand can accommodate many aircraft types (with constraints)
- An aircraft type can be accommodated at many stands (with constraints)
- A turnaround rule applies to a specific aircraft type and stand type
- A stand can impact other stands (with adjacency constraints)
- A stand can be impacted by other stands (with adjacency constraints) 