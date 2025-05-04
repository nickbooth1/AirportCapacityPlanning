#!/bin/bash

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Airport Capacity Planner - Connectivity Test Script ===${NC}"
echo "This script will test connectivity between all components of the system."

# Check if the PostgreSQL database exists, create if not
echo -e "\n${YELLOW}Checking if database exists...${NC}"
if psql -lqt | cut -d \| -f 1 | grep -qw airport_capacity_planner; then
  echo -e "${GREEN}Database 'airport_capacity_planner' already exists.${NC}"
else
  echo "Creating database 'airport_capacity_planner'..."
  createdb airport_capacity_planner
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database created successfully.${NC}"
  else
    echo -e "${RED}Failed to create database. Please check PostgreSQL installation.${NC}"
    exit 1
  fi
fi

# Store the root directory
ROOT_DIR=$(pwd)

# Run database migrations if needed
echo -e "\n${YELLOW}Running database migrations...${NC}"
cd backend && npm run db:migrate
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Migrations completed successfully.${NC}"
else
  echo -e "${RED}Migration failed. Please check database configuration.${NC}"
  cd "$ROOT_DIR"
  exit 1
fi

# Seed database with initial data
echo -e "\n${YELLOW}Seeding database with test data...${NC}"
npm run db:seed
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Database seeded successfully.${NC}"
else
  echo -e "${YELLOW}Warning: Seeding may have failed, but we'll continue.${NC}"
fi

# Return to root directory
cd "$ROOT_DIR"

# Install needed dependencies at root level
echo -e "\n${YELLOW}Installing root-level dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to install dependencies. Continuing anyway.${NC}"
fi

# Set up the environment configuration
echo -e "\n${YELLOW}Setting up backend environment...${NC}"
if [ ! -f backend/.env ]; then
  echo "Creating .env file for backend..."
  cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=airport_capacity_planner
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (for authentication)
JWT_SECRET=supersecretkey123456789
JWT_EXPIRES_IN=1d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
EOF
  echo -e "${GREEN}Backend .env file created.${NC}"
else
  echo -e "${GREEN}Backend .env file already exists.${NC}"
fi

# Start backend in background
echo -e "\n${YELLOW}Starting backend server...${NC}"
(cd backend && npm run dev) &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Give backend some time to start
sleep 5
echo -e "${GREEN}Backend should be running now.${NC}"

# Start frontend in background
echo -e "\n${YELLOW}Starting frontend server...${NC}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

# Give frontend some time to start
sleep 5
echo -e "${GREEN}Frontend should be running now.${NC}"

# Run the connectivity test
echo -e "\n${YELLOW}Running connectivity test...${NC}"
npm run test:e2e
TEST_RESULT=$?

# Clean up - kill the processes
echo -e "\n${YELLOW}Cleaning up...${NC}"
kill $BACKEND_PID
kill $FRONTEND_PID

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}All connectivity tests passed successfully!${NC}"
  echo "Your Airport Capacity Planner system components are properly connected."
  exit 0
else
  echo -e "\n${RED}Some connectivity tests failed.${NC}"
  echo "Please check the error messages above and fix any issues."
  exit 1
fi 