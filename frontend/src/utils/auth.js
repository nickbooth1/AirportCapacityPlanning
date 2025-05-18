/**
 * Get the authentication token from local storage
 * @returns {string|null} The authentication token
 */
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

/**
 * Set the authentication token in local storage
 * @param {string} token - The authentication token
 */
export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
};

/**
 * Remove the authentication token from local storage
 */
export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
};

/**
 * Check if the user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Get the user ID from the token
 * @returns {string|null} The user ID
 */
export const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId');
  }
  return null;
};

/**
 * Set the user ID in local storage
 * @param {string} userId - The user ID
 */
export const setUserId = (userId) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userId', userId);
  }
};

/**
 * Get the user's role
 * @returns {string|null} The user's role
 */
export const getUserRole = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userRole');
  }
  return null;
};

/**
 * Check if the user has admin role
 * @returns {boolean} True if admin, false otherwise
 */
export const isAdmin = () => {
  const role = getUserRole();
  return role === 'admin';
};