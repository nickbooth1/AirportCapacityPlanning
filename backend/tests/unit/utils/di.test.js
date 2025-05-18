/**
 * Tests for the dependency injection container
 */

const { Container, ServiceLocator } = require('../../../src/utils/di');

describe('Dependency Injection', () => {
  describe('Container', () => {
    let container;

    beforeEach(() => {
      container = new Container();
    });

    it('should register and retrieve a simple service', () => {
      const service = { name: 'test-service' };
      container.register('testService', service);
      
      const retrieved = container.get('testService');
      expect(retrieved).toBe(service);
    });

    it('should handle constructor-based services', () => {
      class TestService {
        constructor() {
          this.name = 'constructed-service';
        }
      }
      
      container.register('testService', TestService);
      
      const instance = container.get('testService');
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('constructed-service');
    });

    it('should handle factory functions', () => {
      const factory = () => ({ name: 'factory-service' });
      
      container.register('testService', factory);
      
      const instance = container.get('testService');
      expect(instance.name).toBe('factory-service');
    });

    it('should maintain singleton instances by default', () => {
      class TestService {
        constructor() {
          this.count = 0;
        }
        
        increment() {
          this.count++;
        }
      }
      
      container.register('testService', TestService);
      
      const instance1 = container.get('testService');
      instance1.increment();
      
      const instance2 = container.get('testService');
      expect(instance2.count).toBe(1);
      expect(instance1).toBe(instance2);
    });

    it('should create new instances for transient services', () => {
      class TestService {
        constructor() {
          this.count = 0;
        }
        
        increment() {
          this.count++;
        }
      }
      
      container.register('testService', TestService, { singleton: false });
      
      const instance1 = container.get('testService');
      instance1.increment();
      
      const instance2 = container.get('testService');
      expect(instance2.count).toBe(0);
      expect(instance1).not.toBe(instance2);
    });

    it('should inject dependencies', () => {
      class DependencyService {
        getName() {
          return 'dependency';
        }
      }
      
      class TestService {
        constructor(dependency) {
          this.dependency = dependency;
        }
        
        getDependencyName() {
          return this.dependency.getName();
        }
      }
      
      container.register('dependencyService', DependencyService);
      container.register('testService', TestService, {
        dependencies: ['dependencyService']
      });
      
      const service = container.get('testService');
      expect(service.getDependencyName()).toBe('dependency');
    });

    it('should detect circular dependencies', () => {
      // Service A depends on B, B depends on A
      class ServiceA {
        constructor(b) {
          this.b = b;
        }
      }
      
      class ServiceB {
        constructor(a) {
          this.a = a;
        }
      }
      
      container.register('serviceA', ServiceA, { dependencies: ['serviceB'] });
      container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });
      
      expect(() => container.get('serviceA')).toThrow(/circular dependency/i);
    });

    it('should handle mock registrations', () => {
      class TestService {
        getName() {
          return 'real';
        }
      }
      
      const mockService = {
        getName: () => 'mock'
      };
      
      container.register('testService', TestService);
      container.enableMockMode();
      container.registerMock('testService', mockService);
      
      const instance = container.get('testService');
      expect(instance.getName()).toBe('mock');
      
      container.disableMockMode();
      const realInstance = container.get('testService');
      expect(realInstance.getName()).toBe('real');
    });

    it('should reset the container', () => {
      const service = { name: 'test-service' };
      container.register('testService', service);
      
      container.reset();
      
      expect(container.has('testService')).toBe(false);
      expect(() => container.get('testService')).toThrow();
    });

    it('should reset instances but keep registrations when requested', () => {
      class TestService {
        constructor() {
          this.count = 0;
        }
        
        increment() {
          this.count++;
        }
      }
      
      container.register('testService', TestService);
      
      const instance1 = container.get('testService');
      instance1.increment();
      
      container.reset(true); // Keep registrations
      
      expect(container.has('testService')).toBe(true);
      expect(container.hasInstance('testService')).toBe(false);
      
      const instance2 = container.get('testService');
      expect(instance2.count).toBe(0); // Fresh instance
    });

    it('should throw when trying to get an unregistered service', () => {
      expect(() => container.get('nonExistentService')).toThrow(/not registered/i);
    });

    it('should provide lists of registered and active services', () => {
      container.register('service1', {});
      container.register('service2', {});
      
      expect(container.getRegisteredServiceNames()).toEqual(['service1', 'service2']);
      expect(container.getActiveServiceNames()).toEqual([]);
      
      container.get('service1');
      
      expect(container.getActiveServiceNames()).toEqual(['service1']);
    });
  });

  describe('ServiceLocator', () => {
    beforeEach(() => {
      ServiceLocator.reset();
    });

    it('should provide access to the global container', () => {
      const service = { name: 'global-service' };
      
      ServiceLocator.register('globalService', service);
      
      expect(ServiceLocator.get('globalService')).toBe(service);
    });

    it('should allow registering services', () => {
      ServiceLocator.register('service', { value: 'test' });
      expect(ServiceLocator.has('service')).toBe(true);
    });

    it('should allow retrieving services', () => {
      ServiceLocator.register('service', { value: 'test' });
      expect(ServiceLocator.get('service').value).toBe('test');
    });

    it('should support mock mode', () => {
      ServiceLocator.register('service', { value: 'real' });
      ServiceLocator.enableMockMode();
      ServiceLocator.registerMock('service', { value: 'mock' });
      
      expect(ServiceLocator.get('service').value).toBe('mock');
      
      ServiceLocator.disableMockMode();
      expect(ServiceLocator.get('service').value).toBe('real');
    });

    it('should support global reset', () => {
      ServiceLocator.register('service', { value: 'test' });
      ServiceLocator.reset();
      
      expect(ServiceLocator.has('service')).toBe(false);
    });

    it('should provide list of registered services', () => {
      ServiceLocator.register('service1', {});
      ServiceLocator.register('service2', {});
      
      expect(ServiceLocator.getRegisteredServiceNames()).toContain('service1');
      expect(ServiceLocator.getRegisteredServiceNames()).toContain('service2');
    });
  });
});