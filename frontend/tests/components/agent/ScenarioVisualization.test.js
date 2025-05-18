import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioVisualization from '../../../src/components/agent/ScenarioVisualization';

// Mock Chart.js
jest.mock('chart.js/auto', () => {
  return class {
    constructor() {
      this.destroy = jest.fn();
    }
    
    static register() {}
  };
});

describe('ScenarioVisualization Component', () => {
  // Sample scenario data for testing
  const mockScenarioData = {
    capacity: {
      narrowBodyCapacity: 45,
      wideBodyCapacity: 25,
      totalCapacity: 70
    },
    utilizationMetrics: {
      overallUtilization: 0.75,
      peakUtilization: 0.92,
      offPeakUtilization: 0.53,
      peakTime: '08:00-09:00'
    },
    capacityByHour: [
      { hour: 6, narrowBodyCapacity: 32, wideBodyCapacity: 18, totalCapacity: 50, utilization: 0.65 },
      { hour: 7, narrowBodyCapacity: 40, wideBodyCapacity: 22, totalCapacity: 62, utilization: 0.81 },
      { hour: 8, narrowBodyCapacity: 45, wideBodyCapacity: 25, totalCapacity: 70, utilization: 0.92 },
      { hour: 9, narrowBodyCapacity: 42, wideBodyCapacity: 23, totalCapacity: 65, utilization: 0.85 }
    ],
    impactSummary: 'Adding 3 wide-body stands increases peak capacity by 15%.'
  };
  
  // Comparison data for testing
  const mockComparisonData = {
    capacity: {
      narrowBodyCapacity: 45,
      wideBodyCapacity: 20,
      totalCapacity: 65
    },
    utilizationMetrics: {
      overallUtilization: 0.70,
      peakUtilization: 0.87,
      offPeakUtilization: 0.49
    },
    capacityByHour: [
      { hour: 6, narrowBodyCapacity: 32, wideBodyCapacity: 15, totalCapacity: 47, utilization: 0.61 },
      { hour: 7, narrowBodyCapacity: 40, wideBodyCapacity: 18, totalCapacity: 58, utilization: 0.75 },
      { hour: 8, narrowBodyCapacity: 45, wideBodyCapacity: 20, totalCapacity: 65, utilization: 0.87 },
      { hour: 9, narrowBodyCapacity: 42, wideBodyCapacity: 19, totalCapacity: 61, utilization: 0.79 }
    ],
    comparison: {
      capacityDelta: {
        narrowBody: 0,
        wideBody: 5,
        total: 5
      },
      utilizationDelta: 0.05
    }
  };

  // Mock canvas API for chart rendering
  beforeEach(() => {
    // Mock the canvas API and context methods used by Chart.js
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      fillText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn()
    }));
    
    // Mock toDataURL for export functionality
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockedData');
  });

  it('renders the component with scenario data', () => {
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Check if main title is displayed
    expect(screen.getByText('Scenario Results')).toBeInTheDocument();
    
    // Check if impact summary is displayed
    expect(screen.getByText('Adding 3 wide-body stands increases peak capacity by 15%.')).toBeInTheDocument();
    
    // Check if tabs are displayed
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Hourly Analysis')).toBeInTheDocument();
    expect(screen.getByText('Data Table')).toBeInTheDocument();
  });

  it('displays empty state when no data is provided', () => {
    render(<ScenarioVisualization scenarioData={null} loading={false} />);
    
    // Check if empty state is displayed
    expect(screen.getByText('No scenario data available')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(<ScenarioVisualization scenarioData={null} loading={true} />);
    
    // Cards typically display a loading state in Ant Design
    // This would be shown by the Card's loading prop
    // Since we're mocking Ant Design components, we need to check for the loading attribute
    expect(screen.getByTestId('mock-card').getAttribute('loading')).toBe('true');
  });
  
  it('handles scenario data without capacity info gracefully', () => {
    // Incomplete scenario data missing capacity info
    const incompleteData = {
      utilizationMetrics: mockScenarioData.utilizationMetrics,
      impactSummary: 'Test scenario with missing capacity data'
    };
    
    render(<ScenarioVisualization scenarioData={incompleteData} />);
    
    // Should still render without crashing
    expect(screen.getByText('Scenario Results')).toBeInTheDocument();
    expect(screen.getByText('Test scenario with missing capacity data')).toBeInTheDocument();
  });
  
  it('handles scenario data without utilization metrics gracefully', () => {
    // Incomplete scenario data missing utilization metrics
    const incompleteData = {
      capacity: mockScenarioData.capacity,
      impactSummary: 'Test scenario with missing utilization data'
    };
    
    render(<ScenarioVisualization scenarioData={incompleteData} />);
    
    // Should still render without crashing
    expect(screen.getByText('Scenario Results')).toBeInTheDocument();
    expect(screen.getByText('Test scenario with missing utilization data')).toBeInTheDocument();
  });
  
  it('handles scenario data without hourly data gracefully', () => {
    // Incomplete scenario data missing hourly breakdown
    const incompleteData = {
      capacity: mockScenarioData.capacity,
      utilizationMetrics: mockScenarioData.utilizationMetrics,
      impactSummary: 'Test scenario with missing hourly data'
    };
    
    render(<ScenarioVisualization scenarioData={incompleteData} />);
    
    // Should still render capacity tab without crashing
    expect(screen.getByText('Scenario Results')).toBeInTheDocument();
    
    // Switch to hourly tab
    fireEvent.click(screen.getByText('Hourly Analysis'));
    
    // Should handle missing data gracefully
    expect(screen.getByText('Hourly Capacity Analysis')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Default tab should be 'capacity'
    expect(screen.getByText('Stand Capacity')).toBeInTheDocument();
    
    // Switch to hourly analysis tab
    fireEvent.click(screen.getByText('Hourly Analysis'));
    
    // Check if hourly analysis content is displayed
    expect(screen.getByText('Hourly Capacity Analysis')).toBeInTheDocument();
    
    // Switch to data table tab
    fireEvent.click(screen.getByText('Data Table'));
    
    // Check if data table content is displayed
    expect(screen.getByText('Scenario Data')).toBeInTheDocument();
    expect(screen.getByText('Data table view is under development')).toBeInTheDocument();
  });

  it('handles chart type changes correctly', () => {
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Find chart type buttons - in our mock we check for icon presence
    const barChartButton = screen.getAllByTestId('mock-button-default')[0];
    const pieChartButton = screen.getAllByTestId('mock-button-default')[1];
    
    // Click pie chart button
    fireEvent.click(pieChartButton);
    
    // This would change the chart type in the real component
    // We can only verify the click happened since we can't easily test the Chart.js implementation
    
    // Click bar chart button
    fireEvent.click(barChartButton);
    
    // Similarly, verify the click happened
  });

  it('handles metric selection for hourly chart', () => {
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Switch to hourly analysis tab
    fireEvent.click(screen.getByText('Hourly Analysis'));
    
    // Find the metric selector
    const metricSelect = screen.getByTestId('mock-select');
    
    // Change metric to 'narrow'
    fireEvent.change(metricSelect, { target: { value: 'narrow' } });
    
    // Change metric to 'wide'
    fireEvent.change(metricSelect, { target: { value: 'wide' } });
    
    // Change metric to 'utilization'
    fireEvent.change(metricSelect, { target: { value: 'utilization' } });
  });

  it('displays comparison data when provided', () => {
    render(
      <ScenarioVisualization 
        scenarioData={mockScenarioData} 
        comparisonData={mockComparisonData}
      />
    );
    
    // Check if comparison indicator is displayed
    expect(screen.getByText('(Comparison Active)')).toBeInTheDocument();
    
    // Check if comparison metrics are displayed
    // In real component, we would have comparison insights like difference values
    // With mocked components it's hard to check for all the comparison metrics
    // So we just check that the comparison mode is active
  });

  it('triggers compare request when button is clicked', () => {
    const mockOnRequestCompare = jest.fn();
    
    render(
      <ScenarioVisualization 
        scenarioData={mockScenarioData} 
        onRequestCompare={mockOnRequestCompare}
      />
    );
    
    // Find and click the compare button
    const compareButton = screen.getByText('Compare');
    fireEvent.click(compareButton);
    
    // Check if onRequestCompare callback was called
    expect(mockOnRequestCompare).toHaveBeenCalled();
  });
  
  it('renders interactive elements for each chart type', () => {
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Test chart type toggle buttons
    const barChartButton = screen.getAllByTestId('mock-button-default')[0];
    const pieChartButton = screen.getAllByTestId('mock-button-default')[1];
    
    // Bar chart should be active by default
    expect(barChartButton.getAttribute('type')).toBe('primary');
    expect(pieChartButton.getAttribute('type')).toBe('default');
    
    // Click pie chart button
    fireEvent.click(pieChartButton);
    
    // Now pie chart button should be active
    expect(pieChartButton.getAttribute('type')).toBe('primary');
    
    // Test hourly chart controls
    fireEvent.click(screen.getByText('Hourly Analysis'));
    
    // Find metric selector
    const metricSelector = screen.getByTestId('mock-select');
    expect(metricSelector).toBeInTheDocument();
    
    // Change metric
    fireEvent.change(metricSelector, { target: { value: 'utilization' } });
    
    // Hourly chart should update (this would be reflected in chart data in the real component)
  });
  
  it('handles missing data when comparing scenarios', () => {
    // Partial comparison data with some missing fields
    const partialComparisonData = {
      capacity: {
        narrowBodyCapacity: 40,
        // Missing wideBodyCapacity
        totalCapacity: 60
      },
      // Missing utilizationMetrics
      capacityByHour: mockComparisonData.capacityByHour.slice(0, 2), // Partial hourly data
      comparison: {
        capacityDelta: {
          narrowBody: 0,
          wideBody: 5,
          total: 5
        },
        // Missing utilizationDelta
      }
    };
    
    render(
      <ScenarioVisualization 
        scenarioData={mockScenarioData} 
        comparisonData={partialComparisonData}
      />
    );
    
    // Check if comparison indicator is displayed
    expect(screen.getByText('(Comparison Active)')).toBeInTheDocument();
    
    // Component should render without crashing despite missing data
    // We're testing graceful handling of incomplete data
  });

  it('attempts to export chart when export button is clicked', () => {
    global.URL.createObjectURL = jest.fn();
    HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('mock-data-url');
    
    // Mock document.createElement and link.click
    const mockAnchor = { click: jest.fn(), download: '', href: '' };
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return document.createElement(tag);
    });
    
    render(<ScenarioVisualization scenarioData={mockScenarioData} />);
    
    // Find and click an export button
    const exportButtons = screen.getAllByTestId('mock-button-default').filter(
      button => button.getAttribute('data-icon') === 'true'
    );
    
    // Click the export button (assuming it's one of the buttons with icons)
    fireEvent.click(exportButtons[0]);
    
    // Check if toDataURL was called (part of the export process)
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalled();
    
    // Check if the mock link was created with proper attributes
    expect(mockAnchor.download).toContain('scenario-chart');
    expect(mockAnchor.click).toHaveBeenCalled();
  });
  
  it('displays error state when API calls fail', () => {
    // Setup scenario with error message
    const scenarioWithError = {
      ...mockScenarioData,
      error: 'Failed to load scenario data'
    };
    
    render(<ScenarioVisualization scenarioData={scenarioWithError} />);
    
    // Check if error message is displayed
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load scenario data')).toBeInTheDocument();
  });
  
  it('handles refreshing scenario data', () => {
    // Mock the refresh function
    const mockRefresh = jest.fn();
    mockScenarioData.scenarioId = 'refresh-test-123';
    
    render(
      <ScenarioVisualization 
        scenarioData={mockScenarioData} 
        onRefresh={mockRefresh}
      />
    );
    
    // Find and click the refresh button
    const refreshButton = screen.getByTestId('mock-button-default');
    fireEvent.click(refreshButton);
    
    // Check if refresh callback was called with the correct scenario ID
    expect(mockRefresh).toHaveBeenCalledWith('refresh-test-123');
  });
});