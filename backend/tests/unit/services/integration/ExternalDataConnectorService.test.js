/**
 * Unit tests for ExternalDataConnectorService
 */

// Mock dependencies before requiring the service
jest.mock('../../../../src/utils/logger', () => require('../../../mocks/logger'));
jest.mock('../../../../src/config', () => require('../../../mocks/config'));

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Now require the service
const ExternalDataConnectorService = require('../../../../src/services/integration/ExternalDataConnectorService');

describe('ExternalDataConnectorService', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful axios responses
    axios.get.mockImplementation((url) => {
      if (url.includes('weather')) {
        return Promise.resolve({ 
          data: {
            location: 'London',
            forecast: [
              {
                date: '2025-06-01',
                temperature: { min: 15, max: 25 },
                conditions: 'Partly Cloudy'
              }
            ]
          }
        });
      } else if (url.includes('airline')) {
        return Promise.resolve({
          data: {
            airline: 'BA',
            schedules: [
              {
                flightNumber: 'BA123',
                origin: 'LHR',
                destination: 'JFK',
                departureTime: '10:00',
                arrivalTime: '13:00'
              }
            ]
          }
        });
      } else if (url.includes('market')) {
        return Promise.resolve({
          data: {
            projections: [
              { year: 2025, growth: 3.5 },
              { year: 2026, growth: 3.8 }
            ]
          }
        });
      } else if (url.includes('events')) {
        return Promise.resolve({
          data: {
            events: [
              {
                name: 'International Air Show',
                startDate: '2025-07-15',
                endDate: '2025-07-20',
                expectedAttendees: 75000
              }
            ]
          }
        });
      }
      
      // Default response for unknown URLs
      return Promise.resolve({ data: {} });
    });
    
    // Initialize service with mock config
    service = new ExternalDataConnectorService({
      weatherApiConfig: {
        apiKey: 'test-weather-key',
        baseUrl: 'https://api.weather.test'
      },
      airlineApiConfig: {
        apiKey: 'test-airline-key',
        baseUrl: 'https://api.airline.test'
      },
      marketApiConfig: {
        apiKey: 'test-market-key',
        baseUrl: 'https://api.market.test'
      },
      eventsApiConfig: {
        apiKey: 'test-events-key',
        baseUrl: 'https://api.events.test'
      }
    });
    
    // Clear cache
    service.cache = new Map();
    
    // Mock methods
    service.transformWeatherData = jest.fn().mockImplementation((data, airportCode) => ({
      location: airportCode,
      forecast: data.forecast || [],
      unit: data.unit || 'metric'
    }));
    
    service.transformAirlineSchedules = jest.fn().mockImplementation((data) => ({
      scheduleUpdates: data.schedules || [],
      lastUpdated: data.lastUpdated || new Date().toISOString()
    }));
    
    service.transformMarketForecasts = jest.fn().mockImplementation((data) => ({
      forecast: {
        passengerGrowth: data.projections || [],
        movementGrowth: data.movementGrowth || []
      },
      source: data.source || 'test',
      publishedDate: data.publishedDate || new Date().toISOString()
    }));
    
    service.transformEventData = jest.fn().mockImplementation((data) => ({
      events: data.events || [],
      totalCount: (data.events || []).length,
      categories: [...new Set((data.events || []).map(e => e.category || 'conference'))]
    }));
    
    service.assessWeatherImpact = jest.fn().mockImplementation((condition, hourly) => {
      if (['thunderstorm', 'heavy_snow', 'freezing_rain', 'hurricane'].includes(condition)) {
        return 'severe';
      } else if (hourly && hourly.some(h => h.visibility < 3)) {
        return 'moderate';
      }
      return 'minimal';
    });
    
    service.estimateEventImpact = jest.fn().mockImplementation((event) => {
      if (event.expectedAttendees > 50000) {
        return {
          passengerIncrease: Math.round(event.expectedAttendees * 0.2),
          impactLevel: 'high'
        };
      } else if (event.expectedAttendees > 10000) {
        return {
          passengerIncrease: Math.round(event.expectedAttendees * 0.15),
          impactLevel: 'medium'
        };
      }
      return {
        passengerIncrease: Math.round(event.expectedAttendees * 0.1),
        impactLevel: 'low'
      };
    });
    
    service.getAirportCoordinates = jest.fn().mockResolvedValue({
      latitude: 51.47,
      longitude: -0.45
    });
    
    service.getFallbackWeatherData = jest.fn().mockImplementation((airportCode) => ({
      location: airportCode,
      forecast: [],
      isFallback: true
    }));
    
    service.getFallbackAirlineSchedules = jest.fn().mockImplementation((options) => ({
      scheduleUpdates: [],
      lastUpdated: new Date().toISOString(),
      isFallback: true
    }));
    
    service.getFallbackMarketForecasts = jest.fn().mockImplementation((options) => ({
      forecast: { passengerGrowth: [], movementGrowth: [] },
      source: 'Fallback',
      isFallback: true
    }));
    
    service.getFallbackEventData = jest.fn().mockImplementation((options) => ({
      events: [],
      totalCount: 0,
      categories: [],
      isFallback: true
    }));
    
    service.refreshWeatherData = jest.fn().mockResolvedValue(true);
    service.refreshAirlineSchedules = jest.fn().mockResolvedValue(true);
    service.refreshMarketForecasts = jest.fn().mockResolvedValue(true);
    service.refreshEvents = jest.fn().mockResolvedValue(true);
    
    // Mock simulation methods
    service.simulateWeatherForecast = jest.fn().mockImplementation((lat, lon, startDate, endDate, units) => ({
      unit: units || 'metric',
      location: { latitude: lat, longitude: lon },
      forecast: [
        {
          date: '2025-06-01',
          hourly: [
            { time: '06:00', temperature: 18, precipitation: 0, windSpeed: 5, windDirection: 180, visibility: 10 },
            { time: '12:00', temperature: 25, precipitation: 0, windSpeed: 7, windDirection: 200, visibility: 10 },
            { time: '18:00', temperature: 22, precipitation: 0, windSpeed: 6, windDirection: 220, visibility: 10 }
          ],
          summary: { condition: 'clear', minTemp: 18, maxTemp: 25 }
        }
      ],
      generatedAt: new Date().toISOString()
    }));
    
    service.simulateAirlineSchedules = jest.fn().mockImplementation((airline, startDate, endDate) => ({
      schedules: [
        {
          airline: airline || 'BA',
          type: 'new_service',
          origin: 'LHR',
          destination: 'JFK',
          startDate: '2025-06-01',
          frequency: 'daily',
          aircraftType: 'B777'
        }
      ],
      lastUpdated: new Date().toISOString()
    }));
    
    service.simulateMarketForecasts = jest.fn().mockImplementation((timeHorizon, region, segment) => ({
      passengerGrowth: [
        { year: 2025, growth: 3.5 },
        { year: 2026, growth: 3.8 }
      ],
      movementGrowth: [
        { year: 2025, growth: 2.8 },
        { year: 2026, growth: 3.0 }
      ],
      aircraftMixTrend: {
        narrowbodyShare: [
          { year: 2025, percentage: 65 },
          { year: 2026, percentage: 64 }
        ],
        widebodyShare: [
          { year: 2025, percentage: 35 },
          { year: 2026, percentage: 36 }
        ]
      },
      source: 'Simulated Market Data Provider',
      publishedDate: new Date().toISOString().split('T')[0]
    }));
    
    service.simulateEvents = jest.fn().mockImplementation((airportCode, startDate, endDate, category) => ({
      events: [
        {
          id: 'event-1',
          name: 'Conference: LHR 1',
          category: 'conference',
          startDate: '2025-07-15',
          endDate: '2025-07-18',
          location: 'LHR Area',
          expectedAttendees: 20000,
          description: 'A conference event near LHR airport.'
        }
      ],
      source: 'Local Event Database'
    }));
    
    // Mock connector methods
    service.connectors = {
      weather: {
        getForecast: jest.fn().mockImplementation((...args) => service.simulateWeatherForecast(...args))
      },
      airlineSchedules: {
        getSchedules: jest.fn().mockImplementation((...args) => service.simulateAirlineSchedules(...args))
      },
      marketForecasts: {
        getForecasts: jest.fn().mockImplementation((...args) => service.simulateMarketForecasts(...args))
      },
      events: {
        getEvents: jest.fn().mockImplementation((...args) => service.simulateEvents(...args))
      }
    };
  });
  
  describe('getWeatherForecast', () => {
    it('should fetch and transform weather data', async () => {
      // Arrange
      const options = {
        airportCode: 'LHR',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        units: 'metric'
      };
      
      // Act
      const result = await service.getWeatherForecast(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.location).toBe('LHR');
      
      // Check that transformWeatherData was called
      expect(service.transformWeatherData).toHaveBeenCalled();
      
      // Check that cache was updated
      const cacheKey = `weather:${options.airportCode}:${options.startDate}:${options.endDate}:${options.units}`;
      expect(service.cache.has(cacheKey)).toBe(true);
    });
    
    it('should use cached data when available', async () => {
      // Arrange
      const options = {
        airportCode: 'LHR',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        units: 'metric'
      };
      
      const cachedData = {
        location: 'LHR',
        forecast: [{ date: '2025-06-01', conditions: 'Cached' }]
      };
      
      // Add to cache
      const cacheKey = `weather:${options.airportCode}:${options.startDate}:${options.endDate}:${options.units}`;
      service.addToCache(cacheKey, cachedData, 3600000); // 1 hour
      
      // Act
      const result = await service.getWeatherForecast(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(cachedData);
      
      // Verify getAirportCoordinates was not called
      expect(service.getAirportCoordinates).not.toHaveBeenCalled();
    });
    
    it('should return fallback data when API fails', async () => {
      // Arrange
      const options = {
        airportCode: 'LHR',
        startDate: '2025-06-01',
        endDate: '2025-06-07'
      };
      
      // Mock API failure
      service.getAirportCoordinates = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Act
      const result = await service.getWeatherForecast(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.location).toBe('LHR');
      expect(result.isFallback).toBe(true);
      
      // Verify fallback method was called
      expect(service.getFallbackWeatherData).toHaveBeenCalledWith('LHR');
    });
  });
  
  describe('getAirlineSchedules', () => {
    it('should fetch and transform airline schedule data', async () => {
      // Arrange
      const options = {
        airline: 'BA',
        startDate: '2025-06-01',
        endDate: '2025-06-30'
      };
      
      // Act
      const result = await service.getAirlineSchedules(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(service.transformAirlineSchedules).toHaveBeenCalled();
      
      // Check that cache was updated
      const cacheKey = `airlineSchedules:${options.airline}:${options.startDate}:${options.endDate}`;
      expect(service.cache.has(cacheKey)).toBe(true);
    });
    
    it('should return fallback data when API fails', async () => {
      // Arrange
      const options = {
        airline: 'BA',
        startDate: '2025-06-01',
        endDate: '2025-06-30'
      };
      
      // Mock API failure
      service.connectors.airlineSchedules.getSchedules = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Act
      const result = await service.getAirlineSchedules(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isFallback).toBe(true);
      
      // Verify fallback method was called
      expect(service.getFallbackAirlineSchedules).toHaveBeenCalledWith(options);
    });
  });
  
  describe('getMarketForecasts', () => {
    it('should fetch and transform market forecast data', async () => {
      // Arrange
      const options = {
        timeHorizon: 'medium_term',
        region: 'Europe',
        segment: 'international'
      };
      
      // Act
      const result = await service.getMarketForecasts(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(service.transformMarketForecasts).toHaveBeenCalled();
      
      // Check that cache was updated
      const cacheKey = `marketForecasts:${options.timeHorizon}:${options.region}:${options.segment}`;
      expect(service.cache.has(cacheKey)).toBe(true);
    });
    
    it('should return fallback data when API fails', async () => {
      // Arrange
      const options = {
        timeHorizon: 'medium_term',
        region: 'Europe',
        segment: 'international'
      };
      
      // Mock API failure
      service.connectors.marketForecasts.getForecasts = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Act
      const result = await service.getMarketForecasts(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isFallback).toBe(true);
      
      // Verify fallback method was called
      expect(service.getFallbackMarketForecasts).toHaveBeenCalledWith(options);
    });
  });
  
  describe('getEvents', () => {
    it('should fetch and transform event data', async () => {
      // Arrange
      const options = {
        airportCode: 'LHR',
        startDate: '2025-06-01',
        endDate: '2025-08-31',
        category: 'conference'
      };
      
      // Act
      const result = await service.getEvents(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(service.transformEventData).toHaveBeenCalled();
      
      // Check that cache was updated
      const cacheKey = `events:${options.airportCode}:${options.startDate}:${options.endDate}:${options.category}`;
      expect(service.cache.has(cacheKey)).toBe(true);
    });
    
    it('should return fallback data when API fails', async () => {
      // Arrange
      const options = {
        airportCode: 'LHR',
        startDate: '2025-06-01',
        endDate: '2025-08-31'
      };
      
      // Mock API failure
      service.connectors.events.getEvents = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Act
      const result = await service.getEvents(options);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isFallback).toBe(true);
      
      // Verify fallback method was called
      expect(service.getFallbackEventData).toHaveBeenCalledWith(options);
    });
  });
  
  describe('addToCache and getFromCache', () => {
    it('should store and retrieve data from cache', () => {
      // Arrange
      const key = 'test-key';
      const data = { test: 'data' };
      const ttl = 1000; // 1 second
      
      // Act - store in cache
      service.addToCache(key, data, ttl);
      
      // Assert - check it was stored
      expect(service.cache.has(key)).toBe(true);
      
      // Act - retrieve from cache
      const retrieved = service.getFromCache(key);
      
      // Assert - check it matches
      expect(retrieved).toEqual(data);
    });
    
    it('should return null for expired cache items', async () => {
      // Arrange
      const key = 'test-key';
      const data = { test: 'data' };
      const ttl = 1; // 1 millisecond
      
      // Act - store in cache
      service.addToCache(key, data, ttl);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Act - retrieve from cache
      const retrieved = service.getFromCache(key);
      
      // Assert - should be null as expired
      expect(retrieved).toBeNull();
      
      // Check entry was removed
      expect(service.cache.has(key)).toBe(false);
    });
  });
  
  describe('cleanCache', () => {
    it('should remove expired items from cache', async () => {
      // Arrange
      service.addToCache('valid', { data: 'valid' }, 60000); // 1 minute
      service.addToCache('expired', { data: 'expired' }, 1); // 1 millisecond
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Act
      service.cleanCache();
      
      // Assert
      expect(service.cache.has('valid')).toBe(true);
      expect(service.cache.has('expired')).toBe(false);
    });
  });
  
  describe('performPeriodicRefresh', () => {
    it('should refresh all data types', async () => {
      // Act
      const result = await service.performPeriodicRefresh();
      
      // Assert
      expect(result).toBeDefined();
      expect(result.refreshedDataTypes).toContain('weather');
      expect(result.refreshedDataTypes).toContain('airlineSchedules');
      expect(result.refreshedDataTypes).toContain('marketForecasts');
      expect(result.refreshedDataTypes).toContain('events');
      
      // Verify all refresh methods were called
      expect(service.refreshWeatherData).toHaveBeenCalled();
      expect(service.refreshAirlineSchedules).toHaveBeenCalled();
      expect(service.refreshMarketForecasts).toHaveBeenCalled();
      expect(service.refreshEvents).toHaveBeenCalled();
    });
    
    it('should skip data types when specified', async () => {
      // Act
      const result = await service.performPeriodicRefresh({
        skipWeather: true,
        skipMarketForecasts: true
      });
      
      // Assert
      expect(result.refreshedDataTypes).not.toContain('weather');
      expect(result.refreshedDataTypes).toContain('airlineSchedules');
      expect(result.refreshedDataTypes).not.toContain('marketForecasts');
      expect(result.refreshedDataTypes).toContain('events');
      
      // Verify only specified methods were called
      expect(service.refreshWeatherData).not.toHaveBeenCalled();
      expect(service.refreshAirlineSchedules).toHaveBeenCalled();
      expect(service.refreshMarketForecasts).not.toHaveBeenCalled();
      expect(service.refreshEvents).toHaveBeenCalled();
    });
  });
});