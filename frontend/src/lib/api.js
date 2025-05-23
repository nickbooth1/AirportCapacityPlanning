// lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001') + '/api', // Add /api prefix
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for handling errors or adding auth tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally if needed
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 