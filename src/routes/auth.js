const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route POST /api/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authController.getCurrentUser);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authController.logout);

module.exports = router; 