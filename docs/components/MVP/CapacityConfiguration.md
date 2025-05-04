# CapaCity Component: Capacity Configuration

## 1. Overview

This component manages the operational parameters, rules, and settings used by the CapaCity tool, particularly by the Stand Capacity Engine, to perform calculations. It allows users to define airport-specific or scenario-specific operational constraints like standard turnaround times for different aircraft types, buffer times between stand usages, and the airport's core operating hours. This configuration directly influences the calculated capacity.

## 2. Inputs

*   **User Input (via UI):**
    *   Data for creating or updating turnaround time rules (e.g., selecting an aircraft type and specifying its minimum turnaround duration).
    *   Data for setting or updating general operational settings (e.g., default required gap time between aircraft on a stand, start and end time for daily operations).
*   **API Requests:** HTTP requests from the frontend targeting the component's API endpoints (e.g., `PUT /api/config/settings`, `POST /api/config/turnaround-rules`).

## 3. Outputs

*   **Data (via API):** Structured data representing the defined configuration rules and settings, sent in response to API requests (e.g., a list of all turnaround rules, the current operational settings).
*   **Confirmation/Status Messages (via API):** Success or error messages following create or update operations.
*   **Data for other Components:** Provides the necessary configuration data required by the Stand Capacity Engine to perform its calculations.

## 4. Data Storage (PostgreSQL Schema)

The following tables will store the capacity configuration data:

*   **`operational_settings`** (Could be a key-value store or specific columns)
    *   `id` (INTEGER, Primary Key, default: 1, CHECK (id = 1)) - Ensures only one row exists for global settings.
    *   `default_gap_minutes` (INTEGER, Not Null, default: 15) - Default buffer time required between aircraft occupying the same stand.
    *   `operating_start_time` (TIME, Not Null, default: '06:00:00') - Start of the core operational period for capacity calculation.
    *   `operating_end_time` (TIME, Not Null, default: '23:59:59') - End of the core operational period for capacity calculation.
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())
*   **`turnaround_rules`**
    *   `id` (UUID, Primary Key, default: gen_random_uuid())
    *   `aircraft_type_code` (VARCHAR, Foreign Key references `aircraft_types.code`, Not Null, Unique) - Ensures one rule per aircraft type.
    *   `min_turnaround_minutes` (INTEGER, Not Null) - The standard minimum time required for an aircraft of this type to turnaround on a stand.
    *   `created_at` (TIMESTAMPTZ, default: now())
    *   `updated_at` (TIMESTAMPTZ, default: now())

*Indexes will be added to foreign keys and frequently queried columns.*

## 5. Modules

*   **Database Schema:** As defined above.
*   **API Endpoints (Backend):** Routes for managing configuration:
    *   `GET /api/config/settings`
    *   `PUT /api/config/settings`
    *   `GET /api/config/turnaround-rules`
    *   `POST /api/config/turnaround-rules`
    *   `PUT /api/config/turnaround-rules/:aircraft_type_code`
    *   `DELETE /api/config/turnaround-rules/:aircraft_type_code`
*   **Backend Services:** Node.js logic encapsulating database interactions for settings and rules (e.g., `ConfigService`).
*   **Frontend UI (Next.js):** Pages/components for displaying and editing operational settings and turnaround rules.

## 6. Incremental Delivery Plan

1.  **Operational Settings (Foundation):**
    *   Define and create the `operational_settings` table in PostgreSQL (ensuring only one row).
    *   Implement Backend API: `GET` and `PUT` endpoints for `/api/config/settings`.
    *   Implement Backend Service logic for fetching and updating the single settings row.
    *   Implement Frontend UI: A dedicated page or section to display and modify the operational settings (gap time, operating hours).
2.  **Turnaround Rules:**
    *   Define and create the `turnaround_rules` table (including FK to `aircraft_types`).
    *   Implement Backend API: CRUD endpoints for `/api/config/turnaround-rules` (handling by `aircraft_type_code`).
    *   Implement Backend Service logic for `turnaround_rules`.
    *   Implement Frontend UI: Page/components to list existing rules, add new rules (selecting an aircraft type and entering time), edit existing rules, and delete rules.
3.  **Integration & Testing:**
    *   Ensure the `aircraft_types` data is available (likely from the Airport Definition component being built concurrently or beforehand) for selection in the UI.
    *   Thoroughly test fetching, creating, updating, and deleting settings and rules.
    *   Validate data inputs (e.g., times must be positive integers).

This component provides the essential operational parameters needed before the Stand Capacity Engine can produce meaningful results. 