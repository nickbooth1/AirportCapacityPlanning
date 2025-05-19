import React from 'react';
import Head from 'next/head';
import { Layout, Typography, Tabs, Alert, Button, Space } from 'antd';
import { ExperimentOutlined, LineChartOutlined, MessageOutlined } from '@ant-design/icons';
import SimpleChat from '../../src/components/agent/SimpleChat';

const { Title, Paragraph } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

/**
 * Test Scenario page with simplified components that don't require API calls
 */
const TestScenariosPage = () => {
  return (
    <>
      <Head>
        <title>Test Scenarios | AirportAI</title>
      </Head>
      
      <Layout>
        <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
          <Title level={2}>
            <ExperimentOutlined /> Test Scenarios
          </Title>
          
          <Paragraph>
            This is a test page with simplified components that don't require API connections.
          </Paragraph>
          
          <Tabs defaultActiveKey="assistant" type="card">
            <TabPane 
              tab={<span><MessageOutlined /> AI Assistant</span>} 
              key="assistant"
            >
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <SimpleChat 
                  placeholderText="Type a message to test the chat component..."
                />
                
                <div style={{ marginTop: 24 }}>
                  <Title level={4}>Example Questions</Title>
                  <Space direction="vertical">
                    <Button type="link" size="small">
                      What if we add 5 more narrow body stands to Terminal 2?
                    </Button>
                    <Button type="link" size="small">
                      How would reducing turnaround times by 10 minutes affect our capacity?
                    </Button>
                    <Button type="link" size="small">
                      What if we implement stricter adjacency rules for wide-body aircraft?
                    </Button>
                  </Space>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </Content>
      </Layout>
    </>
  );
};

export default TestScenariosPage;