const { Model } = require('objection');

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
        data_source: { type: ['string', 'null'], maxLength: 255 },
        last_updated: { type: 'string', format: 'date-time' },
      }
    };
  }

  static get relationMappings() {
    return {};
  }

  static async findByIATA(code) {
    return this.query().findOne({ iata_code: code.toUpperCase() });
  }

  static async findByICAO(code) {
    return this.query().findOne({ icao_code: code.toUpperCase() });
  }

  static async findAirports(query) {
    if (!query) {
      return this.query();
    }

    return this.query().where(builder => {
      builder.where('name', 'like', `%${query}%`)
        .orWhere('iata_code', 'like', `%${query}%`)
        .orWhere('icao_code', 'like', `%${query}%`)
        .orWhere('city', 'like', `%${query}%`)
        .orWhere('country', 'like', `%${query}%`);
    });
  }

  static async findAirportsInRadius(lat, lon, radiusKm) {
    // Using Haversine formula directly in SQL for finding airports in radius
    const earthRadiusKm = 6371;
    
    return this.query()
      .whereRaw(`
        (
          ${earthRadiusKm} * acos(
            cos(radians(?)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(latitude))
          )
        ) < ?
      `, [lat, lon, lat, radiusKm])
      .orderByRaw(`
        (
          ${earthRadiusKm} * acos(
            cos(radians(?)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(latitude))
          )
        )
      `, [lat, lon, lat]);
  }

  static async findNearestAirport(lat, lon) {
    // Find the nearest active airport to a given location
    const earthRadiusKm = 6371;
    
    return this.query()
      .where({ status: 'active' })
      .orderByRaw(`
        (
          ${earthRadiusKm} * acos(
            cos(radians(?)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(latitude))
          )
        )
      `, [lat, lon, lat])
      .limit(1)
      .first();
  }
}

module.exports = Airport; 