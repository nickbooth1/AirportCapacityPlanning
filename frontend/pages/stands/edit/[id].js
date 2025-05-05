import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, InputNumber, Select, Card, message, Space, Typography, Switch, Divider, Spin } from 'antd';
import { SaveOutlined, CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';
import dynamic from 'next/dynamic';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Stand types
const STAND_TYPES = [
  { value: 'contact', label: 'Contact' },
  { value: 'remote', label: 'Remote' },
  { value: 'cargo', label: 'Cargo' },
];

// Import MapComponent dynamically with no SSR
const MapComponent = dynamic(
  () => import('../../../components/MapComponent'),
  { ssr: false }
);

export default function EditStand() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [stand, setStand] = useState(null);
  const [terminals, setTerminals] = useState([]);
  const [piers, setPiers] = useState([]);
  const [filteredPiers, setFilteredPiers] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [sizeCategories, setSizeCategories] = useState([]);
  const [mapPosition, setMapPosition] = useState({ lat: null, lng: null });
  const [showMap, setShowMap] = useState(false);

  // Fetch data when the component mounts
  useEffect(() => {
    if (id) {
      fetchStand();
      fetchTerminals();
      fetchPiers();
      fetchAircraftTypes();
      fetchSizeCategories();
    }
  }, [id]);

  // Filter piers when terminal selection changes
  useEffect(() => {
    if (selectedTerminal) {
      const filtered = piers.filter(pier => pier.terminal_id === selectedTerminal);
      setFilteredPiers(filtered);
      
      // Only reset pier selection if the current pier doesn't belong to the selected terminal
      const currentPierId = form.getFieldValue('pier_id');
      if (currentPierId) {
        const currentPier = piers.find(p => p.id === currentPierId);
        if (currentPier && currentPier.terminal_id !== selectedTerminal) {
          form.setFieldsValue({ pier_id: undefined });
        }
      }
    } else {
      setFilteredPiers([]);
    }
  }, [selectedTerminal, piers, form]);

  // Function to fetch stand details
  const fetchStand = async () => {
    try {
      setInitializing(true);
      const response = await api.getStand(id);
      setStand(response.data);
      
      // Set the terminal for pier filtering
      const pier = response.data.pier_id ? 
        (await api.getPier(response.data.pier_id)).data : null;
      
      if (pier) {
        setSelectedTerminal(pier.terminal_id);
      }
      
      // Set map position if coordinates exist
      if (response.data.latitude && response.data.longitude) {
        setMapPosition({
          lat: response.data.latitude,
          lng: response.data.longitude
        });
      }
      
      // Set form values
      form.setFieldsValue({
        name: response.data.name,
        code: response.data.code,
        pier_id: response.data.pier_id,
        stand_type: response.data.stand_type,
        max_aircraft_size_code: response.data.max_aircraft_size_code,
        max_wingspan_meters: response.data.max_wingspan_meters,
        max_length_meters: response.data.max_length_meters,
        is_active: response.data.is_active,
        has_jetbridge: response.data.has_jetbridge,
        description: response.data.description,
      });
      
      setInitializing(false);
    } catch (error) {
      console.error('Error fetching stand:', error);
      message.error('Failed to fetch stand details');
      setInitializing(false);
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
    } catch (error) {
      console.error('Error fetching piers:', error);
      message.error('Failed to fetch piers');
    }
  };

  // Function to fetch aircraft types
  const fetchAircraftTypes = async () => {
    try {
      const response = await api.getAircraftTypes();
      setAircraftTypes(response.data);
    } catch (error) {
      console.error('Error fetching aircraft types:', error);
      message.error('Failed to fetch aircraft types');
    }
  };

  // Function to fetch size categories
  const fetchSizeCategories = async () => {
    try {
      const response = await api.getAircraftSizeCategories();
      setSizeCategories(response.data);
    } catch (error) {
      console.error('Error fetching size categories:', error);
      message.error('Failed to fetch size categories');
    }
  };

  // Handle terminal selection
  const handleTerminalChange = (value) => {
    setSelectedTerminal(value);
  };

  // Handle form submission
  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      // Add map coordinates if available
      if (mapPosition.lat && mapPosition.lng) {
        values.latitude = mapPosition.lat;
        values.longitude = mapPosition.lng;
      }
      
      await api.updateStand(id, values);
      message.success('Stand updated successfully');
      router.push('/stands');
    } catch (error) {
      console.error('Error updating stand:', error);
      
      // Display more specific error if available
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to update stand');
      }
      
      setLoading(false);
    }
  };

  // Open map selection interface
  const openMapSelection = () => {
    setShowMap(!showMap);
  };

  if (initializing) {
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

  return (
    <Layout>
      <Card>
        <Title level={2}>Edit Stand</Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          style={{ maxWidth: 800 }}
        >
          <Divider orientation="left">Basic Information</Divider>
          
          <Form.Item
            name="name"
            label="Stand Name"
            rules={[{ required: true, message: 'Please enter stand name' }]}
          >
            <Input placeholder="e.g., South Terminal Stand 23" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="Stand Code"
            rules={[
              { required: true, message: 'Please enter stand code' },
              { max: 10, message: 'Code should be at most 10 characters' }
            ]}
          >
            <Input placeholder="e.g., S23" />
          </Form.Item>
          
          <Form.Item
            name="terminal_id"
            label="Terminal"
          >
            <Select 
              placeholder="Select terminal" 
              onChange={handleTerminalChange}
              value={selectedTerminal}
              disabled={true}
              help="Cannot change terminal directly. Change the pier to update terminal association."
            >
              {Array.isArray(terminals) ? terminals.map(terminal => (
                <Option key={terminal.id} value={terminal.id}>
                  {terminal.name}
                </Option>
              )) : null}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="pier_id"
            label="Pier"
            rules={[{ required: true, message: 'Please select a pier' }]}
          >
            <Select 
              placeholder="Select pier" 
              disabled={!selectedTerminal || filteredPiers.length === 0}
            >
              {Array.isArray(filteredPiers) ? filteredPiers.map(pier => (
                <Option key={pier.id} value={pier.id}>
                  {pier.name}
                </Option>
              )) : null}
            </Select>
          </Form.Item>
          
          <Divider orientation="left">Stand Characteristics</Divider>
          
          <Form.Item
            name="stand_type"
            label="Stand Type"
          >
            <Select placeholder="Select stand type">
              {STAND_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="max_aircraft_size_code"
            label="Maximum Aircraft Size Category"
          >
            <Select placeholder="Select maximum aircraft size">
              {sizeCategories.map(category => (
                <Option key={category.code} value={category.code}>
                  {category.code} - {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="max_wingspan_meters"
            label="Maximum Wingspan (meters)"
          >
            <InputNumber min={0} placeholder="e.g., 36" />
          </Form.Item>
          
          <Form.Item
            name="max_length_meters"
            label="Maximum Length (meters)"
          >
            <InputNumber min={0} placeholder="e.g., 40" />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="has_jetbridge"
            label="Has Jetbridge"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Divider orientation="left">Map Location</Divider>
          
          <Form.Item label="Stand Location">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                icon={<EnvironmentOutlined />} 
                onClick={openMapSelection}
              >
                {showMap ? 'Hide Map' : (mapPosition.lat ? 'Change Location' : 'Set Location on Map')}
              </Button>
              
              {mapPosition.lat && mapPosition.lng && (
                <div>
                  <strong>Selected Coordinates:</strong> {mapPosition.lat.toFixed(6)}, {mapPosition.lng.toFixed(6)}
                </div>
              )}
              
              {showMap && (
                <div style={{ height: '400px', marginTop: '10px' }}>
                  <MapComponent
                    position={mapPosition.lat ? mapPosition : null}
                    setPosition={(pos) => setMapPosition(pos || { lat: null, lng: null })}
                    height="400px"
                  />
                </div>
              )}
            </Space>
          </Form.Item>
          
          <Divider orientation="left">Additional Information</Divider>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} placeholder="Additional details about this stand" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
                Save Changes
              </Button>
              <Button icon={<CloseOutlined />} onClick={() => router.push('/stands')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
} 