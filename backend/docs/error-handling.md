# Error Handling and Input Validation

This document describes the error handling and input validation mechanisms implemented in the Airport Capacity Planner API.

## Error Handling

The application implements a robust error handling system that:

1. Provides consistent error responses across all endpoints
2. Logs errors with appropriate context for debugging
3. Prevents sensitive information leakage in production
4. Uses appropriate HTTP status codes for different error types

### Error Types

The following custom error types are implemented:

- **ValidationError** (400): Invalid input data
- **UnauthorizedError** (401): Authentication required
- **ForbiddenError** (403): Insufficient permissions
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Resource conflict
- **RateLimitError** (429): Rate limit exceeded

### Error Response Format

All error responses follow a consistent structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorId": "unique-error-identifier",
  "details": [
    {
      "message": "Specific validation error message",
      "path": ["field", "with", "error"],
      "type": "validation.error.type"
    }
  ]
}
```

- `success`: Always false for error responses
- `error`: A concise, user-friendly error message
- `errorId`: A unique identifier for tracking the error in logs
- `details`: Optional array of detailed error information (validation errors)

The `stack` property is included only in development mode.

### Global Error Handler

The application uses a global error handling middleware that:

1. Catches all unhandled errors from routes and middleware
2. Formats error responses according to the standard format
3. Logs errors with context and request information
4. Sets appropriate HTTP status codes

## Input Validation

The application implements comprehensive input validation using:

1. Validation middleware for request parameters
2. Controller-level validation for business rules
3. Service-level validation for domain logic

### Validation Middleware

Validation middleware is applied to all API routes to:

1. Validate request parameters, query strings, and bodies
2. Reject invalid requests before reaching controllers
3. Provide detailed error messages for invalid input

### Validation Utilities

The `validation.js` utility provides:

1. Functions to validate common data types (UUIDs, IDs, etc.)
2. Functions to validate complex domain objects
3. Consistent validation result format

## Implementation

### Core Files

- **[src/middleware/errorHandler.js](../src/middleware/errorHandler.js)**: Global error handling middleware and custom error classes
- **[src/middleware/validationMiddleware.js](../src/middleware/validationMiddleware.js)**: Request validation middleware
- **[src/utils/validation.js](../src/utils/validation.js)**: Validation utility functions

### Usage Examples

#### Controller Error Handling

Controllers use try/catch blocks and pass errors to the next middleware:

```javascript
async processQuery(req, res, next) {
  try {
    // Controller logic
    const result = await service.doSomething();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Log the error and pass to the error handler
    logger.error(`Error in processQuery: ${error.message}`);
    next(error);
  }
}
```

#### Custom Error Throwing

For specific error conditions, use custom error classes:

```javascript
if (!user) {
  throw new NotFoundError('User not found');
}

if (user.id !== requestingUserId) {
  throw new ForbiddenError('You do not have permission to access this resource');
}
```

#### Request Validation

Routes use validation middleware:

```javascript
router.post('/query',
  validationMiddleware.validateAgentQuery,
  (req, res, next) => {
    try {
      controller.processQuery(req, res);
    } catch (error) {
      next(error);
    }
  }
);
```

## Testing

The error handling and validation system is tested through:

1. Unit tests for validation functions
2. Integration tests for validation middleware
3. End-to-end tests for error responses

See the test suite in `tests/unit/agent/AgentController.test.js` for examples.