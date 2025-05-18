# AI Agent Implementation - Phase 3

## Overview

The AI Agent system provides an intelligent assistant for the Airport Capacity Planner application. The system uses natural language processing to understand user queries, execute appropriate tools based on intent, and generate natural language responses with relevant visualizations. The implementation follows a phased approach, with Phase 3 focusing on integrating real-time communication capabilities.

## Architecture

The AI Agent system consists of several key components:

1. **Backend Services**
   - `AgentService`: Main service that coordinates query processing, tool execution, and response generation
   - `NLPService`: Handles natural language processing for intent and entity extraction
   - `OpenAIService`: Integrates with OpenAI API for entity extraction, response generation, and multi-step reasoning
   - `ContextService`: Manages conversation context and history
   - `ToolOrchestratorService`: Executes appropriate tools based on intent and entities
   - `VisualizationService`: Generates visualizations based on data returned by tools
   - `WebSocketService`: Provides real-time communication between backend and frontend

2. **Frontend Components**
   - `Chat`: Main chat interface component for user interaction
   - `ChatMessage`: Component for rendering individual chat messages
   - `ActionApproval`: Component for approving or rejecting action proposals
   - `EmbeddedVisualization`: Component for rendering visualizations within chat messages

3. **Models**
   - `AgentQuery`: Represents a user query with processing status
   - `AgentResponse`: Represents an agent response with visualizations
   - `ActionProposal`: Represents a proposed action that requires user approval
   - `AgentInsight`: Represents a saved insight from an agent response
   - `ConversationContext`: Represents a conversation session with message history

## Real-Time Communication

The system uses WebSocket technology to enable real-time communication between the backend and frontend. This provides:

- Immediate delivery of agent responses 
- Real-time typing indicators
- Action proposal notifications
- Action result notifications
- Error notifications

The WebSocket service is implemented using Socket.IO and is integrated with the authentication system to ensure secure communication.

## Workflow

1. **User Query Processing**
   - User submits a query through the chat interface
   - Query is sent to the backend via HTTP
   - Backend processes the query through the NLP service to identify intent and entities
   - Backend executes the appropriate tool based on intent and entities
   - Backend generates a response using the OpenAI service
   - Response is sent back to the frontend via WebSocket
   - Frontend displays the response with any visualizations

2. **Action Approval Process**
   - If a tool execution requires approval, an action proposal is created
   - Proposal details are sent to the frontend via WebSocket
   - Frontend displays an approval UI for the user
   - User approves or rejects the proposal
   - Approval/rejection is sent to the backend via HTTP
   - Backend executes the approved action or cancels it
   - Result is sent back to the frontend via WebSocket
   - Frontend displays the result

## Implementation Details

### Backend Components

#### WebSocketService

The WebSocket service provides real-time communication between the backend and frontend. It supports:

- Authentication using JWT
- Conversation rooms for targeted message delivery
- User-specific channels for private notifications
- Broadcasting of agent responses, typing indicators, action proposals, and errors

```javascript
// Example: Broadcasting an agent response
webSocketService.broadcastAgentResponse(contextId, {
  id: response.id,
  text: response.text,
  visualizations: response.visualizations || []
});

// Example: Broadcasting a typing indicator
webSocketService.broadcastTypingIndicator(contextId, true);
```

#### AgentService

The Agent service coordinates the processing of user queries, tool execution, and response generation. It has been enhanced to support real-time updates through WebSocket:

```javascript
// Example: Processing a user query with real-time updates
async processQuery(query, userId, contextId = null) {
  // ...
  
  // Get WebSocket service for real-time updates
  const wsService = getWebSocketService();
  
  // Send typing indicator if WebSocket is available
  if (wsService) {
    wsService.broadcastTypingIndicator(context.id, true);
  }
  
  // Execute tool and generate response
  // ...
  
  // Broadcast agent response if WebSocket is available
  if (wsService) {
    // Turn off typing indicator
    wsService.broadcastTypingIndicator(context.id, false);
    
    // Broadcast the response
    wsService.broadcastAgentResponse(context.id, {
      id: updatedResponse.id,
      text: updatedResponse.text,
      visualizations: updatedResponse.visualizations || []
    });
  }
  
  // ...
}
```

### Frontend Components

#### Chat Component

The Chat component provides the main interface for user interaction with the AI Agent. It establishes a WebSocket connection with the backend and handles various real-time events:

```javascript
// Example: Setting up WebSocket connection and event handlers
useEffect(() => {
  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  
  const socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
    auth: { token },
    withCredentials: true
  });
  
  socketInstance.on('connect', () => {
    console.log('Connected to WebSocket server');
  });
  
  socketInstance.on('agent-response', (response) => {
    setMessages(prev => [...prev, {
      id: response.id,
      type: 'agent',
      text: response.text,
      visualizations: response.visualizations || [],
      timestamp: new Date()
    }]);
    
    setLoading(false);
    setIsAgentTyping(false);
  });
  
  socketInstance.on('agent-typing', ({ isTyping }) => {
    setIsAgentTyping(isTyping);
  });
  
  // ...
  
  setSocket(socketInstance);
  
  return () => {
    socketInstance.disconnect();
  };
}, []);
```

## Configuration

The system uses the following environment variables for configuration:

```
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# WebSocket Settings
WS_PATH=/socket.io
WS_CORS_ORIGIN=http://localhost:3000

# Feature Flags
ENABLE_AGENT=true
ENABLE_WEBSOCKET=true
```

## Testing

The WebSocket service includes a comprehensive test suite that verifies:

- Connection with valid JWT token
- Rejection of invalid JWT tokens
- Joining conversation rooms
- Emitting to conversations and users
- Broadcasting agent responses, typing indicators, action proposals, and errors

## Phase 3 Completion Criteria

- [x] WebSocket service for real-time communication implemented
- [x] Frontend components for chat interface created
- [x] Real-time updates for agent responses implemented
- [x] Real-time updates for action proposals implemented
- [x] Unit tests for WebSocket service created
- [x] Environment variables for OpenAI API configuration added
- [x] Frontend dependencies updated to support WebSocket and Markdown rendering
- [x] Documentation for the AI Agent implementation created

## Future Enhancements (Phase 4)

1. **Enhanced Multi-Step Reasoning**
   - Improve the agent's ability to break down complex problems into steps
   - Provide step-by-step explanations of reasoning process

2. **Context-Aware Responses**
   - Better utilization of conversation history to provide more relevant responses
   - Maintain thread of conversation across multiple queries

3. **Proactive Insights**
   - Generate proactive insights based on data analysis
   - Notify users of potential issues or opportunities

4. **Advanced Visualization Capabilities**
   - Support for more complex visualization types
   - Interactive visualizations that update in real-time

5. **Conversational Analytics**
   - Track and analyze user queries to improve agent performance
   - Identify common user needs and pain points