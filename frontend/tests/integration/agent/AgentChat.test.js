import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from '../../../components/agent/Chat';
import AgentService from '../../../src/api/AgentService';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const emit = jest.fn();
  const on = jest.fn();
  const off = jest.fn();
  const disconnect = jest.fn();
  
  const socket = {
    emit,
    on,
    off,
    disconnect,
    io: {
      on: jest.fn(),
      reconnectionDelay: 3000
    }
  };
  
  return {
    io: jest.fn(() => socket)
  };
});

// Mock AgentService
jest.mock('../../../src/api/AgentService', () => ({
  sendQuery: jest.fn(),
  getConversation: jest.fn(),
  approveAction: jest.fn(),
  rejectAction: jest.fn(),
  submitFeedback: jest.fn(),
  saveInsight: jest.fn()
}));

// Mock the global fetch
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn().mockReturnValue('mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

describe('Agent Chat Integration Tests', () => {
  let mockSocket;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch successful responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          contextId: 'ctx123',
          messages: []
        }
      })
    });
    
    // Setup socket mock
    mockSocket = io();
    
    // Mock socket event handlers
    mockSocket.on.mockImplementation((event, callback) => {
      // Store the callbacks for later triggering
      if (event === 'agent-response') {
        mockSocket.agentResponseCallback = callback;
      } else if (event === 'action-proposal') {
        mockSocket.actionProposalCallback = callback;
      } else if (event === 'action-result') {
        mockSocket.actionResultCallback = callback;
      }
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('renders the chat interface', () => {
    render(<Chat contextId="ctx123" />);
    
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome to the airport capacity ai assistant/i)).toBeInTheDocument();
  });
  
  test('sends a message and receives a response', async () => {
    render(<Chat contextId="ctx123" />);
    
    // Find the input field and send button
    const inputField = screen.getByPlaceholderText(/ask a question/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Type a message
    fireEvent.change(inputField, { target: { value: 'What is the current airport capacity?' } });
    
    // Send the message
    fireEvent.click(sendButton);
    
    // Verify the user message is displayed
    expect(screen.getByText('What is the current airport capacity?')).toBeInTheDocument();
    
    // Simulate agent response via WebSocket
    await act(async () => {
      mockSocket.agentResponseCallback({
        id: 'resp1',
        text: 'The current airport capacity is 50 flights per hour.',
        timestamp: new Date().toISOString()
      });
    });
    
    // Verify the agent response is displayed
    await waitFor(() => {
      expect(screen.getByText('The current airport capacity is 50 flights per hour.')).toBeInTheDocument();
    });
  });
  
  test('handles action proposals and approvals', async () => {
    render(<Chat contextId="ctx123" />);
    
    // Find the input field and send button
    const inputField = screen.getByPlaceholderText(/ask a question/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Type a message
    fireEvent.change(inputField, { target: { value: 'Schedule maintenance for Stand A1' } });
    
    // Send the message
    fireEvent.click(sendButton);
    
    // Simulate action proposal via WebSocket
    await act(async () => {
      mockSocket.actionProposalCallback({
        id: 'proposal1',
        description: 'I will schedule maintenance for Stand A1',
        actionType: 'maintenance_create',
        parameters: {
          standId: 'A1',
          startDate: '2025-05-20',
          endDate: '2025-05-22',
          reason: 'Regular maintenance'
        }
      });
    });
    
    // Verify the action proposal is displayed
    expect(screen.getByText(/i will schedule maintenance for stand a1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    
    // Click approve button
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    
    // Verify approval message
    expect(screen.getByText(/approving action/i)).toBeInTheDocument();
    
    // Simulate action result via WebSocket
    await act(async () => {
      mockSocket.actionResultCallback({
        responseId: 'result1',
        message: 'Maintenance for Stand A1 has been scheduled successfully.',
        success: true
      });
    });
    
    // Verify the action result is displayed
    await waitFor(() => {
      expect(screen.getByText(/maintenance for stand a1 has been scheduled successfully/i)).toBeInTheDocument();
    });
  });
  
  test('handles action rejection', async () => {
    render(<Chat contextId="ctx123" />);
    
    // Simulate action proposal via WebSocket
    await act(async () => {
      mockSocket.actionProposalCallback({
        id: 'proposal2',
        description: 'I will update capacity parameters to increase hourly capacity',
        actionType: 'capacity_parameter_update',
        parameters: {
          hourlyCapacity: 60,
          overrideDefault: true
        }
      });
    });
    
    // Verify the action proposal is displayed
    expect(screen.getByText(/i will update capacity parameters/i)).toBeInTheDocument();
    
    // Click reject button
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    
    // Find and fill the rejection reason dialog
    const rejectReasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(rejectReasonInput, { target: { value: 'This would exceed safety limits' } });
    
    // Click the confirm reject button in the dialog
    fireEvent.click(screen.getByRole('button', { name: /reject$/i }));
    
    // Verify rejection message
    expect(screen.getByText(/action rejected: this would exceed safety limits/i)).toBeInTheDocument();
  });
  
  test('handles feedback submission', async () => {
    render(<Chat contextId="ctx123" />);
    
    // Simulate agent response
    await act(async () => {
      mockSocket.agentResponseCallback({
        id: 'resp2',
        text: 'Here is the capacity report you requested.',
        timestamp: new Date().toISOString()
      });
    });
    
    // Find and click the thumbs up button
    const thumbsUpButton = screen.getByRole('button', { name: /helpful/i });
    fireEvent.click(thumbsUpButton);
    
    // Verify feedback was submitted
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/agent/feedback'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rating":5')
      })
    );
  });
  
  test('handles error states gracefully', async () => {
    // Mock a failed fetch
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'Internal server error'
      })
    });
    
    render(<Chat contextId="ctx123" />);
    
    // Type and send a message
    const inputField = screen.getByPlaceholderText(/ask a question/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(inputField, { target: { value: 'What is the capacity forecast?' } });
    fireEvent.click(sendButton);
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/error: internal server error/i)).toBeInTheDocument();
    });
  });
});