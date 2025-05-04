import React from 'react';
import MaintenanceRequestList from '../../components/maintenance/MaintenanceRequestList';
import Layout from '../../components/Layout/Layout';

const MaintenanceRequestsPage = () => {
  return (
    <Layout title="Stand Maintenance Requests">
      <MaintenanceRequestList />
    </Layout>
  );
};

export default MaintenanceRequestsPage; 