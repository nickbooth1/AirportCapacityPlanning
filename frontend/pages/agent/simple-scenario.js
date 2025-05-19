import React from 'react';
import Head from 'next/head';
import { Layout, Typography, Card } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

/**
 * Simplified Scenario page to test basic functionality
 */
const SimpleScenarioPage = () => {
  return (
    <>
      <Head>
        <title>Simple Scenarios | AirportAI</title>
      </Head>
      
      <Layout>
        <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
          <Title level={2}>
            <ExperimentOutlined /> Simple Scenario Test
          </Title>
          
          <Paragraph>
            This is a simplified version of the scenario page for testing.
          </Paragraph>
          
          <Card title="Test Card" style={{ marginTop: 16 }}>
            <Paragraph>
              If you can see this card, the basic page rendering is working correctly.
            </Paragraph>
          </Card>
        </Content>
      </Layout>
    </>
  );
};

export default SimpleScenarioPage;