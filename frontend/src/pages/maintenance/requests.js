import React from 'react';
import MaintenanceRequestList from '../../components/maintenance/MaintenanceRequestList';
import CapacityImpactAnalysis from '../../components/maintenance/CapacityImpactAnalysis';
import Layout from '../../../components/Layout';

const MaintenanceRequestsPage = () => {
  return (
    <Layout title="Stand Maintenance Requests">
      <CapacityImpactAnalysis />
      <MaintenanceRequestList />
    </Layout>
  );
};

export default MaintenanceRequestsPage; 