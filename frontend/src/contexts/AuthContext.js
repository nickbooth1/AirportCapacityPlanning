import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for existing auth on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // For now, we'll use a placeholder implementation that sets a default user
      // In a real implementation, you would check local storage or make an API call
      setUser({ id: 'default-user', name: 'Airport Staff', role: 'staff' });
      // Set a dummy token for development
      setToken('dummy-auth-token');
      setLoading(false);
    } catch (err) {
      console.error('Auth status check error:', err);
      setError('Failed to authenticate');
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      // Placeholder for actual API login
      // In a real implementation, you would call your auth API
      console.log('Login attempt with:', credentials);
      
      // Simulate successful login
      setUser({ id: credentials.username, name: 'Airport Staff', role: 'staff' });
      setToken('dummy-auth-token-' + Date.now());
      setError(null);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Placeholder for actual logout
      setUser(null);
      setToken(null);
      setError(null);
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 