import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComparativeCapacityChart from '../../../components/capacity/ComparativeCapacityChart';

// Mock chart.js and chartjs-plugin-datalabels
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn()
}));

jest.mock('chartjs-plugin-datalabels', () => jest.fn());

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Bar: jest.fn().mockImplementation(({ data, options, height }) => (
    <div data-testid="mock-bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data.labels)}</div>
      <div data-testid="chart-datasets">{data.datasets.length}</div>
      <div data-testid="chart-height">{height}</div>
    </div>
  )),
  Line: jest.fn().mockImplementation(({ data, options, height }) => (
    <div data-testid="mock-line-chart">
      <div data-testid="chart-data">{JSON.stringify(data.labels)}</div>
      <div data-testid="chart-datasets">{data.datasets.length}</div>
      <div data-testid="chart-height">{height}</div>
    </div>
  ))
}));

// Mock scenarios and metrics
const mockScenarios = [
  {
    id: 'scenario1',
    title: 'Baseline Scenario',
    results: {
      total: {
        total_capacity: 50,
        utilization: 0.8
      },
      byHour: {
        8: { total_capacity: 45, utilization: 0.75 },
        9: { total_capacity: 50, utilization: 0.8 },
        10: { total_capacity: 48, utilization: 0.78 }
      },
      byDay: {
        1: { total_capacity: 46, utilization: 0.76 },
        2: { total_capacity: 48, utilization: 0.78 }
      },
      byTerminal: {
        'Terminal 1': { total_capacity: 30, utilization: 0.85 },
        'Terminal 2': { total_capacity: 20, utilization: 0.75 }
      },
      byStandType: {
        narrowBody: { total_capacity: 30, utilization: 0.82 },
        wideBody: { total_capacity: 20, utilization: 0.78 },
        total: { total_capacity: 50, utilization: 0.8 }
      }
    }
  },
  {
    id: 'scenario2',
    title: 'Expansion Scenario',
    results: {
      total: {
        total_capacity: 60,
        utilization: 0.75
      },
      byHour: {
        8: { total_capacity: 55, utilization: 0.7 },
        9: { total_capacity: 60, utilization: 0.75 },
        10: { total_capacity: 58, utilization: 0.73 }
      },
      byDay: {
        1: { total_capacity: 56, utilization: 0.72 },
        2: { total_capacity: 58, utilization: 0.74 }
      },
      byTerminal: {
        'Terminal 1': { total_capacity: 35, utilization: 0.8 },
        'Terminal 2': { total_capacity: 25, utilization: 0.7 }
      },
      byStandType: {
        narrowBody: { total_capacity: 35, utilization: 0.77 },
        wideBody: { total_capacity: 25, utilization: 0.73 },
        total: { total_capacity: 60, utilization: 0.75 }
      }
    }
  }
];

const mockMetrics = [
  {
    id: 'total_capacity',
    name: 'Total Capacity',
    unit: 'stands',
    description: 'Maximum number of aircraft stands available'
  },
  {
    id: 'utilization',
    name: 'Utilization',
    unit: '%',
    description: 'Percentage of time stands are occupied'
  },
  {
    id: 'peak_demand',
    name: 'Peak Demand',
    unit: 'aircraft',
    description: 'Maximum number of aircraft requiring stands simultaneously'
  }
];

describe('ComparativeCapacityChart', () => {
  const mockOnParameterChange = jest.fn();
  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
        onExport={mockOnExport}
      />
    );
    
    expect(screen.getByText('Comparative Capacity Analysis')).toBeInTheDocument();
  });

  it('renders a bar chart by default', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
      />
    );
    
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  it('switches between chart types', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
      />
    );
    
    // Initially a bar chart
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
    
    // Switch to line chart
    fireEvent.mouseDown(screen.getByText(/Bar Chart/i));
    fireEvent.click(screen.getByText(/Line Chart/i));
    
    expect(mockOnParameterChange).toHaveBeenCalledWith('chartType', 'line');
    
    // Re-render with new chart type
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
        chartType="line"
      />
    );
    
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('changes grouping options', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
      />
    );
    
    // Default is 'hour'
    expect(screen.getByText(/Hour of Day/i)).toBeInTheDocument();
    
    // Change to 'day'
    fireEvent.mouseDown(screen.getByText(/Hour of Day/i));
    fireEvent.click(screen.getByText(/Day of Week/i));
    
    expect(mockOnParameterChange).toHaveBeenCalledWith('groupBy', 'day');
  });

  it('changes metrics', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
      />
    );
    
    // Default primary metric
    expect(screen.getByText(/Total Capacity/i)).toBeInTheDocument();
    
    // Change primary metric
    fireEvent.mouseDown(screen.getAllByText(/Total Capacity/i)[0]); // Find the select option
    fireEvent.click(screen.getByText(/Peak Demand/i));
    
    expect(mockOnParameterChange).toHaveBeenCalledWith('primaryMetric', 'peak_demand');
  });

  it('toggles difference view', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onParameterChange={mockOnParameterChange}
      />
    );
    
    // Click the show difference button
    fireEvent.click(screen.getByText(/Show Difference/i));
    
    expect(mockOnParameterChange).toHaveBeenCalledWith('showDifference', true);
  });

  it('handles export button click', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        onExport={mockOnExport}
      />
    );
    
    // Click the export button
    fireEvent.click(screen.getByText(/Export/i));
    
    expect(mockOnExport).toHaveBeenCalled();
    expect(mockOnExport.mock.calls[0][0]).toHaveProperty('type', 'bar');
    expect(mockOnExport.mock.calls[0][0]).toHaveProperty('data');
    expect(mockOnExport.mock.calls[0][0]).toHaveProperty('options');
    expect(mockOnExport.mock.calls[0][0]).toHaveProperty('parameters');
  });

  it('shows loading state', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        loading={true}
      />
    );
    
    expect(screen.getByText(/Loading capacity data/i)).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        error="Failed to load capacity data"
      />
    );
    
    expect(screen.getByText(/Failed to load capacity data/i)).toBeInTheDocument();
  });

  it('shows key insights when comparing scenarios', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
      />
    );
    
    expect(screen.getByText(/Key Insights/i)).toBeInTheDocument();
    // Check if we have at least one insight
    const insights = screen.getAllByRole('listitem');
    expect(insights.length).toBeGreaterThan(0);
  });

  it('disables controls when loading', () => {
    render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        loading={true}
      />
    );
    
    // Check that the metric select is disabled
    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });

  it('shows empty state when no data is available', () => {
    render(
      <ComparativeCapacityChart
        scenarios={[]}
        metrics={mockMetrics}
      />
    );
    
    expect(screen.getByText(/No data available for visualization/i)).toBeInTheDocument();
  });

  it('handles different group by options correctly', () => {
    // Test with different groupBy values
    const { rerender } = render(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        groupBy="hour"
      />
    );
    
    // Re-render with day grouping
    rerender(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        groupBy="day"
      />
    );
    
    // Re-render with terminal grouping
    rerender(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        groupBy="terminal"
      />
    );
    
    // Re-render with stand_type grouping
    rerender(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        groupBy="stand_type"
      />
    );
    
    // Re-render with total grouping
    rerender(
      <ComparativeCapacityChart
        scenarios={mockScenarios}
        metrics={mockMetrics}
        groupBy="total"
      />
    );
    
    // All these should render without errors
    expect(screen.getByText('Comparative Capacity Analysis')).toBeInTheDocument();
  });
});