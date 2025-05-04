const { Model } = require('objection');

class Airline extends Model {
  static get tableName() {
    return 'airlines';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        iata_code: { type: ['string', 'null'], minLength: 0, maxLength: 2 },
        icao_code: { type: ['string', 'null'], minLength: 0, maxLength: 3 },
        callsign: { type: ['string', 'null'], maxLength: 255 },
        country: { type: ['string', 'null'], maxLength: 255 },
        active: { type: 'boolean' },
        headquarters: { type: ['string', 'null'], maxLength: 255 },
        founded: { type: ['integer', 'null'] },
        fleet_size: { type: ['integer', 'null'] },
        destinations: { type: ['integer', 'null'] },
        alliance: { type: ['string', 'null'], maxLength: 255 },
        subsidiaries: { type: ['array', 'null'] },
        parent: { type: ['string', 'null'], maxLength: 255 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  // Helpful methods for airline validation
  static async findByIATA(iataCode) {
    return this.query().findOne({ iata_code: iataCode });
  }

  static async findByICAO(icaoCode) {
    return this.query().findOne({ icao_code: icaoCode });
  }

  static async validateAirlineReference(code, type = 'IATA') {
    if (!code) return false;
    
    if (type.toUpperCase() === 'IATA') {
      return !!(await this.findByIATA(code));
    } else if (type.toUpperCase() === 'ICAO') {
      return !!(await this.findByICAO(code));
    }
    
    return false;
  }

  static async findAirlines(query) {
    if (!query) {
      return this.query();
    }

    return this.query().where(builder => {
      builder.where('name', 'like', `%${query}%`)
        .orWhere('iata_code', 'like', `%${query}%`)
        .orWhere('icao_code', 'like', `%${query}%`)
        .orWhere('country', 'like', `%${query}%`);
    });
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = Airline; 