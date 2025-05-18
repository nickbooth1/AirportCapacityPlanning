import React, { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Switch,
  Radio,
  Select,
  Button,
  Tabs,
  Input,
  Divider,
  Space,
  notification,
  Spin,
  Alert
} from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  SettingOutlined,
  BellOutlined,
  LineChartOutlined,
  LayoutOutlined,
  CodeOutlined
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import { useUserPreferences } from '../../src/contexts/UserPreferencesContext';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * User Preferences Page
 * 
 * Allow users to customize their experience with the AirportAI agent
 */
const PreferencesPage = () => {
  const { 
    preferences, 
    loading, 
    error, 
    updatePreferences, 
    resetPreferences 
  } = useUserPreferences();
  
  const [activeTab, setActiveTab] = useState('appearance');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Form to track changes
  const [form] = Form.useForm();
  
  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      await updatePreferences(values);
      notification.success({
        message: 'Preferences Updated',
        description: 'Your preferences have been saved successfully.'
      });
    } catch (err) {
      notification.error({
        message: 'Update Failed',
        description: 'Failed to update preferences. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle reset
  const handleReset = async () => {
    try {
      setResetting(true);
      await resetPreferences();
      form.resetFields();
      notification.success({
        message: 'Preferences Reset',
        description: 'Your preferences have been reset to default values.'
      });
    } catch (err) {
      notification.error({
        message: 'Reset Failed',
        description: 'Failed to reset preferences. Please try again.'
      });
    } finally {
      setResetting(false);
    }
  };
  
  if (loading) {
    return (
      <Layout title="User Preferences">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Loading your preferences..." />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="User Preferences">
      <Card>
        <Title level={2}>
          <Space>
            <SettingOutlined />
            User Preferences
          </Space>
        </Title>
        
        <Paragraph>
          Customize your experience with the AirportAI agent by setting your preferences.
          These settings will be remembered across sessions.
        </Paragraph>
        
        {error && (
          <Alert
            message="Error Loading Preferences"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          initialValues={preferences}
          onFinish={handleSubmit}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  <SettingOutlined />
                  Appearance
                </span>
              }
              key="appearance"
            >
              <Form.Item
                name="theme"
                label="Theme"
              >
                <Radio.Group>
                  <Radio.Button value="light">Light</Radio.Button>
                  <Radio.Button value="dark">Dark</Radio.Button>
                  <Radio.Button value="system">System Default</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <BellOutlined />
                  Notifications
                </span>
              }
              key="notifications"
            >
              <Form.Item
                name="notificationEnabled"
                label="Enable Notifications"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <LineChartOutlined />
                  Data Display
                </span>
              }
              key="data"
            >
              <Form.Item
                name="defaultAirport"
                label="Default Airport"
              >
                <Select placeholder="Select default airport">
                  <Option value="ARN">Stockholm Arlanda</Option>
                  <Option value="CPH">Copenhagen Airport</Option>
                  <Option value="OSL">Oslo Airport</Option>
                  <Option value="HEL">Helsinki Airport</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="defaultTimeHorizon"
                label="Default Time Horizon"
              >
                <Select>
                  <Option value="day">Day</Option>
                  <Option value="week">Week</Option>
                  <Option value="month">Month</Option>
                  <Option value="quarter">Quarter</Option>
                  <Option value="year">Year</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="dataPresentation"
                label="Preferred Data Presentation"
              >
                <Radio.Group>
                  <Radio.Button value="table">Table</Radio.Button>
                  <Radio.Button value="chart">Chart</Radio.Button>
                  <Radio.Button value="map">Map</Radio.Button>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item
                name="autoRefreshInterval"
                label="Auto-refresh Interval (seconds)"
              >
                <Select>
                  <Option value={0}>Off</Option>
                  <Option value={30}>30 seconds</Option>
                  <Option value={60}>1 minute</Option>
                  <Option value={300}>5 minutes</Option>
                  <Option value={600}>10 minutes</Option>
                </Select>
              </Form.Item>
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <LayoutOutlined />
                  Dashboard
                </span>
              }
              key="dashboard"
            >
              <Alert
                message="Dashboard Preferences"
                description="Dashboard preferences are set individually for each dashboard. Visit the dashboard page to customize your dashboard layouts."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </TabPane>
            
            <TabPane
              tab={
                <span>
                  <CodeOutlined />
                  Advanced
                </span>
              }
              key="advanced"
            >
              <Form.Item
                name="advancedMode"
                label="Advanced Mode"
                valuePropName="checked"
                help="Shows additional technical details and advanced options throughout the application."
              >
                <Switch />
              </Form.Item>
            </TabPane>
          </Tabs>
          
          <Divider />
          
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                Save Preferences
              </Button>
              
              <Button
                danger
                icon={<UndoOutlined />}
                onClick={handleReset}
                loading={resetting}
              >
                Reset to Defaults
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
};

export default PreferencesPage;