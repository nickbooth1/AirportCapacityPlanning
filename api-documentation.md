# API Documentation: Airport Capacity Planner

This document provides an overview of the RESTful API endpoints available in the Airport Capacity Planner application.

## Base URL

All API endpoints are relative to: `http://localhost:3001/api/`

## Authentication

Most endpoints require authentication using JWT tokens:

```
Authorization: Bearer <token>
```

To obtain a token, use the login endpoint:

```
POST /auth/login
```

## Response Format

All API responses follow a consistent format:

```json
{
  "status": "success" | "error",
  "data": {...} | [...],
  "message": "Error message if status is error",
  "errors": ["Detailed error messages if available"]
}
```

## Endpoints

### Authentication

#### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Success Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "token": "jwt-token",
      "user": {
        "id": 1,
        "username": "admin",
        "role": "admin"
      }
    }
  }
  ```

### Terminals

#### Get All Terminals
- **URL**: `/terminals`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "status": "success",
    "results": 2,
    "data": [
      {
        "id": 1,
        "name": "Terminal 1",
        "code": "T1",
        "description": "Main international terminal"
      },
      {
        "id": 2,
        "name": "Terminal 2",
        "code": "T2",
        "description": "Domestic flights terminal"
      }
    ]
  }
  ```

#### Get Terminal by ID
- **URL**: `/terminals/:id`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": 1,
      "name": "Terminal 1",
      "code": "T1",
      "description": "Main international terminal"
    }
  }
  ```

#### Create Terminal
- **URL**: `/terminals`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Terminal 3",
    "code": "T3",
    "description": "New international terminal"
  }
  ```
- **Success Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": 3,
      "name": "Terminal 3",
      "code": "T3",
      "description": "New international terminal"
    }
  }
  ```

#### Update Terminal
- **URL**: `/terminals/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Terminal 3 Updated",
    "description": "Updated description"
  }
  ```
- **Success Response**: 
  ```json
  {
    "status": "success",
    "data": {
      "id": 3,
      "name": "Terminal 3 Updated",
      "code": "T3",
      "description": "Updated description"
    }
  }
  ```

#### Delete Terminal
- **URL**: `/terminals/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 
  ```json
  {
    "status": "success",
    "message": "Terminal with ID 3 successfully deleted"
  }
  ```

#### Get Terminal Piers
- **URL**: `/terminals/:id/piers`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "status": "success",
    "results": 2,
    "data": [
      {
        "id": 1,
        "name": "Pier A",
        "code": "A",
        "terminal_id": 1,
        "description": "International wide-body pier"
      },
      {
        "id": 2,
        "name": "Pier B",
        "code": "B",
        "terminal_id": 1,
        "description": "International narrow-body pier"
      }
    ]
  }
  ```

### Piers

Similar CRUD endpoints are available for piers at `/piers`.

### Stands

Similar CRUD endpoints are available for stands at `/stands`.

#### Get Stand Constraints
- **URL**: `/stands/:id/constraints`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "status": "success",
    "results": 2,
    "data": [
      {
        "id": 1,
        "stand_id": 1,
        "aircraft_type_id": 1,
        "is_allowed": true,
        "constraint_reason": null,
        "aircraft_type": {
          "id": 1,
          "iata_code": "388",
          "name": "Airbus A380-800"
        }
      },
      {
        "id": 2,
        "stand_id": 1,
        "aircraft_type_id": 2,
        "is_allowed": true,
        "constraint_reason": null,
        "aircraft_type": {
          "id": 2,
          "iata_code": "77W",
          "name": "Boeing 777-300ER"
        }
      }
    ]
  }
  ```

### Aircraft Types

Similar CRUD endpoints are available for aircraft types at `/aircraft-types`.

### Configuration

#### Get Operational Settings
- **URL**: `/config/settings`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "id": 1,
    "default_gap_minutes": 15,
    "operating_start_time": "06:00:00",
    "operating_end_time": "23:59:59",
    "created_at": "2024-07-20T10:23:45.000Z",
    "updated_at": "2024-07-20T10:23:45.000Z"
  }
  ```

#### Update Operational Settings
- **URL**: `/config/settings`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "default_gap_minutes": 20,
    "operating_start_time": "05:00:00",
    "operating_end_time": "23:00:00"
  }
  ```
- **Success Response**: 
  ```json
  {
    "id": 1,
    "default_gap_minutes": 20,
    "operating_start_time": "05:00:00",
    "operating_end_time": "23:00:00",
    "created_at": "2024-07-20T10:23:45.000Z",
    "updated_at": "2024-08-20T15:30:22.000Z"
  }
  ```

#### Get All Turnaround Rules
- **URL**: `/config/turnaround-rules`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  [
    {
      "id": "a1b2c3d4-1234-5678-90ab-cdef12345678",
      "aircraft_type_id": 1,
      "min_turnaround_minutes": 90,
      "created_at": "2024-07-20T10:23:45.000Z",
      "updated_at": "2024-07-20T10:23:45.000Z",
      "aircraftType": {
        "id": 1,
        "iata_code": "388",
        "icao_code": "A388",
        "name": "Airbus A380-800"
      }
    },
    {
      "id": "e5f6g7h8-9012-3456-78ij-klmn90123456",
      "aircraft_type_id": 2,
      "min_turnaround_minutes": 60,
      "created_at": "2024-07-20T10:23:45.000Z",
      "updated_at": "2024-07-20T10:23:45.000Z",
      "aircraftType": {
        "id": 2,
        "iata_code": "77W",
        "icao_code": "B77W",
        "name": "Boeing 777-300ER"
      }
    }
  ]
  ```

#### Get Turnaround Rule by Aircraft Type
- **URL**: `/config/turnaround-rules/aircraft-type/:id`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: 
  ```json
  {
    "id": "a1b2c3d4-1234-5678-90ab-cdef12345678",
    "aircraft_type_id": 1,
    "min_turnaround_minutes": 90,
    "created_at": "2024-07-20T10:23:45.000Z",
    "updated_at": "2024-07-20T10:23:45.000Z",
    "aircraftType": {
      "id": 1,
      "iata_code": "388",
      "icao_code": "A388",
      "name": "Airbus A380-800"
    }
  }
  ```

#### Create Turnaround Rule
- **URL**: `/config/turnaround-rules`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "aircraft_type_id": 3,
    "min_turnaround_minutes": 45
  }
  ```
- **Success Response**: 
  ```json
  {
    "id": "i9j0k1l2-3456-7890-abcd-efgh12345678",
    "aircraft_type_id": 3,
    "min_turnaround_minutes": 45,
    "created_at": "2024-08-20T15:45:22.000Z",
    "updated_at": "2024-08-20T15:45:22.000Z"
  }
  ```

#### Update Turnaround Rule
- **URL**: `/config/turnaround-rules/aircraft-type/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "min_turnaround_minutes": 50
  }
  ```
- **Success Response**: 
  ```json
  {
    "id": "i9j0k1l2-3456-7890-abcd-efgh12345678",
    "aircraft_type_id": 3,
    "min_turnaround_minutes": 50,
    "created_at": "2024-08-20T15:45:22.000Z",
    "updated_at": "2024-08-20T16:12:35.000Z"
  }
  ```

#### Delete Turnaround Rule
- **URL**: `/config/turnaround-rules/aircraft-type/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 
  - Status: 204 No Content

### Operational Settings

Similar CRUD endpoints are available for operational settings at `/settings`.

### Turnaround Rules

Similar CRUD endpoints are available for turnaround rules at `/turnaround-rules`.

## Error Responses

### Not Found (404)
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### Bad Request (400)
```json
{
  "status": "error",
  "message": "Validation Error",
  "errors": ["Name is required", "Code is required"]
}
```

### Unauthorized (401)
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```

### Forbidden (403)
```json
{
  "status": "error",
  "message": "Forbidden"
}
```

### Conflict (409)
```json
{
  "status": "error",
  "message": "Duplicate entry"
}
```

### Internal Server Error (500)
```json
{
  "status": "error",
  "message": "Internal Server Error"
}
``` 