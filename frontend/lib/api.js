import axios from 'axios';

// Create a base API client with default configuration
const apiClient = axios.create({
  baseURL: '/api', // Use relative path
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add a request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Handle connectivity issues
    if (!response) {
      console.error('Network error detected:', error.message);
      // Custom error for network issues
      const networkError = new Error('Cannot connect to the server. Please check if the backend is running.');
      networkError.isNetworkError = true;
      networkError.originalError = error;
      return Promise.reject(networkError);
    }
    
    // Handle specific error status codes
    if (response.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    // Create a more detailed error
    const enhancedError = new Error(response.data?.message || 'An error occurred');
    enhancedError.status = response.status;
    enhancedError.statusText = response.statusText;
    enhancedError.data = response.data;
    
    // Pass the error to the caller
    return Promise.reject(enhancedError);
  }
);

// API endpoints
export const api = {
  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  
  // Terminals
  getTerminals: () => apiClient.get('/terminals'),
  getTerminal: (id) => apiClient.get(`/terminals/${id}`),
  createTerminal: (data) => apiClient.post('/terminals', data),
  updateTerminal: (id, data) => apiClient.put(`/terminals/${id}`, data),
  deleteTerminal: (id) => apiClient.delete(`/terminals/${id}`),
  
  // Piers
  getPiers: () => apiClient.get('/piers'),
  getPier: (id) => apiClient.get(`/piers/${id}`),
  createPier: (data) => apiClient.post('/piers', data),
  updatePier: (id, data) => apiClient.put(`/piers/${id}`, data),
  deletePier: (id) => apiClient.delete(`/piers/${id}`),
  getPiersByTerminal: (terminalId) => apiClient.get(`/piers/by-terminal/${terminalId}`),
  
  // Aircraft Types
  getAircraftTypes: () => apiClient.get('/aircraft-types'),
  getAircraftType: (id) => apiClient.get(`/aircraft-types/${id}`),
  createAircraftType: (data) => apiClient.post('/aircraft-types', data),
  updateAircraftType: (id, data) => apiClient.put(`/aircraft-types/${id}`, data),
  deleteAircraftType: (id) => apiClient.delete(`/aircraft-types/${id}`),
  
  // Aircraft Size Categories
  getAircraftSizeCategories: () => apiClient.get('/aircraft-size-categories'),
  getAircraftSizeCategory: (id) => apiClient.get(`/aircraft-size-categories/${id}`),
  createAircraftSizeCategory: (data) => apiClient.post('/aircraft-size-categories', data),
  updateAircraftSizeCategory: (id, data) => apiClient.put(`/aircraft-size-categories/${id}`, data),
  deleteAircraftSizeCategory: (id) => apiClient.delete(`/aircraft-size-categories/${id}`),
  
  // Stands
  getStands: () => apiClient.get('/stands'),
  getStand: (id) => apiClient.get(`/stands/${id}`),
  createStand: (data) => apiClient.post('/stands', data),
  updateStand: (id, data) => apiClient.put(`/stands/${id}`, data),
  deleteStand: (id) => apiClient.delete(`/stands/${id}`),
  getStandsByPier: (pierId) => apiClient.get(`/stands/by-pier/${pierId}`),
  
  // Stand Aircraft Constraints
  getAllStandConstraints: () => apiClient.get('/stand-constraints'),
  getStandConstraints: (standId) => apiClient.get(`/stand-constraints/by-stand/${standId}`),
  getAircraftConstraints: (aircraftTypeId) => apiClient.get(`/stand-constraints/by-aircraft/${aircraftTypeId}`),
  createStandConstraint: (data) => apiClient.post('/stand-constraints', data),
  updateStandConstraint: (id, data) => apiClient.put(`/stand-constraints/${id}`, data),
  deleteStandConstraint: (id) => apiClient.delete(`/stand-constraints/${id}`),
  
  // Stand Adjacencies
  getStandAdjacencies: (standId) => apiClient.get(`/stand-adjacencies/stand/${standId}`),
  createStandAdjacency: (data) => apiClient.post('/stand-adjacencies', data),
  updateStandAdjacency: (id, data) => apiClient.put(`/stand-adjacencies/${id}`, data),
  deleteStandAdjacency: (id) => apiClient.delete(`/stand-adjacencies/${id}`),
  
  // Operational Settings
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (data) => apiClient.put('/settings', data),
  
  // Turnaround Rules
  getTurnaroundRules: () => apiClient.get('/turnaround-rules'),
  getTurnaroundRule: (id) => apiClient.get(`/turnaround-rules/${id}`),
  createTurnaroundRule: (data) => apiClient.post('/turnaround-rules', data),
  updateTurnaroundRule: (id, data) => apiClient.put(`/turnaround-rules/${id}`, data),
  deleteTurnaroundRule: (id) => apiClient.delete(`/turnaround-rules/${id}`),

  // Maintenance Requests
  getMaintenanceRequests: (params) => apiClient.get('/maintenance/requests', { params }),
  getMaintenanceRequest: (id) => apiClient.get(`/maintenance/requests/${id}`),
  createMaintenanceRequest: (data) => apiClient.post('/maintenance/requests', data),
  updateMaintenanceRequest: (id, data) => apiClient.put(`/maintenance/requests/${id}`, data),
  deleteMaintenanceRequest: (id) => apiClient.delete(`/maintenance/requests/${id}`),
  
  // Maintenance Status Types
  getMaintenanceStatusTypes: () => apiClient.get('/maintenance/status-types'),
  
  // Maintenance Calendar
  getMaintenanceCalendarEvents: (params) => apiClient.get('/maintenance/calendar', { params }),
  
  // Maintenance Impact Analysis
  getMaintenanceImpact: (params) => apiClient.get('/maintenance/impact', { params }),
  
  // General purpose API methods
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
};

export default api; 