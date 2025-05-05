# CapaCity Component: Airport Definition

## 1. Overview

This component is responsible for managing the core physical and operational characteristics of an airport within the CapaCity tool. It allows users to define and maintain the static infrastructure elements like terminals, piers, stands, and the types of aircraft the airport can handle. This data forms the foundation for subsequent capacity calculations.

## 2. Inputs

*   **User Input (via UI):**
    *   Data for creating or updating terminals (e.g., name).
    *   Data for creating or updating piers (e.g., name, associated terminal).
    *   Data for creating or updating aircraft types (e.g., ICAO code, name, wingspan category, length category).
    *   Data for creating or updating stands (e.g., name, associated terminal/pier, maximum aircraft size code, selecting location via map interface).
    *   Data defining specific constraints for stands (e.g., linking a stand to allow only certain aircraft types).
*   **API Requests:** HTTP requests from the frontend (or potentially other systems in the future) targeting the component's API endpoints (e.g., `POST /api/stands`, `PUT /api/terminals/:id`).

## 3. Outputs

*   **Data (via API):** Structured data representing the defined airport elements, sent in response to API requests (e.g., a list of all stands, details of a specific terminal).
*   **Confirmation/Status Messages (via API):** Success or error messages following create, update, or delete operations.
*   **Data for other Components:** Provides the foundational airport data required by other components, primarily the Stand Capacity Engine.

## 4. Data Storage (PostgreSQL Schema)

The following tables will store the airport definition data:

*   **`terminals`**
    *   `id` (UUID, Primary Key, default: gen_random_uuid())
    *   `name` (VARCHAR, Not Null)
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())
*   **`piers`**
    *   `id` (UUID, Primary Key, default: gen_random_uuid())
    *   `name` (VARCHAR, Not Null)
    *   `terminal_id` (UUID, Foreign Key references `terminals.id`, Not Null)
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())
*   **`aircraft_types`** (Represents categories/sizes relevant for stands)
    *   `code` (VARCHAR, Primary Key) - e.g., 'A', 'B', 'C', 'D', 'E', 'F' based on ICAO Aerodrome Reference Code or similar relevant categorization.
    *   `description` (TEXT) - Optional description (e.g., "Small Narrowbody", "Widebody")
    *   `wingspan_category` (VARCHAR) - Optional, more granular detail if needed
    *   `length_category` (VARCHAR) - Optional, more granular detail if needed
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())
*   **`stands`**
    *   `id` (UUID, Primary Key, default: gen_random_uuid())
    *   `name` (VARCHAR, Not Null, Unique)
    *   `terminal_id` (UUID, Foreign Key references `terminals.id`, Nullable)
    *   `pier_id` (UUID, Foreign Key references `piers.id`, Nullable)
    *   `max_aircraft_size_code` (VARCHAR, Foreign Key references `aircraft_types.code`, Not Null) - Represents the largest *category* of aircraft the stand can generally handle.
    *   `is_contact_stand` (BOOLEAN, Nullable, default: true) - True if it's a contact stand (connected to terminal), False if remote.
    *   `has_hydrant_fuel` (BOOLEAN, Nullable, default: false) - True if the stand has hydrant fueling.
    *   `is_biometric_enabled` (BOOLEAN, Nullable, default: false) - True if the associated gate area has biometric capability.
    *   `has_fegp` (BOOLEAN, Nullable, default: false) - True if the stand has Fixed Electrical Ground Power.
    *   `has_avdgs` (BOOLEAN, Nullable, default: false) - True if the stand has an Advanced Visual Docking Guidance System.
    *   `latitude` (DECIMAL(9, 6), Nullable) - Geographic latitude for map display and spatial analysis.
    *   `longitude` (DECIMAL(9, 6), Nullable) - Geographic longitude for map display and spatial analysis.
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())
*   **`stand_aircraft_constraints`** (Optional: Use if specific aircraft *types*, not just size codes, are disallowed/allowed on specific stands beyond the general `max_aircraft_size_code`)
    *   `stand_id` (UUID, Foreign Key references `stands.id`, Primary Key)
    *   `aircraft_type_code` (VARCHAR, Foreign Key references `aircraft_types.code`, Primary Key)
    *   `is_allowed` (BOOLEAN, Not Null, default: true) - Could be used for explicit allows/disallows if needed.
    *   `created_at` (TIMESTAMPTZ, default: now())

*Indexes will be added to foreign keys and frequently queried columns.*

## 5. Modules (Recap from MVPComponents)

*   **Database Schema:** As defined above.
*   **API Endpoints (Backend):** CRUD routes (GET, POST, PUT, DELETE) for `/api/terminals`, `/api/piers`, `/api/aircraft-types`, `/api/stands`.
*   **Backend Services:** Node.js logic encapsulating database interactions for each entity (e.g., `StandService`, `TerminalService`).
*   **Frontend UI (Next.js):** Pages/components for listing, viewing, creating, and editing terminals, piers, aircraft types, and stands.

## 6. Incremental Delivery Plan

We will build this component entity by entity, ensuring each part is functional before moving to the next.

1.  **Setup & Foundation:**
    *   Establish database connection in the Node.js backend.
    *   Set up basic API routing (e.g., using Express).
    *   Set up basic Next.js project structure.
2.  **Aircraft Types (Core Prerequisite):**
    *   Define and create the `aircraft_types` table in PostgreSQL.
    *   Implement Backend API: CRUD endpoints for `/api/aircraft-types`.
    *   Implement Backend Service logic for `aircraft_types`.
    *   Implement Frontend UI: Page to list and add/edit aircraft types. *Initially, we might just pre-populate this table and skip the UI if type definitions are static.*
3.  **Stands (Central Entity):**
    *   Define and create the `stands` table in PostgreSQL (including FK to `aircraft_types` and geo coordinates).
    *   Implement Backend API: CRUD endpoints for `/api/stands`.
    *   Implement Backend Service logic for `stands`.
    *   Implement Frontend UI: Page to list stands, form to add a new stand (linking to an aircraft type), potentially view/edit details.
    *   Implement Frontend UI: Add map interface for selecting/displaying stand latitude/longitude during create/edit.
4.  **Terminals:**
    *   Define and create the `terminals` table.
    *   Implement Backend API: CRUD endpoints for `/api/terminals`.
    *   Implement Backend Service logic for `terminals`.
    *   Implement Frontend UI: Page/components to list/add/edit terminals.
    *   Update `stands` table/logic/UI to link stands to terminals (make FK non-nullable if required).
5.  **Piers:**
    *   Define and create the `piers` table (including FK to `terminals`).
    *   Implement Backend API: CRUD endpoints for `/api/piers`.
    *   Implement Backend Service logic for `piers`.
    *   Implement Frontend UI: Page/components to list/add/edit piers (associating with a terminal).
    *   Update `stands` table/logic/UI to link stands to piers.
6.  **(Optional) Stand Constraints:**
    *   Define and create the `stand_aircraft_constraints` table if needed for finer control.
    *   Implement associated API endpoints and backend/frontend logic.
7.  **Refinement & Testing:** Thoroughly test CRUD operations, data validation, relationships, and UI interactions for all entities.

This incremental approach ensures we have a working data management layer for each part of the airport definition before integrating it fully into the capacity calculation. 