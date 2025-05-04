// Import jest-dom utilities
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./lib/api', () => require('./tests/mocks/apiMock').default);

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: { id: '1' },
    pathname: '/',
    asPath: '/',
  }),
}));

// Mock window.matchMedia which is not available in Jest
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 