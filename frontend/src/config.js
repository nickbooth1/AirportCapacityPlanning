/**
 * Application configuration
 */

// API configuration
// We use the root API URL and add the '/api' prefix in the API calls
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001') + '/api'; 