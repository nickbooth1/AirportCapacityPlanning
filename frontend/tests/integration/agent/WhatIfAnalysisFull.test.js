/**
 * Integration test for What-If Analysis component
 * Tests the full workflow of the What-If analysis feature
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import WhatIfAnalysis from '../../../src/components/agent/WhatIfAnalysis';
import ScenarioVisualization from '../../../src/components/agent/ScenarioVisualization';
import scenarioApi from '../../../src/api/scenarioApi';

// Mock the API client
jest.mock('../../../src/api/scenarioApi');

// Sample test data
const testTemplates = [
  {
    id: '1',
    name: 'Add Terminal Stands',
    description: 'Add additional stands to a terminal',
    category: 'infrastructure',
    requiredParameters: ['terminal', 'standType', 'count'],
    defaultParameters: {
      terminal: 'T2',
      standType: 'narrow_body',
      count: 3
    }
  },
  {
    id: '2',
    name: 'Optimize Terminal Allocation',
    description: 'Optimize allocation of flights to terminals',
    category: 'operations',
    requiredParameters: ['terminalPreference', 'optimizationTarget'],
    defaultParameters: {
      terminalPreference: 'balanced',
      optimizationTarget: 'utilization'
    }
  }
];

const mockScenarioResponse = {
  scenarioId: '123',
  title: 'Test Scenario',
  description: 'Add 5 wide-body stands to Terminal 2',
  status: 'created',
  parameters: {
    terminal: 'T2',
    standType: 'wide_body',
    count: 5
  }
};

const mockCalculationResponse = {
  calculationId: '456',
  scenarioId: '123',
  status: 'completed',
  results: {
    capacity: {
      total: 120,
      byHour: [
        { hour: 6, available: 10 },
        { hour: 7, available: 12 },
        { hour: 8, available: 8 }
      ]
    },
    utilization: {
      overall: 0.85,
      byTerminal: {
        T1: 0.92,
        T2: 0.78
      }
    },
    conflicts: []
  }
};

// Mock the required modules for Scenario Visualization
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Mocked Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Mocked Line Chart</div>
}));

jest.mock('@ant-design/plots', () => ({
  Pie: () => <div data-testid="pie-chart">Mocked Pie Chart</div>,
  Column: () => <div data-testid="column-chart">Mocked Column Chart</div>
}));

describe('What-If Analysis Integration Tests', () => {
  // Setup API mocks
  beforeEach(() => {
    // Reset API mocks
    jest.clearAllMocks();
    
    // Mock API calls
    scenarioApi.createScenario = jest.fn().mockResolvedValue(mockScenarioResponse);
    scenarioApi.createFromTemplate = jest.fn().mockResolvedValue(mockScenarioResponse);
    scenarioApi.calculateScenario = jest.fn().mockResolvedValue({
      calculationId: '456',
      status: 'processing'
    });
    scenarioApi.getCalculation = jest.fn().mockResolvedValue(mockCalculationResponse);
  });
  
  describe('Natural Language Scenario Creation', () => {
    test('should create a scenario using natural language and display results', async () => {
      // Mock callback functions
      const onScenarioCreated = jest.fn();
      const onScenarioCalculated = jest.fn();
      
      // Render the component
      render(
        <WhatIfAnalysis 
          onScenarioCreated={onScenarioCreated} 
          onScenarioCalculated={onScenarioCalculated}
          templates={testTemplates}
        />
      );
      
      // Use natural language input
      const naturalLanguageTab = screen.getByText('Natural Language');
      fireEvent.click(naturalLanguageTab);
      
      // Enter scenario description
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      await userEvent.type(descriptionInput, 'What if we add 5 wide-body stands to Terminal 2?');
      
      // Submit the form
      const submitButton = screen.getByText('Create Scenario');
      fireEvent.click(submitButton);
      
      // Wait for API calls to complete
      await waitFor(() => {
        expect(scenarioApi.createScenario).toHaveBeenCalledWith({
          description: 'What if we add 5 wide-body stands to Terminal 2?',
          title: 'What if we add 5 wide-body stands to Terminal 2?'.substring(0, 30)
        });
      });
      
      // Should auto-calculate by default
      await waitFor(() => {
        expect(scenarioApi.calculateScenario).toHaveBeenCalledWith('123', {
          options: { timeHorizon: 'day' }
        });
      });
      
      // Should poll for results
      await waitFor(() => {
        expect(scenarioApi.getCalculation).toHaveBeenCalledWith('123', '456');
      });
      
      // Should call callbacks
      expect(onScenarioCreated).toHaveBeenCalledWith(mockScenarioResponse);
      expect(onScenarioCalculated).toHaveBeenCalledWith({
        scenarioId: '123',
        calculationId: '456',
        results: mockCalculationResponse.results
      });
    });
    
    test('should handle errors in scenario creation', async () => {
      // Mock API error
      scenarioApi.createScenario.mockRejectedValue(new Error('Failed to create scenario'));
      
      // Render the component
      render(<WhatIfAnalysis templates={testTemplates} />);
      
      // Enter scenario description
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      await userEvent.type(descriptionInput, 'Test scenario with error');
      
      // Submit the form
      const submitButton = screen.getByText('Create Scenario');
      fireEvent.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to create scenario. Please try again.')).toBeInTheDocument();
      });
    });
  });
  
  describe('Template-Based Scenario Creation', () => {
    test('should create a scenario using template and display results', async () => {
      // Mock callback functions
      const onScenarioCreated = jest.fn();
      const onScenarioCalculated = jest.fn();
      
      // Render the component
      render(
        <WhatIfAnalysis 
          onScenarioCreated={onScenarioCreated} 
          onScenarioCalculated={onScenarioCalculated}
          templates={testTemplates}
        />
      );
      
      // Use template-based input
      const templateTab = screen.getByText('Use Template');
      fireEvent.click(templateTab);
      
      // Select template
      await waitFor(() => {
        const templateSelect = screen.getByLabelText('Scenario Template');
        fireEvent.mouseDown(templateSelect);
      });
      
      // Let's assume the select options are shown, select the first template
      const templateOption = await screen.findByText('Add Terminal Stands - infrastructure');
      fireEvent.click(templateOption);
      
      // Fill out the form
      const titleInput = screen.getByLabelText('Scenario Title');
      const descriptionInput = screen.getByLabelText('Scenario Description');
      
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Add Wide-Body Stands to T2');
      
      await userEvent.clear(descriptionInput);
      await userEvent.type(descriptionInput, 'Adding 5 wide-body stands to Terminal 2 to increase capacity');
      
      // Set parameter values
      const terminalInput = screen.getByLabelText('Terminal');
      const countInput = screen.getByLabelText('Count');
      
      await userEvent.selectOptions(terminalInput, 'T2');
      await userEvent.clear(countInput);
      await userEvent.type(countInput, '5');
      
      // Change stand type
      const standTypeInput = screen.getByLabelText('Stand Type');
      await userEvent.selectOptions(standTypeInput, 'wide_body');
      
      // Submit the form
      const submitButton = screen.getByText('Create Scenario');
      fireEvent.click(submitButton);
      
      // Wait for API calls to complete
      await waitFor(() => {
        expect(scenarioApi.createFromTemplate).toHaveBeenCalledWith('1', {
          title: 'Add Wide-Body Stands to T2',
          description: 'Adding 5 wide-body stands to Terminal 2 to increase capacity',
          parameters: {
            terminal: 'T2',
            standType: 'wide_body',
            count: 5
          }
        });
      });
      
      // Should auto-calculate by default
      await waitFor(() => {
        expect(scenarioApi.calculateScenario).toHaveBeenCalledWith('123', {
          options: { timeHorizon: 'day' }
        });
      });
      
      // Should poll for results
      await waitFor(() => {
        expect(scenarioApi.getCalculation).toHaveBeenCalledWith('123', '456');
      });
      
      // Should call callbacks
      expect(onScenarioCreated).toHaveBeenCalledWith(mockScenarioResponse);
      expect(onScenarioCalculated).toHaveBeenCalledWith({
        scenarioId: '123',
        calculationId: '456',
        results: mockCalculationResponse.results
      });
    });
  });
  
  describe('End-to-End Workflow with Visualization', () => {
    test('should create, calculate and visualize scenario results', async () => {
      // Create a full test workflow
      let calculatedScenario = null;
      
      // Handler for scenario calculated event
      const handleScenarioCalculated = (data) => {
        calculatedScenario = data;
      };
      
      // Render the What-If Analysis component
      const { unmount } = render(
        <WhatIfAnalysis 
          onScenarioCalculated={handleScenarioCalculated}
          templates={testTemplates}
        />
      );
      
      // Use natural language to create a scenario
      const descriptionInput = screen.getByLabelText('What-If Scenario Description');
      await userEvent.type(descriptionInput, 'What if we add 5 wide-body stands to Terminal 2?');
      
      // Submit the form
      const submitButton = screen.getByText('Create Scenario');
      fireEvent.click(submitButton);
      
      // Wait for calculation to complete
      await waitFor(() => {
        expect(scenarioApi.getCalculation).toHaveBeenCalled();
        expect(calculatedScenario).not.toBeNull();
      });
      
      // Unmount the What-If Analysis component
      unmount();
      
      // Now render the Visualization component with the results
      render(
        <ScenarioVisualization 
          scenarioId={calculatedScenario.scenarioId}
          calculationId={calculatedScenario.calculationId}
          results={calculatedScenario.results}
        />
      );
      
      // Check if visualization is rendered correctly
      await waitFor(() => {
        // Check for visualization components
        expect(screen.getByText(/Capacity Summary/i)).toBeInTheDocument();
        expect(screen.getByText(/Utilization/i)).toBeInTheDocument();
        
        // Check for charts (these are mocked)
        expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThan(0);
      });
      
      // Check for key metrics
      expect(screen.getByText(/120/)).toBeInTheDocument(); // Total capacity
      expect(screen.getByText(/85%/)).toBeInTheDocument(); // Overall utilization
      
      // Detailed assertions on visualization content could be added here
    });
  });
});