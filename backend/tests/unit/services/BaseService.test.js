/**
 * Tests for BaseService
 */

const BaseService = require('../../../src/services/BaseService');

describe('BaseService', () => {
  let service;
  
  beforeEach(() => {
    service = new BaseService();
  });
  
  it('should initialize correctly', async () => {
    expect(service.initialized).toBe(false);
    
    await service.initialize();
    
    expect(service.initialized).toBe(true);
  });
  
  it('should track operation metrics', async () => {
    // Mock a successful operation
    const successfulOperation = jest.fn().mockResolvedValue('success');
    
    const result = await service._trackOperation(successfulOperation, 'arg1', 'arg2');
    
    expect(result).toBe('success');
    expect(successfulOperation).toHaveBeenCalledWith('arg1', 'arg2');
    expect(service.metrics.successfulOperations).toBe(1);
    expect(service.metrics.errors).toBe(0);
    expect(service.metrics.totalOperations).toBe(1);
    expect(service.metrics.lastOperationTime).toBeGreaterThanOrEqual(0);
  });
  
  it('should track operation errors', async () => {
    // Mock a failing operation
    const error = new Error('Test error');
    const failingOperation = jest.fn().mockRejectedValue(error);
    
    await expect(service._trackOperation(failingOperation)).rejects.toThrow('Test error');
    
    expect(service.metrics.successfulOperations).toBe(0);
    expect(service.metrics.errors).toBe(1);
    expect(service.metrics.totalOperations).toBe(1);
  });
  
  it('should reset metrics', () => {
    // Set some metrics
    service.metrics.errors = 5;
    service.metrics.successfulOperations = 10;
    
    service.resetMetrics();
    
    expect(service.metrics.errors).toBe(0);
    expect(service.metrics.successfulOperations).toBe(0);
  });
  
  it('should check service health', async () => {
    expect(service.isHealthy()).toBe(false);
    
    await service.initialize();
    
    expect(service.isHealthy()).toBe(true);
    
    const healthDetails = service.getHealthDetails();
    expect(healthDetails).toHaveProperty('serviceName', 'BaseService');
    expect(healthDetails).toHaveProperty('initialized', true);
  });
  
  it('should allow extending with custom initialization', async () => {
    class CustomService extends BaseService {
      async _initializeService() {
        this.customInitialized = true;
      }
    }
    
    const customService = new CustomService();
    await customService.initialize();
    
    expect(customService.initialized).toBe(true);
    expect(customService.customInitialized).toBe(true);
  });
  
  it('should handle initialization failures', async () => {
    class FailingService extends BaseService {
      async _initializeService() {
        throw new Error('Initialization failed');
      }
    }
    
    const failingService = new FailingService();
    
    await expect(failingService.initialize()).rejects.toThrow('Initialization failed');
    expect(failingService.initialized).toBe(false);
    expect(failingService.metrics.errors).toBe(1);
  });
  
  it('should call initialize only once', async () => {
    class SpyService extends BaseService {
      constructor() {
        super();
        this.initializeCount = 0;
      }
      
      async _initializeService() {
        this.initializeCount++;
      }
    }
    
    const spyService = new SpyService();
    
    await spyService.initialize();
    await spyService.initialize(); // Second call should not reinitialize
    
    expect(spyService.initializeCount).toBe(1);
  });
  
  it('should ensure initialization before operations', async () => {
    class LazyService extends BaseService {
      constructor() {
        super();
        this.initializeCount = 0;
      }
      
      async _initializeService() {
        this.initializeCount++;
      }
      
      async someOperation() {
        await this._ensureInitialized();
        return 'done';
      }
    }
    
    const lazyService = new LazyService();
    
    // Operation should trigger initialization
    const result = await lazyService.someOperation();
    
    expect(result).toBe('done');
    expect(lazyService.initializeCount).toBe(1);
    expect(lazyService.initialized).toBe(true);
  });
});