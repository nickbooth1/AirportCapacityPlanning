import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Card, Typography, Button, Space, Select, message, Spin, Empty } from 'antd';
import { ArrowLeftOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import api from '../../lib/api';

const { Title } = Typography;
const { Option } = Select;

// Import MapComponent dynamically with no SSR since Leaflet requires a browser environment
const MapWithNoSSR = dynamic(
  () => import('../../components/MapComponent').then((mod) => {
    // Return a modified version of the component that handles multiple markers
    return function MapWithMarkers({ stands }) {
      const [center, setCenter] = useState({ lat: 51.470022, lng: -0.454295 }); // Default: London Heathrow
      const [zoom, setZoom] = useState(15);
      
      // If there are stands with locations, center the map on the first one
      useEffect(() => {
        if (stands && stands.length > 0) {
          const standsWithLocations = stands.filter(stand => 
            stand.latitude && stand.longitude
          );
          
          if (standsWithLocations.length > 0) {
            setCenter({
              lat: parseFloat(standsWithLocations[0].latitude),
              lng: parseFloat(standsWithLocations[0].longitude)
            });
          }
        }
      }, [stands]);
      
      return (
        <div style={{ height: '700px', width: '100%' }}>
          {stands && stands.length > 0 ? (
            <div style={{ height: '100%', width: '100%' }}>
              <MapContainer 
                center={center} 
                zoom={zoom} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {stands.map(stand => {
                  if (stand.latitude && stand.longitude) {
                    const position = {
                      lat: parseFloat(stand.latitude),
                      lng: parseFloat(stand.longitude)
                    };
                    
                    return (
                      <Marker 
                        key={stand.id} 
                        position={position}
                      >
                        <Popup>
                          <div>
                            <strong>{stand.code}</strong> - {stand.name}<br />
                            Terminal: {stand.terminal_name || 'N/A'}<br />
                            Pier: {stand.pier_name || 'N/A'}<br />
                            Type: {stand.stand_type || 'N/A'}<br />
                            <Button
                              size="small"
                              style={{ marginTop: 5 }}
                              onClick={() => {
                                window.open(`/stands/edit/${stand.id}`, '_blank');
                              }}
                            >
                              Edit Stand
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          ) : (
            <Empty description="No stands with locations available" />
          )}
        </div>
      );
    };
  }),
  { ssr: false }
);

// Import necessary components from react-leaflet
const MapPart = dynamic(
  () => import('react-leaflet').then((mod) => ({
    MapContainer: mod.MapContainer,
    TileLayer: mod.TileLayer,
    Marker: mod.Marker,
    Popup: mod.Popup
  })),
  { ssr: false }
);

// Get the individual components from the dynamic import
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function StandsMapView() {
  const router = useRouter();
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminals, setTerminals] = useState([]);
  const [piers, setPiers] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [selectedPier, setSelectedPier] = useState(null);
  const [filteredPiers, setFilteredPiers] = useState([]);

  // Fetch data when the component mounts
  useEffect(() => {
    fetchStands();
    fetchTerminals();
    fetchPiers();
  }, []);

  // Filter piers when terminal selection changes
  useEffect(() => {
    if (selectedTerminal) {
      const filtered = piers.filter(pier => pier.terminal_id === selectedTerminal);
      setFilteredPiers(filtered);
    } else {
      setFilteredPiers(piers);
    }
    setSelectedPier(null);
  }, [selectedTerminal, piers]);

  // Function to fetch stands
  const fetchStands = async () => {
    try {
      setLoading(true);
      const response = await api.getStands();
      setStands(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stands:', error);
      message.error('Failed to fetch stands');
      setLoading(false);
    }
  };

  // Function to fetch terminals
  const fetchTerminals = async () => {
    try {
      const response = await api.getTerminals();
      setTerminals(response.data);
    } catch (error) {
      console.error('Error fetching terminals:', error);
      message.error('Failed to fetch terminals');
    }
  };

  // Function to fetch piers
  const fetchPiers = async () => {
    try {
      const response = await api.getPiers();
      setPiers(response.data);
      setFilteredPiers(response.data);
    } catch (error) {
      console.error('Error fetching piers:', error);
      message.error('Failed to fetch piers');
    }
  };

  // Function to handle terminal select
  const handleTerminalSelect = (value) => {
    setSelectedTerminal(value);
  };

  // Function to handle pier select
  const handlePierSelect = (value) => {
    setSelectedPier(value);
    fetchStandsByPier(value);
  };

  // Function to fetch stands by pier
  const fetchStandsByPier = async (pierId) => {
    try {
      setLoading(true);
      if (pierId) {
        const response = await api.getStandsByPier(pierId);
        setStands(response.data);
      } else {
        await fetchStands();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stands by pier:', error);
      message.error('Failed to fetch stands for the selected pier');
      setLoading(false);
    }
  };

  // Function to reset filters
  const resetFilters = () => {
    setSelectedTerminal(null);
    setSelectedPier(null);
    fetchStands();
  };

  // Filtered stands with valid locations
  const standsWithLocations = useMemo(() => {
    return stands.filter(stand => stand.latitude && stand.longitude);
  }, [stands]);

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
              Stands Map View
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="Filter by Terminal"
              style={{ width: 200 }}
              onChange={handleTerminalSelect}
              value={selectedTerminal}
              allowClear
            >
              {Array.isArray(terminals) ? terminals.map(terminal => (
                <Option key={terminal.id} value={terminal.id}>
                  {terminal.name}
                </Option>
              )) : null}
            </Select>
            
            <Select
              placeholder="Filter by Pier"
              style={{ width: 200 }}
              onChange={handlePierSelect}
              value={selectedPier}
              disabled={!selectedTerminal || filteredPiers.length === 0}
              allowClear
            >
              {Array.isArray(filteredPiers) ? filteredPiers.map(pier => (
                <Option key={pier.id} value={pier.id}>
                  {pier.name}
                </Option>
              )) : null}
            </Select>
            
            <Button onClick={resetFilters}>
              Reset Filters
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : standsWithLocations.length > 0 ? (
          <>
            <p>
              <strong>Displaying:</strong> {standsWithLocations.length} stands with location data (out of {stands.length} total)
            </p>
            <MapWithNoSSR stands={stands} />
          </>
        ) : (
          <Empty 
            description={
              <Space direction="vertical">
                <span>No stands with location data</span>
                <span>Try adding location information to stands by editing them individually</span>
              </Space>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        )}
      </Card>
    </Layout>
  );
} 