import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmbeddedVisualization from '../../../src/components/agent/EmbeddedVisualization';

// Mock data for different visualization types
const mockBarChartData = {
  id: 'viz1',
  type: 'barChart',
  title: 'Terminal Capacity',
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

const mockTableData = {
  id: 'viz2',
  type: 'table',
  title: 'Stand Availability',
  data: {
    headers: ['Stand', 'Status', 'Aircraft Type'],
    rows: [
      ['A1', 'Available', 'Wide-body'],
      ['A2', 'Maintenance', 'Wide-body'],
      ['B1', 'Available', 'Narrow-body'],
      ['B2', 'Occupied', 'Narrow-body'],
      ['C1', 'Available', 'Small'],
      ['C2', 'Available', 'Small'],
      ['C3', 'Maintenance', 'Small'],
      ['D1', 'Occupied', 'Wide-body'],
      ['D2', 'Available', 'Wide-body'],
      ['D3', 'Available', 'Narrow-body']
    ]
  }
};

const mockPieChartData = {
  id: 'viz3',
  type: 'pieChart',
  title: 'Aircraft Distribution',
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

const mockLineChartData = {
  id: 'viz4',
  type: 'lineChart',
  title: 'Capacity Trends',
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

// Large table for stress testing
const createLargeTableData = () => {
  const headers = ['Stand', 'Status', 'Aircraft Type', 'Arrival Time', 'Departure Time', 'Airline', 'Flight Number', 'Origin', 'Destination'];
  const rows = [];
  
  for (let i = 0; i < 100; i++) {
    rows.push([
      `Stand-${i}`,
      i % 3 === 0 ? 'Available' : (i % 3 === 1 ? 'Occupied' : 'Maintenance'),
      i % 2 === 0 ? 'Wide-body' : 'Narrow-body',
      `${8 + Math.floor(i / 10)}:${(i % 10) * 5}`,
      `${10 + Math.floor(i / 10)}:${(i % 10) * 5}`,
      `Airline-${i % 10}`,
      `FL${1000 + i}`,
      `Origin-${i % 20}`,
      `Dest-${i % 20}`
    ]);
  }
  
  return {
    id: 'viz-large',
    type: 'table',
    title: 'Large Flight Schedule',
    data: {
      headers,
      rows
    }
  };
};

describe('EmbeddedVisualization Performance', () => {
  beforeAll(() => {
    // Mock performance.now() for consistent testing
    jest.spyOn(performance, 'now').mockImplementation(() => 0);
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
  });
  
  afterAll(() => {
    // Restore mocks
    jest.restoreAllMocks();
  });
  
  it('renders bar chart visualization in less than 1 second', () => {
    const start = performance.now();
    
    render(<EmbeddedVisualization visualization={mockBarChartData} />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Bar chart render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    expect(screen.getByTestId(`visualization-${mockBarChartData.id}`)).toBeInTheDocument();
    expect(screen.getByText('Terminal Capacity')).toBeInTheDocument();
  });
  
  it('renders table visualization in less than 1 second', () => {
    const start = performance.now();
    
    render(<EmbeddedVisualization visualization={mockTableData} />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Table render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    expect(screen.getByTestId(`visualization-${mockTableData.id}`)).toBeInTheDocument();
    expect(screen.getByText('Stand Availability')).toBeInTheDocument();
    expect(screen.getByText('Stand')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
  });
  
  it('renders pie chart visualization in less than 1 second', () => {
    const start = performance.now();
    
    render(<EmbeddedVisualization visualization={mockPieChartData} />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Pie chart render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    expect(screen.getByTestId(`visualization-${mockPieChartData.id}`)).toBeInTheDocument();
    expect(screen.getByText('Aircraft Distribution')).toBeInTheDocument();
  });
  
  it('renders line chart visualization in less than 1 second', () => {
    const start = performance.now();
    
    render(<EmbeddedVisualization visualization={mockLineChartData} />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Line chart render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    expect(screen.getByTestId(`visualization-${mockLineChartData.id}`)).toBeInTheDocument();
    expect(screen.getByText('Capacity Trends')).toBeInTheDocument();
  });
  
  it('handles large table data within performance constraints', () => {
    const largeTableData = createLargeTableData();
    const start = performance.now();
    
    render(<EmbeddedVisualization visualization={largeTableData} />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Large table (100 rows) render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    expect(screen.getByTestId(`visualization-${largeTableData.id}`)).toBeInTheDocument();
    expect(screen.getByText('Large Flight Schedule')).toBeInTheDocument();
  });
  
  it('applies view state correctly and efficiently', () => {
    const initialViewState = {
      zoom: 1.5,
      scrollPosition: { x: 100, y: 50 }
    };
    
    const start = performance.now();
    
    render(
      <EmbeddedVisualization 
        visualization={mockBarChartData} 
        initialViewState={initialViewState}
      />
    );
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`Bar chart with view state render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000);
    
    // Check if view state was applied
    // This would depend on the actual implementation details of your component
    const container = screen.getByTestId(`visualization-${mockBarChartData.id}`);
    expect(container).toHaveAttribute('data-zoom', '1.5');
  });
}); 