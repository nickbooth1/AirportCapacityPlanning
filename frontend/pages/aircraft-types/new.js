import { useState } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, InputNumber, Select, Card, message, Space, Typography } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import Layout from '../../components/Layout';
import api from '../../lib/api';

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

export default function NewAircraftType() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle form submission
  const onFinish = async (values) => {
    try {
      setLoading(true);
      await api.createAircraftType(values);
      message.success('Aircraft type created successfully');
      router.push('/aircraft-types');
    } catch (error) {
      console.error('Error creating aircraft type:', error);
      
      // Display more specific error if available
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to create aircraft type');
      }
      
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Card>
        <Title level={2}>Add New Aircraft Type</Title>
        
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
                Save
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