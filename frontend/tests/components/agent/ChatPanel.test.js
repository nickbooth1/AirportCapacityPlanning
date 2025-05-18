import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPanel from '../../../src/components/agent/ChatPanel';
import { WebSocketProvider } from '../../../src/contexts/WebSocketContext';
import { AgentService } from '../../../src/api/AgentService';

// Mock the agent service and websocket context
jest.mock('../../../src/api/AgentService');
jest.mock('../../../src/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    connected: true,
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    setupConversationListeners: jest.fn(() => jest.fn()) // Returns cleanup function
  }),
  WebSocketProvider: ({ children }) => <div>{children}</div>
}));

describe('ChatPanel Component', () => {
  const mockConversation = {
    contextId: 'test-conversation-id',
    messages: [
      {
        id: 'msg1',
        role: 'user',
        content: 'What is the current capacity for wide-body aircraft?',
        timestamp: '2023-12-01T14:30:00Z'
      },
      {
        id: 'msg2',
        role: 'agent',
        content: 'The current capacity for wide-body aircraft is 35 per hour.',
        timestamp: '2023-12-01T14:30:05Z',
        visualizations: [
          {
            id: 'viz1',
            type: 'barChart',
            title: 'Wide-body Capacity by Terminal',
            data: 'mock-image-data'
          }
        ]
      }
    ]
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the sendQuery method
    AgentService.sendQuery = jest.fn().mockResolvedValue({
      id: 'new-msg',
      role: 'agent',
      content: 'Response to your query',
      timestamp: new Date().toISOString(),
      visualizations: []
    });
  });
  
  it('renders conversation messages correctly', () => {
    render(<ChatPanel conversation={mockConversation} />);
    
    expect(screen.getByText('What is the current capacity for wide-body aircraft?')).toBeInTheDocument();
    expect(screen.getByText('The current capacity for wide-body aircraft is 35 per hour.')).toBeInTheDocument();
  });
  
  it('sends a query when user submits a message', async () => {
    render(<ChatPanel conversation={mockConversation} />);
    
    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'How many stands are in Terminal 2?' } });
    fireEvent.click(screen.getByText('Send'));
    
    expect(AgentService.sendQuery).toHaveBeenCalledWith(
      'test-conversation-id', 
      'How many stands are in Terminal 2?'
    );
    
    await waitFor(() => {
      expect(screen.getByText('Response to your query')).toBeInTheDocument();
    });
  });
  
  it('displays visualizations correctly', () => {
    render(<ChatPanel conversation={mockConversation} />);
    
    // Check if visualization title is displayed
    expect(screen.getByText('Wide-body Capacity by Terminal')).toBeInTheDocument();
    
    // Check if visualization container exists
    const visualization = screen.getByTestId('visualization-viz1');
    expect(visualization).toBeInTheDocument();
  });
  
  it('handles user input correctly', () => {
    render(<ChatPanel conversation={mockConversation} />);
    
    const input = screen.getByPlaceholderText('Ask a question...');
    
    // Type in the input
    fireEvent.change(input, { target: { value: 'Test input' } });
    expect(input).toHaveValue('Test input');
    
    // Clear the input by clicking send
    fireEvent.click(screen.getByText('Send'));
    expect(input).toHaveValue('');
  });
  
  it('shows loading indicator while waiting for response', async () => {
    // Mock delay in the response
    AgentService.sendQuery = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            id: 'new-msg',
            role: 'agent',
            content: 'Delayed response',
            timestamp: new Date().toISOString()
          });
        }, 100);
      });
    });
    
    render(<ChatPanel conversation={mockConversation} />);
    
    const input = screen.getByPlaceholderText('Ask a question...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByText('Send'));
    
    // Loading indicator should appear
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Wait for the response
    await waitFor(() => {
      expect(screen.getByText('Delayed response')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
}); 