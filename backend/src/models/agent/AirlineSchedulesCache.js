const { Model } = require('objection');

class AirlineSchedulesCache extends Model {
  static get tableName() {
    return 'airline_schedules_cache';
  }

  static get idColumn() {
    return ['airline_code', 'schedule_date'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['airlineCode', 'scheduleDate', 'data', 'expiresAt'],
      properties: {
        airlineCode: { type: 'string' },
        scheduleDate: { type: 'string', format: 'date' },
        data: {
          type: 'object',
          properties: {
            flights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  flightNumber: { type: 'string' },
                  origin: { type: 'string' },
                  destination: { type: 'string' },
                  scheduledDeparture: { type: 'string', format: 'date-time' },
                  scheduledArrival: { type: 'string', format: 'date-time' },
                  aircraft: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                totalFlights: { type: 'integer' },
                domesticFlights: { type: 'integer' },
                internationalFlights: { type: 'integer' },
                onTimePerformance: { type: 'number' }
              }
            },
            metadata: {
              type: 'object',
              additionalProperties: true
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

  static async getAirlineSchedule(airlineCode, date) {
    const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    return await this.query()
      .where({
        airlineCode,
        scheduleDate: formattedDate
      })
      .where('expiresAt', '>', new Date().toISOString())
      .first();
  }

  static async updateAirlineSchedule(airlineCode, date, data, expiryHours = 12) {
    const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    // Calculate expiry
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);
    
    // Upsert the schedule data
    return await this.query()
      .insert({
        airlineCode,
        scheduleDate: formattedDate,
        data,
        expiresAt: expiryDate.toISOString(),
        createdAt: new Date().toISOString()
      })
      .onConflict(['airline_code', 'schedule_date'])
      .merge();
  }

  static async clearExpiredData() {
    return await this.query()
      .delete()
      .where('expiresAt', '<', new Date().toISOString());
  }

  static async getMultiAirlineSchedules(airlineCodes, date) {
    const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    return await this.query()
      .whereIn('airlineCode', airlineCodes)
      .where('scheduleDate', formattedDate)
      .where('expiresAt', '>', new Date().toISOString());
  }
}

module.exports = AirlineSchedulesCache;