const express = require('express');
const router = express.Router();

// Import the agent router from the subdirectory
const agentRouter = require('./agent/index');

// Mount the agent router at this endpoint
router.use('/', agentRouter);

module.exports = router;