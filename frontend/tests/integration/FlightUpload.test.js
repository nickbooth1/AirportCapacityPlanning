import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FlightUploadProvider, UploadStatus } from '../../src/contexts/FlightUploadContext';
import UploadTool from '../../components/flights/UploadTool';
import UploadQA from '../../components/flights/UploadQA';
import * as flightUploadApi from '../../api/flightUploadApi';

// Mock API functions
jest.mock('../../api/flightUploadApi');

// Mock file upload
const mockFile = new File(['test,data,csv'], 'test.csv', { type: 'text/csv' });

describe('Flight Upload Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock API responses
    flightUploadApi.uploadFile.mockResolvedValue({ id: 1, filename: 'test.csv' });
    flightUploadApi.getUploadStatus.mockResolvedValue({ id: 1, status: 'completed' });
    flightUploadApi.validateFlights.mockResolvedValue({ message: 'Validation started' });
    flightUploadApi.getValidationStats.mockResolvedValue({
      total: 10,
      valid: 8,
      invalid: 2,
      arrivalValid: 4,
      arrivalInvalid: 1,
      departureValid: 4,
      departureInvalid: 1
    });
    flightUploadApi.getValidationResults.mockResolvedValue({
      data: [
        {
          id: 1,
          flight_number: 'BA123',
          airline_iata: 'BA',
          flight_nature: 'A',
          origin_destination_iata: 'JFK',
          scheduled_datetime: '2023-09-15T14:00:00',
          aircraft_type_iata: 'B738',
          validation_status: 'valid',
          validation_errors: null
        },
        {
          id: 2,
          flight_number: 'LH456',
          airline_iata: 'LH',
          flight_nature: 'D',
          origin_destination_iata: 'FRA',
          scheduled_datetime: '2023-09-15T16:30:00',
          aircraft_type_iata: 'A320',
          validation_status: 'invalid',
          validation_errors: JSON.stringify([
            { field: 'seat_capacity', message: 'Seat capacity must be a positive number' }
          ])
        }
      ],
      pagination: {
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    });
    flightUploadApi.approveFlights.mockResolvedValue({ 
      success: true, 
      message: '8 flights marked for import' 
    });
  });
  
  test('Complete upload and validation workflow', async () => {
    // Setup test component with context
    const TestComponent = () => {
      const [currentStep, setCurrentStep] = React.useState(0);
      
      // Mock the status changing for testing
      const advanceStep = () => {
        setCurrentStep(prev => prev + 1);
      };
      
      return (
        <FlightUploadProvider>
          <button onClick={advanceStep}>Advance Step</button>
          {currentStep === 0 && <UploadTool acceptedFileTypes={['.csv']} maxFileSize={50} />}
          {currentStep === 1 && <UploadQA />}
        </FlightUploadProvider>
      );
    };
    
    render(<TestComponent />);
    
    // Step 1: Upload file
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    
    // Verify file is selected
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
    
    // Click upload button
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    // Advance to QA component
    const advanceButton = screen.getByText('Advance Step');
    fireEvent.click(advanceButton);
    
    // Verify QA component shows validation results
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
      expect(screen.getByText('Total Flights')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total flights
      expect(screen.getByText('8')).toBeInTheDocument(); // Valid flights
      expect(screen.getByText('2')).toBeInTheDocument(); // Invalid flights
    });
    
    // Verify table shows flight data
    expect(screen.getByText('BA123')).toBeInTheDocument();
    expect(screen.getByText('LH456')).toBeInTheDocument();
    
    // Click approve button
    const approveButton = screen.getByText('Approve Valid Flights');
    fireEvent.click(approveButton);
    
    // Verify API calls were made correctly
    await waitFor(() => {
      expect(flightUploadApi.approveFlights).toHaveBeenCalledWith(expect.anything(), {
        approveAll: true,
        excludeInvalid: true
      });
    });
  });
  
  test('Export validation report', async () => {
    // Mock the window.URL.createObjectURL and other DOM methods
    const mockUrl = 'blob:test';
    const mockCreateObjectURL = jest.fn().mockReturnValue(mockUrl);
    const mockRevokeObjectURL = jest.fn();
    const originalCreateElement = document.createElement;
    
    // Mock link element
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
      setAttribute: jest.fn()
    };
    
    // Setup mocks
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement.call(document, tag);
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    // Mock blob response for export
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    flightUploadApi.exportValidationReport.mockResolvedValue(mockBlob);
    
    // Render QA component directly with validation data
    render(
      <FlightUploadProvider>
        <UploadQA />
      </FlightUploadProvider>
    );
    
    // Force component to show validation results by mocking context state
    await act(async () => {
      // Wait for validation data to load
      await waitFor(() => {
        // Find and click export button (CSV)
        const exportButton = screen.getByTitle('Export CSV');
        fireEvent.click(exportButton);
      });
    });
    
    // Verify export API call
    await waitFor(() => {
      expect(flightUploadApi.exportValidationReport).toHaveBeenCalled();
    });
  });
}); 