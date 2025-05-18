/**
 * Collaboration API Routes
 */

const express = require('express');
const router = express.Router();
const collaborationController = require('../../controllers/CollaborationController');
const auth = require('../../middleware/auth');

/**
 * Workspaces
 */

/**
 * @route   POST /api/collaboration/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
router.post('/workspaces', auth, (req, res) => {
  return collaborationController.createWorkspace(req, res);
});

/**
 * @route   GET /api/collaboration/workspaces/:workspaceId
 * @desc    Get workspace details
 * @access  Private
 */
router.get('/workspaces/:workspaceId', auth, (req, res) => {
  return collaborationController.getWorkspace(req, res);
});

/**
 * @route   PUT /api/collaboration/workspaces/:workspaceId
 * @desc    Update workspace details
 * @access  Private
 */
router.put('/workspaces/:workspaceId', auth, (req, res) => {
  return collaborationController.updateWorkspace(req, res);
});

/**
 * Comments
 */

/**
 * @route   POST /api/collaboration/workspaces/:workspaceId/comments
 * @desc    Add comment to workspace item
 * @access  Private
 */
router.post('/workspaces/:workspaceId/comments', auth, (req, res) => {
  return collaborationController.addComment(req, res);
});

/**
 * @route   GET /api/collaboration/workspaces/:workspaceId/comments
 * @desc    Get comments for workspace item
 * @access  Private
 */
router.get('/workspaces/:workspaceId/comments', auth, (req, res) => {
  return collaborationController.getComments(req, res);
});

/**
 * Activity
 */

/**
 * @route   GET /api/collaboration/workspaces/:workspaceId/activity
 * @desc    Get activity for workspace
 * @access  Private
 */
router.get('/workspaces/:workspaceId/activity', auth, (req, res) => {
  return collaborationController.getActivity(req, res);
});

/**
 * Users
 */

/**
 * @route   GET /api/collaboration/workspaces/:workspaceId/users
 * @desc    Get active users in workspace
 * @access  Private
 */
router.get('/workspaces/:workspaceId/users', auth, (req, res) => {
  return collaborationController.getActiveUsers(req, res);
});

/**
 * Content
 */

/**
 * @route   POST /api/collaboration/workspaces/:workspaceId/content
 * @desc    Add content to workspace
 * @access  Private
 */
router.post('/workspaces/:workspaceId/content', auth, (req, res) => {
  return collaborationController.addContent(req, res);
});

/**
 * @route   DELETE /api/collaboration/workspaces/:workspaceId/content
 * @desc    Remove content from workspace
 * @access  Private
 */
router.delete('/workspaces/:workspaceId/content', auth, (req, res) => {
  return collaborationController.removeContent(req, res);
});

/**
 * Annotations
 */

/**
 * @route   POST /api/collaboration/workspaces/:workspaceId/annotations
 * @desc    Create annotation for visualization
 * @access  Private
 */
router.post('/workspaces/:workspaceId/annotations', auth, (req, res) => {
  return collaborationController.createAnnotation(req, res);
});

/**
 * WebSocket
 */

/**
 * @route   GET /api/collaboration/ws/stats
 * @desc    Get WebSocket status and statistics
 * @access  Private
 */
router.get('/ws/stats', auth, (req, res) => {
  return collaborationController.getWebSocketStats(req, res);
});

module.exports = router;