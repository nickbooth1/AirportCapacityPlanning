/**
 * Controller Factory Utility
 * 
 * This utility provides a factory for creating controllers with injected
 * service dependencies from the DI container.
 */

const { ServiceLocator } = require('./di');
const logger = require('./logger');

/**
 * Create a controller with injected service dependencies
 * 
 * @param {function} controllerFactory - Factory function that returns the controller object
 * @param {Array<string>} dependencies - Array of service names to inject
 * @returns {Object} - The created controller with injected dependencies
 */
function createController(controllerFactory, dependencies = []) {
  try {
    // Resolve dependencies from the DI container
    const resolvedDependencies = dependencies.map(dep => {
      try {
        return ServiceLocator.get(dep);
      } catch (error) {
        logger.warn(`Failed to resolve dependency '${dep}' for controller. Using null instead.`);
        return null;
      }
    });
    
    // Call the controller factory with the resolved dependencies
    const controller = controllerFactory(...resolvedDependencies);
    
    // Add metadata about dependencies
    controller._di = {
      dependencies,
      resolvedDependencies: dependencies.map((dep, index) => ({
        name: dep,
        resolved: resolvedDependencies[index] !== null
      }))
    };
    
    return controller;
  } catch (error) {
    logger.error(`Failed to create controller: ${error.message}`, {
      error: error.stack,
      dependencies
    });
    
    // Return a fallback controller that serves error responses
    return createFallbackController(error, dependencies);
  }
}

/**
 * Create a fallback controller that serves error responses
 * 
 * @param {Error} error - The error that occurred during controller creation
 * @param {Array<string>} dependencies - The dependencies that were requested
 * @returns {Object} - Fallback controller object
 */
function createFallbackController(error, dependencies) {
  const errorMessage = `Controller initialization failed: ${error.message}`;
  logger.error(errorMessage, { dependencies });
  
  // Create a fallback controller that returns errors for all routes
  return {
    _di: {
      error: errorMessage,
      dependencies,
      resolvedDependencies: dependencies.map(dep => ({
        name: dep,
        resolved: false
      }))
    },
    // Default handler for all methods
    handleRequest: (req, res) => {
      res.status(500).json({
        error: 'Controller Initialization Failed',
        message: 'The server failed to initialize this controller. Please try again later.'
      });
    }
  };
}

/**
 * Create a route handler that injects request-specific dependencies
 * 
 * @param {function} handlerFactory - Factory function that returns the handler function
 * @param {Array<string>} dependencies - Array of service names to inject
 * @returns {function} - Express route handler
 */
function createHandler(handlerFactory, dependencies = []) {
  return (req, res, next) => {
    try {
      // Resolve dependencies from the DI container
      const resolvedDependencies = dependencies.map(dep => {
        try {
          return ServiceLocator.get(dep);
        } catch (error) {
          logger.warn(`Failed to resolve dependency '${dep}' for handler. Using null instead.`);
          return null;
        }
      });
      
      // Call the handler factory with the resolved dependencies
      const handler = handlerFactory(...resolvedDependencies);
      
      // Call the handler with the request, response, and next
      handler(req, res, next);
    } catch (error) {
      logger.error(`Handler initialization failed: ${error.message}`, {
        error: error.stack,
        dependencies,
        url: req.url,
        method: req.method
      });
      
      // Pass the error to the next middleware
      next(error);
    }
  };
}

module.exports = {
  createController,
  createHandler
};