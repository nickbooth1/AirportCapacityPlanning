/**
 * Voice Interface Routes
 * 
 * This file defines the routes for voice interface capabilities of the AirportAI agent.
 */

const express = require('express');
const router = express.Router();
const voiceInterfaceController = require('../controllers/VoiceInterfaceController');
const auth = require('../middleware/auth');

// Transcription route
router.post('/transcribe', auth, (req, res) => voiceInterfaceController.transcribe(req, res));

// Command processing route
router.post('/process-command', auth, (req, res) => voiceInterfaceController.processCommand(req, res));

// Speech synthesis route
router.post('/synthesize', auth, (req, res) => voiceInterfaceController.synthesize(req, res));

// Session management routes
router.post('/sessions', auth, (req, res) => voiceInterfaceController.startSession(req, res));
router.get('/sessions', auth, (req, res) => voiceInterfaceController.getActiveSessions(req, res));
router.delete('/sessions/:sessionId', auth, (req, res) => voiceInterfaceController.endSession(req, res));

// Speaker profile routes
router.post('/speakers', auth, (req, res) => voiceInterfaceController.createSpeakerProfile(req, res));

module.exports = router;