import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Select, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const StandAdjacenciesSection = ({ standId, standName }) => {
  const [adjacencies, setAdjacencies] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdjacency, setEditingAdjacency] = useState(null);
  const [form] = Form.useForm();

  // Fetch stand adjacencies and all available stands
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [adjacenciesResponse, standsResponse] = await Promise.all([
          api.getStandAdjacencies(standId),
          api.getStands()
        ]);

        setAdjacencies(adjacenciesResponse.data);
        setStands(standsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load stand adjacencies');
      } finally {
        setLoading(false);
      }
    };

    if (standId) {
      fetchData();
    }
  }, [standId]);

  // Filter out the current stand from the stands list
  const filteredStands = stands.filter(stand => stand.id !== parseInt(standId, 10));

  // Handle opening the add/edit modal
  const handleAddAdjacency = () => {
    setEditingAdjacency(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditAdjacency = (adjacency) => {
    setEditingAdjacency(adjacency);
    
    // Determine which ID to use as adjacent_stand_id based on which side of the relationship we're viewing
    const isStandTheImpacted = adjacency.stand_id === parseInt(standId, 10);
    const adjacentStandId = isStandTheImpacted ? adjacency.adjacent_stand_id : adjacency.stand_id;
    
    form.setFieldsValue({
      adjacent_stand_id: adjacentStandId,
      impact_direction: adjacency.impact_direction,
      restriction_type: adjacency.restriction_type,
      max_aircraft_size_code: adjacency.max_aircraft_size_code,
      restriction_details: adjacency.restriction_details,
      is_active: adjacency.is_active,
    });
    
    setModalVisible(true);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingAdjacency) {
        await api.updateStandAdjacency(editingAdjacency.id, {
          ...values,
          stand_id: parseInt(standId, 10),
        });
        message.success('Adjacency updated successfully');
      } else {
        await api.createStandAdjacency({
          ...values,
          stand_id: parseInt(standId, 10),
        });
        message.success('Adjacency created successfully');
      }
      
      setModalVisible(false);
      
      // Refresh the data
      const response = await api.getStandAdjacencies(standId);
      setAdjacencies(response.data);
      
    } catch (error) {
      console.error('Error saving adjacency:', error);
      message.error('Failed to save adjacency');
    }
  };

  // Handle deletion
  const handleDeleteAdjacency = async (id) => {
    try {
      await api.deleteStandAdjacency(id);
      message.success('Adjacency deleted successfully');
      
      // Refresh the data
      const response = await api.getStandAdjacencies(standId);
      setAdjacencies(response.data);
      
    } catch (error) {
      console.error('Error deleting adjacency:', error);
      message.error('Failed to delete adjacency');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Adjacent Stand',
      dataIndex: 'adjacent_stand_name',
      key: 'adjacent_stand_name',
      render: (text, record) => {
        // If this stand is the adjacent one, show the other stand
        const isStandTheImpacted = record.stand_id === parseInt(standId, 10);
        return isStandTheImpacted 
          ? `${record.adjacent_stand_code} - ${record.adjacent_stand_name}` 
          : `${record.stand_code} - ${record.stand_name}`;
      },
    },
    {
      title: 'Direction',
      dataIndex: 'impact_direction',
      key: 'impact_direction',
      render: (direction) => {
        const colors = {
          left: 'green',
          right: 'blue',
          behind: 'orange',
          front: 'purple',
          other: 'gray',
        };
        return <Tag color={colors[direction]}>{direction.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Restriction Type',
      dataIndex: 'restriction_type',
      key: 'restriction_type',
      render: (type) => {
        const colors = {
          no_use: 'red',
          size_limited: 'orange',
          aircraft_type_limited: 'gold',
          operational_limit: 'blue',
          other: 'gray',
        };
        const labels = {
          no_use: 'No Use',
          size_limited: 'Size Limited',
          aircraft_type_limited: 'Aircraft Type Limited',
          operational_limit: 'Operational Limit',
          other: 'Other',
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      },
    },
    {
      title: 'Max Aircraft Size',
      dataIndex: 'max_aircraft_size_code',
      key: 'max_aircraft_size_code',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (isActive ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditAdjacency(record)}
          />
          <Popconfirm
            title="Delete this adjacency?"
            description="Are you sure you want to delete this adjacency? This action cannot be undone."
            onConfirm={() => handleDeleteAdjacency(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={<Title level={4}>Stand Adjacencies</Title>}
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddAdjacency}
        >
          Add Adjacency
        </Button>
      }
      style={{ marginTop: 20 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
          Adjacencies define how this stand interacts with neighboring stands. 
          Use this to track operational restrictions when adjacent stands are in use.
        </Text>
      </div>
      
      <Table
        columns={columns}
        dataSource={adjacencies}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
      
      {/* Add/Edit Adjacency Modal */}
      <Modal
        title={editingAdjacency ? 'Edit Adjacency' : 'Add Adjacency'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleFormSubmit}>
            Save
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="adjacent_stand_id"
            label="Adjacent Stand"
            rules={[{ required: true, message: 'Please select an adjacent stand' }]}
          >
            <Select placeholder="Select an adjacent stand">
              {filteredStands.map(stand => (
                <Option key={stand.id} value={stand.id}>
                  {stand.code} - {stand.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="impact_direction"
            label="Impact Direction"
            rules={[{ required: true, message: 'Please select the impact direction' }]}
          >
            <Select placeholder="Select direction">
              <Option value="left">Left</Option>
              <Option value="right">Right</Option>
              <Option value="behind">Behind</Option>
              <Option value="front">Front</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="restriction_type"
            label="Restriction Type"
            rules={[{ required: true, message: 'Please select the restriction type' }]}
          >
            <Select placeholder="Select restriction type">
              <Option value="no_use">No Use</Option>
              <Option value="size_limited">Size Limited</Option>
              <Option value="aircraft_type_limited">Aircraft Type Limited</Option>
              <Option value="operational_limit">Operational Limit</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="max_aircraft_size_code"
            label="Maximum Aircraft Size"
          >
            <Select placeholder="Select max aircraft size" allowClear>
              <Option value="A">A</Option>
              <Option value="B">B</Option>
              <Option value="C">C</Option>
              <Option value="D">D</Option>
              <Option value="E">E</Option>
              <Option value="F">F</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="restriction_details"
            label="Restriction Details"
          >
            <TextArea rows={4} placeholder="Enter detailed description of the restriction" />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Status"
            initialValue={true}
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StandAdjacenciesSection; 