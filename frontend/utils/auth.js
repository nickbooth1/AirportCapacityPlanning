/**
 * Authentication utilities
 */

/**
 * Get authentication token from localStorage
 * @returns {string|null} Authentication token or null if not logged in
 */
export const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('auth_token');
};

/**
 * Set authentication token in localStorage
 * @param {string} token - Authentication token
 */
export const setAuthToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem('auth_token', token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = () => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('auth_token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Parse JWT token to get user info
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const parseToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return {};
  }
};

/**
 * Get current user info from token
 * @returns {Object} User info
 */
export const getCurrentUser = () => {
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  
  return parseToken(token);
};