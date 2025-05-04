import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Typography, Button, Space, Descriptions, Spin, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

const { Title } = Typography;

// Import the map component dynamically with no SSR since Leaflet requires a browser environment
const MapComponent = dynamic(
  () => import('../../../components/MapComponent'),
  { ssr: false }
);

export default function StandMap() {
  const router = useRouter();
  const { id } = router.query;
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch stand data
  useEffect(() => {
    if (!id) return;
    
    const fetchStand = async () => {
      try {
        setLoading(true);
        const response = await api.getStand(id);
        setStand(response.data);
        
        // Set position if lat/lng are available
        if (response.data.latitude && response.data.longitude) {
          setPosition({
            lat: parseFloat(response.data.latitude),
            lng: parseFloat(response.data.longitude)
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stand:', error);
        message.error('Failed to fetch stand details');
        setLoading(false);
      }
    };
    
    fetchStand();
  }, [id]);

  // Handle saving the updated location
  const handleSaveLocation = async () => {
    try {
      setLoading(true);
      await api.updateStand(id, {
        ...stand,
        latitude: position ? position.lat : null,
        longitude: position ? position.lng : null
      });
      
      message.success('Stand location updated successfully');
      setEditMode(false);
      setLoading(false);
    } catch (error) {
      console.error('Error updating stand location:', error);
      message.error('Failed to update stand location');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Card
        title={
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/stands')}
            >
              Back to Stands
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {stand ? `${stand.code} - ${stand.name}` : 'Stand Map'}
            </Title>
          </Space>
        }
        extra={
          editMode ? (
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSaveLocation}
              disabled={loading}
            >
              Save Location
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => setEditMode(true)}
              disabled={loading}
            >
              Edit Location
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : stand ? (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Terminal">{stand.terminal_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Pier">{stand.pier_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Type">{stand.stand_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="Jetbridge">{stand.has_jetbridge ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Status">{stand.is_active ? 'Active' : 'Inactive'}</Descriptions.Item>
              <Descriptions.Item label="Max Aircraft Size">{stand.max_aircraft_size_code || '-'}</Descriptions.Item>
              <Descriptions.Item label="Latitude">{position ? position.lat.toFixed(6) : 'Not set'}</Descriptions.Item>
              <Descriptions.Item label="Longitude">{position ? position.lng.toFixed(6) : 'Not set'}</Descriptions.Item>
            </Descriptions>
            
            <div style={{ height: '600px', marginTop: 16 }}>
              <MapComponent
                position={position}
                setPosition={editMode ? setPosition : null}
                readOnly={!editMode}
                height="600px"
                zoom={18}
              />
            </div>
            
            {editMode && (
              <div style={{ marginTop: 16 }}>
                <p>
                  Click on the map to set the stand location. The position will be saved when you click the Save Location button.
                </p>
              </div>
            )}
          </>
        ) : (
          <p>Stand not found</p>
        )}
      </Card>
    </Layout>
  );
} 