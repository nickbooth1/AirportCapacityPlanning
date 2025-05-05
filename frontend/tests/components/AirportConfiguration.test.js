import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AirportConfiguration from '../../src/pages/config/airport-configuration';
import { AirportConfigProvider } from '../../src/contexts/AirportConfigContext';

// Mock axios
jest.mock('axios');

// Mock data
const mockAirports = [
  { id: 1, name: 'London Heathrow', iata_code: 'LHR', country: 'GB' },
  { id: 2, name: 'JFK International', iata_code: 'JFK', country: 'US' }
];

const mockAirlines = [
  { id: 1, name: 'British Airways', iata_code: 'BA' },
  { id: 2, name: 'American Airlines', iata_code: 'AA' }
];

const mockTerminals = [
  { id: 1, name: 'Terminal 1', code: 'T1' },
  { id: 2, name: 'Terminal 2', code: 'T2' }
];

const mockGhas = [
  { id: 1, name: 'Swissport' },
  { id: 2, name: 'Menzies Aviation' }
];

const mockAllocations = [
  {
    id: 1,
    airline_id: 1,
    airline_name: 'British Airways',
    airline_iata_code: 'BA',
    terminal_id: 1,
    terminal_name: 'Terminal 1',
    terminal_code: 'T1',
    gha_id: 1,
    gha_name: 'Swissport'
  }
];

describe('AirportConfiguration Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default axios responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/airports')) {
        return Promise.resolve({ data: { data: mockAirports } });
      }
      if (url.includes('/airlines')) {
        return Promise.resolve({ data: { data: mockAirlines } });
      }
      if (url.includes('/terminals')) {
        return Promise.resolve({ data: { data: mockTerminals } });
      }
      if (url.includes('/ghas')) {
        return Promise.resolve({ data: { data: mockGhas } });
      }
      if (url.includes('/airport-config')) {
        return Promise.resolve({ data: { data: { baseAirport: mockAirports[0] } } });
      }
      if (url.includes('/allocations')) {
        return Promise.resolve({ data: { data: mockAllocations } });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock other axios methods
    axios.put.mockResolvedValue({ 
      data: { 
        data: { baseAirport: mockAirports[0] } 
      } 
    });
    axios.post.mockResolvedValue({ 
      data: { 
        data: mockAllocations[0] 
      } 
    });
    axios.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders loading state initially', async () => {
    render(
      <AirportConfigProvider>
        <AirportConfiguration />
      </AirportConfigProvider>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders base airport selection when loaded', async () => {
    render(
      <AirportConfigProvider>
        <AirportConfiguration />
      </AirportConfigProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Base Airport')).toBeInTheDocument();
      expect(screen.getByText('Airline Terminal Allocations')).toBeInTheDocument();
    });
  });

  test('displays allocations in the table', async () => {
    render(
      <AirportConfigProvider>
        <AirportConfiguration />
      </AirportConfigProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('BA - British Airways')).toBeInTheDocument();
      expect(screen.getByText('T1 - Terminal 1')).toBeInTheDocument();
      expect(screen.getByText('Swissport')).toBeInTheDocument();
    });
  });

  test('opens add allocation dialog', async () => {
    render(
      <AirportConfigProvider>
        <AirportConfiguration />
      </AirportConfigProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Add Allocation')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Allocation'));
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Airline *')).toBeInTheDocument();
      expect(screen.getByText('Terminal *')).toBeInTheDocument();
      expect(screen.getByText('Ground Handling Agent (Optional)')).toBeInTheDocument();
    });
  });
}); 