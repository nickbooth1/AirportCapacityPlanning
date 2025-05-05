const { Model } = require('objection');

class GroundHandlingAgent extends Model {
  static get tableName() {
    return 'ground_handling_agents';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'status'],
      
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        code: { type: ['string', 'null'], maxLength: 10 },
        abbreviation: { type: ['string', 'null'], maxLength: 10 },
        headquarters: { type: ['string', 'null'], maxLength: 255 },
        country: { type: ['string', 'null'], minLength: 2, maxLength: 2 },
        country_name: { type: ['string', 'null'], maxLength: 255 },
        founded: { type: ['integer', 'null'] },
        website: { type: ['string', 'null'], maxLength: 255 },
        parent_company: { type: ['string', 'null'], maxLength: 255 },
        subsidiaries: { type: ['array', 'null'] },
        service_types: { 
          type: ['array', 'null'],
          items: { 
            type: 'string', 
            enum: [
              'passenger_services',
              'ramp_services',
              'baggage_handling',
              'cargo_handling',
              'aircraft_services',
              'fuel_services',
              'catering',
              'security',
              'maintenance',
              'other'
            ]
          }
        },
        operates_at: { type: ['array', 'null'], items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'inactive'] },
        data_source: { type: ['string', 'null'], maxLength: 255 },
        last_updated: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Airport = require('./Airport');
    return {
      airports: {
        relation: Model.ManyToManyRelation,
        modelClass: Airport,
        join: {
          from: 'ground_handling_agents.id',
          through: {
            from: 'gha_airport.gha_id',
            to: 'gha_airport.airport_id',
            extra: ['services_provided', 'contract_type', 'is_primary_handler']
          },
          to: 'airports.id'
        }
      }
    };
  }

  /**
   * Find GHAs by name search
   * @param {string} name - Name to search for
   * @returns {Promise<Array>} - Matching GHAs
   */
  static async findByName(name) {
    return this.query().where('name', 'like', `%${name}%`);
  }

  /**
   * Find a GHA by its code
   * @param {string} code - GHA code
   * @returns {Promise<Object>} - GHA object
   */
  static async findByCode(code) {
    return this.query().findOne({ code: code.toUpperCase() });
  }

  /**
   * Find GHAs that operate at a specific airport
   * @param {string} airportCode - IATA or ICAO code of the airport
   * @returns {Promise<Array>} - Array of GHAs
   */
  static async findByAirport(airportCode) {
    const code = airportCode.toUpperCase();
    
    return this.query()
      .whereJsonSupersetOf('operates_at', [code])
      .orWhereExists(
        this.relatedQuery('airports')
          .where('iata_code', code)
          .orWhere('icao_code', code)
      );
  }

  /**
   * Validate if a GHA operates at a specific airport
   * @param {string} ghaName - Name of the GHA
   * @param {string} airportCode - IATA or ICAO code of the airport
   * @returns {Promise<boolean>} - True if the GHA operates at the airport
   */
  static async validateGHAAtAirport(ghaName, airportCode) {
    const code = airportCode.toUpperCase();
    
    const result = await this.query()
      .where('name', 'like', `%${ghaName}%`)
      .whereJsonSupersetOf('operates_at', [code])
      .orWhereExists(
        this.relatedQuery('airports')
          .where(function() {
            this.where('iata_code', code)
                .orWhere('icao_code', code);
          })
          .andWhere('ground_handling_agents.name', 'like', `%${ghaName}%`)
      )
      .first();
    
    return !!result;
  }

  /**
   * Search for GHAs with flexible criteria
   * @param {string} query - Search term
   * @returns {Promise<Array>} - Matching GHAs
   */
  static async findGHAs(query) {
    if (!query) {
      return this.query();
    }

    return this.query().where(builder => {
      builder.where('name', 'like', `%${query}%`)
        .orWhere('code', 'like', `%${query}%`)
        .orWhere('abbreviation', 'like', `%${query}%`)
        .orWhere('country', 'like', `%${query}%`)
        .orWhere('country_name', 'like', `%${query}%`);
    });
  }
}

module.exports = GroundHandlingAgent; 