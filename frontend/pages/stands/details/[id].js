import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Typography, Button, Descriptions, Spin, Space, Tabs, Tag, Divider } from 'antd';
import { ArrowLeftOutlined, EditOutlined, EnvironmentOutlined, ControlOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Layout from '../../../components/Layout';
import StandAdjacenciesSection from '../../../components/StandAdjacenciesSection';
import api from '../../../lib/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Import the map component dynamically with no SSR since Leaflet requires a browser environment
const MapComponent = dynamic(
  () => import('../../../components/MapComponent'),
  { ssr: false }
);

export default function StandDetails() {
  const router = useRouter();
  const { id } = router.query;
  
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(null);

  // Fetch stand details when the component mounts
  useEffect(() => {
    if (id) {
      fetchStand();
    }
  }, [id]);

  // Function to fetch stand details
  const fetchStand = async () => {
    try {
      setLoading(true);
      const response = await api.getStand(id);
      setStand(response.data);
      
      // Set map position if coordinates exist
      if (response.data.latitude && response.data.longitude) {
        setPosition({
          lat: parseFloat(response.data.latitude),
          lng: parseFloat(response.data.longitude)
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stand:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p style={{ marginTop: '20px' }}>Loading stand details...</p>
          </div>
        </Card>
      </Layout>
    );
  }

  // Render tag for stand type
  const renderStandType = (type) => {
    const typeColors = {
      contact: 'blue',
      remote: 'orange',
      cargo: 'purple'
    };
    
    return type ? <Tag color={typeColors[type] || 'default'}>{type.toUpperCase()}</Tag> : <Text type="secondary">-</Text>;
  };

  // Render status tag
  const renderStatus = (isActive) => {
    return isActive ? 
      <Tag color="green">ACTIVE</Tag> : 
      <Tag color="red">INACTIVE</Tag>;
  };

  return (
    <Layout>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space direction="vertical" size="small">
            <Title level={2}>Stand Details</Title>
            {stand && (
              <Text>
                <Text strong>{stand.code}</Text> - {stand.name}
              </Text>
            )}
          </Space>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/stands')}
            >
              Back to Stands
            </Button>
            <Button 
              icon={<EnvironmentOutlined />} 
              onClick={() => router.push(`/stands/map/${id}`)}
            >
              Map View
            </Button>
            <Button 
              icon={<ControlOutlined />} 
              onClick={() => router.push(`/stands/constraints/${id}`)}
            >
              Constraints
            </Button>
            <Button 
              type="primary"
              icon={<EditOutlined />} 
              onClick={() => router.push(`/stands/edit/${id}`)}
            >
              Edit
            </Button>
          </Space>
        </div>

        <Tabs defaultActiveKey="details">
          <TabPane tab="Details" key="details">
            {stand && (
              <>
                <Card title="Basic Information" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Code">{stand.code}</Descriptions.Item>
                    <Descriptions.Item label="Name">{stand.name}</Descriptions.Item>
                    <Descriptions.Item label="Terminal">{stand.terminal_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Pier">{stand.pier_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Stand Type">{renderStandType(stand.stand_type)}</Descriptions.Item>
                    <Descriptions.Item label="Status">{renderStatus(stand.is_active)}</Descriptions.Item>
                    <Descriptions.Item label="Jetbridge">{stand.has_jetbridge ? 'Yes' : 'No'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="Aircraft Capabilities" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Maximum Aircraft Size">{stand.max_aircraft_size_code || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Maximum Wingspan (meters)">{stand.max_wingspan_meters || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Maximum Length (meters)">{stand.max_length_meters || '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>

                {position && (
                  <Card title="Location" style={{ marginBottom: 16 }}>
                    <div style={{ height: '400px', width: '100%', marginBottom: 16 }}>
                      <MapComponent 
                        position={position} 
                        readOnly={true} 
                        height="400px"
                      />
                    </div>
                    <Text>
                      <strong>Coordinates:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                    </Text>
                  </Card>
                )}

                {stand.description && (
                  <Card title="Additional Information">
                    <p>{stand.description}</p>
                  </Card>
                )}
              </>
            )}
          </TabPane>

          <TabPane tab="Adjacencies" key="adjacencies">
            {stand && <StandAdjacenciesSection standId={id} standName={stand.name} />}
          </TabPane>
        </Tabs>
      </Card>
    </Layout>
  );
} 