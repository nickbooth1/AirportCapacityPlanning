#!/bin/bash

# Airport Capacity Planner - Development Environment Setup Script

echo "Setting up development environment for Airport Capacity Planner..."

# Check if PostgreSQL is installed
if command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL is installed"
else
  echo "PostgreSQL is not installed. Please install PostgreSQL and try again."
  exit 1
fi

# Check if Node.js is installed
if command -v node >/dev/null 2>&1; then
  echo "Node.js is installed: $(node -v)"
else
  echo "Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

# Check if npm is installed
if command -v npm >/dev/null 2>&1; then
  echo "npm is installed: $(npm -v)"
else
  echo "npm is not installed. Please install npm and try again."
  exit 1
fi

# Create PostgreSQL database
echo "Creating PostgreSQL database..."
read -p "Enter PostgreSQL username [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

echo "Creating database 'airport_capacity_planner'..."
createdb -U "$DB_USER" airport_capacity_planner || {
  echo "Could not create database. Please check your PostgreSQL installation and permissions."
  exit 1
}

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Create .env file
echo "Creating .env file for backend..."
if [ ! -f .env ]; then
  cat > .env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=airport_capacity_planner
DB_USER=${DB_USER}
DB_PASSWORD=postgres

# JWT Secret (for authentication)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=1d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
EOF
  echo ".env file created. Please edit with your database credentials."
else
  echo ".env file already exists. Skipping..."
fi

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Seed database with initial data
echo "Seeding database with initial data..."
npm run db:seed

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Create .env.local file
echo "Creating .env.local file for frontend..."
if [ ! -f .env.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
  echo ".env.local file created."
else
  echo ".env.local file already exists. Skipping..."
fi

# Success message
echo "========================================================"
echo "Development environment setup complete!"
echo "========================================================"
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "To start the frontend server:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Make sure to update the .env file in the backend directory with your database credentials."
echo ""
echo "Happy coding!"

exit 0 