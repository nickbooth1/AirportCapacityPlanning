/**
 * Dependency Injection (DI) utility
 * 
 * This module provides a lightweight dependency injection container 
 * for managing service dependencies and enabling easier testing and modularity.
 * 
 * Key features:
 * - Registration of services with lifecycle management
 * - Singleton and transient instance support
 * - Factory function support for complex initialization
 * - Mock/stub replacement for testing
 * - Lazy initialization of dependencies
 * - Circular dependency detection
 */

const logger = require('./logger');

class Container {
  constructor() {
    this.registrations = new Map();
    this.instances = new Map();
    this.resolutionStack = [];
    this.mockMode = false;
    this.mockedServices = new Map();
  }

  /**
   * Register a service with the container
   * 
   * @param {string} name - Service name/identifier
   * @param {Function|Object} implementation - Service constructor, factory function, or instance
   * @param {Object} options - Registration options
   * @param {boolean} options.singleton - Whether the service should be a singleton (default: true)
   * @param {Array<string>} options.dependencies - Names of dependencies to inject
   * @param {boolean} options.lazy - Whether to lazily initialize the service (default: true)
   * @returns {Container} - Returns this container for method chaining
   */
  register(name, implementation, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }

    if (!implementation) {
      throw new Error(`No implementation provided for service: ${name}`);
    }

    const {
      singleton = true,
      dependencies = [],
      lazy = true
    } = options;

    // Store the registration
    this.registrations.set(name, {
      implementation,
      singleton,
      dependencies,
      lazy
    });

    if (this.instances.has(name)) {
      logger.debug(`Replacing existing service instance: ${name}`);
      this.instances.delete(name);
    }

    return this;
  }

  /**
   * Get a service from the container
   * 
   * @param {string} name - Service name/identifier
   * @returns {Object} - The resolved service instance
   */
  get(name) {
    // Check if we have a mocked version during testing
    if (this.mockMode && this.mockedServices.has(name)) {
      return this.mockedServices.get(name);
    }

    // Check if instance already exists for singleton services
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Get the service registration
    const registration = this.registrations.get(name);
    
    if (!registration) {
      throw new Error(`Service not registered: ${name}`);
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(name)) {
      const depPath = [...this.resolutionStack, name].join(' -> ');
      throw new Error(`Circular dependency detected: ${depPath}`);
    }

    // Add to resolution stack for cycle detection
    this.resolutionStack.push(name);

    try {
      // Resolve the service
      const instance = this.resolveInstance(name, registration);

      // If singleton, store the instance
      if (registration.singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      // Remove from resolution stack
      this.resolutionStack.pop();
    }
  }

  /**
   * Resolve a service instance
   * 
   * @private
   * @param {string} name - Service name
   * @param {Object} registration - Service registration details
   * @returns {Object} - The resolved service instance
   */
  resolveInstance(name, registration) {
    const { implementation, dependencies } = registration;

    // If implementation is a factory function, call it with resolved dependencies
    if (typeof implementation === 'function') {
      // Check if it's a constructor (class)
      if (implementation.prototype && implementation.prototype.constructor === implementation) {
        // Resolve dependencies
        const resolvedDeps = dependencies.map(dep => this.get(dep));
        
        // Instantiate with dependencies
        return new implementation(...resolvedDeps);
      } else {
        // It's a factory function
        const resolvedDeps = dependencies.map(dep => this.get(dep));
        return implementation(...resolvedDeps);
      }
    }

    // If implementation is an object, return it directly
    if (typeof implementation === 'object' && implementation !== null) {
      return implementation;
    }

    throw new Error(`Invalid implementation for service: ${name}`);
  }

  /**
   * Enable mock mode for testing
   */
  enableMockMode() {
    this.mockMode = true;
    return this;
  }

  /**
   * Disable mock mode
   */
  disableMockMode() {
    this.mockMode = false;
    this.mockedServices.clear();
    return this;
  }

  /**
   * Register a mock implementation for a service
   * 
   * @param {string} name - Service name
   * @param {Object} mockImplementation - Mock implementation
   * @returns {Container} - The container instance
   */
  registerMock(name, mockImplementation) {
    if (!this.registrations.has(name)) {
      logger.warn(`Registering mock for unregistered service: ${name}`);
    }
    
    this.mockedServices.set(name, mockImplementation);
    return this;
  }

  /**
   * Reset the container
   * 
   * @param {boolean} keepRegistrations - Whether to keep registrations (default: false)
   * @returns {Container} - The container instance
   */
  reset(keepRegistrations = false) {
    this.instances.clear();
    this.mockedServices.clear();
    this.resolutionStack = [];
    
    if (!keepRegistrations) {
      this.registrations.clear();
    }
    
    return this;
  }

  /**
   * Check if a service is registered
   * 
   * @param {string} name - Service name
   * @returns {boolean} - Whether the service is registered
   */
  has(name) {
    return this.registrations.has(name);
  }

  /**
   * Check if a service instance has been created
   * 
   * @param {string} name - Service name
   * @returns {boolean} - Whether the service instance exists
   */
  hasInstance(name) {
    return this.instances.has(name);
  }

  /**
   * Get all registered service names
   * 
   * @returns {Array<string>} - Array of service names
   */
  getRegisteredServiceNames() {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get all active service instances
   * 
   * @returns {Array<string>} - Array of service names with active instances
   */
  getActiveServiceNames() {
    return Array.from(this.instances.keys());
  }
}

// Create a singleton container instance
const container = new Container();

/**
 * Service locator utility for accessing DI container
 */
class ServiceLocator {
  static getContainer() {
    return container;
  }

  static get(name) {
    return container.get(name);
  }

  static register(name, implementation, options) {
    return container.register(name, implementation, options);
  }

  static registerMock(name, implementation) {
    return container.registerMock(name, implementation);
  }

  static enableMockMode() {
    return container.enableMockMode();
  }

  static disableMockMode() {
    return container.disableMockMode();
  }

  static reset(keepRegistrations = false) {
    return container.reset(keepRegistrations);
  }

  static has(name) {
    return container.has(name);
  }

  static getRegisteredServiceNames() {
    return container.getRegisteredServiceNames();
  }
}

module.exports = {
  Container,
  ServiceLocator,
  // Export singleton container instance
  container
};