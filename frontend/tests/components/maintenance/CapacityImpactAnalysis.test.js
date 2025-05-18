import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CapacityImpactAnalysis from '../../../src/components/maintenance/CapacityImpactAnalysis';
import { getCapacityImpactAnalysis } from '../../../src/api/capacityApi';

// Mock the ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Set up the ResizeObserver mock before tests
beforeAll(() => {
  window.ResizeObserver = ResizeObserverMock;
});

// Mock the capacityApi
jest.mock('../../../src/api/capacityApi', () => ({
  getCapacityImpactAnalysis: jest.fn()
}));

// Mock the CapacityImpactChart component to avoid rendering the chart
jest.mock('../../../src/components/maintenance/CapacityImpactChart', () => {
  return function MockChart({ data, loading, error }) {
    if (loading) return <div data-testid="loading-spinner">Loading...</div>;
    if (error) return <div data-testid="error-message">Error: {error.message}</div>;
    if (!data || data.length === 0) return <div>No data available</div>;
    
    return (
      <div data-testid="chart">
        <div>Chart with {data.length} days of data</div>
        {data.length > 0 && (
          <div data-testid="chart-summary">
            <div>Original Capacity: {data[0].originalDailyCapacity.total}</div>
            <div>Net Capacity: {data[0].finalNetCapacity.total}</div>
          </div>
        )}
      </div>
    );
  };
});

// Mock the DatePicker and other dependencies
jest.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({ label, value, onChange }) => {
    return (
      <input 
        type="text" 
        data-testid={`date-picker-${label.replace(/\s+/g, '-').toLowerCase()}`}
        value={value.toISOString().split('T')[0]}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
    );
  },
  LocalizationProvider: ({ children }) => <div>{children}</div>
}));

jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn()
}));

// Sample data for testing
const mockImpactData = {
  dailyImpacts: [
    {
      date: '2023-12-15',
      originalDailyCapacity: {
        narrowBody: 150,
        wideBody: 50,
        total: 200
      },
      capacityAfterDefiniteImpact: {
        narrowBody: 140,
        wideBody: 45,
        total: 185
      },
      finalNetCapacity: {
        narrowBody: 135,
        wideBody: 40,
        total: 175
      },
      maintenanceImpacts: {
        definite: {
          reduction: {
            narrowBody: 10,
            wideBody: 5,
            total: 15
          },
          requests: [
            {
              id: 1,
              standId: 101,
              standCode: 'A1',
              title: 'Terminal A Gate 1 Maintenance',
              status: 'Approved'
            }
          ]
        },
        potential: {
          reduction: {
            narrowBody: 5,
            wideBody: 5,
            total: 10
          },
          requests: [
            {
              id: 2,
              standId: 102,
              standCode: 'A2',
              title: 'Terminal A Gate 2 Repair',
              status: 'Requested'
            }
          ]
        }
      }
    }
  ]
};

describe('CapacityImpactAnalysis Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful API response
    getCapacityImpactAnalysis.mockResolvedValue(mockImpactData);
  });

  test('renders the component with date selectors', async () => {
    render(<CapacityImpactAnalysis />);
    
    // Check that title and date pickers are rendered
    expect(screen.getByText('Maintenance Impact on Stand Capacity')).toBeInTheDocument();
    expect(screen.getByTestId('date-picker-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('date-picker-end-date')).toBeInTheDocument();
    
    // Check that range selection buttons are rendered
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('14 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    
    // Wait for the API to be called
    await waitFor(() => {
      expect(getCapacityImpactAnalysis).toHaveBeenCalled();
    });
    
    // Wait for chart to be rendered with data
    await waitFor(() => {
      expect(screen.getByTestId('chart')).toBeInTheDocument();
    });
  });

  test('displays loading state while fetching data', async () => {
    // Delay the API response
    getCapacityImpactAnalysis.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockImpactData), 100))
    );
    
    render(<CapacityImpactAnalysis />);
    
    // Check for loading indicator
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart')).toBeInTheDocument();
    });
  });

  test('displays error state when API fails', async () => {
    // Mock API error
    const errorMessage = 'Failed to fetch data';
    getCapacityImpactAnalysis.mockRejectedValue(new Error(errorMessage));
    
    render(<CapacityImpactAnalysis />);
    
    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  test('displays summary statistics when data is loaded', async () => {
    render(<CapacityImpactAnalysis />);
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByTestId('chart')).toBeInTheDocument();
    });
    
    // Check that summary information is displayed
    expect(screen.getByText(/Analyzing capacity impact from/)).toBeInTheDocument();
    expect(screen.getByText(/Total Maintenance Requests: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Average Daily Impact: 25/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum Daily Impact: 25/)).toBeInTheDocument();
  });
}); 