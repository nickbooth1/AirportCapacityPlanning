/**
 * Domain Adapters Index
 * 
 * Exports all domain adapters for the autonomous orchestration engine.
 */

const BaseDomainAdapter = require('./BaseDomainAdapter');
const CapacityDomainAdapter = require('./CapacityDomainAdapter');
const PassengerDomainAdapter = require('./PassengerDomainAdapter');
const SustainabilityDomainAdapter = require('./SustainabilityDomainAdapter');
const CommercialDomainAdapter = require('./CommercialDomainAdapter');
const CrisisDomainAdapter = require('./CrisisDomainAdapter');

module.exports = {
  BaseDomainAdapter,
  CapacityDomainAdapter,
  PassengerDomainAdapter,
  SustainabilityDomainAdapter,
  CommercialDomainAdapter,
  CrisisDomainAdapter
};