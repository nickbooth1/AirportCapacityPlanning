import React from 'react';
import { 
  Layout, 
  Typography, 
  Card, 
  Space, 
  Button 
} from 'antd';
import {
  SyncOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

/**
 * Simple page to test if icons are working
 */
const TestIconsPage = () => {
  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        <Title level={2}>Icon Test Page</Title>
        
        <Card style={{ marginTop: 16 }}>
          <Paragraph>
            This page tests if various Ant Design icons are working correctly.
          </Paragraph>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Basic Icons:</Title>
              <Space>
                <Button icon={<UserOutlined />} />
                <Button icon={<HomeOutlined />} />
                <Button icon={<SettingOutlined />} />
                <Button icon={<SyncOutlined />}>Sync Icon</Button>
              </Space>
            </div>
            
            <div>
              <Title level={4}>Spinning Icons:</Title>
              <Space>
                <SyncOutlined spin />
                <LoadingOutlined spin />
              </Space>
            </div>
            
            <div>
              <Title level={4}>Colored Icons:</Title>
              <Space>
                <SyncOutlined style={{ color: 'red', fontSize: 24 }} />
                <SyncOutlined style={{ color: 'green', fontSize: 24 }} />
                <SyncOutlined style={{ color: 'blue', fontSize: 24 }} />
              </Space>
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default TestIconsPage;