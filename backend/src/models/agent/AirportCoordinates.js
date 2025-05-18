const { Model } = require('objection');

class AirportCoordinates extends Model {
  static get tableName() {
    return 'airport_coordinates';
  }

  static get idColumn() {
    return 'airport_code';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['airportCode', 'latitude', 'longitude'],
      properties: {
        airportCode: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        city: { type: 'string' },
        country: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  static async getCoordinates(airportCode) {
    return await this.query().findById(airportCode);
  }

  static async upsertCoordinates(data) {
    return await this.query()
      .insert({
        airportCode: data.airportCode,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country,
        updatedAt: new Date().toISOString()
      })
      .onConflict('airport_code')
      .merge({
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country,
        updatedAt: new Date().toISOString()
      });
  }

  static async findNearbyAirports(latitude, longitude, radiusKm = 100, limit = 10) {
    // This is a simplified version that uses direct calculation
    // In a production environment, you might use PostGIS or another spatial database feature
    const earthRadiusKm = 6371;
    
    // Convert radius to degrees (approximate)
    const radiusDegrees = radiusKm / earthRadiusKm * (180 / Math.PI);
    
    // Find airports within the bounding box first as a coarse filter
    const airports = await this.query()
      .whereBetween('latitude', [latitude - radiusDegrees, latitude + radiusDegrees])
      .whereBetween('longitude', [longitude - radiusDegrees, longitude + radiusDegrees]);
    
    // Calculate actual distance for each airport and filter by actual radius
    const airportsWithDistance = airports.map(airport => {
      // Haversine formula for distance calculation
      const dLat = (airport.latitude - latitude) * Math.PI / 180;
      const dLon = (airport.longitude - longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(airport.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = earthRadiusKm * c;
      
      return {
        ...airport,
        distance
      };
    }).filter(airport => airport.distance <= radiusKm);
    
    // Sort by distance and limit results
    return airportsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
}

module.exports = AirportCoordinates;