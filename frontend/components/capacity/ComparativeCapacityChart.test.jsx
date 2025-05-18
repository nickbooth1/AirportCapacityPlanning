import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComparativeCapacityChart from './ComparativeCapacityChart';

// Mock Chart.js to avoid canvas rendering issues in tests
jest.mock('chart.js');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="mock-line-chart">Line Chart</div>,
}));

// Mock data
const mockScenarios = [
  {
    id: 'scenario1',
    title: 'Baseline',
    results: {
      total: {
        total_capacity: 120,
        utilization: 0.75
      },
      byHour: {
        6: { total_capacity: 10, utilization: 0.7 },
        7: { total_capacity: 15, utilization: 0.8 },
        8: { total_capacity: 18, utilization: 0.9 },
      },
      byTerminal: {
        'Terminal 1': { total_capacity: 50, utilization: 0.8 },
        'Terminal 2': { total_capacity: 70, utilization: 0.7 },
      },
      byStandType: {
        narrowBody: { total_capacity: 80, utilization: 0.7 },
        wideBody: { total_capacity: 40, utilization: 0.85 },
        total: { total_capacity: 120, utilization: 0.75 }
      }
    }
  },
  {
    id: 'scenario2',
    title: 'Terminal 2 Expansion',
    results: {
      total: {
        total_capacity: 140,
        utilization: 0.7
      },
      byHour: {
        6: { total_capacity: 12, utilization: 0.65 },
        7: { total_capacity: 18, utilization: 0.75 },
        8: { total_capacity: 22, utilization: 0.85 },
      },
      byTerminal: {
        'Terminal 1': { total_capacity: 50, utilization: 0.8 },
        'Terminal 2': { total_capacity: 90, utilization: 0.65 },
      },
      byStandType: {
        narrowBody: { total_capacity: 90, utilization: 0.65 },
        wideBody: { total_capacity: 50, utilization: 0.8 },
        total: { total_capacity: 140, utilization: 0.7 }
      }
    }
  }
];

const mockMetrics = [
  { id: 'total_capacity', name: 'Total Capacity', unit: 'stands', description: 'Total number of stands available' },
  { id: 'utilization', name: 'Utilization', unit: '', description: 'Percentage of capacity utilized' },
  { id: 'peak_hour', name: 'Peak Hour', unit: 'flights', description: 'Maximum flights per hour' }
];

describe('ComparativeCapacityChart', () => {
  const defaultProps = {
    scenarios: mockScenarios,
    metrics: mockMetrics,
    onParameterChange: jest.fn(),
    onExport: jest.fn()
  };

  test('renders the component with default props', () => {
    render(<ComparativeCapacityChart {...defaultProps} />);
    
    // Check title is rendered
    expect(screen.getByText('Comparative Capacity Analysis')).toBeInTheDocument();
    
    // Check controls are rendered
    expect(screen.getByText('Bar Chart')).toBeInTheDocument();
    
    // Chart should be rendered
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  test('changes chart type when selector is changed', async () => {
    render(<ComparativeCapacityChart {...defaultProps} />);
    
    // Find and click line chart option
    fireEvent.click(screen.getByText('Line Chart'));
    
    // Line chart should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    });
    
    // Callback should be called with correct parameters
    expect(defaultProps.onParameterChange).toHaveBeenCalledWith('chartType', 'line');
  });

  test('shows key insights when comparing scenarios', () => {
    render(<ComparativeCapacityChart {...defaultProps} />);
    
    // Key insights section should be rendered
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    
    // Should show capacity increase insight
    const insightText = screen.getByText(/shows a 16.7% increase in overall total_capacity/);
    expect(insightText).toBeInTheDocument();
  });

  test('toggles difference visualization', () => {
    render(<ComparativeCapacityChart {...defaultProps} />);
    
    // Find and click show difference button
    fireEvent.click(screen.getByText('Show Difference'));
    
    // Callback should be called with correct parameters
    expect(defaultProps.onParameterChange).toHaveBeenCalledWith('showDifference', true);
  });

  test('shows loading state when loading prop is true', () => {
    render(<ComparativeCapacityChart {...defaultProps} loading={true} />);
    
    // Should show loading spinner
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'loading');
  });

  test('handles export functionality', () => {
    render(<ComparativeCapacityChart {...defaultProps} />);
    
    // Find and click export button
    fireEvent.click(screen.getByText('Export'));
    
    // Export callback should be called
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  test('renders empty state when no scenarios provided', () => {
    render(<ComparativeCapacityChart metrics={mockMetrics} scenarios={[]} />);
    
    // Should show empty chart message
    expect(screen.getByText('No data available')).toBeInTheDocument();
    
    // Should not show insights section
    expect(screen.queryByText('Key Insights')).not.toBeInTheDocument();
  });
});