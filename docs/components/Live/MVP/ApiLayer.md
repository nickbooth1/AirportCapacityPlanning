# CapaCity Component: API Layer

## 1. Overview

This component serves as the crucial intermediary between the User Interface (Frontend) and the backend business logic and data access layers. It exposes a well-defined set of endpoints (likely following RESTful principles for this project) that the frontend can consume to retrieve data, submit changes, and trigger actions like capacity calculations. It's responsible for receiving HTTP requests, routing them to the appropriate backend services, handling request/response formatting, implementing cross-cutting concerns like validation and potentially authentication/authorization in the future.

## 2. Inputs

*   **HTTP Requests:** Received from the Frontend (Next.js) application. These include:
    *   `GET` requests to fetch data (e.g., `/api/stands`, `/api/config/settings`).
    *   `POST` requests to create new resources (e.g., `/api/terminals`, `/api/config/turnaround-rules`).
    *   `PUT` or `PATCH` requests to update existing resources (e.g., `/api/stands/:id`, `/api/config/settings`).
    *   `DELETE` requests to remove resources (e.g., `/api/piers/:id`).
    *   Requests to trigger specific actions (e.g., `GET` or `POST` to `/api/capacity/calculate`).
*   **Request Data:** Payloads within the HTTP requests, typically JSON bodies for `POST`/`PUT`/`PATCH` requests, URL parameters (e.g., `:id`), and query string parameters.

## 3. Outputs

*   **HTTP Responses:** Sent back to the Frontend application. These include:
    *   **Data Payloads:** Structured data (typically JSON) in response to `GET` requests or successful `POST`/`PUT` requests (often returning the created/updated resource).
    *   **Status Codes:** Standard HTTP status codes indicating the outcome of the request (e.g., `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).
    *   **Error Messages:** Structured error information (JSON) in the response body for client-side (4xx) or server-side (5xx) errors.

## 4. Key Responsibilities

*   **Routing:** Mapping incoming HTTP request paths and methods to the correct backend controller or service function.
*   **Request Parsing:** Extracting data from request bodies, URL parameters, and query strings.
*   **Input Validation:** Checking incoming data for correctness (e.g., required fields, data types, valid formats) before passing it to backend services. This prevents invalid data from reaching the core logic or database.
*   **Response Formatting:** Structuring the data and status codes returned by backend services into standard HTTP responses.
*   **Error Handling:** Catching errors thrown by backend services and translating them into appropriate HTTP error responses.
*   **Middleware Integration:** Incorporating middleware functions for tasks like logging, request parsing (e.g., `express.json()`), potentially CORS (Cross-Origin Resource Sharing) handling, and future authentication/authorization.
*   **Decoupling:** Separating the frontend's interaction details (HTTP) from the core backend business logic.

## 5. Modules

*   **`Router Setup`:** Configuration defining all API routes and mapping them to handlers (likely organized by resource, e.g., `standsRouter`, `configRouter`).
*   **`Controllers/Handlers`:** Functions that receive the processed request, call the appropriate backend service methods, and format the response. They act as the direct link between the HTTP layer and the service layer.
*   **`Middleware`:** Functions executed during the request-response cycle:
    *   `Request Parsing Middleware` (e.g., `express.json()`)
    *   `Validation Middleware` (Could use libraries like `express-validator` or `zod`)
    *   `Error Handling Middleware` (A dedicated middleware to catch errors and send standardized responses)
    *   `Logging Middleware` (To log incoming requests/outgoing responses)
    *   `(Future) Auth Middleware` (To protect endpoints)

## 6. Incremental Delivery Plan

This component is built alongside the other backend components it serves.

1.  **Basic Setup (with Airport Definition - Stands):**
    *   Initialize Express.js (or chosen Node.js framework) in the backend project.
    *   Implement basic request parsing middleware (e.g., JSON body parser).
    *   Set up the initial router for `/api/stands`.
    *   Create basic handler functions for `GET /api/stands` and `POST /api/stands` that initially return mock data or call placeholder service functions.
2.  **Connect to Airport Definition Services:**
    *   Integrate the API handlers for `/api/stands` (and later terminals, piers, aircraft types) to call the actual methods on the `AirportDefinition` backend services.
    *   Implement basic input validation for creating/updating stands.
    *   Implement basic error handling to return appropriate HTTP status codes (e.g., 400 for bad input, 500 for server errors).
3.  **Connect to Capacity Configuration Services:**
    *   Set up routers and handlers for `/api/config/settings` and `/api/config/turnaround-rules`.
    *   Integrate these handlers to call the `CapacityConfiguration` backend services.
    *   Add input validation and error handling for configuration endpoints.
4.  **Connect to Stand Capacity Engine:**
    *   Set up the router and handler for `/api/capacity/calculate`.
    *   Integrate the handler to trigger the `StandCapacityEngine` service.
    *   Handle the response from the engine and return it to the client.
5.  **Refine Middleware:**
    *   Implement more robust input validation (e.g., using a dedicated library).
    *   Implement centralized error handling middleware.
    *   Add request logging middleware.
    *   Configure CORS if frontend and backend are served from different origins.
6.  **Testing:**
    *   Implement API-level tests (integration tests) to verify routing, validation, data transformation, and error handling for all endpoints.

This layer evolves as the backend services it exposes are developed. 