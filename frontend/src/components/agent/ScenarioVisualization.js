import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tabs, 
  Button, 
  Select, 
  Space, 
  Tooltip,
  Typography,
  Divider,
  Empty,
  Alert,
  Spin,
  Statistic
} from 'antd';
import { 
  BarChartOutlined, 
  LineChartOutlined, 
  PieChartOutlined,
  TableOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  SyncOutlined,
  CompareOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import Chart from 'chart.js/auto';
import scenarioApi from '../../api/scenarioApi';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * Component for Scenario Visualization and Comparison
 * Displays charts and data for scenario results
 */
const ScenarioVisualization = ({ 
  scenarioData, 
  comparisonData = null,
  onRequestCompare,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('capacity');
  const [chartType, setChartType] = useState('bar');
  const [metric, setMetric] = useState('total');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Chart references
  const capacityChartRef = useRef(null);
  const utilizationChartRef = useRef(null);
  const hourlyChartRef = useRef(null);
  
  // Chart instances
  const [capacityChart, setCapacityChart] = useState(null);
  const [utilizationChart, setUtilizationChart] = useState(null);
  const [hourlyChart, setHourlyChart] = useState(null);

  // Generate or update charts when data changes
  useEffect(() => {
    if (scenarioData) {
      renderCapacityChart();
      renderUtilizationChart();
      renderHourlyChart();
    }
    
    // Cleanup charts on unmount
    return () => {
      if (capacityChart) capacityChart.destroy();
      if (utilizationChart) utilizationChart.destroy();
      if (hourlyChart) hourlyChart.destroy();
    };
  }, [scenarioData, comparisonData, chartType, metric]);

  // Render capacity bar/pie chart
  const renderCapacityChart = () => {
    if (!capacityChartRef.current || !scenarioData?.capacity) return;
    
    // Destroy existing chart
    if (capacityChart) capacityChart.destroy();
    
    // Prepare chart data
    const labels = ['Narrow Body', 'Wide Body', 'Total'];
    const primaryData = [
      scenarioData.capacity.narrowBodyCapacity || 0,
      scenarioData.capacity.wideBodyCapacity || 0,
      scenarioData.capacity.totalCapacity || 0
    ];
    
    // Add comparison data if available
    let comparisonDataset = null;
    if (comparisonData?.capacity) {
      comparisonDataset = {
        label: 'Comparison Scenario',
        data: [
          comparisonData.capacity.narrowBodyCapacity || 0,
          comparisonData.capacity.wideBodyCapacity || 0,
          comparisonData.capacity.totalCapacity || 0
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      };
    }
    
    // Create dataset based on chart type
    const datasets = [
      {
        label: 'Current Scenario',
        data: primaryData,
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ];
    
    // Add comparison dataset if available
    if (comparisonDataset) {
      datasets.push(comparisonDataset);
    }
    
    // Create chart
    const newChart = new Chart(capacityChartRef.current, {
      type: chartType === 'pie' ? 'pie' : 'bar',
      data: {
        labels,
        datasets: chartType === 'pie' ? [datasets[0]] : datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Stand Capacity'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          },
          legend: {
            position: 'top',
            display: chartType !== 'pie' || !comparisonDataset
          }
        },
        scales: chartType === 'pie' ? undefined : {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Flights'
            }
          }
        }
      }
    });
    
    setCapacityChart(newChart);
  };
  
  // Render utilization chart
  const renderUtilizationChart = () => {
    if (!utilizationChartRef.current || !scenarioData?.utilizationMetrics) return;
    
    // Destroy existing chart
    if (utilizationChart) utilizationChart.destroy();
    
    // Prepare utilization data
    const utilizationData = {
      labels: ['Overall', 'Peak', 'Off-Peak'],
      datasets: [
        {
          label: 'Current Scenario',
          data: [
            scenarioData.utilizationMetrics.overallUtilization || 0,
            scenarioData.utilizationMetrics.peakUtilization || 0,
            scenarioData.utilizationMetrics.offPeakUtilization || 0
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    };
    
    // Add comparison data if available
    if (comparisonData?.utilizationMetrics) {
      utilizationData.datasets.push({
        label: 'Comparison Scenario',
        data: [
          comparisonData.utilizationMetrics.overallUtilization || 0,
          comparisonData.utilizationMetrics.peakUtilization || 0,
          comparisonData.utilizationMetrics.offPeakUtilization || 0
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      });
    }
    
    // Create chart
    const newChart = new Chart(utilizationChartRef.current, {
      type: 'bar',
      data: utilizationData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Stand Utilization'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += (context.parsed.y * 100).toFixed(1) + '%';
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: {
              callback: function(value) {
                return (value * 100).toFixed(0) + '%';
              }
            },
            title: {
              display: true,
              text: 'Utilization Rate'
            }
          }
        }
      }
    });
    
    setUtilizationChart(newChart);
  };
  
  // Render hourly capacity chart
  const renderHourlyChart = () => {
    if (!hourlyChartRef.current || !scenarioData?.capacityByHour) return;
    
    // Destroy existing chart
    if (hourlyChart) hourlyChart.destroy();
    
    // Extract data for the selected metric
    const hours = scenarioData.capacityByHour.map(h => `${h.hour}:00`);
    const primaryData = scenarioData.capacityByHour.map(h => {
      if (metric === 'narrow') return h.narrowBodyCapacity || 0;
      if (metric === 'wide') return h.wideBodyCapacity || 0;
      if (metric === 'utilization') return h.utilization || 0;
      return h.totalCapacity || 0; // default to total
    });
    
    // Prepare datasets
    const datasets = [
      {
        label: getMetricLabel(metric),
        data: primaryData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }
    ];
    
    // Add comparison data if available
    if (comparisonData?.capacityByHour) {
      const comparisonValues = comparisonData.capacityByHour.map(h => {
        if (metric === 'narrow') return h.narrowBodyCapacity || 0;
        if (metric === 'wide') return h.wideBodyCapacity || 0;
        if (metric === 'utilization') return h.utilization || 0;
        return h.totalCapacity || 0;
      });
      
      datasets.push({
        label: `Comparison ${getMetricLabel(metric)}`,
        data: comparisonValues,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: true
      });
    }
    
    // Create chart
    const newChart = new Chart(hourlyChartRef.current, {
      type: 'line',
      data: {
        labels: hours,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Hourly ${getMetricLabel(metric)}`
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (metric === 'utilization') {
                    label += (context.parsed.y * 100).toFixed(1) + '%';
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metric === 'utilization' ? 'Utilization Rate' : 'Number of Flights'
            },
            ticks: {
              callback: function(value) {
                if (metric === 'utilization') {
                  return (value * 100).toFixed(0) + '%';
                }
                return value;
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Hour of Day'
            }
          }
        }
      }
    });
    
    setHourlyChart(newChart);
  };
  
  // Helper to get metric label
  const getMetricLabel = (metricKey) => {
    const labels = {
      total: 'Total Capacity',
      narrow: 'Narrow Body Capacity',
      wide: 'Wide Body Capacity',
      utilization: 'Stand Utilization'
    };
    return labels[metricKey] || 'Capacity';
  };
  
  // Handler for chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };
  
  // Handler for metric change
  const handleMetricChange = (value) => {
    setMetric(value);
  };
  
  // Export chart as image
  const handleExport = (chartRef) => {
    if (!chartRef.current) return;
    
    const link = document.createElement('a');
    link.download = `scenario-chart-${Date.now()}.png`;
    link.href = chartRef.current.toDataURL('image/png');
    link.click();
  };
  
  // No data state
  if (!scenarioData && !loading) {
    return (
      <Card>
        <Empty description="No scenario data available" />
      </Card>
    );
  }
  
  return (
    <Card loading={loading}>
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
        
        {/* Title with info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>
            Scenario Results
            {comparisonData && <Text type="secondary" style={{ marginLeft: 8 }}>(Comparison Active)</Text>}
          </Title>
          
          <Space>
            {!comparisonData && (
              <Button 
                icon={<CompareOutlined />} 
                onClick={onRequestCompare}
              >
                Compare
              </Button>
            )}
            
            <Tooltip title="Refresh Results">
              <Button 
                icon={<SyncOutlined />} 
                onClick={() => {
                  if (scenarioData?.scenarioId) {
                    // Reload scenario data
                  }
                }}
              />
            </Tooltip>
          </Space>
        </div>
        
        {scenarioData && (
          <Paragraph>
            <InfoCircleOutlined /> {scenarioData.impactSummary || 'Scenario analysis complete.'}
          </Paragraph>
        )}
        
        {/* Main visualization tabs */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane 
            tab={<span><BarChartOutlined /> Capacity</span>} 
            key="capacity"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card 
                  title="Stand Capacity" 
                  extra={
                    <Space>
                      <Button.Group>
                        <Button 
                          type={chartType === 'bar' ? 'primary' : 'default'} 
                          icon={<BarChartOutlined />} 
                          onClick={() => handleChartTypeChange('bar')}
                        />
                        <Button 
                          type={chartType === 'pie' ? 'primary' : 'default'} 
                          icon={<PieChartOutlined />} 
                          onClick={() => handleChartTypeChange('pie')}
                        />
                      </Button.Group>
                      <Button 
                        icon={<DownloadOutlined />} 
                        onClick={() => handleExport(capacityChartRef)}
                      />
                    </Space>
                  }
                >
                  <div style={{ height: 300 }}>
                    <canvas ref={capacityChartRef} />
                  </div>
                  
                  {comparisonData && (
                    <div style={{ marginTop: 16 }}>
                      <Divider>Comparison</Divider>
                      <Row gutter={[16, 16]}>
                        <Col span={8}>
                          <Statistic 
                            title="Narrow Body Difference" 
                            value={comparisonData.comparison?.capacityDelta?.narrowBody || 0}
                            suffix="flights"
                            valueStyle={{ 
                              color: (comparisonData.comparison?.capacityDelta?.narrowBody || 0) >= 0 ? '#3f8600' : '#cf1322'
                            }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="Wide Body Difference" 
                            value={comparisonData.comparison?.capacityDelta?.wideBody || 0}
                            suffix="flights"
                            valueStyle={{ 
                              color: (comparisonData.comparison?.capacityDelta?.wideBody || 0) >= 0 ? '#3f8600' : '#cf1322'
                            }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="Total Difference" 
                            value={comparisonData.comparison?.capacityDelta?.total || 0}
                            suffix="flights"
                            valueStyle={{ 
                              color: (comparisonData.comparison?.capacityDelta?.total || 0) >= 0 ? '#3f8600' : '#cf1322'
                            }}
                          />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card 
                  title="Utilization Metrics" 
                  extra={
                    <Button 
                      icon={<DownloadOutlined />} 
                      onClick={() => handleExport(utilizationChartRef)}
                    />
                  }
                >
                  <div style={{ height: 300 }}>
                    <canvas ref={utilizationChartRef} />
                  </div>
                  
                  {comparisonData && (
                    <div style={{ marginTop: 16 }}>
                      <Divider>Utilization Difference</Divider>
                      <Statistic 
                        title="Overall Utilization Change" 
                        value={(comparisonData.comparison?.utilizationDelta || 0) * 100}
                        precision={1}
                        suffix="%"
                        valueStyle={{ 
                          color: (comparisonData.comparison?.utilizationDelta || 0) >= 0 ? '#3f8600' : '#cf1322'
                        }}
                      />
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane 
            tab={<span><LineChartOutlined /> Hourly Analysis</span>} 
            key="hourly"
          >
            <Card
              title="Hourly Capacity Analysis"
              extra={
                <Space>
                  <Select
                    value={metric}
                    onChange={handleMetricChange}
                    style={{ width: 150 }}
                  >
                    <Option value="total">Total Capacity</Option>
                    <Option value="narrow">Narrow Body</Option>
                    <Option value="wide">Wide Body</Option>
                    <Option value="utilization">Utilization</Option>
                  </Select>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={() => handleExport(hourlyChartRef)}
                  />
                </Space>
              }
            >
              <div style={{ height: 400 }}>
                <canvas ref={hourlyChartRef} />
              </div>
              
              {scenarioData?.capacityByHour && (
                <div style={{ marginTop: 16 }}>
                  <Divider>Key Insights</Divider>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic 
                          title="Peak Hour" 
                          value={scenarioData.utilizationMetrics?.peakTime || 'N/A'}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic 
                          title="Max Hourly Capacity" 
                          value={Math.max(...scenarioData.capacityByHour.map(h => h.totalCapacity || 0))}
                          suffix="flights"
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic 
                          title="Peak Utilization" 
                          value={(scenarioData.utilizationMetrics?.peakUtilization || 0) * 100}
                          precision={1}
                          suffix="%"
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
            </Card>
          </TabPane>
          
          <TabPane 
            tab={<span><TableOutlined /> Data Table</span>} 
            key="data"
          >
            <Card title="Scenario Data">
              {/* Summary data table will go here */}
              <p>Data table view is under development</p>
            </Card>
          </TabPane>
        </Tabs>
      </Space>
    </Card>
  );
};

export default ScenarioVisualization;