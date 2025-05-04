import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Table, Button, Card, message, Popconfirm, Space, Typography, Tag, Switch, Modal, Form, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function StandConstraints() {
  const router = useRouter();
  const { id } = router.query;
  
  const [constraints, setConstraints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stand, setStand] = useState(null);
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [filteredAircraftTypes, setFilteredAircraftTypes] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Fetch data when the component mounts
  useEffect(() => {
    if (id) {
      fetchStand();
      fetchConstraints();
      fetchAircraftTypes();
    }
  }, [id]);

  // Filter out aircraft types that already have constraints
  useEffect(() => {
    if (aircraftTypes.length > 0 && constraints.length > 0) {
      const constrainedAircraftIds = constraints.map(c => c.aircraft_type_id);
      const filtered = aircraftTypes.filter(aircraft => !constrainedAircraftIds.includes(aircraft.id));
      setFilteredAircraftTypes(filtered);
    } else {
      setFilteredAircraftTypes(aircraftTypes);
    }
  }, [aircraftTypes, constraints]);

  // Function to fetch stand details
  const fetchStand = async () => {
    try {
      const response = await api.getStand(id);
      setStand(response.data);
    } catch (error) {
      console.error('Error fetching stand details:', error);
      message.error('Failed to fetch stand details');
    }
  };

  // Function to fetch stand constraints
  const fetchConstraints = async () => {
    try {
      setLoading(true);
      const response = await api.getStandConstraints(id);
      setConstraints(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stand constraints:', error);
      message.error('Failed to fetch stand constraints');
      setLoading(false);
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

  // Function to handle delete
  const handleDelete = async (constraintId) => {
    try {
      await api.deleteStandConstraint(constraintId);
      message.success('Constraint removed successfully');
      fetchConstraints();
    } catch (error) {
      console.error('Error deleting constraint:', error);
      message.error('Failed to delete constraint');
    }
  };

  // Function to show add constraint modal
  const showAddModal = () => {
    form.resetFields();
    setAddModalVisible(true);
  };

  // Function to handle add constraint submission
  const handleAddConstraint = async (values) => {
    try {
      setSubmitting(true);
      await api.createStandConstraint({
        stand_id: id,
        aircraft_type_id: values.aircraft_type_id,
        is_allowed: values.is_allowed,
        constraint_reason: values.constraint_reason,
      });
      
      setAddModalVisible(false);
      message.success('Constraint added successfully');
      fetchConstraints();
      setSubmitting(false);
    } catch (error) {
      console.error('Error adding constraint:', error);
      message.error('Failed to add constraint');
      setSubmitting(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Aircraft Type',
      dataIndex: 'aircraft_name',
      key: 'aircraft_name',
      render: (text, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{text}</Text>
          <Text type="secondary">IATA: {record.aircraft_iata_code} / ICAO: {record.aircraft_icao_code}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_allowed',
      key: 'is_allowed',
      render: (isAllowed) => (
        isAllowed ? 
          <Tag color="green">Allowed</Tag> : 
          <Tag color="red">Not Allowed</Tag>
      ),
      filters: [
        { text: 'Allowed', value: true },
        { text: 'Not Allowed', value: false },
      ],
      onFilter: (value, record) => record.is_allowed === value,
    },
    {
      title: 'Reason',
      dataIndex: 'constraint_reason',
      key: 'constraint_reason',
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to delete this constraint?"
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
      ),
    },
  ];

  return (
    <Layout>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space direction="vertical" size="small">
            <Title level={2}>Stand Constraints</Title>
            {stand && (
              <Text>
                Stand: <Text strong>{stand.name}</Text> ({stand.code})
              </Text>
            )}
          </Space>
          
          <Space>
            <Button 
              icon={<RollbackOutlined />} 
              onClick={() => router.push('/stands')}
            >
              Back to Stands
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showAddModal}
              disabled={filteredAircraftTypes.length === 0}
            >
              Add Constraint
            </Button>
          </Space>
        </div>
        
        <Table 
          dataSource={constraints} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Add Aircraft Constraint"
        visible={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddConstraint}
        >
          <Form.Item
            name="aircraft_type_id"
            label="Aircraft Type"
            rules={[{ required: true, message: 'Please select an aircraft type' }]}
          >
            <Select placeholder="Select aircraft type">
              {filteredAircraftTypes.map(aircraft => (
                <Option key={aircraft.id} value={aircraft.id}>
                  {aircraft.name} ({aircraft.iata_code}/{aircraft.icao_code})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_allowed"
            label="Status"
            initialValue={true}
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Allowed" 
              unCheckedChildren="Not Allowed" 
              defaultChecked
            />
          </Form.Item>
          
          <Form.Item
            name="constraint_reason"
            label="Reason (optional)"
          >
            <Select placeholder="Select reason or specify custom">
              <Option value="Wingspan too large">Wingspan too large</Option>
              <Option value="Length too large">Length too large</Option>
              <Option value="Weight restriction">Weight restriction</Option>
              <Option value="Operational limitation">Operational limitation</Option>
              <Option value="Preferred aircraft">Preferred aircraft</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add
              </Button>
              <Button onClick={() => setAddModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
} 