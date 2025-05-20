# Stand Management and Deletion Documentation

This document outlines the comprehensive features for stand management, soft deletion, and dependency handling in the Airport Capacity Planner system.

## 1. Soft Delete Functionality

### Overview

Soft delete allows stands to be marked as deleted without physically removing them from the database. This provides several benefits:

1. Historical records are preserved
2. Accidental deletions can be restored
3. References to stands from other entities remain intact
4. Reporting and auditing are more complete

### Database Schema

The soft delete functionality is implemented with the following columns in the `stands` table:

- `deleted_at`: Timestamp indicating when the stand was deleted (NULL for active stands)
- `deleted_by`: Reference to the user or system that performed the deletion
- `deletion_reason`: Optional text explaining why the stand was deleted

### Model Modifiers

The Stand model includes the following query modifiers:

- `notDeleted`: Only return stands that haven't been soft-deleted
- `onlyDeleted`: Only return stands that have been soft-deleted
- `withDeleted`: Return all stands, regardless of deletion status

### Service Layer Functions

The following service methods have been enhanced to support soft delete:

- `getAllStands`: Includes options for `includeDeleted` and `onlyDeleted`
- `getStandById`: Includes option for `includeDeleted`
- `getStandsByPierId`: Includes options for `includeDeleted` and `onlyDeleted` 
- `getStandsByTerminalId`: Includes options for `includeDeleted` and `onlyDeleted`
- `searchStands`: Includes options for `includeDeleted` and `onlyDeleted`
- `deleteStand`: Defaults to soft delete with `softDelete` option to control behavior
- `undeleteStand`: New method to restore soft-deleted stands

## 2. Cascade Rules and Dependency Management

### Overview

When deleting stands, various dependencies need to be handled carefully to maintain data integrity. The system implements cascade rules to ensure that dependent entities are properly handled during stand deletion.

### Stand Dependencies

Stands can have multiple types of dependencies:

1. **Maintenance Requests**: Scheduled maintenance for the stand
2. **Adjacency Rules**: Rules defining relationships between stands

### Dependency Discovery

Before deletion, the system can check for dependencies:

- `GET /stands/:id/dependencies`: Returns a comprehensive list of all dependencies for a stand
- Includes counts and detailed information about each dependency

### Cascade Operations

When deleting a stand, the following cascade operations can be performed:

1. **Maintenance Request Cancellation**: 
   - Automatically cancel pending or scheduled maintenance requests
   - Option to skip active maintenance or cancel all
   - System-generated comments with cancellation reason

2. **Adjacency Rule Removal**:
   - Automatically remove all adjacency rules involving the stand
   - Both rules where the stand is primary or adjacent are handled

### Force and Cancel Options

The stand deletion API supports options for controlling cascade behavior:

- `force=true`: Override dependency checks and perform the deletion
- `cancelMaintenance=true`: Automatically cancel all maintenance requests
- `permanent=true`: Perform permanent deletion instead of soft delete
- `reason=TEXT`: Provide reason for deletion (used in maintenance cancellations)

## 3. Maintenance Request Cancellation

### Overview

The system supports cancellation of maintenance requests, both individually and as part of stand deletion cascade.

### Individual Cancellation

- `POST /maintenance/requests/:id/cancel`: Cancel a specific maintenance request
- Supports providing a cancellation reason
- Status is updated to "Cancelled" (status_id: 6)

### Bulk Cancellation

Bulk cancellation happens as part of the stand deletion process:

- Controlled by the `cancelMaintenance` parameter
- Includes audit trail entries for each cancelled request
- Notifies relevant users of cancellations

### Cancellation Considerations

- Completed maintenance (status_id: 5) cannot be cancelled
- Already cancelled maintenance (status_id: 6) is skipped
- Active maintenance can be cancelled with appropriate permissions

## 4. API Endpoints

### Stand Management Endpoints

- `GET /stands`: Accepts `includeDeleted` and `onlyDeleted` query parameters
- `GET /stands/:id`: Accepts `includeDeleted` query parameter
- `GET /stands/:id/dependencies`: Get all dependencies for a stand
- `DELETE /stands/:id`: Delete a stand with options for cascade operations
- `POST /stands/:id/restore`: Restore a soft-deleted stand

### Maintenance Request Endpoints

- `POST /maintenance/requests/:id/cancel`: Cancel a specific maintenance request
- `PUT /maintenance/requests/:id/status`: Update the status of a maintenance request

## 5. Usage Examples

### Checking Dependencies Before Deletion

```http
GET /stands/123/dependencies
```

### Soft Delete with Cascade Operations

```http
DELETE /stands/123?force=true&cancelMaintenance=true&reason=Removing%20obsolete%20stand
```

### Permanently Delete a Stand

```http
DELETE /stands/123?permanent=true&force=true
```

### Restore a Deleted Stand

```http
POST /stands/123/restore
```

### Cancel a Maintenance Request

```http
POST /maintenance/requests/abc-123/cancel
{
  "reason": "No longer needed due to operational changes"
}
```

## 6. Audit Trail

All operations are thoroughly logged through the AuditService:

- `soft_delete`: When a stand is soft-deleted
- `delete`: When a stand is permanently deleted
- `restore`: When a soft-deleted stand is restored
- `cancel`: When a maintenance request is cancelled

## 7. Validation and Safety Features

The system implements several validation mechanisms to prevent unsafe operations:

1. **Active Maintenance Detection**: 
   - Checks for maintenance currently in progress or scheduled
   - Prevents accidental disruption to airport operations

2. **Force Flag Requirements**:
   - Operations with dependencies require explicit force flag
   - Prevents accidental deletion of stands with dependencies

3. **Concurrency Control**:
   - ETag-based concurrency control for updates
   - Prevents conflicting changes and race conditions

4. **Comprehensive Audit Trail**:
   - All operations are fully logged
   - Tracks who performed the action, when, and why

5. **Stand Code Uniqueness**:
   - Ensures uniqueness of stand codes within a pier
   - Considers both active and soft-deleted stands

## 8. Implementation Considerations

- When checking for uniqueness constraints (e.g., stand code within pier), both active and soft-deleted stands are considered
- Soft-deleted stands are not shown in the UI by default
- Soft-deleted stands cannot be modified until they are restored
- The system maintains referential integrity even with soft-deleted records