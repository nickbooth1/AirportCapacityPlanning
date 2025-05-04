# Airport Capacity Planner Architecture

## System Architecture

```
                   +-----------------+
                   |                 |
                   |  Web Browser    |
                   |                 |
                   +--------+--------+
                            |
                            | HTTP
                            |
                   +--------v--------+
                   |                 |
                   |  Next.js        |
                   |  Frontend       |
                   |                 |
                   +--------+--------+
                            |
                            | HTTP/REST API
                            |
+------------+     +--------v--------+     +---------------+
|            |     |                 |     |               |
|  PostgreSQL+<--->+  Express.js     |     |  Airport      |
|  Database  |     |  Backend API    +<--->+  External     |
|            |     |                 |     |  Services     |
+------------+     +-----------------+     +---------------+
```

## Component Description

### Frontend (Next.js)
- **Pages**: React pages for each view in the application
- **Components**: Reusable UI components
- **Lib**: Utility functions and API client
- **Hooks**: Custom React hooks for state management
- **Styles**: CSS and styling utilities

### Backend (Express.js)
- **Controllers**: Request handlers for API endpoints
- **Services**: Business logic and operations
- **Models**: Data models interfacing with the database
- **Routes**: API route definitions
- **Middleware**: Authentication, validation, error handling
- **Utils**: Utility functions and helpers
- **Migrations**: Database schema management

### Database (PostgreSQL)
- **Terminals**: Airport terminal data
- **Piers**: Terminal pier data
- **Stands**: Aircraft stand data and configurations
- **Aircraft Types**: Aircraft specifications and categories
- **Stand Constraints**: Compatibility rules for aircraft types at stands
- **Operational Settings**: Global application settings
- **Turnaround Rules**: Aircraft turnaround time rules

## Data Flow

1. **User Interface** - Browser displays the Next.js frontend
2. **Frontend Logic** - React components make API calls to the backend
3. **API Layer** - Express.js handles requests, validates inputs
4. **Business Logic** - Services implement domain-specific operations
5. **Data Access** - Models interact with the PostgreSQL database
6. **Response** - Data flows back through the layers to the user

## Technology Stack

- **Frontend**:
  - Next.js for server-side rendering
  - React for UI components
  - Material UI for design system
  - Leaflet for map visualizations
  - Axios for API requests

- **Backend**:
  - Node.js runtime
  - Express.js web framework
  - Knex.js for database queries
  - PostgreSQL client for database connection
  - JWT for authentication

- **Database**:
  - PostgreSQL for relational data storage

- **Development**:
  - Git for version control
  - npm for package management
  - Jest for testing
  - ESLint and Prettier for code linting 