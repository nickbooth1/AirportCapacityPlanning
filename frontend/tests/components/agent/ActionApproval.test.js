import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActionApproval from '../../../src/components/agent/ActionApproval';
import { AgentService } from '../../../src/api/AgentService';

// Mock the agent service
jest.mock('../../../src/api/AgentService');

describe('ActionApproval Component', () => {
  const mockProposal = {
    proposalId: 'test-proposal-id',
    actionType: 'maintenance_create',
    description: 'Schedule maintenance for stand A3',
    parameters: {
      standId: 'A3',
      startTime: '2023-12-05T09:00:00Z',
      endTime: '2023-12-05T17:00:00Z'
    },
    impact: 'This will reduce terminal capacity by approximately 5%',
    status: 'pending'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock approval and rejection responses
    AgentService.approveAction = jest.fn().mockResolvedValue({
      proposalId: 'test-proposal-id',
      status: 'approved',
      result: { success: true, message: 'Action executed successfully' }
    });
    
    AgentService.rejectAction = jest.fn().mockResolvedValue({
      proposalId: 'test-proposal-id',
      status: 'rejected'
    });
  });
  
  it('renders proposal details correctly', () => {
    render(<ActionApproval proposal={mockProposal} onComplete={jest.fn()} />);
    
    expect(screen.getByText('Schedule maintenance for stand A3')).toBeInTheDocument();
    expect(screen.getByText('This will reduce terminal capacity by approximately 5%')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });
  
  it('calls approveAction when approve button is clicked', async () => {
    const mockOnComplete = jest.fn();
    render(<ActionApproval proposal={mockProposal} onComplete={mockOnComplete} />);
    
    fireEvent.click(screen.getByText('Approve'));
    
    expect(AgentService.approveAction).toHaveBeenCalledWith('test-proposal-id');
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        proposalId: 'test-proposal-id',
        status: 'approved',
        result: { success: true, message: 'Action executed successfully' }
      });
    });
  });
  
  it('calls rejectAction when reject button is clicked', async () => {
    const mockOnComplete = jest.fn();
    render(<ActionApproval proposal={mockProposal} onComplete={mockOnComplete} />);
    
    fireEvent.click(screen.getByText('Reject'));
    
    expect(AgentService.rejectAction).toHaveBeenCalledWith('test-proposal-id', undefined);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        proposalId: 'test-proposal-id',
        status: 'rejected'
      });
    });
  });
  
  it('allows providing rejection reason', async () => {
    AgentService.rejectAction = jest.fn().mockImplementation((id, reason) => {
      return Promise.resolve({
        proposalId: id,
        status: 'rejected',
        reason
      });
    });
    
    const mockOnComplete = jest.fn();
    render(<ActionApproval proposal={mockProposal} onComplete={mockOnComplete} />);
    
    // Click the "Reject with reason" button or similar
    fireEvent.click(screen.getByText('Reject with reason'));
    
    // Enter reason in the dialog or input
    const reasonInput = screen.getByPlaceholderText('Enter rejection reason');
    fireEvent.change(reasonInput, { target: { value: 'Maintenance conflicts with flight schedule' } });
    
    // Confirm rejection
    fireEvent.click(screen.getByText('Confirm Rejection'));
    
    expect(AgentService.rejectAction).toHaveBeenCalledWith(
      'test-proposal-id', 
      'Maintenance conflicts with flight schedule'
    );
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        proposalId: 'test-proposal-id',
        status: 'rejected',
        reason: 'Maintenance conflicts with flight schedule'
      });
    });
  });
  
  it('shows loading state during approval/rejection process', async () => {
    // Mock a delay in the response
    AgentService.approveAction = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            proposalId: 'test-proposal-id',
            status: 'approved',
            result: { success: true }
          });
        }, 100);
      });
    });
    
    render(<ActionApproval proposal={mockProposal} onComplete={jest.fn()} />);
    
    fireEvent.click(screen.getByText('Approve'));
    
    // Loading indicator should appear
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Buttons should be disabled
    expect(screen.getByText('Approve')).toBeDisabled();
    expect(screen.getByText('Reject')).toBeDisabled();
    
    // Wait for approval to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
  
  it('displays error message when approval fails', async () => {
    // Mock an error response
    AgentService.approveAction = jest.fn().mockRejectedValue(
      new Error('Failed to approve action: Server error')
    );
    
    render(<ActionApproval proposal={mockProposal} onComplete={jest.fn()} />);
    
    fireEvent.click(screen.getByText('Approve'));
    
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to approve action: Server error')).toBeInTheDocument();
    });
    
    // Buttons should be enabled again
    expect(screen.getByText('Approve')).not.toBeDisabled();
    expect(screen.getByText('Reject')).not.toBeDisabled();
  });
}); 