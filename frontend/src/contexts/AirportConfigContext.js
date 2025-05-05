import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// API base URL - should match the backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create the context
const AirportConfigContext = createContext();

/**
 * Airport Configuration Provider Component
 * Provides state and methods for managing airport configuration
 */
export const AirportConfigProvider = ({ children }) => {
  // State for the configuration data
  const [airportConfig, setAirportConfig] = useState({
    baseAirport: null,
    airlineAllocations: []
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch configuration data on component mount
  useEffect(() => {
    fetchAirportConfig();
  }, []);
  
  /**
   * Fetch airport configuration from the API
   */
  const fetchAirportConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch base airport configuration
      const configResponse = await axios.get(`${API_URL}/airport-config`);
      
      // Fetch airline allocations
      const allocationsResponse = await axios.get(`${API_URL}/airport-config/allocations`);
      
      setAirportConfig({
        baseAirport: configResponse.data.data.baseAirport,
        airlineAllocations: allocationsResponse.data.data || []
      });
    } catch (err) {
      console.error('Error fetching airport configuration:', err);
      setError('Failed to load airport configuration');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update the base airport
   */
  const updateBaseAirport = async (airportId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`${API_URL}/airport-config`, {
        baseAirportId: airportId
      });
      
      // Update only the baseAirport part of the state
      setAirportConfig(prev => ({
        ...prev,
        baseAirport: response.data.data.baseAirport
      }));
      
      return true;
    } catch (err) {
      console.error('Error updating base airport:', err);
      setError('Failed to update base airport');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Add a new airline terminal allocation
   */
  const addAirlineAllocation = async (allocation) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/airport-config/allocations`, {
        airlineId: allocation.airlineId,
        terminalId: allocation.terminalId,
        ghaId: allocation.ghaId
      });
      
      // Add the new allocation to the state
      setAirportConfig(prev => ({
        ...prev,
        airlineAllocations: [...prev.airlineAllocations, response.data.data]
      }));
      
      return true;
    } catch (err) {
      console.error('Error adding airline allocation:', err);
      setError(err.response?.data?.message || 'Failed to add airline allocation');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update an existing airline terminal allocation
   */
  const updateAirlineAllocation = async (id, allocation) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`${API_URL}/airport-config/allocations/${id}`, {
        airlineId: allocation.airlineId,
        terminalId: allocation.terminalId,
        ghaId: allocation.ghaId
      });
      
      // Update the allocation in state
      setAirportConfig(prev => ({
        ...prev,
        airlineAllocations: prev.airlineAllocations.map(a => 
          a.id === id ? response.data.data : a
        )
      }));
      
      return true;
    } catch (err) {
      console.error('Error updating airline allocation:', err);
      setError(err.response?.data?.message || 'Failed to update airline allocation');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Delete an airline terminal allocation
   */
  const deleteAirlineAllocation = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete(`${API_URL}/airport-config/allocations/${id}`);
      
      // Remove the allocation from state
      setAirportConfig(prev => ({
        ...prev,
        airlineAllocations: prev.airlineAllocations.filter(a => a.id !== id)
      }));
      
      return true;
    } catch (err) {
      console.error('Error deleting airline allocation:', err);
      setError('Failed to delete airline allocation');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Context value that will be provided
  const contextValue = {
    airportConfig,
    loading,
    error,
    refreshConfig: fetchAirportConfig,
    updateBaseAirport,
    addAirlineAllocation,
    updateAirlineAllocation,
    deleteAirlineAllocation
  };
  
  return (
    <AirportConfigContext.Provider value={contextValue}>
      {children}
    </AirportConfigContext.Provider>
  );
};

/**
 * Custom hook for using the airport configuration context
 */
export const useAirportConfig = () => {
  const context = useContext(AirportConfigContext);
  
  if (!context) {
    throw new Error('useAirportConfig must be used within an AirportConfigProvider');
  }
  
  return context;
}; 