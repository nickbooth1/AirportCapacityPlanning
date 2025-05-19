/**
 * Route fix utility
 * 
 * This module provides a fix for route definitions to ensure all routes
 * are registered with proper callbacks.
 */

/**
 * Ensures a route handler is a proper callback function
 * Apply this to any route handler that might be an object instead of a function
 * 
 * @param {Function|Object} handler - The route handler
 * @returns {Function} A proper Express route handler
 */
function ensureCallback(handler) {
  if (typeof handler !== 'function') {
    // If the handler is not a function, return a wrapper that logs the error
    return (req, res) => {
      console.error(`Invalid route handler: Expected a function but got ${typeof handler}`);
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Invalid route handler definition'
      });
    };
  }
  return handler;
}

/**
 * Wraps a controller method to ensure it's called correctly
 * 
 * @param {Object} controller - The controller object
 * @param {string} methodName - The name of the method to call
 * @returns {Function} A proper Express route handler
 */
function controllerMethod(controller, methodName) {
  if (!controller[methodName] || typeof controller[methodName] !== 'function') {
    return (req, res) => {
      console.error(`Missing controller method: ${methodName}`);
      res.status(500).json({
        error: 'Server configuration error',
        message: `Controller method ${methodName} not found`
      });
    };
  }
  
  return (req, res, next) => {
    try {
      return controller[methodName](req, res, next);
    } catch (error) {
      console.error(`Error in controller method ${methodName}:`, error);
      next(error);
    }
  };
}

/**
 * Applies auth middleware and ensures the handler is a proper callback
 * 
 * @param {Function} authMiddleware - Authentication middleware
 * @param {Function|Object} handler - The route handler
 * @returns {Array<Function>} Middleware chain including auth and handler
 */
function withAuth(authMiddleware, handler) {
  return [
    authMiddleware,
    ensureCallback(handler)
  ];
}

/**
 * A safer router extension to prevent object errors
 * 
 * @param {Object} router - Express router
 * @returns {Object} Enhanced router with safer methods
 */
function safeRouter(router) {
  const original = {
    get: router.get.bind(router),
    post: router.post.bind(router),
    put: router.put.bind(router),
    delete: router.delete.bind(router),
    patch: router.patch.bind(router),
    use: router.use.bind(router)
  };

  // Create a deep clone of the router to avoid modifying the original
  const safeRouterObj = Object.create(router);
  
  // Override router methods to ensure callbacks
  safeRouterObj.get = function(path, ...handlers) {
    return original.get(path, ...handlers.map(h => {
      if (typeof h === 'function') return h;
      console.warn(`Replaced invalid handler for GET ${path} (was ${typeof h})`);
      return (req, res) => res.status(500).send(`Invalid route handler for GET ${path}`);
    }));
  };
  
  safeRouterObj.post = function(path, ...handlers) {
    return original.post(path, ...handlers.map(h => {
      if (typeof h === 'function') return h;
      console.warn(`Replaced invalid handler for POST ${path} (was ${typeof h})`);
      return (req, res) => res.status(500).send(`Invalid route handler for POST ${path}`);
    }));
  };
  
  safeRouterObj.put = function(path, ...handlers) {
    return original.put(path, ...handlers.map(h => {
      if (typeof h === 'function') return h;
      console.warn(`Replaced invalid handler for PUT ${path} (was ${typeof h})`);
      return (req, res) => res.status(500).send(`Invalid route handler for PUT ${path}`);
    }));
  };
  
  safeRouterObj.delete = function(path, ...handlers) {
    return original.delete(path, ...handlers.map(h => {
      if (typeof h === 'function') return h;
      console.warn(`Replaced invalid handler for DELETE ${path} (was ${typeof h})`);
      return (req, res) => res.status(500).send(`Invalid route handler for DELETE ${path}`);
    }));
  };
  
  safeRouterObj.patch = function(path, ...handlers) {
    return original.patch(path, ...handlers.map(h => {
      if (typeof h === 'function') return h;
      console.warn(`Replaced invalid handler for PATCH ${path} (was ${typeof h})`);
      return (req, res) => res.status(500).send(`Invalid route handler for PATCH ${path}`);
    }));
  };
  
  // Also handle router.use for mounting middleware
  safeRouterObj.use = function(path, ...handlers) {
    if (typeof path === 'function') {
      // router.use(handler) form
      return original.use(...[path, ...handlers].map(h => {
        if (typeof h === 'function') return h;
        console.warn(`Replaced invalid middleware (was ${typeof h})`);
        return (req, res, next) => next();
      }));
    } else {
      // router.use(path, handler) form
      return original.use(path, ...handlers.map(h => {
        if (typeof h === 'function') return h;
        console.warn(`Replaced invalid middleware for path ${path} (was ${typeof h})`);
        return (req, res, next) => next();
      }));
    }
  };
  
  return safeRouterObj;
}

module.exports = {
  ensureCallback,
  controllerMethod,
  withAuth,
  safeRouter
};