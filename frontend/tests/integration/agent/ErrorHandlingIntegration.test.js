/**
 * Integration tests for error handling across the workflow
 * Tests how errors propagate through components and are handled
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Import components
import WhatIfAnalysis from '../../../src/components/agent/WhatIfAnalysis';
import ScenarioVisualization from '../../../src/components/agent/ScenarioVisualization';
import ScenarioManagement from '../../../src/components/agent/ScenarioManagement';

// Import API client
import scenarioApi from '../../../src/api/scenarioApi';

// Mock API client
jest.mock('../../../src/api/scenarioApi');

// Mock context provider
const MockAppContext = ({ children, initialState = {} }) => {
  const [state, setState] = React.useState({
    selectedScenario: null,
    scenarios: [],
    calculations: {},
    error: null,
    ...initialState
  });
  
  const contextValue = {
    ...state,
    setSelectedScenario: (scenario) => setState(prev => ({ ...prev, selectedScenario: scenario })),
    setScenarios: (scenarios) => setState(prev => ({ ...prev, scenarios })),
    setCalculations: (calcs) => setState(prev => ({ ...prev, calculations: calcs })),
    setError: (error) => setState(prev => ({ ...prev, error })),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    refreshScenarios: jest.fn()
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Create AppContext
const AppContext = React.createContext({});

describe('Error Handling Integration Tests', () => {
  // Setup API mocks
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('Network error handling', () => {
    test('should handle API timeout in scenario creation', async () => {
      // Mock API timeout
      scenarioApi.createScenario = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), 100);
        })
      );
      
      render(
        <MockAppContext>
          <WhatIfAnalysis />
        </MockAppContext>
      );
      
      // Enter natural language input
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 5 stands to Terminal 2?' } 
      });
      
      // Submit form
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show loading state
      expect(screen.getByText(/Creating scenario/i)).toBeInTheDocument();
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Request timed out/i)).toBeInTheDocument();
      });
      
      // Should have retry button
      const retryButton = screen.getByText(/Try Again/i);
      expect(retryButton).toBeInTheDocument();
      
      // Retry should call API again
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Scenario',
        description: 'What if we add 5 stands to Terminal 2?'
      });
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(scenarioApi.createScenario).toHaveBeenCalledTimes(1);
      });
    });
    
    test('should handle server errors in calculation', async () => {
      // Mock successful scenario creation
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Scenario',
        description: 'What if we add 5 stands to Terminal 2?'
      });
      
      // But calculation fails with server error
      scenarioApi.calculateScenario = jest.fn().mockRejectedValue({
        status: 500,
        message: 'Internal server error',
        details: 'Database connection failed'
      });
      
      render(
        <MockAppContext>
          <WhatIfAnalysis autoCalculate={true} />
        </MockAppContext>
      );
      
      // Enter natural language input
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 5 stands to Terminal 2?' } 
      });
      
      // Submit form
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show successful creation but calculation error
      await waitFor(() => {
        expect(screen.getByText(/Scenario created/i)).toBeInTheDocument();
        expect(screen.getByText(/Calculation error/i)).toBeInTheDocument();
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      });
      
      // Should have option to retry calculation
      const calculateButton = screen.getByText(/Calculate Again/i);
      expect(calculateButton).toBeInTheDocument();
      
      // Fix the API mock to succeed on retry
      scenarioApi.calculateScenario = jest.fn().mockResolvedValue({
        calculationId: '101',
        status: 'processing'
      });
      
      scenarioApi.getCalculation = jest.fn().mockResolvedValue({
        calculationId: '101',
        status: 'completed',
        results: {
          capacity: { total: 120 },
          utilization: { overall: 0.85 }
        }
      });
      
      // Retry calculation
      fireEvent.click(calculateButton);
      
      // Should show calculation success
      await waitFor(() => {
        expect(scenarioApi.calculateScenario).toHaveBeenCalledTimes(1);
        expect(scenarioApi.getCalculation).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Calculation complete/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Data validation errors', () => {
    test('should handle validation errors from server', async () => {
      // Mock API validation error
      scenarioApi.createScenario = jest.fn().mockRejectedValue({
        status: 400,
        message: 'Validation error',
        details: {
          description: 'Description is too vague, please be more specific'
        }
      });
      
      render(
        <MockAppContext>
          <WhatIfAnalysis />
        </MockAppContext>
      );
      
      // Enter too vague description
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we change something?' } 
      });
      
      // Submit form
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Validation error/i)).toBeInTheDocument();
        expect(screen.getByText(/Description is too vague/i)).toBeInTheDocument();
      });
      
      // Input should still be available for correction
      expect(descriptionInput).toHaveValue('What if we change something?');
      
      // Fix the input
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 5 wide-body stands to Terminal 2?' } 
      });
      
      // Mock successful response for fixed input
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Scenario',
        description: 'What if we add 5 wide-body stands to Terminal 2?',
        parameters: {
          terminal: 'T2',
          standType: 'wide_body',
          count: 5
        }
      });
      
      // Try again
      fireEvent.click(createButton);
      
      // Should succeed
      await waitFor(() => {
        expect(scenarioApi.createScenario).toHaveBeenCalledTimes(1);
        expect(scenarioApi.createScenario).toHaveBeenCalledWith(expect.objectContaining({
          description: 'What if we add 5 wide-body stands to Terminal 2?'
        }));
      });
    });
    
    test('should handle NLP parsing errors and suggestions', async () => {
      // Mock API with NLP parsing error and suggestions
      scenarioApi.createScenario = jest.fn().mockRejectedValue({
        status: 422,
        message: 'Could not parse natural language input',
        details: {
          error: 'Ambiguous intent',
          clarificationQuestions: [
            'Which terminal are you referring to?',
            'What type of stands do you want to add?',
            'How many stands would you like to add?'
          ],
          confidence: 0.3
        }
      });
      
      render(
        <MockAppContext>
          <WhatIfAnalysis />
        </MockAppContext>
      );
      
      // Enter ambiguous description
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add more stands?' } 
      });
      
      // Submit form
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show parsing error with clarification questions
      await waitFor(() => {
        expect(screen.getByText(/Could not parse natural language input/i)).toBeInTheDocument();
        expect(screen.getByText(/Ambiguous intent/i)).toBeInTheDocument();
        
        // Should show clarification questions
        expect(screen.getByText(/Which terminal are you referring to/i)).toBeInTheDocument();
        expect(screen.getByText(/What type of stands/i)).toBeInTheDocument();
        expect(screen.getByText(/How many stands/i)).toBeInTheDocument();
      });
      
      // Fix the input based on clarification questions
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 8 narrow-body stands to Terminal 1?' } 
      });
      
      // Mock successful response for fixed input
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Scenario',
        description: 'What if we add 8 narrow-body stands to Terminal 1?',
        parameters: {
          terminal: 'T1',
          standType: 'narrow_body',
          count: 8
        }
      });
      
      // Try again
      fireEvent.click(createButton);
      
      // Should succeed
      await waitFor(() => {
        expect(scenarioApi.createScenario).toHaveBeenCalledTimes(1);
        expect(scenarioApi.createScenario).toHaveBeenCalledWith(expect.objectContaining({
          description: 'What if we add 8 narrow-body stands to Terminal 1?'
        }));
      });
    });
  });
  
  describe('Authorization and authentication errors', () => {
    test('should handle unauthorized access', async () => {
      // Mock unauthorized error
      scenarioApi.getScenarios = jest.fn().mockRejectedValue({
        status: 401,
        message: 'Unauthorized access'
      });
      
      render(
        <MockAppContext>
          <ScenarioManagement />
        </MockAppContext>
      );
      
      // Should show authentication error
      await waitFor(() => {
        expect(screen.getByText(/Unauthorized access/i)).toBeInTheDocument();
        expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
      });
      
      // Should have login button
      expect(screen.getByText(/Log In/i)).toBeInTheDocument();
    });
    
    test('should handle forbidden resources', async () => {
      // Mock scenarios list success
      scenarioApi.getScenarios = jest.fn().mockResolvedValue({
        scenarios: [
          {
            id: '1',
            title: 'User 1 Scenario',
            description: 'Accessible to current user'
          },
          {
            id: '2',
            title: 'Another User Scenario',
            description: 'Belongs to another user'
          }
        ],
        total: 2
      });
      
      // But accessing specific scenario is forbidden
      scenarioApi.getScenario = jest.fn().mockImplementation((id) => {
        if (id === '1') {
          return Promise.resolve({
            id: '1',
            title: 'User 1 Scenario',
            description: 'Accessible to current user'
          });
        } else {
          return Promise.reject({
            status: 403,
            message: 'Forbidden: You do not have access to this scenario'
          });
        }
      });
      
      // Render the management component
      const { rerender } = render(
        <MockAppContext>
          <ScenarioManagement />
        </MockAppContext>
      );
      
      // Should load scenarios
      await waitFor(() => {
        expect(screen.getByText('User 1 Scenario')).toBeInTheDocument();
        expect(screen.getByText('Another User Scenario')).toBeInTheDocument();
      });
      
      // Now try to access forbidden scenario
      rerender(
        <MockAppContext
          initialState={{
            selectedScenario: { id: '2', title: 'Another User Scenario' }
          }}
        >
          <ScenarioVisualization scenarioId="2" />
        </MockAppContext>
      );
      
      // Should show forbidden error
      await waitFor(() => {
        expect(screen.getByText(/Forbidden/i)).toBeInTheDocument();
        expect(screen.getByText(/You do not have access to this scenario/i)).toBeInTheDocument();
      });
      
      // Should have back button
      expect(screen.getByText(/Back/i)).toBeInTheDocument();
    });
  });
  
  describe('Error recovery flow', () => {
    test('should recover from scenario calculation error', async () => {
      // Setup mock with calculation error
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Recovery Scenario',
        description: 'What if we add 5 stands to Terminal 2?'
      });
      
      // First calculation attempt fails
      scenarioApi.calculateScenario = jest.fn().mockRejectedValueOnce({
        status: 500,
        message: 'Calculation engine error'
      });
      
      // Second attempt succeeds
      scenarioApi.calculateScenario.mockResolvedValueOnce({
        calculationId: '101',
        status: 'processing'
      });
      
      scenarioApi.getCalculation = jest.fn().mockResolvedValue({
        calculationId: '101',
        status: 'completed',
        results: {
          capacity: { total: 120 },
          utilization: { overall: 0.85 }
        }
      });
      
      render(
        <MockAppContext>
          <WhatIfAnalysis autoCalculate={true} />
        </MockAppContext>
      );
      
      // Create scenario
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 5 stands to Terminal 2?' } 
      });
      
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show calculation error
      await waitFor(() => {
        expect(screen.getByText(/Calculation engine error/i)).toBeInTheDocument();
      });
      
      // Retry calculation
      const retryButton = screen.getByText(/Calculate Again/i);
      fireEvent.click(retryButton);
      
      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/Calculation complete/i)).toBeInTheDocument();
      });
      
      // Should call APIs correct number of times
      expect(scenarioApi.createScenario).toHaveBeenCalledTimes(1);
      expect(scenarioApi.calculateScenario).toHaveBeenCalledTimes(2);
      expect(scenarioApi.getCalculation).toHaveBeenCalledTimes(1);
    });
    
    test('should handle interruptions in calculation polling', async () => {
      // Mock APIs for interrupted polling
      scenarioApi.createScenario = jest.fn().mockResolvedValue({
        scenarioId: '1',
        title: 'Test Interrupt Scenario',
        description: 'What if we add 5 stands to Terminal 2?'
      });
      
      scenarioApi.calculateScenario = jest.fn().mockResolvedValue({
        calculationId: '101',
        status: 'processing'
      });
      
      // First poll returns processing
      scenarioApi.getCalculation = jest.fn()
        .mockResolvedValueOnce({
          calculationId: '101',
          status: 'processing',
          progress: 0.3
        })
        // Second poll fails due to network error
        .mockRejectedValueOnce(new Error('Network error'))
        // Third poll succeeds with completed status
        .mockResolvedValueOnce({
          calculationId: '101',
          status: 'completed',
          results: {
            capacity: { total: 120 },
            utilization: { overall: 0.85 }
          }
        });
      
      render(
        <MockAppContext>
          <WhatIfAnalysis autoCalculate={true} />
        </MockAppContext>
      );
      
      // Create scenario
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      fireEvent.change(descriptionInput, { 
        target: { value: 'What if we add 5 stands to Terminal 2?' } 
      });
      
      const createButton = screen.getByText('Create Scenario');
      fireEvent.click(createButton);
      
      // Should show processing
      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
        expect(screen.getByText(/30%/i)).toBeInTheDocument();
      });
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
      
      // Retry polling
      const retryButton = screen.getByText(/Retry/i);
      fireEvent.click(retryButton);
      
      // Should show completed result
      await waitFor(() => {
        expect(screen.getByText(/Calculation complete/i)).toBeInTheDocument();
      });
      
      // Should have called getCalculation 3 times
      expect(scenarioApi.getCalculation).toHaveBeenCalledTimes(3);
    });
  });
});