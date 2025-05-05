import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, InputNumber, Select, Card, message, Space, Typography, Switch, Divider } from 'antd';
import { SaveOutlined, CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import Layout from '../../components/Layout';
import api from '../../lib/api';
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
  () => import('../../components/MapComponent'),
  { ssr: false }
);

export default function NewStand() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [terminals, setTerminals] = useState([]);
  const [piers, setPiers] = useState([]);
  const [filteredPiers, setFilteredPiers] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [sizeCategories, setSizeCategories] = useState([]);
  const [mapPosition, setMapPosition] = useState({ lat: null, lng: null });
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);

  // Fetch reference data when component mounts
  useEffect(() => {
    fetchTerminals();
    fetchPiers();
    fetchAircraftTypes();
    fetchSizeCategories();
  }, []);

  // Filter piers when terminal selection changes
  useEffect(() => {
    if (selectedTerminal) {
      const filtered = piers.filter(pier => pier.terminal_id === selectedTerminal);
      setFilteredPiers(filtered);
      // Reset pier selection if terminal changes
      form.setFieldsValue({ pier_id: undefined });
    } else {
      setFilteredPiers([]);
      form.setFieldsValue({ pier_id: undefined });
    }
  }, [selectedTerminal, piers, form]);

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
      
      await api.createStand(values);
      message.success('Stand created successfully');
      router.push('/stands');
    } catch (error) {
      console.error('Error creating stand:', error);
      
      // Display more specific error if available
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to create stand');
      }
      
      setLoading(false);
    }
  };

  // Open map selection interface
  const openMapSelection = () => {
    setShowMap(!showMap);
  };

  return (
    <Layout>
      <Card>
        <Title level={2}>Add New Stand</Title>
        
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
            rules={[{ required: true, message: 'Please select a terminal' }]}
          >
            <Select 
              placeholder="Select terminal" 
              onChange={handleTerminalChange}
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
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="has_jetbridge"
            label="Has Jetbridge"
            valuePropName="checked"
            initialValue={false}
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
                Save Stand
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