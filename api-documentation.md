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