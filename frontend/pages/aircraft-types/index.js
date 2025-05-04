import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Table, Button, Card, message, Popconfirm, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '../../components/Layout';
import api from '../../lib/api';

const { Title } = Typography;

export default function AircraftTypes() {
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch aircraft types when the component mounts
  useEffect(() => {
    fetchAircraftTypes();
  }, []);

  // Function to fetch aircraft types
  const fetchAircraftTypes = async () => {
    try {
      setLoading(true);
      const response = await api.getAircraftTypes();
      setAircraftTypes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching aircraft types:', error);
      message.error('Failed to fetch aircraft types');
      setLoading(false);
    }
  };

  // Function to handle delete
  const handleDelete = async (id) => {
    try {
      await api.deleteAircraftType(id);
      message.success('Aircraft type deleted successfully');
      fetchAircraftTypes(); // Refresh the list
    } catch (error) {
      console.error('Error deleting aircraft type:', error);
      message.error('Failed to delete aircraft type');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'IATA Code',
      dataIndex: 'iata_code',
      key: 'iata_code',
      sorter: (a, b) => a.iata_code.localeCompare(b.iata_code),
    },
    {
      title: 'ICAO Code',
      dataIndex: 'icao_code',
      key: 'icao_code',
      sorter: (a, b) => a.icao_code.localeCompare(b.icao_code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      sorter: (a, b) => (a.manufacturer || '').localeCompare(b.manufacturer || ''),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Wingspan (m)',
      dataIndex: 'wingspan_meters',
      key: 'wingspan_meters',
      sorter: (a, b) => a.wingspan_meters - b.wingspan_meters,
    },
    {
      title: 'Length (m)',
      dataIndex: 'length_meters',
      key: 'length_meters',
      sorter: (a, b) => a.length_meters - b.length_meters,
    },
    {
      title: 'Size Category',
      dataIndex: 'size_category',
      key: 'size_category',
      sorter: (a, b) => (a.size_category || '').localeCompare(b.size_category || ''),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => router.push(`/aircraft-types/edit/${record.id}`)} 
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this aircraft type?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Aircraft Types</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => router.push('/aircraft-types/new')}
          >
            Add Aircraft Type
          </Button>
        </div>
        
        <Table 
          dataSource={aircraftTypes} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Layout>
  );
} 