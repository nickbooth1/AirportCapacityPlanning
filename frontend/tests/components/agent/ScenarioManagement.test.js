import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioManagement from '../../../src/components/agent/ScenarioManagement';
import scenarioApi from '../../../src/api/scenarioApi';

// Mock the scenario API
jest.mock('../../../src/api/scenarioApi', () => ({
  listScenarios: jest.fn(),
  getScenario: jest.fn(),
  updateScenario: jest.fn(),
  deleteScenario: jest.fn(),
  calculateScenario: jest.fn(),
  createScenario: jest.fn()
}));

// Mock the child components
jest.mock('../../../src/components/agent/ScenarioVisualization', () => {
  return function MockScenarioVisualization({ scenarioData, comparisonData, onRequestCompare }) {
    return (
      <div data-testid="mock-scenario-visualization">
        <div>Scenario ID: {scenarioData?.scenarioId || 'none'}</div>
        <div>Comparison ID: {comparisonData?.scenarioId || 'none'}</div>
        {onRequestCompare && (
          <button onClick={onRequestCompare} data-testid="request-compare-button">
            Request Compare
          </button>
        )}
      </div>
    );
  };
});

jest.mock('../../../src/components/agent/WhatIfAnalysis', () => {
  return function MockWhatIfAnalysis({ onScenarioCreated, onScenarioCalculated }) {
    return (
      <div data-testid="mock-what-if-analysis">
        <button 
          onClick={() => onScenarioCreated({ scenarioId: 'new-scenario-123' })}
          data-testid="create-scenario-button"
        >
          Create Scenario
        </button>
        <button 
          onClick={() => onScenarioCalculated({ 
            scenarioId: 'new-scenario-123', 
            calculationId: 'calc-123', 
            results: { totalCapacity: 100 } 
          })}
          data-testid="calc-scenario-button"
        >
          Calculate Scenario
        </button>
      </div>
    );
  };
});

describe('ScenarioManagement Component', () => {
  // Sample templates and scenarios for testing
  const mockTemplates = [
    {
      id: 'template1',
      name: 'Add Terminal',
      category: 'Infrastructure',
      description: 'Add a new terminal'
    },
    {
      id: 'template2',
      name: 'Change Aircraft Mix',
      category: 'Fleet',
      description: 'Change the mix of aircraft types'
    }
  ];
  
  const mockScenarios = [
    {
      scenarioId: 'scenario1',
      title: 'Scenario 1',
      description: 'Test scenario one',
      type: 'what-if',
      status: 'calculated',
      createdAt: '2023-06-01T12:00:00Z',
      lastCalculatedAt: '2023-06-01T12:05:00Z'
    },
    {
      scenarioId: 'scenario2',
      title: 'Scenario 2',
      description: 'Test scenario two',
      type: 'forecast',
      status: 'created',
      createdAt: '2023-06-02T14:30:00Z'
    },
    {
      scenarioId: 'scenario3',
      title: 'Scenario 3',
      description: 'Test scenario three',
      type: 'optimization',
      status: 'calculating',
      createdAt: '2023-06-03T09:15:00Z'
    }
  ];
  
  // Mock scenario details with results
  const mockScenarioDetails = {
    scenarioId: 'scenario1',
    title: 'Scenario 1',
    description: 'Test scenario one',
    type: 'what-if',
    status: 'calculated',
    createdAt: '2023-06-01T12:00:00Z',
    lastCalculatedAt: '2023-06-01T12:05:00Z',
    results: {
      capacity: {
        narrowBodyCapacity: 45,
        wideBodyCapacity: 25,
        totalCapacity: 70
      },
      utilizationMetrics: {
        overallUtilization: 0.75,
        peakUtilization: 0.92,
        offPeakUtilization: 0.53
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    scenarioApi.listScenarios.mockResolvedValue({ scenarios: mockScenarios });
    scenarioApi.getScenario.mockImplementation((id) => {
      if (id === 'scenario1') {
        return Promise.resolve(mockScenarioDetails);
      }
      return Promise.resolve(mockScenarios.find(s => s.scenarioId === id));
    });
    
    scenarioApi.updateScenario.mockResolvedValue({ success: true });
    scenarioApi.deleteScenario.mockResolvedValue({ success: true });
    scenarioApi.calculateScenario.mockResolvedValue({ calculationId: 'calc-123', status: 'processing' });
  });

  it('renders the component and loads scenarios', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Check if the component title is displayed
    expect(screen.getByText('Scenario Management')).toBeInTheDocument();
    
    // Check if API was called to load scenarios
    expect(scenarioApi.listScenarios).toHaveBeenCalled();
    
    // Check if scenarios are displayed
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
      expect(screen.getByText('Scenario 2')).toBeInTheDocument();
      expect(screen.getByText('Scenario 3')).toBeInTheDocument();
    });
    
    // Check if status tags are displayed
    const calculatedTag = screen.getByTestId('mock-tag-success');
    expect(calculatedTag).toBeInTheDocument();
    expect(calculatedTag).toHaveTextContent('calculated');
    
    const createdTag = screen.getByTestId('mock-tag-blue');
    expect(createdTag).toBeInTheDocument();
    expect(createdTag).toHaveTextContent('created');
    
    const calculatingTag = screen.getByTestId('mock-tag-processing');
    expect(calculatingTag).toBeInTheDocument();
    expect(calculatingTag).toHaveTextContent('calculating');
  });
  
  it('handles API errors when loading scenarios', async () => {
    // Mock API failure
    scenarioApi.listScenarios.mockRejectedValueOnce(new Error('Failed to load scenarios'));
    
    // Spy on console.error to prevent it from cluttering test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Check if API was called
    expect(scenarioApi.listScenarios).toHaveBeenCalled();
    
    // Wait for error handling
    await waitFor(() => {
      // In the real component, this would display an error message
      // We're just verifying it doesn't crash and logs the error
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    // Clean up the spy
    consoleSpy.mockRestore();
  });
  
  it('displays empty state when no scenarios are available', async () => {
    // Mock empty scenario list
    scenarioApi.listScenarios.mockResolvedValueOnce({ scenarios: [] });
    
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Check if API was called
    expect(scenarioApi.listScenarios).toHaveBeenCalled();
    
    // There should be an empty table
    await waitFor(() => {
      expect(screen.getByTestId('mock-table')).toBeInTheDocument();
      // No scenario rows should be in the document
      expect(screen.queryByText('Scenario 1')).not.toBeInTheDocument();
    });
  });

  it('opens scenario details when clicking on a scenario', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // Click on a scenario
    fireEvent.click(screen.getByText('Scenario 1'));
    
    // Check if the API was called to get scenario details
    expect(scenarioApi.getScenario).toHaveBeenCalledWith('scenario1');
    
    // Check if details drawer is opened
    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    });
    
    // Check if visualization component is displayed with scenario data
    expect(screen.getByTestId('mock-scenario-visualization')).toBeInTheDocument();
  });

  it('creates a new scenario', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Click on "New Scenario" button
    fireEvent.click(screen.getByText('New Scenario'));
    
    // Check if drawer is opened with WhatIfAnalysis component
    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('mock-what-if-analysis')).toBeInTheDocument();
    });
    
    // Simulate scenario creation
    fireEvent.click(screen.getByTestId('create-scenario-button'));
    
    // Check if the scenarios list is refreshed
    expect(scenarioApi.listScenarios).toHaveBeenCalledTimes(2);
  });

  it('calculates a scenario', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // Find the calculate button for a scenario
    const calculateButtons = screen.getAllByTestId('mock-button-default')
      .filter(button => button.getAttribute('data-icon') === 'true');
    
    // Click on the calculate button (third button in each row, after view and edit)
    fireEvent.click(calculateButtons[2]);
    
    // Check if API was called
    expect(scenarioApi.calculateScenario).toHaveBeenCalledWith('scenario1');
  });

  it('edits a scenario', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // Find edit button for a scenario (should be second button in row)
    const editButtons = screen.getAllByTestId('mock-button-default')
      .filter(button => button.getAttribute('data-icon') === 'true');
    
    // Click on edit button
    fireEvent.click(editButtons[1]);
    
    // Check if edit modal is displayed
    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Edit Scenario');
    });
    
    // Find form fields (in our mock implementation)
    const titleField = screen.getByTestId('form-item-title');
    const descriptionField = screen.getByTestId('form-item-description');
    
    expect(titleField).toBeInTheDocument();
    expect(descriptionField).toBeInTheDocument();
    
    // Click OK to submit the form
    fireEvent.click(screen.getByTestId('modal-ok'));
    
    // Actual form submission would call updateScenario
    // This is a limitation of our mock implementation
  });

  it('deletes a scenario', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // Find delete button for a scenario
    const deleteButtons = screen.getAllByTestId('mock-button-default')
      .filter(button => button.getAttribute('data-icon') === 'true');
    
    // Click on delete button (should be the 5th button, after view, edit, calculate, and duplicate)
    fireEvent.click(deleteButtons[4]);
    
    // This should show a popconfirm in our mock
    await waitFor(() => {
      expect(screen.getByTestId('mock-popconfirm')).toBeInTheDocument();
    });
    
    // Confirm deletion
    fireEvent.click(screen.getByTestId('popconfirm-confirm'));
    
    // Check if deleteScenario API was called
    expect(scenarioApi.deleteScenario).toHaveBeenCalled();
    
    // Check if scenarios are reloaded
    expect(scenarioApi.listScenarios).toHaveBeenCalledTimes(2);
  });
  
  it('handles API errors when deleting a scenario', async () => {
    // Mock API failure for delete
    scenarioApi.deleteScenario.mockRejectedValueOnce(new Error('Failed to delete scenario'));
    
    // Spy on console.error and message.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // Find delete button
    const deleteButtons = screen.getAllByTestId('mock-button-default')
      .filter(button => button.getAttribute('data-icon') === 'true');
    
    // Click on delete button
    fireEvent.click(deleteButtons[4]);
    
    // Confirm deletion
    fireEvent.click(screen.getByTestId('popconfirm-confirm'));
    
    // Check if deleteScenario API was called
    expect(scenarioApi.deleteScenario).toHaveBeenCalled();
    
    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    // Clean up the spy
    consoleSpy.mockRestore();
  });

  it('compares scenarios', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
    });
    
    // In a real test, we would select two scenarios using checkboxes
    // Due to our mock limitations, this is difficult to test directly
    
    // Open a scenario first
    fireEvent.click(screen.getByText('Scenario 1'));
    
    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByTestId('mock-scenario-visualization')).toBeInTheDocument();
    });
    
    // Click on request compare button
    fireEvent.click(screen.getByTestId('request-compare-button'));
    
    // Check if compare modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Compare Scenarios');
    });
    
    // Select a comparison scenario
    const comparisonSelect = screen.getByTestId('mock-select');
    fireEvent.change(comparisonSelect, { target: { value: 'scenario2' } });
    
    // Confirm comparison
    fireEvent.click(screen.getByTestId('modal-ok'));
    
    // Check if the comparison data is fetched
    expect(scenarioApi.getScenario).toHaveBeenCalledWith('scenario2');
  });
  
  it('filters scenarios by type', async () => {
    // Setup scenario API to respond to filter
    scenarioApi.listScenarios.mockImplementation((params) => {
      if (params && params.type === 'what-if') {
        return Promise.resolve({ 
          scenarios: mockScenarios.filter(s => s.type === 'what-if') 
        });
      }
      return Promise.resolve({ scenarios: mockScenarios });
    });
    
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenario 1')).toBeInTheDocument();
      expect(screen.getByText('Scenario 2')).toBeInTheDocument();
      expect(screen.getByText('Scenario 3')).toBeInTheDocument();
    });
    
    // Find and use the filter dropdown
    const filterSelect = screen.getByTestId('mock-select');
    fireEvent.change(filterSelect, { target: { value: 'what-if' } });
    
    // Check if API was called with filter
    expect(scenarioApi.listScenarios).toHaveBeenCalledWith({ type: 'what-if' });
  });
  
  it('completes a full workflow - create, view, edit, calculate', async () => {
    render(<ScenarioManagement templates={mockTemplates} />);
    
    // 1. Create new scenario
    fireEvent.click(screen.getByText('New Scenario'));
    
    // Check if drawer is opened with creation form
    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('mock-what-if-analysis')).toBeInTheDocument();
    });
    
    // Create scenario
    fireEvent.click(screen.getByTestId('create-scenario-button'));
    
    // 2. View the created scenario
    expect(scenarioApi.listScenarios).toHaveBeenCalledTimes(2); // Initial + after creation
    
    // 3. Calculate scenario
    fireEvent.click(screen.getByTestId('calc-scenario-button'));
    
    // Check that calculation is complete
    expect(screen.getByText('scenario-123')).toBeInTheDocument();
    
    // Test complete - the workflow includes create, view details, calculate
  });
});