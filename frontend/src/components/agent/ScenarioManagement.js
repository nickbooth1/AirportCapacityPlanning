import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Popconfirm,
  Modal,
  Select,
  Form,
  Input,
  message,
  Tooltip,
  Drawer,
  Tabs,
  Empty
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  CalculatorOutlined,
  LineChartOutlined,
  CopyOutlined,
  CompareOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import scenarioApi from '../../api/scenarioApi';
import ScenarioVisualization from './ScenarioVisualization';
import WhatIfAnalysis from './WhatIfAnalysis';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

/**
 * Component for Scenario Management
 * Lists and allows management of scenarios
 */
const ScenarioManagement = ({ templates = [] }) => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [comparisonScenario, setComparisonScenario] = useState(null);
  const [selectedScenarioData, setSelectedScenarioData] = useState(null);
  const [comparisonScenarioData, setComparisonScenarioData] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  
  // Load scenarios on mount
  useEffect(() => {
    loadScenarios();
  }, []);
  
  // Load scenario data when selected scenario changes
  useEffect(() => {
    if (selectedScenario) {
      loadScenarioData(selectedScenario);
    } else {
      setSelectedScenarioData(null);
    }
  }, [selectedScenario]);
  
  // Load comparison data when comparison scenario changes
  useEffect(() => {
    if (comparisonScenario) {
      loadScenarioData(comparisonScenario, true);
    } else {
      setComparisonScenarioData(null);
    }
  }, [comparisonScenario]);
  
  // Load scenarios from API
  const loadScenarios = async () => {
    setLoading(true);
    
    try {
      const response = await scenarioApi.listScenarios();
      setScenarios(response.scenarios || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      message.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };
  
  // Load scenario data including calculation results
  const loadScenarioData = async (scenarioId, isComparison = false) => {
    try {
      const scenario = await scenarioApi.getScenario(scenarioId);
      
      // Set data based on whether this is the main scenario or comparison
      if (isComparison) {
        setComparisonScenarioData(scenario);
      } else {
        setSelectedScenarioData(scenario);
      }
    } catch (error) {
      console.error(`Error loading ${isComparison ? 'comparison' : 'scenario'} data:`, error);
      message.error(`Failed to load ${isComparison ? 'comparison' : 'scenario'} data`);
      
      // Reset scenario selection on error
      if (isComparison) {
        setComparisonScenario(null);
      } else {
        setSelectedScenario(null);
      }
    }
  };
  
  // Calculate a scenario
  const calculateScenario = async (scenarioId) => {
    try {
      await scenarioApi.calculateScenario(scenarioId);
      message.success('Calculation started');
      
      // Reload the scenario to get updated status
      setTimeout(() => {
        loadScenarioData(scenarioId, scenarioId === comparisonScenario);
      }, 1000);
    } catch (error) {
      console.error('Error calculating scenario:', error);
      message.error('Failed to start calculation');
    }
  };
  
  // Handle scenario creation
  const handleScenarioCreated = (newScenario) => {
    loadScenarios();
    message.success('Scenario created successfully');
  };
  
  // Handle scenario calculation completion
  const handleScenarioCalculated = (result) => {
    message.success('Scenario calculation completed');
    loadScenarioData(result.scenarioId);
  };
  
  // Handle scenario update
  const handleUpdateScenario = async (values) => {
    if (!selectedScenario) return;
    
    try {
      await scenarioApi.updateScenario(selectedScenario, values);
      message.success('Scenario updated successfully');
      loadScenarios();
      setEditModalVisible(false);
      
      // Reload scenario data
      loadScenarioData(selectedScenario);
    } catch (error) {
      console.error('Error updating scenario:', error);
      message.error('Failed to update scenario');
    }
  };
  
  // Handle scenario deletion
  const handleDeleteScenario = async (scenarioId) => {
    try {
      await scenarioApi.deleteScenario(scenarioId);
      message.success('Scenario deleted');
      
      // Reset selected scenario if it was deleted
      if (selectedScenario === scenarioId) {
        setSelectedScenario(null);
        setDetailsVisible(false);
      }
      
      // Reset comparison scenario if it was deleted
      if (comparisonScenario === scenarioId) {
        setComparisonScenario(null);
      }
      
      loadScenarios();
    } catch (error) {
      console.error('Error deleting scenario:', error);
      message.error('Failed to delete scenario');
    }
  };
  
  // Handle scenario duplication
  const handleDuplicateScenario = async (scenarioId) => {
    try {
      const sourceScenario = scenarios.find(s => s.scenarioId === scenarioId);
      if (!sourceScenario) return;
      
      const newTitle = `Copy of ${sourceScenario.title || sourceScenario.description.substring(0, 30)}`;
      
      const response = await scenarioApi.createScenario({
        title: newTitle,
        description: sourceScenario.description,
        baselineId: sourceScenario.scenarioId
      });
      
      message.success('Scenario duplicated');
      loadScenarios();
    } catch (error) {
      console.error('Error duplicating scenario:', error);
      message.error('Failed to duplicate scenario');
    }
  };
  
  // Handle comparison initiation
  const handleCompare = () => {
    if (selectedRowKeys.length < 1) {
      message.warning('Please select at least one scenario to compare');
      return;
    }
    
    if (selectedRowKeys.length === 1) {
      // Only one scenario selected, open modal to select second
      setCompareModalVisible(true);
    } else {
      // Multiple scenarios selected, use the first two
      setSelectedScenario(selectedRowKeys[0]);
      setComparisonScenario(selectedRowKeys[1]);
      setDetailsVisible(true);
    }
  };
  
  // Handle comparison from scenario details
  const handleRequestCompare = () => {
    setCompareModalVisible(true);
  };
  
  // Show edit modal
  const showEditModal = (scenarioId) => {
    const scenario = scenarios.find(s => s.scenarioId === scenarioId);
    if (!scenario) return;
    
    editForm.setFieldsValue({
      title: scenario.title,
      description: scenario.description
    });
    
    setSelectedScenario(scenarioId);
    setEditModalVisible(true);
  };
  
  // Show scenario details
  const showDetails = (scenarioId) => {
    setSelectedScenario(scenarioId);
    setComparisonScenario(null);
    setDetailsVisible(true);
  };
  
  // Get status tag with appropriate color
  const getStatusTag = (status) => {
    const statusColors = {
      created: 'blue',
      calculating: 'processing',
      calculated: 'success',
      modified: 'warning',
      failed: 'error'
    };
    
    return (
      <Tag color={statusColors[status] || 'default'}>
        {status}
      </Tag>
    );
  };
  
  // Table columns
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => showDetails(record.scenarioId)}>
          {text || record.description.substring(0, 30)}
        </a>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<LineChartOutlined />} 
              size="small"
              onClick={() => showDetails(record.scenarioId)}
            />
          </Tooltip>
          
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => showEditModal(record.scenarioId)}
            />
          </Tooltip>
          
          <Tooltip title="Calculate">
            <Button 
              icon={<CalculatorOutlined />} 
              size="small"
              onClick={() => calculateScenario(record.scenarioId)}
              disabled={record.status === 'calculating'}
            />
          </Tooltip>
          
          <Tooltip title="Duplicate">
            <Button 
              icon={<CopyOutlined />} 
              size="small"
              onClick={() => handleDuplicateScenario(record.scenarioId)}
            />
          </Tooltip>
          
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this scenario?"
              onConfirm={() => handleDeleteScenario(record.scenarioId)}
              okText="Yes"
              cancelText="No"
              icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Card 
        title={<Title level={4}>Scenario Management</Title>}
        extra={
          <Space>
            <Select 
              style={{ width: 140 }} 
              placeholder="Filter by type"
              allowClear
              onChange={(value) => {
                // Filter scenarios by type
              }}
            >
              <Option value="what-if">What-If</Option>
              <Option value="forecast">Forecast</Option>
              <Option value="optimization">Optimization</Option>
              <Option value="manual">Manual</Option>
            </Select>
            
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedScenario(null);
                setComparisonScenario(null);
                setDetailsVisible(true);
              }}
            >
              New Scenario
            </Button>
            
            <Button 
              icon={<CompareOutlined />}
              onClick={handleCompare}
              disabled={selectedRowKeys.length === 0}
            >
              Compare
            </Button>
            
            <Button 
              icon={<SyncOutlined />}
              onClick={loadScenarios}
            />
          </Space>
        }
      >
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            // Max 2 selections for comparison
            getCheckboxProps: (record) => ({
              disabled: selectedRowKeys.length >= 2 && !selectedRowKeys.includes(record.scenarioId)
            })
          }}
          columns={columns}
          dataSource={scenarios.map(s => ({ ...s, key: s.scenarioId }))}
          loading={loading}
        />
      </Card>
      
      {/* Scenario Details Drawer */}
      <Drawer
        title={
          <Space>
            <span>
              {selectedScenarioData?.title || 'Scenario Details'}
            </span>
            {selectedScenarioData && getStatusTag(selectedScenarioData.status)}
          </Space>
        }
        width="80%"
        placement="right"
        onClose={() => setDetailsVisible(false)}
        visible={detailsVisible}
        extra={
          selectedScenarioData && (
            <Space>
              <Button 
                icon={<CalculatorOutlined />} 
                onClick={() => calculateScenario(selectedScenario)}
                disabled={selectedScenarioData.status === 'calculating'}
              >
                Re-calculate
              </Button>
              {comparisonScenario ? (
                <Button 
                  icon={<CompareOutlined />}
                  onClick={() => setComparisonScenario(null)}
                >
                  Clear Comparison
                </Button>
              ) : (
                <Button 
                  icon={<CompareOutlined />}
                  onClick={handleRequestCompare}
                >
                  Compare
                </Button>
              )}
            </Space>
          )
        }
      >
        <Tabs defaultActiveKey={selectedScenarioData ? "view" : "create"}>
          <TabPane 
            tab="View Results" 
            key="view" 
            disabled={!selectedScenarioData}
          >
            {selectedScenarioData ? (
              <>
                {/* Scenario metadata */}
                <Card style={{ marginBottom: 16 }}>
                  <Paragraph>
                    <strong>Description:</strong> {selectedScenarioData.description}
                  </Paragraph>
                  <Space>
                    <Text type="secondary">
                      Created: {new Date(selectedScenarioData.createdAt).toLocaleString()}
                    </Text>
                    <Text type="secondary">
                      Type: {selectedScenarioData.type}
                    </Text>
                    {selectedScenarioData.lastCalculatedAt && (
                      <Text type="secondary">
                        Last Calculated: {new Date(selectedScenarioData.lastCalculatedAt).toLocaleString()}
                      </Text>
                    )}
                  </Space>
                </Card>
                
                {/* Scenario visualization */}
                <ScenarioVisualization 
                  scenarioData={selectedScenarioData.results} 
                  comparisonData={comparisonScenarioData?.results}
                  onRequestCompare={handleRequestCompare}
                  loading={false}
                />
              </>
            ) : (
              <Empty description="Select a scenario to view results" />
            )}
          </TabPane>
          
          <TabPane tab="Create New" key="create">
            <WhatIfAnalysis 
              templates={templates}
              onScenarioCreated={handleScenarioCreated}
              onScenarioCalculated={handleScenarioCalculated}
            />
          </TabPane>
        </Tabs>
      </Drawer>
      
      {/* Compare Modal */}
      <Modal
        title="Compare Scenarios"
        visible={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCompareModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="compare" 
            type="primary" 
            onClick={() => {
              setDetailsVisible(true);
              setCompareModalVisible(false);
            }}
            disabled={!comparisonScenario}
          >
            Compare
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label="Base Scenario" 
            extra="This is your currently selected scenario"
          >
            <Input 
              value={scenarios.find(s => s.scenarioId === selectedScenario)?.title || ''}
              disabled
            />
          </Form.Item>
          
          <Form.Item 
            label="Comparison Scenario"
            required
            extra="Select a scenario to compare against the base scenario"
          >
            <Select
              placeholder="Select a scenario"
              style={{ width: '100%' }}
              value={comparisonScenario}
              onChange={setComparisonScenario}
            >
              {scenarios
                .filter(s => s.scenarioId !== selectedScenario)
                .map(s => (
                  <Option key={s.scenarioId} value={s.scenarioId}>
                    {s.title || s.description.substring(0, 30)} ({s.type})
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title="Edit Scenario"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => editForm.submit()}
        okText="Update"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateScenario}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Enter scenario title" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <TextArea 
              placeholder="Enter scenario description" 
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScenarioManagement;