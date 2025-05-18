/**
 * ComparativeCapacityChart.jsx
 * 
 * React component for comparing capacity metrics between scenarios
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Select, Spin, Typography, Space, Tooltip, Button, Alert } from 'antd';
import { BarChartOutlined, LineChartOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const { Title: TitleText } = Typography;
const { Option } = Select;

/**
 * Component for comparing capacity metrics between scenarios
 * 
 * @param {Object} props - Component props
 * @param {Array} props.scenarios - Array of scenario objects to compare
 * @param {Array} props.metrics - Array of metric definitions
 * @param {Function} props.onParameterChange - Callback when user adjusts parameters
 * @param {Function} props.onExport - Callback for exporting visualization
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */
const ComparativeCapacityChart = ({
  scenarios = [],
  metrics = [],
  onParameterChange,
  onExport,
  loading = false,
  error = null
}) => {
  // State for the component
  const [chartType, setChartType] = useState('bar');
  const [primaryMetric, setPrimaryMetric] = useState(metrics[0]?.id || 'total_capacity');
  const [secondaryMetric, setSecondaryMetric] = useState(metrics[1]?.id || 'utilization');
  const [groupBy, setGroupBy] = useState('hour');
  const [showDifference, setShowDifference] = useState(false);
  
  // Get available metrics for selection
  const availableMetrics = useMemo(() => {
    return metrics.map(metric => ({
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      description: metric.description
    }));
  }, [metrics]);
  
  // Prepare chart data based on scenarios and selected metrics
  const chartData = useMemo(() => {
    if (!scenarios.length) return null;
    
    // Find metric definitions
    const metric1 = metrics.find(m => m.id === primaryMetric);
    const metric2 = metrics.find(m => m.id === secondaryMetric);
    
    // Generate labels based on groupBy
    let labels = [];
    switch(groupBy) {
      case 'hour':
        labels = Array.from({length: 24}, (_, i) => `${i}:00`);
        break;
      case 'day':
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'terminal':
        // Extract unique terminals from all scenarios
        const terminalSet = new Set();
        scenarios.forEach(scenario => {
          Object.keys(scenario.results?.byTerminal || {}).forEach(terminal => {
            terminalSet.add(terminal);
          });
        });
        labels = Array.from(terminalSet);
        break;
      case 'stand_type':
        labels = ['Narrow Body', 'Wide Body', 'Total'];
        break;
      default:
        labels = ['Total'];
    }
    
    // Create datasets
    const datasets = [];
    
    // Primary metric dataset(s)
    scenarios.forEach((scenario, index) => {
      // Primary metric data 
      const primaryData = extractMetricData(scenario, primaryMetric, groupBy, labels);
      
      datasets.push({
        label: `${scenario.title || `Scenario ${index + 1}`} - ${metric1?.name || primaryMetric}`,
        data: primaryData,
        backgroundColor: getScenarioColor(index, 0.7),
        borderColor: getScenarioColor(index, 1),
        borderWidth: 1,
        yAxisID: 'y'
      });
      
      // If showing differences and we have a baseline scenario
      if (showDifference && index > 0) {
        const baselineData = extractMetricData(scenarios[0], primaryMetric, groupBy, labels);
        const diffData = primaryData.map((value, i) => 
          baselineData[i] !== null ? value - baselineData[i] : null
        );
        
        datasets.push({
          label: `Diff: ${scenario.title || `Scenario ${index + 1}`} vs Baseline`,
          data: diffData,
          type: 'line',
          backgroundColor: getScenarioColor(index, 0.3),
          borderColor: getScenarioColor(index, 1),
          borderDashed: [5, 5],
          pointRadius: 4,
          yAxisID: 'y'
        });
      }
    });
    
    // Add secondary metric dataset if different from primary
    if (secondaryMetric !== primaryMetric) {
      scenarios.forEach((scenario, index) => {
        const secondaryData = extractMetricData(scenario, secondaryMetric, groupBy, labels);
        
        datasets.push({
          label: `${scenario.title || `Scenario ${index + 1}`} - ${metric2?.name || secondaryMetric}`,
          data: secondaryData,
          type: 'line',
          backgroundColor: 'transparent',
          borderColor: getScenarioColor(index, 1, true), // Darker variation
          borderWidth: 2,
          pointRadius: 3,
          yAxisID: 'y1'
        });
      });
    }
    
    return {
      labels,
      datasets
    };
  }, [scenarios, primaryMetric, secondaryMetric, groupBy, showDifference, metrics]);
  
  // Chart options configuration
  const chartOptions = useMemo(() => {
    const primaryMetricObj = metrics.find(m => m.id === primaryMetric);
    const secondaryMetricObj = metrics.find(m => m.id === secondaryMetric);
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.raw !== null ? context.raw : 'N/A';
              
              // Add unit based on metric
              let unit = '';
              if (context.dataset.yAxisID === 'y') {
                unit = primaryMetricObj?.unit || '';
              } else if (context.dataset.yAxisID === 'y1') {
                unit = secondaryMetricObj?.unit || '';
              }
              
              return `${label}: ${value}${unit ? ' ' + unit : ''}`;
            }
          }
        },
        datalabels: {
          display: false // Disable for cleaner look, enable selectively if needed
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: getGroupByLabel(groupBy)
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: `${primaryMetricObj?.name || primaryMetric}${primaryMetricObj?.unit ? ' (' + primaryMetricObj.unit + ')' : ''}`
          }
        },
        y1: {
          type: 'linear',
          display: secondaryMetric !== primaryMetric,
          position: 'right',
          title: {
            display: true,
            text: `${secondaryMetricObj?.name || secondaryMetric}${secondaryMetricObj?.unit ? ' (' + secondaryMetricObj.unit + ')' : ''}`
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    };
  }, [metrics, primaryMetric, secondaryMetric, groupBy]);
  
  // Chart component based on selected type
  const chartComponent = useMemo(() => {
    if (!chartData) return (
      <div className="empty-chart" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#999'
      }}>
        <Space direction="vertical" align="center">
          <InfoCircleOutlined style={{ fontSize: 48 }} />
          <span>No data available for visualization</span>
        </Space>
      </div>
    );
    
    switch(chartType) {
      case 'bar':
        return <Bar data={chartData} options={chartOptions} height={400} />;
      case 'line':
        return <Line data={chartData} options={chartOptions} height={400} />;
      default:
        return <Bar data={chartData} options={chartOptions} height={400} />;
    }
  }, [chartData, chartOptions, chartType]);
  
  // Handle parameter changes
  const handleParameterChange = (parameter, value) => {
    switch(parameter) {
      case 'chartType':
        setChartType(value);
        break;
      case 'primaryMetric':
        setPrimaryMetric(value);
        if (value === secondaryMetric) {
          // Find a different secondary metric
          const differentMetric = metrics.find(m => m.id !== value)?.id;
          if (differentMetric) setSecondaryMetric(differentMetric);
        }
        break;
      case 'secondaryMetric':
        setSecondaryMetric(value);
        break;
      case 'groupBy':
        setGroupBy(value);
        break;
      case 'showDifference':
        setShowDifference(value);
        break;
      default:
        break;
    }
    
    // Notify parent component
    if (onParameterChange) {
      onParameterChange(parameter, value);
    }
  };
  
  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport({
        type: chartType,
        data: chartData,
        options: chartOptions,
        parameters: {
          primaryMetric,
          secondaryMetric,
          groupBy,
          showDifference
        }
      });
    }
  };
  
  return (
    <Card className="comparative-capacity-chart">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TitleText level={4} style={{ margin: 0 }}>Comparative Capacity Analysis</TitleText>
          
          {/* Export button */}
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            type="default"
            disabled={!chartData || loading}
          >
            Export
          </Button>
        </div>
        
        {/* Chart controls */}
        <div className="chart-controls">
          <Space wrap>
            <Select 
              value={chartType} 
              onChange={value => handleParameterChange('chartType', value)}
              style={{ width: 120 }}
              disabled={loading}
            >
              <Option value="bar"><BarChartOutlined /> Bar Chart</Option>
              <Option value="line"><LineChartOutlined /> Line Chart</Option>
            </Select>
            
            <Select 
              value={primaryMetric} 
              onChange={value => handleParameterChange('primaryMetric', value)}
              style={{ width: 180 }}
              placeholder="Primary Metric"
              disabled={loading || !availableMetrics.length}
            >
              {availableMetrics.map(metric => (
                <Option key={metric.id} value={metric.id}>
                  <Tooltip title={metric.description}>
                    {metric.name} {metric.unit ? `(${metric.unit})` : ''}
                  </Tooltip>
                </Option>
              ))}
            </Select>
            
            <Select 
              value={secondaryMetric} 
              onChange={value => handleParameterChange('secondaryMetric', value)}
              style={{ width: 180 }}
              placeholder="Secondary Metric"
              disabled={loading || !availableMetrics.length}
            >
              {availableMetrics.map(metric => (
                <Option key={metric.id} value={metric.id}>
                  <Tooltip title={metric.description}>
                    {metric.name} {metric.unit ? `(${metric.unit})` : ''}
                  </Tooltip>
                </Option>
              ))}
            </Select>
            
            <Select 
              value={groupBy} 
              onChange={value => handleParameterChange('groupBy', value)}
              style={{ width: 150 }}
              placeholder="Group By"
              disabled={loading}
            >
              <Option value="hour">Hour of Day</Option>
              <Option value="day">Day of Week</Option>
              <Option value="terminal">Terminal</Option>
              <Option value="stand_type">Stand Type</Option>
              <Option value="total">Total Only</Option>
            </Select>
            
            <Tooltip title="Show difference vs baseline scenario">
              <Button 
                type={showDifference ? 'primary' : 'default'}
                onClick={() => handleParameterChange('showDifference', !showDifference)}
                disabled={scenarios.length < 2 || loading}
              >
                Show Difference
              </Button>
            </Tooltip>
          </Space>
        </div>
        
        {/* Error message */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}
        
        {/* Chart display */}
        <div className="chart-container" style={{ 
          height: 400, 
          position: 'relative',
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '8px'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%' 
            }}>
              <Spin size="large" tip="Loading capacity data..." />
            </div>
          ) : (
            chartComponent
          )}
        </div>
        
        {/* Key insights */}
        {scenarios.length > 1 && !loading && !error && (
          <div className="key-insights">
            <TitleText level={5}>Key Insights</TitleText>
            <ul>
              {generateInsights(scenarios, primaryMetric, secondaryMetric, groupBy).map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </Space>
    </Card>
  );
};

// PropTypes definition
ComparativeCapacityChart.propTypes = {
  scenarios: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    results: PropTypes.object
  })),
  metrics: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    unit: PropTypes.string,
    description: PropTypes.string
  })),
  onParameterChange: PropTypes.func,
  onExport: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string
};

// Helper functions

/**
 * Extract metric data from a scenario
 * @param {Object} scenario - Scenario object
 * @param {string} metricId - Metric identifier
 * @param {string} groupBy - Grouping criteria
 * @param {Array} labels - Labels to match
 * @returns {Array} - Array of metric values
 */
function extractMetricData(scenario, metricId, groupBy, labels) {
  const results = scenario.results || {};
  
  switch(groupBy) {
    case 'hour':
      return labels.map(hour => {
        const hourNum = parseInt(hour);
        return results.byHour && results.byHour[hourNum] && results.byHour[hourNum][metricId] !== undefined
          ? results.byHour[hourNum][metricId]
          : null;
      });
      
    case 'day':
      const dayMap = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0
      };
      return labels.map(day => {
        const dayNum = dayMap[day];
        return results.byDay && results.byDay[dayNum] && results.byDay[dayNum][metricId] !== undefined
          ? results.byDay[dayNum][metricId]
          : null;
      });
      
    case 'terminal':
      return labels.map(terminal => {
        return results.byTerminal && results.byTerminal[terminal] && results.byTerminal[terminal][metricId] !== undefined
          ? results.byTerminal[terminal][metricId]
          : null;
      });
      
    case 'stand_type':
      const standTypeMap = {
        'Narrow Body': 'narrowBody',
        'Wide Body': 'wideBody',
        'Total': 'total'
      };
      return labels.map(type => {
        const key = standTypeMap[type];
        return results.byStandType && results.byStandType[key] && results.byStandType[key][metricId] !== undefined
          ? results.byStandType[key][metricId]
          : null;
      });
      
    default:
      return [results.total && results.total[metricId] !== undefined ? results.total[metricId] : null];
  }
}

/**
 * Get a color for a scenario visualization
 * @param {number} index - Scenario index
 * @param {number} opacity - Color opacity
 * @param {boolean} isDark - Whether to use a darker shade
 * @returns {string} - Color string
 */
function getScenarioColor(index, opacity = 1, isDark = false) {
  const colors = [
    { light: '26, 111, 223', dark: '20, 85, 170' },  // blue
    { light: '230, 105, 115', dark: '180, 60, 70' }, // red
    { light: '83, 166, 120', dark: '55, 120, 85' },  // green
    { light: '146, 84, 222', dark: '100, 60, 170' }, // purple
    { light: '228, 153, 58', dark: '180, 120, 40' }, // orange
    { light: '68, 158, 188', dark: '40, 120, 150' }  // teal
  ];
  
  const colorSet = colors[index % colors.length];
  const rgbValues = isDark ? colorSet.dark : colorSet.light;
  
  return `rgba(${rgbValues}, ${opacity})`;
}

/**
 * Get a label for the grouping criteria
 * @param {string} groupBy - Grouping criteria
 * @returns {string} - Display label
 */
function getGroupByLabel(groupBy) {
  switch(groupBy) {
    case 'hour': return 'Hour of Day';
    case 'day': return 'Day of Week';
    case 'terminal': return 'Terminal';
    case 'stand_type': return 'Stand Type';
    default: return '';
  }
}

/**
 * Generate insights based on scenario comparisons
 * @param {Array} scenarios - Scenarios to compare
 * @param {string} primaryMetric - Primary metric ID
 * @param {string} secondaryMetric - Secondary metric ID
 * @param {string} groupBy - Grouping criteria
 * @returns {Array} - Array of insight strings
 */
function generateInsights(scenarios, primaryMetric, secondaryMetric, groupBy) {
  if (scenarios.length < 2) return [];
  
  const insights = [];
  const baseline = scenarios[0];
  const comparison = scenarios[1];
  
  // Compare totals for primary metric
  if (baseline.results?.total?.[primaryMetric] !== undefined && 
      comparison.results?.total?.[primaryMetric] !== undefined) {
    
    const baselineValue = baseline.results.total[primaryMetric];
    const comparisonValue = comparison.results.total[primaryMetric];
    const diff = comparisonValue - baselineValue;
    const percentDiff = (diff / baselineValue) * 100;
    
    const direction = diff > 0 ? 'increase' : 'decrease';
    
    insights.push(
      `${comparison.title || 'Comparison scenario'} shows a ${Math.abs(percentDiff).toFixed(1)}% ${direction} in overall ${primaryMetric} compared to ${baseline.title || 'baseline'}.`
    );
  }
  
  // Find peak values
  if (groupBy === 'hour' && baseline.results?.byHour && comparison.results?.byHour) {
    let baselinePeak = 0;
    let baselinePeakHour = null;
    let comparisonPeak = 0;
    let comparisonPeakHour = null;
    
    for (let i = 0; i < 24; i++) {
      if (baseline.results.byHour[i]?.[primaryMetric] > baselinePeak) {
        baselinePeak = baseline.results.byHour[i][primaryMetric];
        baselinePeakHour = i;
      }
      
      if (comparison.results.byHour[i]?.[primaryMetric] > comparisonPeak) {
        comparisonPeak = comparison.results.byHour[i][primaryMetric];
        comparisonPeakHour = i;
      }
    }
    
    if (baselinePeakHour !== null && comparisonPeakHour !== null) {
      if (baselinePeakHour !== comparisonPeakHour) {
        insights.push(
          `Peak ${primaryMetric} shifts from ${baselinePeakHour}:00 to ${comparisonPeakHour}:00 in the ${comparison.title || 'comparison'} scenario.`
        );
      } else {
        const peakDiff = comparisonPeak - baselinePeak;
        const peakPercentDiff = (peakDiff / baselinePeak) * 100;
        const direction = peakDiff > 0 ? 'increases' : 'decreases';
        
        insights.push(
          `Peak ${primaryMetric} at ${baselinePeakHour}:00 ${direction} by ${Math.abs(peakPercentDiff).toFixed(1)}% in the ${comparison.title || 'comparison'} scenario.`
        );
      }
    }
  }
  
  // Add insight about secondary metric if different from primary
  if (secondaryMetric !== primaryMetric && 
      baseline.results?.total?.[secondaryMetric] !== undefined && 
      comparison.results?.total?.[secondaryMetric] !== undefined) {
    
    const baselineValue = baseline.results.total[secondaryMetric];
    const comparisonValue = comparison.results.total[secondaryMetric];
    const diff = comparisonValue - baselineValue;
    const percentDiff = (diff / baselineValue) * 100;
    
    if (Math.abs(percentDiff) > 5) {
      const direction = diff > 0 ? 'increase' : 'decrease';
      insights.push(
        `${comparison.title || 'Comparison scenario'} shows a ${Math.abs(percentDiff).toFixed(1)}% ${direction} in overall ${secondaryMetric}.`
      );
    }
  }
  
  return insights;
}

export default ComparativeCapacityChart;