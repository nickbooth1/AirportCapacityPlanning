import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Table, Button, Card, message, Popconfirm, Space, Typography, Tag, Select, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, ControlOutlined, GlobalOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import dynamic from 'next/dynamic';

const { Title } = Typography;
const { Option } = Select;

// Import necessary components from react-leaflet with no SSR
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

// Import Leaflet CSS dynamically
const MapCSSLoader = () => {
  useEffect(() => {
    import('leaflet/dist/leaflet.css');
  }, []);
  return null;
};

// Fix for default Leaflet icon
const fixLeafletIcon = () => {
  useEffect(() => {
    // Import Leaflet to fix the icon issue
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);
  
  return null;
};

export default function Stands() {
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [piers, setPiers] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [selectedPier, setSelectedPier] = useState(null);
  const [filteredPiers, setFilteredPiers] = useState([]);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 51.470022, lng: -0.454295 }); // Default: London Heathrow
  const router = useRouter();

  // Fetch data when the component mounts
  useEffect(() => {
    fetchStands();
    fetchPiers();
    fetchTerminals();
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
      
      // Center map on first stand with coordinates if available
      const standsWithCoords = response.data.filter(stand => 
        stand.latitude && stand.longitude
      );
      
      if (standsWithCoords.length > 0) {
        setMapCenter({
          lat: parseFloat(standsWithCoords[0].latitude),
          lng: parseFloat(standsWithCoords[0].longitude)
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stands:', error);
      message.error('Failed to fetch stands');
      setLoading(false);
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
        
        // Update map center if stands with coordinates exist
        const standsWithCoords = response.data.filter(stand => 
          stand.latitude && stand.longitude
        );
        
        if (standsWithCoords.length > 0) {
          setMapCenter({
            lat: parseFloat(standsWithCoords[0].latitude),
            lng: parseFloat(standsWithCoords[0].longitude)
          });
        }
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

  // Function to handle delete
  const handleDelete = async (id) => {
    try {
      await api.deleteStand(id);
      message.success('Stand deleted successfully');
      
      // Refresh the list based on current filters
      if (selectedPier) {
        fetchStandsByPier(selectedPier);
      } else {
        fetchStands();
      }
    } catch (error) {
      console.error('Error deleting stand:', error);
      message.error('Failed to delete stand');
    }
  };

  // Filtered stands with valid locations for map
  const standsWithLocations = useMemo(() => {
    return stands.filter(stand => stand.latitude && stand.longitude);
  }, [stands]);

  // Table columns
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Terminal',
      dataIndex: 'terminal_name',
      key: 'terminal_name',
      sorter: (a, b) => (a.terminal_name || '').localeCompare(b.terminal_name || ''),
    },
    {
      title: 'Pier',
      dataIndex: 'pier_name',
      key: 'pier_name',
      sorter: (a, b) => (a.pier_name || '').localeCompare(b.pier_name || ''),
    },
    {
      title: 'Type',
      dataIndex: 'stand_type',
      key: 'stand_type',
      render: (type) => type ? type : '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        isActive ? 
          <Tag color="green">Active</Tag> : 
          <Tag color="red">Inactive</Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: 'Jetbridge',
      dataIndex: 'has_jetbridge',
      key: 'has_jetbridge',
      render: (hasJetbridge) => (
        hasJetbridge ? 
          <Tag color="blue">Yes</Tag> : 
          <Tag color="orange">No</Tag>
      ),
      filters: [
        { text: 'Yes', value: true },
        { text: 'No', value: false },
      ],
      onFilter: (value, record) => record.has_jetbridge === value,
    },
    {
      title: 'Max Size',
      dataIndex: 'max_aircraft_size_code',
      key: 'max_aircraft_size_code',
      render: (size) => size ? size : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<InfoCircleOutlined />} 
            onClick={() => router.push(`/stands/details/${record.id}`)} 
            size="small"
            title="View Details"
          />
          <Button 
            icon={<EnvironmentOutlined />} 
            onClick={() => router.push(`/stands/map/${record.id}`)} 
            size="small"
            title="View on Map"
          />
          <Button 
            icon={<ControlOutlined />} 
            onClick={() => router.push(`/stands/constraints/${record.id}`)} 
            size="small"
            title="Manage Constraints"
          />
          <Button 
            icon={<EditOutlined />} 
            onClick={() => router.push(`/stands/edit/${record.id}`)} 
            size="small"
            title="Edit"
          />
          <Popconfirm
            title="Are you sure you want to delete this stand?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              size="small"
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Aircraft Stands</Title>
          <Space>
            <Button 
              icon={<GlobalOutlined />} 
              onClick={() => router.push('/stands/map-view')}
            >
              Full Map View
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => router.push('/stands/new')}
              style={{ backgroundColor: '#000000', color: '#FFDE59', borderColor: '#000000' }}
            >
              Add Stand
            </Button>
          </Space>
        </div>
        
        {/* Map Overview Section */}
        <Card 
          title="Stands Map Overview" 
          style={{ marginBottom: 16 }}
          extra={
            <Button onClick={() => setShowMap(!showMap)}>
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          }
        >
          {showMap && (
            <>
              <MapCSSLoader />
              {fixLeafletIcon()}
              <div style={{ height: '400px', width: '100%', marginBottom: 16 }}>
                {typeof window !== 'undefined' && (
                  <MapContainer 
                    center={mapCenter} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {standsWithLocations.map(stand => {
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
                                <Button
                                  size="small"
                                  style={{ marginTop: 5 }}
                                  onClick={() => router.push(`/stands/map/${stand.id}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      }
                      return null;
                    })}
                  </MapContainer>
                )}
              </div>
              <p>
                <strong>Displaying:</strong> {standsWithLocations.length} stands with location data (out of {stands.length} total)
              </p>
            </>
          )}
        </Card>
        
        <Divider>Stand List</Divider>
        
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Select
            style={{ width: 200 }}
            placeholder="Filter by Terminal"
            allowClear
            onChange={handleTerminalSelect}
            value={selectedTerminal}
          >
            {terminals.map(terminal => (
              <Option key={terminal.id} value={terminal.id}>
                {terminal.name}
              </Option>
            ))}
          </Select>
          
          <Select
            style={{ width: 200 }}
            placeholder="Filter by Pier"
            allowClear
            onChange={handlePierSelect}
            value={selectedPier}
            disabled={filteredPiers.length === 0}
          >
            {filteredPiers.map(pier => (
              <Option key={pier.id} value={pier.id}>
                {pier.name}
              </Option>
            ))}
          </Select>
          
          <Button onClick={resetFilters}>Reset Filters</Button>
        </div>
        
        <Table 
          dataSource={stands} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Layout>
  );
} 