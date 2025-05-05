import React from 'react';
import Layout from '../../components/Layout';
import AirportConfiguration from '../../src/pages/config/airport-configuration';

/**
 * Page wrapper for the Airport Configuration component
 */
export default function AirportConfigPage() {
  return (
    <Layout title="Airport Configuration">
      <AirportConfiguration />
    </Layout>
  );
} 