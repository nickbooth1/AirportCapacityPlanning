import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhatIfAnalysis from '../../../src/components/agent/WhatIfAnalysis';
import scenarioApi from '../../../src/api/scenarioApi';

// Mock the scenario API
jest.mock('../../../src/api/scenarioApi', () => ({
  createScenario: jest.fn(),
  createFromTemplate: jest.fn(),
  calculateScenario: jest.fn(),
  getCalculation: jest.fn()
}));

describe('WhatIfAnalysis Component', () => {
  const mockTemplates = [
    {
      id: 'template1',
      name: 'New Terminal',
      category: 'Infrastructure',
      description: 'Evaluate impact of adding a new terminal',
      requiredParameters: ['terminalName', 'standCount', 'terminalLocation'],
      defaultParameters: {
        terminalName: 'T4',
        standCount: 10
      }
    },
    {
      id: 'template2',
      name: 'Aircraft Mix Change',
      category: 'Operational',
      description: 'Analyze impact of changing aircraft mix',
      requiredParameters: ['narrowBodyPercentage', 'wideBodyPercentage'],
      defaultParameters: {
        narrowBodyPercentage: 70,
        wideBodyPercentage: 30
      },
      parameterSchema: {
        properties: {
          narrowBodyPercentage: { type: 'number' },
          wideBodyPercentage: { type: 'number' }
        }
      }
    }
  ];

  const mockProps = {
    onScenarioCreated: jest.fn(),
    onScenarioCalculated: jest.fn(),
    templates: mockTemplates
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    scenarioApi.createScenario.mockResolvedValue({
      scenarioId: 'new-scenario-123',
      title: 'Test Scenario',
      status: 'created'
    });
    
    scenarioApi.createFromTemplate.mockResolvedValue({
      scenarioId: 'template-scenario-456',
      title: 'Test Template Scenario',
      status: 'created'
    });
    
    scenarioApi.calculateScenario.mockResolvedValue({
      calculationId: 'calc-123',
      status: 'processing'
    });
    
    scenarioApi.getCalculation.mockResolvedValue({
      status: 'completed',
      results: { totalCapacity: 100 }
    });
  });

  it('renders the component with natural language form by default', () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Check title and default form
    expect(screen.getByText('What-If Analysis')).toBeInTheDocument();
    expect(screen.getByText('Natural Language')).toBeInTheDocument();
    expect(screen.getByLabelText('What-If Scenario Description')).toBeInTheDocument();
  });
  
  it('displays loading state during form submission', async () => {
    // Create a delayed promise to test loading state
    scenarioApi.createScenario.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({ scenarioId: 'loading-test-123' }), 100);
      });
    });
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test loading state' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if the loading state is displayed (button should be in loading state)
    const submitButton = screen.getByText('Create Scenario');
    expect(submitButton.getAttribute('loading')).toBe('true');
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockProps.onScenarioCreated).toHaveBeenCalled();
    });
  });
  
  it('displays calculation loading state', async () => {
    // Setup mocks for testing calculation loading state
    scenarioApi.createScenario.mockResolvedValue({ scenarioId: 'calc-loading-123' });
    scenarioApi.calculateScenario.mockResolvedValue({ calculationId: 'calc-loading-456' });
    // First call returns processing, never resolved to avoid test timing issues
    scenarioApi.getCalculation.mockResolvedValue({ status: 'processing' });
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test calculation loading' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if calculation loading state is displayed
    await waitFor(() => {
      expect(screen.getByText('Calculating scenario results...')).toBeInTheDocument();
    });
  });

  it('switches between natural language and template forms', () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Default is natural language
    expect(screen.getByLabelText('What-If Scenario Description')).toBeInTheDocument();
    
    // Switch to template form
    fireEvent.click(screen.getByText('Use Template'));
    
    // Template form should be visible
    expect(screen.getByLabelText('Scenario Template')).toBeInTheDocument();
    expect(screen.queryByLabelText('What-If Scenario Description')).not.toBeInTheDocument();
    
    // Switch back to natural language
    fireEvent.click(screen.getByText('Natural Language'));
    
    // Natural language form should be visible again
    expect(screen.getByLabelText('What-If Scenario Description')).toBeInTheDocument();
  });

  it('submits a natural language scenario correctly', async () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, {
      target: { value: 'What if we add 3 more wide-body stands at Terminal 2?' }
    });
    
    const titleInput = screen.getByLabelText('Scenario Title');
    fireEvent.change(titleInput, {
      target: { value: 'Terminal 2 Expansion' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(scenarioApi.createScenario).toHaveBeenCalledWith({
        description: 'What if we add 3 more wide-body stands at Terminal 2?',
        title: 'Terminal 2 Expansion'
      });
    });
    
    // Check if onScenarioCreated callback was called
    expect(mockProps.onScenarioCreated).toHaveBeenCalled();
  });

  it('selects a template and loads its parameters', async () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Switch to template form
    fireEvent.click(screen.getByText('Use Template'));
    
    // Select a template
    const templateSelect = screen.getByLabelText('Scenario Template');
    fireEvent.change(templateSelect, { target: { value: 'template1' } });
    
    // Check if template description is shown
    await waitFor(() => {
      expect(screen.getByText('Evaluate impact of adding a new terminal')).toBeInTheDocument();
    });
    
    // Check if parameter fields are loaded
    expect(screen.getByLabelText('Terminal Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Stand Count')).toBeInTheDocument();
    expect(screen.getByLabelText('Terminal Location')).toBeInTheDocument();
    
    // Check if default values are loaded
    const terminalNameInput = screen.getByLabelText('Terminal Name');
    expect(terminalNameInput.value).toBe('T4');
  });

  it('submits a template-based scenario correctly', async () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Switch to template form
    fireEvent.click(screen.getByText('Use Template'));
    
    // Select a template
    const templateSelect = screen.getByLabelText('Scenario Template');
    fireEvent.change(templateSelect, { target: { value: 'template2' } });
    
    // Wait for template to load
    await waitFor(() => {
      expect(screen.getByText('Analyze impact of changing aircraft mix')).toBeInTheDocument();
    });
    
    // Fill out the form
    const titleInput = screen.getByLabelText('Scenario Title');
    fireEvent.change(titleInput, { target: { value: 'Aircraft Mix Scenario' } });
    
    const descriptionInput = screen.getByLabelText('Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Testing aircraft mix changes' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(scenarioApi.createFromTemplate).toHaveBeenCalledWith('template2', {
        title: 'Aircraft Mix Scenario',
        description: 'Testing aircraft mix changes',
        parameters: {
          narrowBodyPercentage: 70,
          wideBodyPercentage: 30
        }
      });
    });
  });
  
  it('modifies template parameters before submission', async () => {
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Switch to template form
    fireEvent.click(screen.getByText('Use Template'));
    
    // Select a template
    const templateSelect = screen.getByLabelText('Scenario Template');
    fireEvent.change(templateSelect, { target: { value: 'template2' } });
    
    // Wait for template to load
    await waitFor(() => {
      expect(screen.getByText('Analyze impact of changing aircraft mix')).toBeInTheDocument();
    });
    
    // Fill out the form with custom values
    const titleInput = screen.getByLabelText('Scenario Title');
    fireEvent.change(titleInput, { target: { value: 'Modified Aircraft Mix' } });
    
    const descriptionInput = screen.getByLabelText('Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Testing with modified percentages' } });
    
    // Modify parameter values
    const narrowBodyInput = screen.getByLabelText('Narrow Body Percentage');
    fireEvent.change(narrowBodyInput, { target: { value: 60 } });
    
    const wideBodyInput = screen.getByLabelText('Wide Body Percentage');
    fireEvent.change(wideBodyInput, { target: { value: 40 } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if API was called with modified parameters
    await waitFor(() => {
      expect(scenarioApi.createFromTemplate).toHaveBeenCalledWith('template2', {
        title: 'Modified Aircraft Mix',
        description: 'Testing with modified percentages',
        parameters: {
          narrowBodyPercentage: 60,
          wideBodyPercentage: 40
        }
      });
    });
  });
  
  it('validates required fields in template form', async () => {
    // Mock form validation error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Switch to template form
    fireEvent.click(screen.getByText('Use Template'));
    
    // Select a template
    const templateSelect = screen.getByLabelText('Scenario Template');
    fireEvent.change(templateSelect, { target: { value: 'template1' } });
    
    // Wait for template to load
    await waitFor(() => {
      expect(screen.getByText('Evaluate impact of adding a new terminal')).toBeInTheDocument();
    });
    
    // Submit without filling required fields
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // API should not be called
    expect(scenarioApi.createFromTemplate).not.toHaveBeenCalled();
    
    // Clean up
    consoleSpy.mockRestore();
  });

  it('displays error message when API call fails', async () => {
    // Mock API failure
    scenarioApi.createScenario.mockRejectedValue(new Error('API Error'));
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test scenario' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
  
  it('displays error when calculation API call fails', async () => {
    // Setup mocks for scenario creation success but calculation failure
    scenarioApi.createScenario.mockResolvedValue({ scenarioId: 'calc-error-123' });
    scenarioApi.calculateScenario.mockRejectedValue(new Error('Calculation API Error'));
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test scenario with calculation error' } });
    
    // Submit the form (auto-calculate is selected by default)
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if calculation error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Calculation API Error')).toBeInTheDocument();
    });
  });
  
  it('handles calculation failure status correctly', async () => {
    // Setup API mocks for failed calculation status
    scenarioApi.createScenario.mockResolvedValue({ scenarioId: 'calc-fail-123' });
    scenarioApi.calculateScenario.mockResolvedValue({ calculationId: 'calc-fail-456' });
    scenarioApi.getCalculation.mockResolvedValue({ 
      status: 'failed', 
      errorMessage: 'Calculation process failed' 
    });
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Test failed calculation' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if error message is displayed for failed calculation
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Calculation failed: Calculation process failed')).toBeInTheDocument();
    });
  });

  it('auto-calculates scenario when option is selected', async () => {
    scenarioApi.createScenario.mockResolvedValue({ scenarioId: 'auto-calc-123' });
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Auto-calculate test' } });
    
    // Submit the form (auto-calculate is selected by default)
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if calculateScenario was called after creation
    await waitFor(() => {
      expect(scenarioApi.calculateScenario).toHaveBeenCalledWith('auto-calc-123', {
        options: { timeHorizon: 'day' }
      });
    });
  });

  it('polls calculation status correctly', async () => {
    // Setup mock implementation for status polling
    scenarioApi.createScenario.mockResolvedValue({ scenarioId: 'poll-123' });
    scenarioApi.calculateScenario.mockResolvedValue({ calculationId: 'calc-456' });
    
    // Mock getCalculation to first return 'processing' then 'completed'
    scenarioApi.getCalculation
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ 
        status: 'completed',
        results: { totalCapacity: 120 }
      });
    
    // Mock setTimeout
    jest.useFakeTimers();
    
    render(<WhatIfAnalysis {...mockProps} />);
    
    // Fill out and submit the form
    const descriptionInput = screen.getByLabelText('What-If Scenario Description');
    fireEvent.change(descriptionInput, { target: { value: 'Polling test' } });
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Check if calculation started
    await waitFor(() => {
      expect(scenarioApi.calculateScenario).toHaveBeenCalledWith('poll-123', expect.any(Object));
    });
    
    // Check if getCalculation was called
    await waitFor(() => {
      expect(scenarioApi.getCalculation).toHaveBeenCalledWith('poll-123', 'calc-456');
    });
    
    // Fast-forward timers to trigger next poll
    jest.advanceTimersByTime(2000);
    
    // Check if onScenarioCalculated was called with results
    await waitFor(() => {
      expect(mockProps.onScenarioCalculated).toHaveBeenCalledWith({
        scenarioId: 'poll-123',
        calculationId: 'calc-456',
        results: { totalCapacity: 120 }
      });
    });
    
    // Clean up timer mocks
    jest.useRealTimers();
  });
});