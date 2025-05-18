/**
 * User Preferences Context
 * 
 * React context provider for user preferences across the application
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import userPreferencesApi from '../api/userPreferencesApi';

// Create context
const UserPreferencesContext = createContext();

// Default preferences
const defaultPreferences = {
  theme: 'system',
  notificationEnabled: true,
  defaultAirport: null,
  defaultTimeHorizon: 'week',
  autoRefreshInterval: 60,
  dataPresentation: 'chart',
  advancedMode: false
};

/**
 * User Preferences Provider component
 */
export const UserPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userPreferences = await userPreferencesApi.getUserPreferences();
        setPreferences(userPreferences || defaultPreferences);
      } catch (err) {
        console.error('Error loading preferences:', err);
        setError('Failed to load user preferences');
        // Fall back to defaults
        setPreferences(defaultPreferences);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, []);
  
  /**
   * Update preferences
   * @param {Object} newPreferences - New preferences to update
   * @returns {Promise<Object>} - Updated preferences
   */
  const updatePreferences = async (newPreferences) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      
      // Update on server
      const updatedPreferences = await userPreferencesApi.updatePreferences({
        ...preferences,
        ...newPreferences
      });
      
      // Update with server response
      setPreferences(updatedPreferences);
      
      return updatedPreferences;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
      throw err;
    }
  };
  
  /**
   * Update a single preference
   * @param {string} key - Preference key
   * @param {*} value - New value
   * @returns {Promise<Object>} - Updated preferences
   */
  const updatePreference = async (key, value) => {
    return updatePreferences({ [key]: value });
  };
  
  /**
   * Reset preferences to defaults
   * @param {Array} [categories] - Optional categories to reset
   * @returns {Promise<Object>} - Reset preferences
   */
  const resetPreferences = async (categories = null) => {
    try {
      setError(null);
      
      const resetPrefs = await userPreferencesApi.resetPreferences(categories);
      setPreferences(resetPrefs);
      
      return resetPrefs;
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError('Failed to reset preferences');
      throw err;
    }
  };
  
  // Context value
  const value = {
    preferences,
    loading,
    error,
    updatePreferences,
    updatePreference,
    resetPreferences
  };
  
  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

/**
 * Hook for using user preferences context
 * @returns {Object} User preferences context
 */
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  
  return context;
};

export default UserPreferencesContext;