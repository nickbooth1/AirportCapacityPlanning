/**
 * Mock configuration for testing
 */
module.exports = {
  // Basic config settings
  environment: 'test',
  port: 3001,
  apiPrefix: '/api',

  // Auth settings
  auth: {
    jwtSecret: 'test-secret-key',
    tokenExpiration: '24h'
  },

  // Database settings
  database: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true
  },

  // External API settings
  externalApis: {
    weather: {
      baseUrl: 'https://api.test-weather.com',
      apiKey: 'test-weather-api-key',
      cacheExpiration: 3600 // 1 hour
    },
    flights: {
      baseUrl: 'https://api.test-flights.com',
      apiKey: 'test-flights-api-key',
      cacheExpiration: 7200 // 2 hours
    },
    marketForecasts: {
      baseUrl: 'https://api.test-forecasts.com',
      apiKey: 'test-forecasts-api-key',
      cacheExpiration: 86400 // 24 hours
    }
  },

  // Storage settings
  storage: {
    uploadDir: '/tmp/test-uploads',
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },

  // Logging settings
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    filePath: '/tmp/test-logs'
  },

  // Notification settings
  notifications: {
    email: {
      enabled: false,
      sender: 'test@example.com',
      smtpHost: 'smtp.test.com',
      smtpPort: 587
    }
  },

  // Capacity calculation settings
  capacity: {
    defaultTimeSlots: [
      { id: 'morning', name: 'Morning', startTime: '06:00', endTime: '12:00' },
      { id: 'afternoon', name: 'Afternoon', startTime: '12:00', endTime: '18:00' },
      { id: 'evening', name: 'Evening', startTime: '18:00', endTime: '23:59' }
    ],
    defaultUtilizationThreshold: 0.85
  },

  // AI service settings
  ai: {
    openai: {
      apiKey: 'test-openai-api-key',
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7
    }
  }
};
EOF < /dev/null