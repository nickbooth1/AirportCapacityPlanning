import React, { createContext, useState, useContext } from 'react';
import columnMappingApi from '../../api/columnMappingApi';

/**
 * Column Mapping Context
 * @type {React.Context}
 */
const ColumnMappingContext = createContext();

/**
 * Mapping status enum
 * @type {Object}
 */
export const MappingStatus = {
  IDLE: 'idle',
  DETECTING: 'detecting',
  CONFIGURING: 'configuring',
  APPLYING: 'applying',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Column Mapping Provider Component
 * Provides state and methods for column mapping workflow
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const ColumnMappingProvider = ({ children }) => {
  // Main state
  const [status, setStatus] = useState(MappingStatus.IDLE);
  const [sourceColumns, setSourceColumns] = useState([]);
  const [targetFields, setTargetFields] = useState([]);
  const [mappingSelections, setMappingSelections] = useState({});
  const [transformations, setTransformations] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [uploadId, setUploadId] = useState(null);
  
  // Common state
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  /**
   * Reset the mapping state to initial values
   */
  const resetMapping = () => {
    setStatus(MappingStatus.IDLE);
    setSourceColumns([]);
    setMappingSelections({});
    setTransformations({});
    setSelectedProfile(null);
    setUploadId(null);
    setError(null);
  };
  
  /**
   * Detect columns from an uploaded file
   * @param {File} file - File to detect columns from
   * @returns {Promise<boolean>} Success indicator
   */
  const detectColumnsFromFile = async (file) => {
    try {
      setStatus(MappingStatus.DETECTING);
      setLoading(true);
      setError(null);
      
      const response = await columnMappingApi.detectColumns(file);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to detect columns');
      }
      
      setSourceColumns(response.columns);
      setStatus(MappingStatus.CONFIGURING);
      
      // Load target fields if not already loaded
      if (targetFields.length === 0) {
        await loadTargetFields();
      }
      
      // Generate suggestions
      await suggestMappings(response.columns);
      
      return true;
    } catch (error) {
      console.error('Error detecting columns:', error);
      setError(error.message || 'Failed to detect columns');
      setStatus(MappingStatus.FAILED);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Detect columns from an existing upload
   * @param {number} id - Upload ID
   * @returns {Promise<boolean>} Success indicator
   */
  const detectColumnsFromUpload = async (id) => {
    try {
      setStatus(MappingStatus.DETECTING);
      setLoading(true);
      setError(null);
      
      const response = await columnMappingApi.detectColumnsFromUpload(id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to detect columns');
      }
      
      setSourceColumns(response.columns);
      setUploadId(id);
      setStatus(MappingStatus.CONFIGURING);
      
      // Load target fields if not already loaded
      if (targetFields.length === 0) {
        await loadTargetFields();
      }
      
      // Generate suggestions
      await suggestMappings(response.columns);
      
      return true;
    } catch (error) {
      console.error('Error detecting columns:', error);
      setError(error.message || 'Failed to detect columns');
      setStatus(MappingStatus.FAILED);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load target fields for mapping
   * @returns {Promise<boolean>} Success indicator
   */
  const loadTargetFields = async () => {
    try {
      setLoading(true);
      
      const response = await columnMappingApi.getMappingFields();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get mapping fields');
      }
      
      setTargetFields(response.fields);
      return true;
    } catch (error) {
      console.error('Error loading target fields:', error);
      setError(error.message || 'Failed to load target fields');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Generate mapping suggestions based on source columns
   * @param {string[]} columns - Source columns
   * @returns {Promise<boolean>} Success indicator
   */
  const suggestMappings = async (columns) => {
    try {
      setLoading(true);
      
      const response = await columnMappingApi.suggestMappings(columns || sourceColumns);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to suggest mappings');
      }
      
      setMappingSelections(response.suggestions);
      return true;
    } catch (error) {
      console.error('Error suggesting mappings:', error);
      setError(error.message || 'Failed to suggest mappings');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update a mapping selection
   * @param {string} targetField - Target field to update
   * @param {string} sourceColumn - Source column to map to
   */
  const updateMapping = (targetField, sourceColumn) => {
    setMappingSelections(prev => ({
      ...prev,
      [targetField]: sourceColumn
    }));
  };
  
  /**
   * Update a transformation for a field
   * @param {string} targetField - Target field to update
   * @param {string} transformation - Transformation to apply
   */
  const updateTransformation = (targetField, transformation) => {
    if (!transformation) {
      // Remove transformation if empty
      const newTransformations = { ...transformations };
      delete newTransformations[targetField];
      setTransformations(newTransformations);
    } else {
      setTransformations(prev => ({
        ...prev,
        [targetField]: transformation
      }));
    }
  };
  
  /**
   * Load mapping profiles
   * @returns {Promise<boolean>} Success indicator
   */
  const loadMappingProfiles = async () => {
    try {
      setLoading(true);
      
      const response = await columnMappingApi.listMappingProfiles();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load mapping profiles');
      }
      
      setAvailableProfiles(response.profiles);
      return true;
    } catch (error) {
      console.error('Error loading mapping profiles:', error);
      setError(error.message || 'Failed to load mapping profiles');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Apply selected mapping to transform data
   * @returns {Promise<Object|false>} Result object or false on failure
   */
  const applyMapping = async () => {
    if (!uploadId) {
      setError('No upload ID provided');
      return false;
    }
    
    if (!mappingSelections || Object.keys(mappingSelections).length === 0) {
      setError('No mapping selections provided');
      return false;
    }
    
    try {
      setStatus(MappingStatus.APPLYING);
      setLoading(true);
      setError(null);
      
      // Prepare mapping profile
      const mappingProfile = {
        mappings: mappingSelections,
        transformations: Object.keys(transformations).length > 0 ? transformations : undefined,
        id: selectedProfile?.id
      };
      
      const response = await columnMappingApi.applyMapping(uploadId, mappingProfile);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to apply mapping');
      }
      
      setStatus(MappingStatus.COMPLETED);
      return response;
    } catch (error) {
      console.error('Error applying mapping:', error);
      setError(error.message || 'Failed to apply mapping');
      setStatus(MappingStatus.FAILED);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Save current mapping as a profile
   * @param {string} name - Profile name
   * @param {string} description - Profile description
   * @param {boolean} isDefault - Whether this should be the default profile
   * @returns {Promise<Object|false>} Result object or false on failure
   */
  const saveAsProfile = async (name, description, isDefault = false) => {
    if (!mappingSelections || Object.keys(mappingSelections).length === 0) {
      setError('No mapping selections to save');
      return false;
    }
    
    try {
      setLoading(true);
      
      const profileData = {
        name,
        description,
        mappings: mappingSelections,
        transformations: Object.keys(transformations).length > 0 ? transformations : undefined,
        isDefault
      };
      
      const response = await columnMappingApi.createMappingProfile(profileData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save mapping profile');
      }
      
      // Reload available profiles
      await loadMappingProfiles();
      
      // Set this as the selected profile
      setSelectedProfile({
        id: response.id,
        name,
        description
      });
      
      return response;
    } catch (error) {
      console.error('Error saving mapping profile:', error);
      setError(error.message || 'Failed to save mapping profile');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Apply a saved mapping profile
   * @param {number} profileId - Profile ID to apply
   * @returns {Promise<boolean>} Success indicator
   */
  const applyProfile = async (profileId) => {
    try {
      setLoading(true);
      
      const response = await columnMappingApi.getMappingProfile(profileId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get mapping profile');
      }
      
      const { profile } = response;
      
      setMappingSelections(profile.mappings);
      setTransformations(profile.transformations || {});
      setSelectedProfile({
        id: profile.id,
        name: profile.name,
        description: profile.description
      });
      
      return true;
    } catch (error) {
      console.error('Error applying profile:', error);
      setError(error.message || 'Failed to apply profile');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Delete a mapping profile
   * @param {number} profileId - Profile ID to delete
   * @returns {Promise<boolean>} Success indicator
   */
  const deleteProfile = async (profileId) => {
    try {
      setLoading(true);
      
      const response = await columnMappingApi.deleteMappingProfile(profileId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete profile');
      }
      
      // Reload available profiles
      await loadMappingProfiles();
      
      // Clear selected profile if it was the one deleted
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      setError(error.message || 'Failed to delete profile');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Context value that will be provided to consumers
   * @type {Object}
   */
  const contextValue = {
    // State
    status,
    sourceColumns,
    targetFields,
    mappingSelections,
    transformations,
    selectedProfile,
    availableProfiles,
    uploadId,
    error,
    loading,
    
    // Methods
    resetMapping,
    detectColumnsFromFile,
    detectColumnsFromUpload,
    loadTargetFields,
    suggestMappings,
    updateMapping,
    updateTransformation,
    loadMappingProfiles,
    applyMapping,
    saveAsProfile,
    applyProfile,
    deleteProfile,
    
    // Setters
    setUploadId
  };
  
  return (
    <ColumnMappingContext.Provider value={contextValue}>
      {children}
    </ColumnMappingContext.Provider>
  );
};

/**
 * Custom hook for using the column mapping context
 * @returns {Object} Column mapping context value
 * @throws {Error} If used outside of ColumnMappingProvider
 */
export const useColumnMapping = () => {
  const context = useContext(ColumnMappingContext);
  
  if (!context) {
    throw new Error('useColumnMapping must be used within a ColumnMappingProvider');
  }
  
  return context;
}; 