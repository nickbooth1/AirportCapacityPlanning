import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout, Typography, Tabs, Spin, Alert, Button, Space } from 'antd';
import { ExperimentOutlined, LineChartOutlined, MessageOutlined } from '@ant-design/icons';
import ScenarioManagement from '../../src/components/agent/ScenarioManagement';
import WhatIfAnalysis from '../../src/components/agent/WhatIfAnalysis';
import Chat from '../../src/components/agent/Chat';
import scenarioApi from '../../src/api/scenarioApi';

const { Title, Paragraph } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

/**
 * AirportAI Agent Hub page with enhanced what-if analysis
 */
const AgentScenariosPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await scenarioApi.listTemplates();
        setTemplates(response || []);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load scenario templates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, []);
  
  return (
    <>
      <Head>
        <title>What-If Analysis | AirportAI</title>
      </Head>
      
      <Layout>
        <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
          <Title level={2}>
            <ExperimentOutlined /> What-If Analysis
          </Title>
          
          <Paragraph>
            Create, analyze, and compare different scenarios to gain insights into airport capacity planning.
          </Paragraph>
          
          {error && (
            <Alert 
              message="Error" 
              description={error}
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setError(null)}
            />
          )}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <p style={{ marginTop: 16 }}>Loading scenario templates...</p>
            </div>
          ) : (
            <Tabs defaultActiveKey="management" type="card">
              <TabPane 
                tab={<span><LineChartOutlined /> Scenario Management</span>} 
                key="management"
              >
                <ScenarioManagement templates={templates} />
              </TabPane>
              
              <TabPane 
                tab={<span><ExperimentOutlined /> Quick Analysis</span>} 
                key="analysis"
              >
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                  <WhatIfAnalysis templates={templates} />
                </div>
              </TabPane>
              
              <TabPane 
                tab={<span><MessageOutlined /> AI Assistant</span>} 
                key="assistant"
              >
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                  <Chat 
                    placeholderText="Ask me to analyze a what-if scenario or compare capacity impacts..."
                    initialContext={{
                      intent: 'what_if_analysis',
                      entities: {}
                    }}
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
                      <Button type="link" size="small">
                        Can you forecast our capacity needs for the next 5 years with 3% annual growth?
                      </Button>
                    </Space>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          )}
        </Content>
      </Layout>
    </>
  );
};

export default AgentScenariosPage;