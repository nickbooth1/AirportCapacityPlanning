import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  Divider, 
  Typography, 
  Space, 
  Radio, 
  Alert,
  Spin
} from 'antd';
import { PlusOutlined, DeleteOutlined, CalculatorOutlined, EditOutlined } from '@ant-design/icons';
import scenarioApi from '../../api/scenarioApi';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Component for What-If Analysis interface
 * Allows users to create, modify and run what-if scenarios
 */
const WhatIfAnalysis = ({ onScenarioCreated, onScenarioCalculated, templates = [] }) => {
  const [form] = Form.useForm();
  const [templateId, setTemplateId] = useState(null);
  const [createMethod, setCreateMethod] = useState('natural');
  const [loading, setLoading] = useState(false);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [parameterFields, setParameterFields] = useState([]);
  
  // Load template options when available
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setCurrentTemplate(template);
        // Reset parameter fields when template changes
        initializeParameterFields(template);
      }
    }
  }, [templateId, templates]);
  
  // Initialize parameter fields based on template
  const initializeParameterFields = (template) => {
    if (!template || !template.requiredParameters) return;
    
    const fields = template.requiredParameters.map(param => ({
      name: param,
      value: template.defaultParameters && template.defaultParameters[param] || null
    }));
    
    setParameterFields(fields);
    
    // Set initial form values
    const initialValues = {};
    fields.forEach(field => {
      initialValues[field.name] = field.value;
    });
    
    form.setFieldsValue({
      ...initialValues,
      title: `New ${template.name} Scenario`,
      description: template.description
    });
  };
  
  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      let response;
      
      // Natural language scenario creation
      if (createMethod === 'natural') {
        response = await scenarioApi.createScenario({
          description: values.description,
          title: values.title || values.description.substring(0, 30)
        });
      } 
      // Structured scenario creation based on template
      else if (createMethod === 'template' && templateId) {
        // Extract parameters from the form
        const parameters = {};
        parameterFields.forEach(field => {
          parameters[field.name] = values[field.name];
        });
        
        response = await scenarioApi.createFromTemplate(templateId, {
          title: values.title,
          description: values.description,
          parameters
        });
      }
      
      if (response && response.scenarioId) {
        // Notify parent component about new scenario
        if (onScenarioCreated) {
          onScenarioCreated(response);
        }
        
        // Auto-calculate scenario if needed
        if (values.autoCalculate) {
          calculateScenario(response.scenarioId);
        }
        
        // Reset form
        form.resetFields();
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
      setErrorMessage(error.message || 'Failed to create scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate scenario results
  const calculateScenario = async (scenarioId) => {
    setCalculationLoading(true);
    
    try {
      const calcResponse = await scenarioApi.calculateScenario(scenarioId, {
        options: {
          timeHorizon: form.getFieldValue('timeHorizon') || 'day'
        }
      });
      
      if (calcResponse && calcResponse.calculationId) {
        // Start polling for calculation results
        pollCalculationStatus(scenarioId, calcResponse.calculationId);
      }
    } catch (error) {
      console.error('Error starting calculation:', error);
      setErrorMessage(error.message || 'Failed to start scenario calculation.');
      setCalculationLoading(false);
    }
  };
  
  // Poll for calculation status
  const pollCalculationStatus = async (scenarioId, calculationId) => {
    try {
      const result = await scenarioApi.getCalculation(scenarioId, calculationId);
      
      if (result.status === 'completed') {
        setCalculationLoading(false);
        
        // Notify parent component about calculated scenario
        if (onScenarioCalculated) {
          onScenarioCalculated({
            scenarioId,
            calculationId,
            results: result.results
          });
        }
      } else if (result.status === 'failed') {
        setCalculationLoading(false);
        setErrorMessage(`Calculation failed: ${result.errorMessage || 'Unknown error'}`);
      } else {
        // Continue polling
        setTimeout(() => {
          pollCalculationStatus(scenarioId, calculationId);
        }, 2000);
      }
    } catch (error) {
      console.error('Error polling calculation status:', error);
      setCalculationLoading(false);
      setErrorMessage('Failed to retrieve calculation status.');
    }
  };
  
  return (
    <Card title="What-If Analysis" bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {errorMessage && (
          <Alert
            message="Error"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage('')}
          />
        )}
        
        <Radio.Group
          value={createMethod}
          onChange={(e) => setCreateMethod(e.target.value)}
          buttonStyle="solid"
          style={{ marginBottom: 16 }}
        >
          <Radio.Button value="natural">Natural Language</Radio.Button>
          <Radio.Button value="template">Use Template</Radio.Button>
        </Radio.Group>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            timeHorizon: 'day',
            autoCalculate: true
          }}
        >
          {/* Natural Language Input */}
          {createMethod === 'natural' && (
            <>
              <Form.Item
                name="description"
                label="What-If Scenario Description"
                rules={[{ required: true, message: 'Please describe your scenario' }]}
              >
                <TextArea
                  placeholder="Describe your scenario in natural language, e.g., 'What if we add 3 more wide-body stands at Terminal 2?'"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Form.Item>
              
              <Form.Item name="title" label="Scenario Title">
                <Input placeholder="Optional title for your scenario" />
              </Form.Item>
            </>
          )}
          
          {/* Template-based Input */}
          {createMethod === 'template' && (
            <>
              <Form.Item
                name="templateId"
                label="Scenario Template"
                rules={[{ required: true, message: 'Please select a template' }]}
              >
                <Select
                  placeholder="Select a scenario template"
                  onChange={(value) => setTemplateId(value)}
                >
                  {templates.map(template => (
                    <Option key={template.id} value={template.id}>
                      {template.name} - {template.category}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              {currentTemplate && (
                <>
                  <Paragraph type="secondary">
                    {currentTemplate.description}
                  </Paragraph>
                  
                  <Form.Item
                    name="title"
                    label="Scenario Title"
                    rules={[{ required: true, message: 'Please enter a title' }]}
                  >
                    <Input placeholder="Enter a title for this scenario" />
                  </Form.Item>
                  
                  <Form.Item
                    name="description"
                    label="Scenario Description"
                    rules={[{ required: true, message: 'Please enter a description' }]}
                  >
                    <TextArea
                      placeholder="Describe the purpose of this scenario"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                  </Form.Item>
                  
                  <Divider orientation="left">Parameters</Divider>
                  
                  {parameterFields.map(field => (
                    <Form.Item
                      key={field.name}
                      name={field.name}
                      label={field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1')}
                      rules={[{ required: currentTemplate.requiredParameters.includes(field.name), message: 'This field is required' }]}
                    >
                      {renderParameterInput(field.name, currentTemplate)}
                    </Form.Item>
                  ))}
                </>
              )}
            </>
          )}
          
          <Divider orientation="left">Calculation Options</Divider>
          
          <Form.Item name="timeHorizon" label="Time Horizon">
            <Select>
              <Option value="day">Day</Option>
              <Option value="week">Week</Option>
              <Option value="month">Month</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="autoCalculate" valuePropName="checked">
            <Radio.Group>
              <Radio value={true}>Auto-calculate after creation</Radio>
              <Radio value={false}>Create without calculating</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Scenario
              </Button>
              <Button type="default" onClick={() => form.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
        
        {calculationLoading && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Spin tip="Calculating scenario results..." />
            <Paragraph style={{ marginTop: 8 }}>
              This may take up to 30 seconds for complex scenarios.
            </Paragraph>
          </div>
        )}
      </Space>
    </Card>
  );
};

// Render an appropriate input based on parameter name and type
const renderParameterInput = (name, template) => {
  // Get schema if available
  const schema = template?.parameterSchema?.properties?.[name];
  
  // Render based on parameter name patterns
  if (name.includes('terminal')) {
    return (
      <Select placeholder="Select terminal">
        <Option value="T1">Terminal 1</Option>
        <Option value="T2">Terminal 2</Option>
        <Option value="T3">Terminal 3</Option>
      </Select>
    );
  }
  
  if (name.includes('count') || name.includes('time') || name.includes('rate')) {
    return <InputNumber min={0} />;
  }
  
  if (name.includes('type')) {
    if (schema?.enum) {
      return (
        <Select placeholder="Select type">
          {schema.enum.map(value => (
            <Option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </Option>
          ))}
        </Select>
      );
    }
    
    return (
      <Select placeholder="Select type">
        <Option value="narrow_body">Narrow Body</Option>
        <Option value="wide_body">Wide Body</Option>
      </Select>
    );
  }
  
  // Boolean parameters
  if (schema?.type === 'boolean') {
    return (
      <Radio.Group>
        <Radio value={true}>Yes</Radio>
        <Radio value={false}>No</Radio>
      </Radio.Group>
    );
  }
  
  // Array parameters
  if (schema?.type === 'array') {
    return <Input placeholder="Comma-separated values" />;
  }
  
  // Default to text input
  return <Input />;
};

export default WhatIfAnalysis;