import '@testing-library/jest-dom';

// Set up window.matchMedia mock
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
};

// Mock for ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock for requestAnimationFrame
global.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
  return 0;
};
EOF < /dev/null