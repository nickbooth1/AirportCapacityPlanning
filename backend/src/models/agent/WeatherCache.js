const { Model } = require('objection');

class WeatherCache extends Model {
  static get tableName() {
    return 'weather_cache';
  }

  static get idColumn() {
    return ['airport_code', 'forecast_date'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['airportCode', 'forecastDate', 'data', 'expiresAt'],
      properties: {
        airportCode: { type: 'string' },
        forecastDate: { type: 'string', format: 'date' },
        data: {
          type: 'object',
          properties: {
            temperature: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                avg: { type: 'number' }
              }
            },
            precipitation: {
              type: 'object',
              properties: {
                probability: { type: 'number' },
                amount: { type: 'number' }
              }
            },
            wind: {
              type: 'object',
              properties: {
                speed: { type: 'number' },
                direction: { type: 'number' },
                gusts: { type: 'number' }
              }
            },
            visibility: { type: 'number' },
            conditions: { type: 'string' },
            hourly: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string', format: 'date-time' },
                  temperature: { type: 'number' },
                  precipitation: { type: 'number' },
                  windSpeed: { type: 'number' },
                  windDirection: { type: 'number' },
                  visibility: { type: 'number' },
                  conditions: { type: 'string' }
                }
              }
            }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
  }

  static async getWeatherForecast(airportCode, date) {
    const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    return await this.query()
      .where({
        airportCode,
        forecastDate: formattedDate
      })
      .where('expiresAt', '>', new Date().toISOString())
      .first();
  }

  static async updateWeatherForecast(airportCode, date, data, expiryHours = 6) {
    const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    // Calculate expiry
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);
    
    // Upsert the weather data
    return await this.query()
      .insert({
        airportCode,
        forecastDate: formattedDate,
        data,
        expiresAt: expiryDate.toISOString(),
        createdAt: new Date().toISOString()
      })
      .onConflict(['airport_code', 'forecast_date'])
      .merge();
  }

  static async clearExpiredData() {
    return await this.query()
      .delete()
      .where('expiresAt', '<', new Date().toISOString());
  }
}

module.exports = WeatherCache;