/**
 * Integration Tests for Voice Interface
 * 
 * These tests verify that the voice interface service correctly integrates
 * with other system components and correctly processes voice commands.
 */

const request = require('supertest');
const app = require('../../src/index');
const voiceInterfaceService = require('../../src/services/agent/VoiceInterfaceService');
const nlpService = require('../../src/services/agent/NLPService');

// Mock the authentication middleware for testing
jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', username: 'test-user' };
  next();
});

// Mock the NLP service that the voice interface service depends on
jest.mock('../../src/services/agent/NLPService');

describe('Voice Interface API Integration Tests', () => {
  // Sample data for testing
  const sampleAudio = {
    audioData: 'base64-encoded-audio-data',
    format: 'wav',
    samplingRate: 16000,
    languageCode: 'en-US'
  };

  const sampleCommand = {
    text: 'Show utilization forecast for Terminal 2 next Tuesday',
    context: {
      conversationId: 'test-conversation',
      currentView: 'capacity-dashboard'
    }
  };

  const sampleSynthesis = {
    text: 'Here is the utilization forecast for Terminal 2 next Tuesday',
    voice: 'default',
    emphasizeTerms: ['Terminal 2', 'Tuesday']
  };

  // Setup and teardown
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock NLP service to return structured intent and entities
    nlpService.processQuery.mockResolvedValue({
      intent: 'show_utilization_forecast',
      confidence: 0.95,
      entities: {
        terminal: 'Terminal 2',
        date: '2024-06-18',
        time_range: 'all_day'
      }
    });
  });

  // Test transcription
  describe('Transcription', () => {
    test('POST /api/voice/transcribe should transcribe audio', async () => {
      const response = await request(app)
        .post('/api/voice/transcribe')
        .send(sampleAudio)
        .expect(200);
      
      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.text).toContain('Terminal 2');
    });

    test('POST /api/voice/transcribe should return 400 if audio data is missing', async () => {
      const response = await request(app)
        .post('/api/voice/transcribe')
        .send({ format: 'wav' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required field');
    });
  });

  // Test command processing
  describe('Command Processing', () => {
    test('POST /api/voice/process-command should process a command', async () => {
      const response = await request(app)
        .post('/api/voice/process-command')
        .send(sampleCommand)
        .expect(200);
      
      expect(response.body).toHaveProperty('commandId');
      expect(response.body).toHaveProperty('intent', 'show_utilization_forecast');
      expect(response.body).toHaveProperty('action.type', 'show_visualization');
      expect(response.body).toHaveProperty('responseText');
    });

    test('POST /api/voice/process-command should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/voice/process-command')
        .send({ context: {} })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required field');
    });

    test('POST /api/voice/process-command should handle special commands', async () => {
      const response = await request(app)
        .post('/api/voice/process-command')
        .send({ text: 'help', context: sampleCommand.context })
        .expect(200);
      
      expect(response.body).toHaveProperty('intent', 'get_help');
      expect(response.body).toHaveProperty('action.type', 'show_help');
    });
  });

  // Test speech synthesis
  describe('Speech Synthesis', () => {
    test('POST /api/voice/synthesize should synthesize speech', async () => {
      const response = await request(app)
        .post('/api/voice/synthesize')
        .send(sampleSynthesis)
        .expect(200);
      
      expect(response.body).toHaveProperty('audioData');
      expect(response.body).toHaveProperty('format', 'mp3');
      expect(response.body).toHaveProperty('wordTimings');
    });

    test('POST /api/voice/synthesize should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/voice/synthesize')
        .send({ voice: 'default' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required field');
    });
  });

  // Test session management
  describe('Session Management', () => {
    test('POST /api/voice/sessions should start a new session', async () => {
      const response = await request(app)
        .post('/api/voice/sessions')
        .send({ initialContext: { currentView: 'capacity-dashboard' } })
        .expect(201);
      
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('startedAt');
    });

    test('GET /api/voice/sessions should list active sessions', async () => {
      // First create a session
      await request(app)
        .post('/api/voice/sessions')
        .send({});
      
      const response = await request(app)
        .get('/api/voice/sessions')
        .expect(200);
      
      expect(response.body).toHaveProperty('sessions');
      expect(response.body.sessions.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('count');
    });

    test('DELETE /api/voice/sessions/:sessionId should end a session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/voice/sessions')
        .send({});
      
      const sessionId = createResponse.body.sessionId;
      
      const response = await request(app)
        .delete(`/api/voice/sessions/${sessionId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('endedAt');
      expect(response.body).toHaveProperty('durationMs');
    });
  });

  // Test speaker profiles
  describe('Speaker Profiles', () => {
    test('POST /api/voice/speakers should create a speaker profile', async () => {
      const response = await request(app)
        .post('/api/voice/speakers')
        .send({ name: 'Test User', audioSample: 'base64-sample' })
        .expect(201);
      
      expect(response.body).toHaveProperty('speakerId');
      expect(response.body).toHaveProperty('name', 'Test User');
    });
  });

  // Test integration with NLP service
  describe('NLP Integration', () => {
    test('Voice command processing should use NLP service', async () => {
      await request(app)
        .post('/api/voice/process-command')
        .send(sampleCommand);
      
      expect(nlpService.processQuery).toHaveBeenCalledWith(sampleCommand.text);
    });

    test('Voice command should handle different intents correctly', async () => {
      // Set up NLP to return a different intent
      nlpService.processQuery.mockResolvedValueOnce({
        intent: 'show_maintenance_impact',
        confidence: 0.92,
        entities: {
          stand_id: 'A1'
        }
      });
      
      const response = await request(app)
        .post('/api/voice/process-command')
        .send({ text: 'Show maintenance impact for stand A1' })
        .expect(200);
      
      expect(response.body).toHaveProperty('intent', 'show_maintenance_impact');
      expect(response.body).toHaveProperty('action.type', 'show_visualization');
      expect(response.body).toHaveProperty('action.parameters.visualizationType', 'maintenanceImpact');
      expect(response.body).toHaveProperty('action.parameters.standId', 'A1');
    });
  });
});