/**
 * Airport.js
 * Model definition for the Airport entity
 */

const { Model } = require('objection');
const Joi = require('joi');

class Airport extends Model {
  static get tableName() {
    return 'airports';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'icao_code', 'latitude', 'longitude', 'status'],
      
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        iata_code: { type: ['string', 'null'], minLength: 3, maxLength: 3, pattern: '^[A-Z]{3}$' },
        icao_code: { type: 'string', minLength: 4, maxLength: 4, pattern: '^[A-Z]{4}$' },
        city: { type: ['string', 'null'], maxLength: 255 },
        country: { type: 'string', minLength: 2, maxLength: 2 },
        country_name: { type: ['string', 'null'], maxLength: 255 },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        elevation_ft: { type: ['number', 'null'] },
        timezone: { type: ['string', 'null'], maxLength: 255 },
        dst: { type: ['string', 'null'], maxLength: 1 },
        type: { 
          type: 'string', 
          enum: [
            'large_airport', 
            'medium_airport', 
            'small_airport', 
            'heliport', 
            'seaplane_base', 
            'closed'
          ] 
        },
        status: { type: 'string', enum: ['active', 'inactive'] },
        website: { type: ['string', 'null'], maxLength: 255 },
        wikipedia_link: { type: ['string', 'null'], maxLength: 255 },
        runway_count: { type: ['integer', 'null'] },
        longest_runway_ft: { type: ['integer', 'null'] },
        has_international_service: { type: ['boolean', 'null'] },
        passenger_volume_annual: { type: ['integer', 'null'] },
        municipality: { type: ['string', 'null'], maxLength: 255 },
        scheduled_service: { type: ['boolean', 'null'] },
        data_source: { type: ['string', 'null'], maxLength: 255 },
        last_updated: { type: 'string', format: 'date-time' },
      }
    };
  }

  static get relationMappings() {
    return {};
  }

  // Validation methods
  static validateIataCode(code) {
    const schema = Joi.string().length(3).uppercase().pattern(/^[A-Z]{3}$/);
    return schema.validate(code);
  }

  static validateIcaoCode(code) {
    const schema = Joi.string().length(4).uppercase().pattern(/^[A-Z]{4}$/);
    return schema.validate(code);
  }

  // Get nearest airports within radius (uses PostGIS)
  static getAirportsInRadius(knex, lat, lon, radiusKm) {
    const earthRadiusKm = 6371;
    
    return this.query(knex)
      .select('*')
      .whereRaw(`
        ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(?, ?)::geography,
          ?
        )
      `, [lon, lat, radiusKm * 1000]) // convert km to meters
      .orderByRaw(`
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(?, ?)::geography
        )
      `, [lon, lat]);
  }

  // Get nearest airport
  static getNearestAirport(knex, lat, lon) {
    return this.query(knex)
      .select('*')
      .whereRaw(`status = 'active'`)
      .orderByRaw(`
        ST_Distance(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(?, ?)::geography
        )
      `, [lon, lat])
      .limit(1)
      .first();
  }
}

module.exports = Airport; 