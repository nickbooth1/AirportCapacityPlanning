import React from 'react';
import Layout from '../../components/Layout';
import TimeSlotsPage from '../../src/pages/config/time-slots';

export default function TimeSlots() {
  return (
    <Layout title="Time Slots Configuration">
      <TimeSlotsPage />
    </Layout>
  );
} 