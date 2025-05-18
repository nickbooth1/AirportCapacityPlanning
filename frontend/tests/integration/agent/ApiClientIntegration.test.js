/**
 * Integration tests for API client integration with components
 * Tests the interaction between components and API clients
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Import components that use API clients
import ScenarioList from '../../../src/components/agent/ScenarioList';
import ScenarioDetail from '../../../src/components/agent/ScenarioDetail';
import CreateScenarioForm from '../../../src/components/agent/CreateScenarioForm';

// Set up MSW server to intercept API calls
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
          },
          {
            id: '2',
            title: 'Terminal Expansion',
            description: 'Add stands to Terminal 2',
            type: 'what-if',
            baselineId: '1',
            status: 'active',
            createdAt: '2025-05-02T14:30:00Z'
          }
        ],
        total: 2
      })
    );
  }),
  
  // GET /api/agent/scenarios/:id
  rest.get('/api/agent/scenarios/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    if (id === '1') {
      return res(
        ctx.status(200),
        ctx.json({
          id: '1',
          title: 'Baseline Scenario',
          description: 'Current airport configuration',
          type: 'baseline',
          status: 'active',
          createdAt: '2025-05-01T10:00:00Z',
          parameters: {
            totalStands: 50,
            wideBodyStands: 15,
            narrowBodyStands: 35
          }
        })
      );
    } else if (id === '2') {
      return res(
        ctx.status(200),
        ctx.json({
          id: '2',
          title: 'Terminal Expansion',
          description: 'Add stands to Terminal 2',
          type: 'what-if',
          baselineId: '1',
          status: 'active',
          createdAt: '2025-05-02T14:30:00Z',
          parameters: {
            terminal: 'T2',
            standType: 'wide_body',
            count: 5,
            operation: 'add'
          }
        })
      );
    } else {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Scenario not found' })
      );
    }
  }),
  
  // GET /api/agent/scenarios/:id/calculations
  rest.get('/api/agent/scenarios/:id/calculations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '101',
          scenarioId: req.params.id,
          status: 'completed',
          startedAt: '2025-05-02T15:00:00Z',
          completedAt: '2025-05-02T15:05:00Z'
        }
      ])
    );
  }),
  
  // GET /api/agent/scenarios/:scenarioId/calculations/:calculationId
  rest.get('/api/agent/scenarios/:scenarioId/calculations/:calculationId', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        calculationId: req.params.calculationId,
        scenarioId: req.params.scenarioId,
        status: 'completed',
        results: {
          capacity: {
            total: 120,
            byHour: [
              { hour: 6, available: 10 },
              { hour: 7, available: 12 }
            ]
          },
          utilization: {
            overall: 0.85
          }
        }
      })
    );
  }),
  
  // POST /api/agent/scenarios
  rest.post('/api/agent/scenarios', (req, res, ctx) => {
    const body = req.body;
    
    return res(
      ctx.status(201),
      ctx.json({
        scenarioId: '3',
        title: body.title || 'New Scenario',
        description: body.description,
        type: 'what-if',
        status: 'created',
        baselineId: body.baselineId,
        parameters: body.parameters || {}
      })
    );
  }),
  
  // POST /api/agent/scenarios/:id/calculate
  rest.post('/api/agent/scenarios/:id/calculate', (req, res, ctx) => {
    return res(
      ctx.status(202),
      ctx.json({
        calculationId: '102',
        status: 'processing'
      })
    );
  })
);

describe('API Client Integration Tests', () => {
  // Enable API mocking before tests
  beforeAll(() => server.listen());
  
  // Reset any request handlers that we may add during the tests
  afterEach(() => server.resetHandlers());
  
  // Clean up after the tests are finished
  afterAll(() => server.close());
  
  describe('ScenarioList component', () => {
    test('should fetch and display scenarios from API', async () => {
      render(<ScenarioList />);
      
      // Should show loading state initially
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
      
      // Should display scenarios after loading
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
        expect(screen.getByText('Terminal Expansion')).toBeInTheDocument();
      });
      
      // Should display scenario types
      expect(screen.getByText('baseline')).toBeInTheDocument();
      expect(screen.getByText('what-if')).toBeInTheDocument();
    });
    
    test('should handle API errors gracefully', async () => {
      // Override the handler to return an error
      server.use(
        rest.get('/api/agent/scenarios', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          );
        })
      );
      
      render(<ScenarioList />);
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/Error loading scenarios/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('ScenarioDetail component', () => {
    test('should fetch and display scenario details from API', async () => {
      render(<ScenarioDetail scenarioId="2" />);
      
      // Should show loading state initially
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
      
      // Should display scenario details after loading
      await waitFor(() => {
        expect(screen.getByText('Terminal Expansion')).toBeInTheDocument();
        expect(screen.getByText('Add stands to Terminal 2')).toBeInTheDocument();
      });
      
      // Should display scenario parameters
      expect(screen.getByText(/Terminal/i)).toBeInTheDocument();
      expect(screen.getByText('T2')).toBeInTheDocument();
      expect(screen.getByText(/Stand Type/i)).toBeInTheDocument();
      expect(screen.getByText('wide_body')).toBeInTheDocument();
      expect(screen.getByText(/Count/i)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
    
    test('should fetch calculation results', async () => {
      render(<ScenarioDetail scenarioId="2" showCalculations={true} />);
      
      // Should display calculation results after loading
      await waitFor(() => {
        expect(screen.getByText(/Calculation Results/i)).toBeInTheDocument();
        expect(screen.getByText(/Capacity/i)).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument(); // Total capacity
        expect(screen.getByText(/Utilization/i)).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument(); // Overall utilization
      });
    });
    
    test('should handle non-existent scenario', async () => {
      render(<ScenarioDetail scenarioId="999" />);
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/Scenario not found/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('CreateScenarioForm component', () => {
    test('should create scenario via API and show success', async () => {
      const onSuccess = jest.fn();
      
      render(
        <CreateScenarioForm 
          baselineId="1"
          onSuccess={onSuccess}
        />
      );
      
      // Fill out form
      const titleInput = screen.getByLabelText(/Scenario Title/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      
      fireEvent.change(titleInput, { target: { value: 'New Test Scenario' } });
      fireEvent.change(descriptionInput, { target: { value: 'Testing API integration' } });
      
      // Submit form
      const submitButton = screen.getByText(/Create/i);
      fireEvent.click(submitButton);
      
      // Should show loading state during submission
      expect(screen.getByText(/Creating/i)).toBeInTheDocument();
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/Scenario created successfully/i)).toBeInTheDocument();
        expect(onSuccess).toHaveBeenCalledWith({
          scenarioId: '3',
          title: 'New Test Scenario',
          description: 'Testing API integration',
          type: 'what-if',
          status: 'created',
          baselineId: '1'
        });
      });
    });
    
    test('should handle API errors during creation', async () => {
      // Override handler to return an error
      server.use(
        rest.post('/api/agent/scenarios', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ error: 'Invalid scenario data' })
          );
        })
      );
      
      render(<CreateScenarioForm baselineId="1" />);
      
      // Fill out form
      const titleInput = screen.getByLabelText(/Scenario Title/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      
      fireEvent.change(titleInput, { target: { value: 'Invalid Scenario' } });
      fireEvent.change(descriptionInput, { target: { value: 'This will cause an error' } });
      
      // Submit form
      const submitButton = screen.getByText(/Create/i);
      fireEvent.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error creating scenario/i)).toBeInTheDocument();
        expect(screen.getByText(/Invalid scenario data/i)).toBeInTheDocument();
      });
    });
    
    test('should calculate scenario after creation', async () => {
      const onCalculationStarted = jest.fn();
      
      render(
        <CreateScenarioForm 
          baselineId="1"
          autoCalculate={true}
          onCalculationStarted={onCalculationStarted}
        />
      );
      
      // Fill out form
      const titleInput = screen.getByLabelText(/Scenario Title/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      
      fireEvent.change(titleInput, { target: { value: 'Auto Calculate Scenario' } });
      fireEvent.change(descriptionInput, { target: { value: 'Should auto-calculate' } });
      
      // Submit form
      const submitButton = screen.getByText(/Create/i);
      fireEvent.click(submitButton);
      
      // Should start calculation
      await waitFor(() => {
        expect(screen.getByText(/Calculation started/i)).toBeInTheDocument();
        expect(onCalculationStarted).toHaveBeenCalledWith({
          calculationId: '102',
          status: 'processing'
        });
      });
    });
  });
});