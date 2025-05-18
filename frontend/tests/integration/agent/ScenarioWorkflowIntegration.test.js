/**
 * Integration test for Scenario Workflow
 * Tests the complete workflow of creating and managing scenarios
 */
import React, { createContext, useState, useContext } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Create a mock context for App-wide state
const AppContext = createContext();

// Mock API endpoints
const server = setupServer(
  // GET /api/agent/scenarios
  rest.get('/api/agent/scenarios', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        scenarios: [
          {
            id: '1',
            title: 'Baseline Scenario',
            description: 'Current airport configuration',
            type: 'baseline',
            status: 'active',
            createdAt: '2025-05-01T10:00:00Z'
          }
        ]
      })
    );
  }),
  
  // POST /api/agent/scenarios
  rest.post('/api/agent/scenarios', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        title: req.body.title,
        description: req.body.description,
        type: 'what-if',
        status: 'created',
        baselineId: req.body.baselineId
      })
    );
  })
);

// Mock ScenarioList component
const ScenarioList = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  React.useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/agent/scenarios');
        setScenarios(response.data.scenarios);
        setLoading(false);
      } catch (err) {
        setError('Error loading scenarios');
        setLoading(false);
      }
    };
    
    fetchScenarios();
  }, []);
  
  if (loading) return <div>Loading scenarios...</div>;
  if (error) return <div>{error}</div>;
  
  return (
    <div>
      <h2>Scenarios</h2>
      <ul>
        {scenarios.map(scenario => (
          <li key={scenario.id}>
            <div>{scenario.title}</div>
            <div>{scenario.description}</div>
            <div>{scenario.type}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Mock CreateScenarioForm component
const CreateScenarioForm = ({ baselineId, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('/api/agent/scenarios', {
        title,
        description,
        baselineId
      });
      
      setSuccess(true);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      setError('Error creating scenario');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2>Create Scenario</h2>
      {success && <div>Scenario created successfully!</div>}
      {error && <div>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input 
            id="title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="description">Description</label>
          <textarea 
            id="description" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Scenario'}
        </button>
      </form>
    </div>
  );
};

// Mock App context provider
const AppProvider = ({ children }) => {
  const [state, setState] = useState({
    user: { id: '1', name: 'Test User' },
    selectedScenario: null
  });
  
  const contextValue = {
    state,
    setState
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Test component that brings everything together
const TestWorkflow = () => {
  const { state, setState } = useContext(AppContext);
  const [createdScenario, setCreatedScenario] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const handleScenarioCreated = (scenario) => {
    setCreatedScenario(scenario);
    setShowCreateForm(false);
  };
  
  return (
    <div>
      <h1>Scenario Management</h1>
      
      <ScenarioList />
      
      <button onClick={() => setShowCreateForm(true)}>
        Create New Scenario
      </button>
      
      {showCreateForm && (
        <CreateScenarioForm 
          baselineId="1" 
          onSuccess={handleScenarioCreated} 
        />
      )}
      
      {createdScenario && (
        <div>
          <h2>Newly Created Scenario</h2>
          <div>Title: {createdScenario.title}</div>
          <div>Description: {createdScenario.description}</div>
          <div>Type: {createdScenario.type}</div>
        </div>
      )}
    </div>
  );
};

describe('Scenario Workflow Integration', () => {
  // Enable API mocking before tests
  beforeAll(() => server.listen());
  
  // Reset handlers between tests
  afterEach(() => server.resetHandlers());
  
  // Clean up after tests
  afterAll(() => server.close());
  
  test('should display existing scenarios', async () => {
    // Render the test component with context
    render(
      <AppProvider>
        <ScenarioList />
      </AppProvider>
    );
    
    // Loading state should be displayed initially
    expect(screen.getByText(/Loading scenarios/i)).toBeInTheDocument();
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
      expect(screen.getByText('Current airport configuration')).toBeInTheDocument();
      expect(screen.getByText('baseline')).toBeInTheDocument();
    });
  });
  
  test('should create a new scenario', async () => {
    // Render the form component
    render(
      <AppProvider>
        <CreateScenarioForm baselineId="1" />
      </AppProvider>
    );
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'New Test Scenario' }
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'This is a test scenario for integration testing' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Scenario created successfully/i)).toBeInTheDocument();
    });
  });
  
  test('should complete the full workflow', async () => {
    // Render the full workflow component
    render(
      <AppProvider>
        <TestWorkflow />
      </AppProvider>
    );
    
    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
    });
    
    // Click to create a new scenario
    fireEvent.click(screen.getByText('Create New Scenario'));
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Complete Workflow Scenario' }
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Testing the complete workflow' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Scenario'));
    
    // Wait for the new scenario to be displayed
    await waitFor(() => {
      expect(screen.getByText('Newly Created Scenario')).toBeInTheDocument();
      expect(screen.getByText('Title: Complete Workflow Scenario')).toBeInTheDocument();
      expect(screen.getByText('Description: Testing the complete workflow')).toBeInTheDocument();
      expect(screen.getByText('Type: what-if')).toBeInTheDocument();
    });
  });
});