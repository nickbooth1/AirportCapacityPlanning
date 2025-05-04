import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, InputNumber, Select, Card, message, Space, Typography, Spin } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

const { Title } = Typography;
const { Option } = Select;

// Size categories
const SIZE_CATEGORIES = [
  { value: 'A', label: 'A - Small' },
  { value: 'B', label: 'B - Medium' },
  { value: 'C', label: 'C - Medium Large' },
  { value: 'D', label: 'D - Large' },
  { value: 'E', label: 'E - Very Large' },
  { value: 'F', label: 'F - Extremely Large' },
];

export default function EditAircraftType() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [aircraftType, setAircraftType] = useState(null);

  // Fetch aircraft type details when the component mounts
  useEffect(() => {
    if (id) {
      fetchAircraftType();
    }
  }, [id]);

  // Function to fetch aircraft type details
  const fetchAircraftType = async () => {
    try {
      setInitializing(true);
      const response = await api.getAircraftType(id);
      setAircraftType(response.data);
      
      // Set form values
      form.setFieldsValue({
        iata_code: response.data.iata_code,
        icao_code: response.data.icao_code,
        name: response.data.name,
        manufacturer: response.data.manufacturer,
        model: response.data.model,
        wingspan_meters: response.data.wingspan_meters,
        length_meters: response.data.length_meters,
        size_category_code: response.data.size_category_code,
      });
      
      setInitializing(false);
    } catch (error) {
      console.error('Error fetching aircraft type:', error);
      message.error('Failed to fetch aircraft type details');
      setInitializing(false);
    }
  };

  // Handle form submission
  const onFinish = async (values) => {
    try {
      setLoading(true);
      await api.updateAircraftType(id, values);
      message.success('Aircraft type updated successfully');
      router.push('/aircraft-types');
    } catch (error) {
      console.error('Error updating aircraft type:', error);
      
      // Display more specific error if available
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to update aircraft type');
      }
      
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Layout>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p style={{ marginTop: '20px' }}>Loading aircraft type...</p>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card>
        <Title level={2}>Edit Aircraft Type</Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            name="iata_code"
            label="IATA Code"
            rules={[
              { required: true, message: 'Please enter IATA code' },
              { max: 3, message: 'IATA code should be at most 3 characters' }
            ]}
          >
            <Input placeholder="e.g., 738" />
          </Form.Item>
          
          <Form.Item
            name="icao_code"
            label="ICAO Code"
            rules={[
              { required: true, message: 'Please enter ICAO code' },
              { max: 4, message: 'ICAO code should be at most 4 characters' }
            ]}
          >
            <Input placeholder="e.g., B738" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="Aircraft Name"
            rules={[{ required: true, message: 'Please enter aircraft name' }]}
          >
            <Input placeholder="e.g., Boeing 737-800" />
          </Form.Item>
          
          <Form.Item
            name="manufacturer"
            label="Manufacturer"
          >
            <Input placeholder="e.g., Boeing" />
          </Form.Item>
          
          <Form.Item
            name="model"
            label="Model"
          >
            <Input placeholder="e.g., 737-800" />
          </Form.Item>
          
          <Form.Item
            name="wingspan_meters"
            label="Wingspan (meters)"
            rules={[{ type: 'number', min: 0, message: 'Please enter a valid wingspan' }]}
          >
            <InputNumber min={0} placeholder="e.g., 35.8" />
          </Form.Item>
          
          <Form.Item
            name="length_meters"
            label="Length (meters)"
            rules={[{ type: 'number', min: 0, message: 'Please enter a valid length' }]}
          >
            <InputNumber min={0} placeholder="e.g., 39.5" />
          </Form.Item>
          
          <Form.Item
            name="size_category_code"
            label="Size Category"
          >
            <Select placeholder="Select size category">
              {SIZE_CATEGORIES.map(category => (
                <Option key={category.value} value={category.value}>
                  {category.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                Update
              </Button>
              <Button 
                onClick={() => router.push('/aircraft-types')}
                icon={<CloseOutlined />}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
} 