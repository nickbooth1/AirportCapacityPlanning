# CapaCity Component: Stand Maintenance

## 1. Overview

This component is responsible for managing maintenance requests for stands within the CapaCity tool. It allows airport operators to request, review, approve, and track maintenance activities for stands, ensuring these activities are factored into capacity calculations. By incorporating stand maintenance information, the capacity calculations can provide more accurate predictions that reflect real-world availability constraints.

## 2. Inputs

* **User Input (via UI):**
  * Data for creating maintenance requests (e.g., stand ID, description, start/end dates and times).
  * Data for reviewing and approving/rejecting maintenance requests (e.g., approval status, comments).
  * Filtering parameters for viewing maintenance requests (e.g., by status, date range, stand).
* **API Requests:** HTTP requests from the frontend targeting the component's API endpoints (e.g., `POST /api/maintenance/requests`, `PUT /api/maintenance/requests/:id`).
* **Integration Input:** References to existing stands from the Airport Definition component.

## 3. Outputs

* **Data (via API):** Structured data representing maintenance requests and their statuses, sent in response to API requests.
* **Confirmation/Status Messages (via API):** Success or error messages following create, update, or delete operations.
* **Data for other Components:** Provides maintenance schedule data to the Stand Capacity Engine for accurate capacity calculations.
* **Notifications:** Optional notifications to stakeholders about new requests, status changes, or approaching maintenance dates.

## 4. Data Storage (PostgreSQL Schema)

The following tables will store the stand maintenance data:

* **`maintenance_status_types`**
  * `id` (SERIAL, Primary Key)
  * `name` (VARCHAR(50), Not Null, Unique) - e.g., 'Requested', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Cancelled'
  * `description` (TEXT, Nullable)
  * `created_at` (TIMESTAMPTZ, default: now())
  * `updated_at` (TIMESTAMPTZ, default: now())

* **`maintenance_requests`**
  * `id` (UUID, Primary Key, default: gen_random_uuid())
  * `stand_id` (UUID, Foreign Key references `stands.id`, Not Null)
  * `title` (VARCHAR(100), Not Null) - Brief title for the maintenance request
  * `description` (TEXT, Not Null) - Detailed description of the maintenance work
  * `requestor_name` (VARCHAR(100), Not Null) - Name of the person requesting maintenance
  * `requestor_email` (VARCHAR(255), Not Null) - Email of the requestor for notifications
  * `requestor_department` (VARCHAR(100), Not Null) - Department of the requestor
  * `start_datetime` (TIMESTAMPTZ, Not Null) - When the maintenance will begin
  * `end_datetime` (TIMESTAMPTZ, Not Null) - When the maintenance will end
  * `status_id` (INTEGER, Foreign Key references `maintenance_status_types.id`, Not Null, default: 1) - Current status (e.g., 1 for 'Requested')
  * `priority` (VARCHAR(20), Not Null, default: 'Medium') - Priority level (e.g., 'Low', 'Medium', 'High', 'Critical')
  * `impact_description` (TEXT, Nullable) - Description of the impact on operations
  * `created_at` (TIMESTAMPTZ, default: now())
  * `updated_at` (TIMESTAMPTZ, default: now())

* **`maintenance_approvals`**
  * `id` (UUID, Primary Key, default: gen_random_uuid())
  * `maintenance_request_id` (UUID, Foreign Key references `maintenance_requests.id`, Not Null)
  * `approver_name` (VARCHAR(100), Not Null) - Name of the person approving/rejecting
  * `approver_email` (VARCHAR(255), Not Null) - Email of the approver
  * `approver_department` (VARCHAR(100), Not Null) - Department of the approver
  * `is_approved` (BOOLEAN, Not Null) - True if approved, False if rejected
  * `approval_datetime` (TIMESTAMPTZ, Not Null, default: now()) - When the approval/rejection occurred
  * `comments` (TEXT, Nullable) - Additional comments by the approver
  * `created_at` (TIMESTAMPTZ, default: now())
  * `updated_at` (TIMESTAMPTZ, default: now())

*Indexes will be added to foreign keys and frequently queried columns.*

## 5. Modules

* **Database Schema:** As defined above.
* **API Endpoints (Backend):**
  * Maintenance Requests:
    * `GET /api/maintenance/requests` - Get all maintenance requests (with filtering options)
    * `GET /api/maintenance/requests/:id` - Get a specific maintenance request
    * `POST /api/maintenance/requests` - Create a new maintenance request
    * `PUT /api/maintenance/requests/:id` - Update a maintenance request
    * `GET /api/maintenance/requests/stand/:standId` - Get all maintenance requests for a specific stand
  * Maintenance Approvals:
    * `POST /api/maintenance/approvals` - Create a new approval/rejection for a maintenance request
    * `GET /api/maintenance/approvals/request/:requestId` - Get all approvals for a specific request
  * Status Types (primarily for UI reference):
    * `GET /api/maintenance/status-types` - Get all possible status types
* **Backend Services:**
  * `MaintenanceRequestService` - Node.js logic for managing maintenance requests
  * `MaintenanceApprovalService` - Logic for handling the approval workflow
  * `MaintenanceNotificationService` - Optional service for sending notifications
  * `MaintenanceCapacityIntegrationService` - Logic for integrating maintenance data with capacity calculations
* **Frontend UI (Next.js):**
  * Maintenance Request List Page - To view and filter all maintenance requests
  * Maintenance Request Detail Page - To view details of a specific request
  * Maintenance Request Form - To create or edit maintenance requests
  * Approval Interface - For stakeholders to review and approve/reject requests
  * Maintenance Calendar View - To visualize upcoming and ongoing maintenance
  * Capacity Impact Visualization - To show how maintenance affects stand capacity

## 6. Incremental Delivery Plan

We will build this component incrementally, ensuring each part is functional before moving to the next.

1. **Setup & Foundation:**
   * Define and create the database tables in PostgreSQL.
   * Set up basic API routing structure for maintenance-related endpoints.
   * Create basic frontend page structure for maintenance management.

2. **Core Maintenance Request Management:**
   * Implement the `maintenance_status_types` table with initial seed data.
   * Implement the `maintenance_requests` table.
   * Implement Backend API: CRUD endpoints for maintenance requests.
   * Implement Backend Service logic for maintenance requests.
   * Implement Frontend UI: Page to list all maintenance requests with basic filtering.
   * Implement Frontend UI: Form to create and edit maintenance requests.
   * Implement Frontend UI: Detail view for a specific maintenance request.

3. **Approval Workflow:**
   * Implement the `maintenance_approvals` table.
   * Implement Backend API: Endpoints for creating and retrieving approvals.
   * Implement Backend Service logic for the approval process.
   * Implement Frontend UI: Interface for approving or rejecting maintenance requests.
   * Add status transition logic (e.g., from 'Requested' to 'Approved' or 'Rejected').

4. **Calendar Visualization:**
   * Implement Frontend UI: Calendar view showing upcoming and ongoing maintenance.
   * Add filtering capabilities to the calendar view (by terminal, pier, etc.).

5. **Capacity Integration:**
   * Implement Backend Service: Logic to provide maintenance data to the Stand Capacity Engine.
   * Update Stand Capacity Engine to factor in maintenance when calculating availability.
   * Implement Frontend UI: Visualization of maintenance impact on capacity.

6. **Advanced Features (if time permits):**
   * Implement notifications for new requests, status changes, and upcoming maintenance.
   * Add recurring maintenance scheduling capability.
   * Implement maintenance history and reporting features.

7. **Refinement & Testing:**
   * Thoroughly test all CRUD operations, workflow transitions, and UI interactions.
   * Ensure proper validation of maintenance request data.
   * Verify integration with the Stand Capacity Engine for accurate capacity calculations.

This incremental approach ensures we build a functional stand maintenance system that integrates with the overall capacity planning tool, providing more accurate and realistic capacity calculations that account for scheduled maintenance activities. 