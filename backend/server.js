const express = require('express');
const cors = require('cors');
const app = express();

// Configure middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend to access
  credentials: true
}));

app.use(express.json());

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a mock flights endpoint
app.get('/api/flights', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  const mockFlights = Array.from({ length: pageSize }, (_, i) => ({
    id: (page - 1) * pageSize + i + 1,
    flight_number: `BA${1000 + i}`,
    airline: 'British Airways',
    aircraft_type: 'B737',
    origin: 'LHR',
    destination: 'JFK',
    scheduled_datetime: new Date(Date.now() + i * 3600000).toISOString(),
    status: 'Scheduled'
  }));
  
  res.json({
    data: mockFlights,
    pagination: {
      total: 100,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    }
  });
});

// Add a mock airlines endpoint
app.get('/api/airlines', (req, res) => {
  const mockAirlines = [
    { id: 1, code: 'BA', name: 'British Airways', country: 'GB', active: true },
    { id: 2, code: 'LH', name: 'Lufthansa', country: 'DE', active: true },
    { id: 3, code: 'AF', name: 'Air France', country: 'FR', active: true }
  ];
  
  res.json({
    success: true,
    message: "Airlines retrieved successfully",
    data: mockAirlines
  });
});

// Add a simple airport config endpoint
app.get('/api/airport-config', (req, res) => {
  res.json({
    name: "London Heathrow",
    code: "LHR",
    timezone: "Europe/London",
    lat: 51.4700,
    lng: -0.4543
  });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
}); 