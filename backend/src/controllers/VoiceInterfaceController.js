/**
 * Voice Interface Controller
 * 
 * This controller handles the HTTP endpoints for the voice interface capabilities
 * of the AirportAI agent.
 */

const voiceInterfaceService = require('../services/agent/VoiceInterfaceService');
const logger = require('../utils/logger');

/**
 * Transcribe audio to text
 */
exports.transcribe = async (req, res) => {
  try {
    const {
      audioData,
      format,
      samplingRate,
      languageCode,
      speakerProfile,
      noiseLevel,
      enhanceAirportTerminology
    } = req.body;
    
    // Validate required fields
    if (!audioData) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Audio data is required'
      });
    }
    
    // Process transcription
    const result = await voiceInterfaceService.transcribe({
      audioData,
      format,
      samplingRate,
      languageCode,
      speakerProfile,
      noiseLevel,
      enhanceAirportTerminology
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Transcription error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to process audio',
      message: error.message
    });
  }
};

/**
 * Process a voice command
 */
exports.processCommand = async (req, res) => {
  try {
    const { text, context, speakerId } = req.body;
    
    // Validate required fields
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Command text is required'
      });
    }
    
    // Process the command
    const result = await voiceInterfaceService.processCommand({
      text,
      context,
      speakerId
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Command processing error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to process command',
      message: error.message
    });
  }
};

/**
 * Synthesize text to speech
 */
exports.synthesize = async (req, res) => {
  try {
    const { text, voice, speed, pitch, emphasizeTerms } = req.body;
    
    // Validate required fields
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Text is required'
      });
    }
    
    // Process synthesis
    const result = await voiceInterfaceService.synthesize({
      text,
      voice,
      speed,
      pitch,
      emphasizeTerms
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Synthesis error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to synthesize speech',
      message: error.message
    });
  }
};

/**
 * Start a new voice session
 */
exports.startSession = async (req, res) => {
  try {
    const { speakerId, initialContext } = req.body;
    
    // Start a new session
    const session = await voiceInterfaceService.startSession({
      speakerId,
      initialContext
    });
    
    return res.status(201).json(session);
  } catch (error) {
    logger.error(`Session start error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to start session',
      message: error.message
    });
  }
};

/**
 * End a voice session
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Session ID is required'
      });
    }
    
    // End the session
    const result = await voiceInterfaceService.endSession(sessionId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Session end error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to end session',
      message: error.message
    });
  }
};

/**
 * Create a speaker profile
 */
exports.createSpeakerProfile = async (req, res) => {
  try {
    const { name, audioSample } = req.body;
    
    // Create a speaker profile
    const profile = await voiceInterfaceService.createSpeakerProfile({
      name,
      audioSample
    });
    
    return res.status(201).json(profile);
  } catch (error) {
    logger.error(`Speaker profile creation error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to create speaker profile',
      message: error.message
    });
  }
};

/**
 * Get active voice sessions
 */
exports.getActiveSessions = async (req, res) => {
  try {
    // Get active sessions
    const sessions = await voiceInterfaceService.getActiveSessions();
    
    return res.status(200).json({
      sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error(`Get sessions error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve sessions',
      message: error.message
    });
  }
};