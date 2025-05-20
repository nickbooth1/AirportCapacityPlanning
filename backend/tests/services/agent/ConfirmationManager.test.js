/**
 * Tests for ConfirmationManager
 */

const ConfirmationManager = require('../../../src/services/agent/ConfirmationManager');

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-123')
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('ConfirmationManager', () => {
  const mockOperation = {
    operationType: 'create_stand',
    parameters: {
      name: 'A12',
      terminal: 'T1',
      type: 'contact'
    }
  };

  const mockSessionId = 'session-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear any pending operations
    ConfirmationManager.pendingOperations.clear();
    
    // Reduce TTL for testing
    ConfirmationManager.operationTTL = 100; // 100ms for quick testing
  });

  afterAll(() => {
    // Clean up interval to avoid memory leaks
    ConfirmationManager.shutdown();
  });

  describe('createPendingOperation', () => {
    it('should create a pending operation with unique ID', () => {
      const result = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      expect(result.operationId).toBe('mock-uuid-123');
      expect(result.operation).toEqual(mockOperation);
      expect(result.sessionId).toBe(mockSessionId);
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.message).toContain('Create a new stand named "A12"');
      expect(result.message).toContain('confirm operation mock-uuid-123');
      
      // Verify it's stored in the map
      expect(ConfirmationManager.pendingOperations.get('mock-uuid-123')).toBeDefined();
    });

    it('should handle errors during creation', () => {
      // Force an error
      jest.spyOn(ConfirmationManager, 'generateConfirmationMessage').mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      expect(() => ConfirmationManager.createPendingOperation(mockOperation, mockSessionId))
        .toThrow('Test error');
    });
  });

  describe('confirmOperation', () => {
    it('should confirm a pending operation', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Confirm it
      const result = ConfirmationManager.confirmOperation(pendingOp.operationId, mockSessionId);
      
      expect(result.status).toBe('confirmed');
      expect(result.confirmedAt).toBeDefined();
      expect(result.message).toContain('confirmed');
      
      // Verify it's updated in the map
      const storedOp = ConfirmationManager.pendingOperations.get(pendingOp.operationId);
      expect(storedOp.status).toBe('confirmed');
    });

    it('should throw error for non-existent operation', () => {
      expect(() => ConfirmationManager.confirmOperation('non-existent', mockSessionId))
        .toThrow('not found or expired');
    });

    it('should throw error for session mismatch', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Try to confirm with wrong session
      expect(() => ConfirmationManager.confirmOperation(pendingOp.operationId, 'wrong-session'))
        .toThrow('Session ID mismatch');
    });

    it('should throw error for already confirmed operation', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Confirm it
      ConfirmationManager.confirmOperation(pendingOp.operationId, mockSessionId);
      
      // Try to confirm again
      expect(() => ConfirmationManager.confirmOperation(pendingOp.operationId, mockSessionId))
        .toThrow('already confirmed');
    });
  });

  describe('rejectOperation', () => {
    it('should reject a pending operation', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Reject it with reason
      const result = ConfirmationManager.rejectOperation(pendingOp.operationId, mockSessionId, 'Testing rejection');
      
      expect(result.status).toBe('rejected');
      expect(result.rejectedAt).toBeDefined();
      expect(result.rejectionReason).toBe('Testing rejection');
      expect(result.message).toContain('rejected');
      expect(result.message).toContain('Testing rejection');
      
      // Verify it's updated in the map
      const storedOp = ConfirmationManager.pendingOperations.get(pendingOp.operationId);
      expect(storedOp.status).toBe('rejected');
    });

    it('should reject with default reason if none provided', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Reject it without reason
      const result = ConfirmationManager.rejectOperation(pendingOp.operationId, mockSessionId);
      
      expect(result.rejectionReason).toBe('User rejected');
    });

    it('should throw error for non-existent operation', () => {
      expect(() => ConfirmationManager.rejectOperation('non-existent', mockSessionId))
        .toThrow('not found or expired');
    });

    it('should throw error for session mismatch', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Try to reject with wrong session
      expect(() => ConfirmationManager.rejectOperation(pendingOp.operationId, 'wrong-session'))
        .toThrow('Session ID mismatch');
    });

    it('should throw error for already rejected operation', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Reject it
      ConfirmationManager.rejectOperation(pendingOp.operationId, mockSessionId);
      
      // Try to reject again
      expect(() => ConfirmationManager.rejectOperation(pendingOp.operationId, mockSessionId))
        .toThrow('already rejected');
    });
  });

  describe('getOperation', () => {
    it('should get a pending operation by ID', () => {
      // Create a pending operation
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Get it
      const result = ConfirmationManager.getOperation(pendingOp.operationId);
      
      expect(result.operationId).toBe(pendingOp.operationId);
      expect(result.operation).toEqual(mockOperation);
    });

    it('should throw error for non-existent operation', () => {
      expect(() => ConfirmationManager.getOperation('non-existent'))
        .toThrow('not found or expired');
    });
  });

  describe('getPendingOperationsForSession', () => {
    it('should get all pending operations for a session', () => {
      // Create multiple pending operations
      const op1 = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      const op2 = ConfirmationManager.createPendingOperation({
        operationType: 'create_terminal',
        parameters: { name: 'Terminal 3' }
      }, mockSessionId);
      
      // Create an operation for another session
      ConfirmationManager.createPendingOperation(mockOperation, 'other-session');
      
      // Get pending operations for session
      const results = ConfirmationManager.getPendingOperationsForSession(mockSessionId);
      
      expect(results.length).toBe(2);
      expect(results[0].operationId).toBe(op1.operationId);
      expect(results[1].operationId).toBe(op2.operationId);
    });

    it('should not include confirmed or rejected operations', () => {
      // Create a pending operation
      const op1 = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      const op2 = ConfirmationManager.createPendingOperation({
        operationType: 'create_terminal',
        parameters: { name: 'Terminal 3' }
      }, mockSessionId);
      
      // Confirm one operation
      ConfirmationManager.confirmOperation(op1.operationId, mockSessionId);
      
      // Get pending operations
      const results = ConfirmationManager.getPendingOperationsForSession(mockSessionId);
      
      expect(results.length).toBe(1);
      expect(results[0].operationId).toBe(op2.operationId);
    });
  });

  describe('cleanupExpiredOperations', () => {
    it('should remove expired operations', async () => {
      // Create a pending operation with short TTL
      const pendingOp = ConfirmationManager.createPendingOperation(mockOperation, mockSessionId);
      
      // Wait for it to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Run cleanup
      ConfirmationManager.cleanupExpiredOperations();
      
      // Verify it's removed
      expect(ConfirmationManager.pendingOperations.has(pendingOp.operationId)).toBe(false);
    });
  });

  describe('generateConfirmationMessage', () => {
    it('should generate message for create_stand', () => {
      const message = ConfirmationManager.generateConfirmationMessage(mockOperation, 'op-123');
      
      expect(message).toContain('Create a new stand named "A12"');
      expect(message).toContain('terminal "T1"');
      expect(message).toContain('confirm operation op-123');
    });

    it('should generate message for update_terminal', () => {
      const operation = {
        operationType: 'update_terminal',
        parameters: {
          identifier: 'T1',
          name: 'Terminal 1 Updated',
          code: 'T1A'
        }
      };
      
      const message = ConfirmationManager.generateConfirmationMessage(operation, 'op-123');
      
      expect(message).toContain('Update terminal "T1"');
      expect(message).toContain('name: "Terminal 1 Updated"');
      expect(message).toContain('code: "T1A"');
    });

    it('should handle unknown operation types', () => {
      const operation = {
        operationType: 'custom_operation',
        parameters: {
          param1: 'value1'
        }
      };
      
      const message = ConfirmationManager.generateConfirmationMessage(operation, 'op-123');
      
      expect(message).toContain('Confirm custom operation');
      expect(message).toContain('"param1":"value1"');
    });
  });

  describe('formatChanges', () => {
    it('should format parameter changes', () => {
      const parameters = {
        identifier: 'A12',
        name: 'A12-Updated',
        terminal: 'T2'
      };
      
      const formatted = ConfirmationManager.formatChanges(parameters, ['identifier']);
      
      expect(formatted).toContain('name: "A12-Updated"');
      expect(formatted).toContain('terminal: "T2"');
      expect(formatted).not.toContain('identifier');
    });

    it('should handle empty changes', () => {
      const parameters = {
        identifier: 'A12'
      };
      
      const formatted = ConfirmationManager.formatChanges(parameters, ['identifier']);
      
      expect(formatted).toBe('no changes specified');
    });
  });
});