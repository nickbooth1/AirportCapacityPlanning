# Airport Capacity Planner MVP

An application for planning and optimizing airport capacity, including terminal, pier, and stand management.

## Project Overview

The Airport Capacity Planner helps airport operators optimize the usage of terminals, piers, and aircraft stands. It allows for:

- Managing terminal and pier configurations
- Aircraft stand allocation and constraints
- Operational settings and turnaround rules
- Capacity analysis and optimization

## System Architecture

The application consists of:

- **Frontend**: Next.js application with interactive visualization
- **Backend**: Node.js/Express REST API
- **Database**: PostgreSQL for data persistence

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL (v14 or later)
- Git

### Setup Instructions

1. Clone the repository
```
git clone https://github.com/nickbooth1/AirportCapacityPlannerMVP.git
cd AirportCapacityPlannerMVP
```

2. Install dependencies for backend
```
cd backend
npm install
```

3. Install dependencies for frontend
```
cd ../frontend
npm install
```

4. Set up environment variables
```
cp backend/.env.example backend/.env
# Edit .env file with your database credentials
```

5. Set up the database
```
cd backend
npm run db:migrate
```

6. Start the development servers
```
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

7. Visit the application at `http://localhost:3000`

## Testing Connectivity

To ensure that all components of the system are properly connected and functioning together, you can run the provided connectivity tests:

### Automated Test Script

The easiest way to test system connectivity is to run the all-in-one test script:

```
npm run test:all
```

This script will:
1. Check if the database exists and create it if needed
2. Run database migrations and seed data
3. Start the backend server
4. Start the frontend development server
5. Run connectivity tests between all components
6. Clean up the running processes

### Individual Component Tests

You can also run tests for specific system components:

```
# Test backend database connectivity
npm run test:backend-db

# Test frontend API connectivity
npm run test:frontend-api

# Test end-to-end connectivity
npm run test:e2e
```

For more details about the connectivity tests, see [tests/README.md](tests/README.md).

## Development

### Project Structure

- `/backend` - Express.js API
  - `/src` - Source code
    - `/controllers` - Request handlers
    - `/services` - Business logic
    - `/models` - Data models
    - `/routes` - API routes
    - `/middleware` - Express middleware
    - `/utils` - Utility functions
    - `/migrations` - Database migrations

- `/frontend` - Next.js application
  - `/pages` - Next.js pages
  - `/components` - React components
  - `/lib` - Utility functions
  - `/hooks` - Custom React hooks
  - `/styles` - CSS and style-related files

## License

This project is licensed under the MIT License. 