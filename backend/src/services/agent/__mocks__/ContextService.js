/**
 * ContextService.js mock for testing
 */

class ContextService {
  constructor() {
    this.store = new Map();
  }

  async set(key, value) {
    this.store.set(key, value);
    return value;
  }

  async get(key) {
    return this.store.get(key);
  }

  async delete(key) {
    this.store.delete(key);
    return true;
  }
}

// Create a mock instance for testing
const contextServiceInstance = new ContextService();

module.exports = contextServiceInstance;
module.exports.ContextService = ContextService;