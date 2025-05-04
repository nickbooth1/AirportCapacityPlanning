import React from 'react';
import MaintenanceRequestList from '../../components/maintenance/MaintenanceRequestList.jsx';
import Layout from '../../components/Layout';

const MaintenanceRequestsPage = () => {
  return (
    <Layout title="Stand Maintenance Requests">
      <MaintenanceRequestList />
    </Layout>
  );
};

export default MaintenanceRequestsPage; 