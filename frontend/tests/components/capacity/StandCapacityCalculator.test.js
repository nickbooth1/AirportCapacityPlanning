import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StandCapacityCalculator from '../../../src/components/capacity/StandCapacityCalculator';
import { calculateStandCapacity } from '../../../src/lib/capacityApi';

// Mock the API client
jest.mock('../../../src/lib/capacityApi', () => ({
  calculateStandCapacity: jest.fn()
}));

// Mock the child components to simplify testing
jest.mock('../../../src/components/capacity/CapacityForm', () => {
  return function MockCapacityForm({ onCalculate, loading }) {
    return (
      <div data-testid="mock-capacity-form">
        <button 
          onClick={() => onCalculate({ useDefinedTimeSlots: true })}
          disabled={loading}
        >
          Calculate
        </button>
      </div>
    );
  };
});

jest.mock('../../../src/components/capacity/CapacityResults', () => {
  return function MockCapacityResults({ results }) {
    return (
      <div data-testid="mock-capacity-results">
        {results ? 'Has Results' : 'No Results'}
      </div>
    );
  };
});

describe('StandCapacityCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders the capacity form', () => {
    render(<StandCapacityCalculator />);
    expect(screen.getByTestId('mock-capacity-form')).toBeInTheDocument();
  });
  
  test('does not show results initially', () => {
    render(<StandCapacityCalculator />);
    expect(screen.queryByTestId('mock-capacity-results')).not.toBeInTheDocument();
  });
  
  test('calls calculateStandCapacity when form is submitted', async () => {
    calculateStandCapacity.mockResolvedValue({
      bestCaseCapacity: {},
      worstCaseCapacity: {},
      timeSlots: []
    });
    
    render(<StandCapacityCalculator />);
    
    fireEvent.click(screen.getByText('Calculate'));
    
    await waitFor(() => {
      expect(calculateStandCapacity).toHaveBeenCalledWith(
        expect.objectContaining({ useDefinedTimeSlots: true })
      );
    });
  });
  
  test('displays results when calculation completes', async () => {
    calculateStandCapacity.mockResolvedValue({
      bestCaseCapacity: {},
      worstCaseCapacity: {},
      timeSlots: []
    });
    
    render(<StandCapacityCalculator />);
    
    fireEvent.click(screen.getByText('Calculate'));
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-capacity-results')).toBeInTheDocument();
      expect(screen.getByText('Has Results')).toBeInTheDocument();
    });
  });
  
  test('displays error when calculation fails', async () => {
    calculateStandCapacity.mockRejectedValue(new Error('API error'));
    
    render(<StandCapacityCalculator />);
    
    fireEvent.click(screen.getByText('Calculate'));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to calculate stand capacity/i)).toBeInTheDocument();
    });
  });
}); 