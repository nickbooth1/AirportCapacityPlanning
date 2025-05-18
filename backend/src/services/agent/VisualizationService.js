const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

/**
 * Service for generating visualizations from data
 */
class VisualizationService {
  constructor() {
    // Initialize ChartJS renderer
    this.chartJSRenderer = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });
    
    // Define color schemes
    this.colorSchemes = {
      default: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
      blue: ['#2e59d9', '#3a68e0', '#4676e7', '#5283ee', '#5e91f5'],
      green: ['#1cc88a', '#1edc94', '#24e99e', '#2af6a7', '#30ffb1'],
      red: ['#e74a3b', '#ed5a4d', '#f36b5f', '#f97c71', '#ff8d83']
    };
    
    // Define visualization type maps for frontend
    this.visualizationTypes = {
      barChart: {
        backendType: 'bar',
        frontendType: 'recharts.BarChart',
        interactive: true,
        description: 'Bar chart for comparing values across categories'
      },
      lineChart: {
        backendType: 'line',
        frontendType: 'recharts.LineChart',
        interactive: true,
        description: 'Line chart for showing trends over time'
      },
      pieChart: {
        backendType: 'pie',
        frontendType: 'recharts.PieChart',
        interactive: true,
        description: 'Pie chart for showing proportions of a whole'
      },
      areaChart: {
        backendType: 'line',
        frontendType: 'recharts.AreaChart',
        interactive: true,
        description: 'Area chart for showing volumes over time'
      },
      scatterPlot: {
        backendType: 'scatter',
        frontendType: 'recharts.ScatterChart',
        interactive: true,
        description: 'Scatter plot for showing relationships between variables'
      },
      heatMap: {
        backendType: 'matrix',
        frontendType: 'custom.HeatMap',
        interactive: true,
        description: 'Heat map for showing intensity across two dimensions'
      },
      table: {
        backendType: 'table',
        frontendType: 'mui.Table',
        interactive: true,
        description: 'Interactive table for structured data'
      }
    };
    
    // Cache for generated visualizations
    this.visualizationCache = new Map();
  }

  /**
   * Generate a bar chart from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generateBarChart(data, title, options = {}) {
    try {
      logger.info(`Generating bar chart: ${title}`);
      
      // Check cache first
      const cacheKey = `barChart:${title}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      if (this.visualizationCache.has(cacheKey)) {
        return this.visualizationCache.get(cacheKey);
      }
      
      const config = {
        type: 'bar',
        data: {
          labels: data.labels || [],
          datasets: data.datasets.map((dataset, index) => ({
            label: dataset.label || `Dataset ${index + 1}`,
            data: dataset.data || [],
            backgroundColor: dataset.backgroundColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            borderColor: dataset.borderColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            borderWidth: 1
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: options.beginAtZero !== false,
              title: {
                display: !!options.yAxisLabel,
                text: options.yAxisLabel
              }
            },
            x: {
              title: {
                display: !!options.xAxisLabel,
                text: options.xAxisLabel
              }
            }
          }
        }
      };
      
      // Generate the chart image
      const chartImage = await this.chartJSRenderer.renderToBuffer(config);
      const base64Image = chartImage.toString('base64');
      
      // Prepare interactive data for frontend
      const interactiveData = {
        datasets: {
          data: data.labels.map((label, i) => {
            const dataPoint = { name: label };
            data.datasets.forEach((dataset) => {
              dataPoint[dataset.label] = dataset.data[i];
            });
            return dataPoint;
          }),
          series: data.datasets.map((dataset) => ({
            dataKey: dataset.label,
            name: dataset.label,
            color: dataset.backgroundColor
          }))
        },
        xAxisKey: 'name',
        xAxisLabel: options.xAxisLabel || '',
        yAxisLabel: options.yAxisLabel || ''
      };
      
      const result = {
        id: uuidv4(),
        type: 'barChart',
        format: 'image/png',
        data: base64Image,
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.barChart
        }
      };
      
      // Store in cache (with 15-minute expiry)
      this.visualizationCache.set(cacheKey, result);
      setTimeout(() => this.visualizationCache.delete(cacheKey), 15 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error(`Bar chart generation error: ${error.message}`);
      throw new Error(`Failed to generate bar chart: ${error.message}`);
    }
  }

  /**
   * Generate a line chart from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generateLineChart(data, title, options = {}) {
    try {
      logger.info(`Generating line chart: ${title}`);
      
      // Check cache first
      const cacheKey = `lineChart:${title}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      if (this.visualizationCache.has(cacheKey)) {
        return this.visualizationCache.get(cacheKey);
      }
      
      const config = {
        type: 'line',
        data: {
          labels: data.labels || [],
          datasets: data.datasets.map((dataset, index) => ({
            label: dataset.label || `Dataset ${index + 1}`,
            data: dataset.data || [],
            backgroundColor: dataset.backgroundColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            borderColor: dataset.borderColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            borderWidth: 2,
            tension: options.tension || 0.1,
            fill: options.fill !== undefined ? options.fill : false,
            pointRadius: options.showPoints !== false ? 3 : 0,
            pointHoverRadius: options.showPoints !== false ? 5 : 0
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: options.beginAtZero !== false,
              title: {
                display: !!options.yAxisLabel,
                text: options.yAxisLabel
              }
            },
            x: {
              title: {
                display: !!options.xAxisLabel,
                text: options.xAxisLabel
              }
            }
          }
        }
      };
      
      // Generate the chart image
      const chartImage = await this.chartJSRenderer.renderToBuffer(config);
      const base64Image = chartImage.toString('base64');
      
      // Prepare interactive data for frontend
      const interactiveData = {
        datasets: {
          data: data.labels.map((label, i) => {
            const dataPoint = { name: label };
            data.datasets.forEach((dataset) => {
              dataPoint[dataset.label] = dataset.data[i];
            });
            return dataPoint;
          }),
          series: data.datasets.map((dataset) => ({
            dataKey: dataset.label,
            name: dataset.label,
            color: dataset.borderColor || dataset.backgroundColor
          }))
        },
        xAxisKey: 'name',
        xAxisLabel: options.xAxisLabel || '',
        yAxisLabel: options.yAxisLabel || ''
      };
      
      const result = {
        id: uuidv4(),
        type: 'lineChart',
        format: 'image/png',
        data: base64Image,
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.lineChart
        }
      };
      
      // Store in cache (with 15-minute expiry)
      this.visualizationCache.set(cacheKey, result);
      setTimeout(() => this.visualizationCache.delete(cacheKey), 15 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error(`Line chart generation error: ${error.message}`);
      throw new Error(`Failed to generate line chart: ${error.message}`);
    }
  }

  /**
   * Generate a pie chart from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generatePieChart(data, title, options = {}) {
    try {
      logger.info(`Generating pie chart: ${title}`);
      
      // Check cache first
      const cacheKey = `pieChart:${title}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      if (this.visualizationCache.has(cacheKey)) {
        return this.visualizationCache.get(cacheKey);
      }
      
      const config = {
        type: 'pie',
        data: {
          labels: data.labels || [],
          datasets: [{
            data: data.values || [],
            backgroundColor: data.colors || this.colorSchemes.default,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              position: options.legendPosition || 'right'
            },
            tooltip: {
              enabled: true
            }
          }
        }
      };
      
      // Generate the chart image
      const chartImage = await this.chartJSRenderer.renderToBuffer(config);
      const base64Image = chartImage.toString('base64');
      
      // Prepare interactive data for frontend
      const interactiveData = {
        datasets: {
          data: data.labels.map((label, i) => ({
            name: label,
            value: data.values[i]
          })),
        },
        nameKey: 'name',
        valueKey: 'value'
      };
      
      const result = {
        id: uuidv4(),
        type: 'pieChart',
        format: 'image/png',
        data: base64Image,
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.pieChart
        }
      };
      
      // Store in cache (with 15-minute expiry)
      this.visualizationCache.set(cacheKey, result);
      setTimeout(() => this.visualizationCache.delete(cacheKey), 15 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error(`Pie chart generation error: ${error.message}`);
      throw new Error(`Failed to generate pie chart: ${error.message}`);
    }
  }
  
  /**
   * Generate a scatter plot from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generateScatterPlot(data, title, options = {}) {
    try {
      logger.info(`Generating scatter plot: ${title}`);
      
      // Check cache first
      const cacheKey = `scatterPlot:${title}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      if (this.visualizationCache.has(cacheKey)) {
        return this.visualizationCache.get(cacheKey);
      }
      
      const config = {
        type: 'scatter',
        data: {
          datasets: data.datasets.map((dataset, index) => ({
            label: dataset.label || `Dataset ${index + 1}`,
            data: dataset.data || [],
            backgroundColor: dataset.backgroundColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            borderColor: dataset.borderColor || this.colorSchemes.default[index % this.colorSchemes.default.length],
            pointRadius: options.pointRadius || 5,
            pointHoverRadius: options.pointHoverRadius || 8
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              position: 'top'
            },
            tooltip: {
              enabled: true
            }
          },
          scales: {
            y: {
              beginAtZero: options.beginAtZero !== false,
              title: {
                display: !!options.yAxisLabel,
                text: options.yAxisLabel
              }
            },
            x: {
              beginAtZero: options.beginAtZeroX !== false,
              title: {
                display: !!options.xAxisLabel,
                text: options.xAxisLabel
              }
            }
          }
        }
      };
      
      // Generate the chart image
      const chartImage = await this.chartJSRenderer.renderToBuffer(config);
      const base64Image = chartImage.toString('base64');
      
      // Prepare interactive data for frontend
      const interactiveData = {
        datasets: {
          data: data.datasets.flatMap((dataset) => 
            dataset.data.map((point) => ({
              name: dataset.label,
              x: point.x,
              y: point.y
            }))
          ),
          series: data.datasets.map((dataset) => ({
            dataKey: dataset.label,
            name: dataset.label,
            color: dataset.backgroundColor
          }))
        },
        xAxisLabel: options.xAxisLabel || '',
        yAxisLabel: options.yAxisLabel || ''
      };
      
      const result = {
        id: uuidv4(),
        type: 'scatterPlot',
        format: 'image/png',
        data: base64Image,
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.scatterPlot
        }
      };
      
      // Store in cache (with 15-minute expiry)
      this.visualizationCache.set(cacheKey, result);
      setTimeout(() => this.visualizationCache.delete(cacheKey), 15 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error(`Scatter plot generation error: ${error.message}`);
      throw new Error(`Failed to generate scatter plot: ${error.message}`);
    }
  }
  
  /**
   * Generate a heat map from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generateHeatMap(data, title, options = {}) {
    try {
      logger.info(`Generating heat map: ${title}`);
      
      // Heat maps aren't natively supported by ChartJS, so we'll create a custom image
      // and provide the data structure for the frontend to render an interactive version
      
      // Prepare interactive data for frontend
      const interactiveData = {
        xLabels: data.xLabels || [],
        yLabels: data.yLabels || [],
        data: data.values || [],
        colorScale: data.colorScale || [
          { threshold: 0, color: '#FFFFFF' },
          { threshold: 25, color: '#A1D6E2' },
          { threshold: 50, color: '#1995AD' },
          { threshold: 75, color: '#F1AB86' },
          { threshold: 100, color: '#C27670' }
        ]
      };
      
      const result = {
        id: uuidv4(),
        type: 'heatMap',
        format: 'application/json', // No static image for heat map
        data: null, // No static image data
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.heatMap
        }
      };
      
      return result;
    } catch (error) {
      logger.error(`Heat map generation error: ${error.message}`);
      throw new Error(`Failed to generate heat map: ${error.message}`);
    }
  }

  /**
   * Format data as a table visualization
   * @param {Array} headers - Table column headers
   * @param {Array} rows - Table row data
   * @param {string} title - Table title
   * @param {Object} options - Additional table options
   * @returns {Object} - Formatted table visualization
   */
  formatTable(headers, rows, title, options = {}) {
    try {
      logger.info(`Formatting table: ${title}`);
      
      // Add sorting, pagination, and other interactive options
      const interactiveOptions = {
        sortable: options.sortable !== false,
        pagination: options.pagination !== false,
        pageSize: options.pageSize || 10,
        filterable: options.filterable !== false,
        exportable: options.exportable !== false,
        responsive: options.responsive !== false
      };
      
      return {
        id: uuidv4(),
        type: 'table',
        format: 'table/json',
        data: {
          headers,
          rows
        },
        interactiveData: {
          headers,
          rows,
          options: interactiveOptions
        },
        title: title,
        metadata: {
          rowCount: rows.length,
          columnCount: headers.length,
          interactive: true,
          visualizationType: this.visualizationTypes.table,
          options: interactiveOptions
        }
      };
    } catch (error) {
      logger.error(`Table formatting error: ${error.message}`);
      throw new Error(`Failed to format table: ${error.message}`);
    }
  }
  
  /**
   * Generate an area chart from data
   * @param {Object} data - The chart data object
   * @param {string} title - The chart title
   * @param {Object} options - Additional chart options
   * @returns {Promise<Object>} - The generated visualization
   */
  async generateAreaChart(data, title, options = {}) {
    try {
      logger.info(`Generating area chart: ${title}`);
      
      // Check cache first
      const cacheKey = `areaChart:${title}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      if (this.visualizationCache.has(cacheKey)) {
        return this.visualizationCache.get(cacheKey);
      }
      
      // Area charts are actually line charts with fill
      const config = {
        type: 'line',
        data: {
          labels: data.labels || [],
          datasets: data.datasets.map((dataset, index) => {
            const color = dataset.backgroundColor || this.colorSchemes.default[index % this.colorSchemes.default.length];
            return {
              label: dataset.label || `Dataset ${index + 1}`,
              data: dataset.data || [],
              backgroundColor: color + '80', // Add alpha for fill
              borderColor: color,
              borderWidth: 2,
              tension: 0.4,
              fill: true
            };
          })
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: options.beginAtZero !== false,
              stacked: options.stacked === true,
              title: {
                display: !!options.yAxisLabel,
                text: options.yAxisLabel
              }
            },
            x: {
              title: {
                display: !!options.xAxisLabel,
                text: options.xAxisLabel
              }
            }
          }
        }
      };
      
      // Generate the chart image
      const chartImage = await this.chartJSRenderer.renderToBuffer(config);
      const base64Image = chartImage.toString('base64');
      
      // Prepare interactive data for frontend
      const interactiveData = {
        datasets: {
          data: data.labels.map((label, i) => {
            const dataPoint = { name: label };
            data.datasets.forEach((dataset) => {
              dataPoint[dataset.label] = dataset.data[i];
            });
            return dataPoint;
          }),
          series: data.datasets.map((dataset) => ({
            dataKey: dataset.label,
            name: dataset.label,
            color: dataset.backgroundColor || dataset.borderColor
          }))
        },
        xAxisKey: 'name',
        xAxisLabel: options.xAxisLabel || '',
        yAxisLabel: options.yAxisLabel || '',
        stacked: options.stacked === true
      };
      
      const result = {
        id: uuidv4(),
        type: 'areaChart',
        format: 'image/png',
        data: base64Image,
        interactiveData,
        title: title,
        metadata: {
          width: 800,
          height: 400,
          options: options,
          interactive: true,
          visualizationType: this.visualizationTypes.areaChart
        }
      };
      
      // Store in cache (with 15-minute expiry)
      this.visualizationCache.set(cacheKey, result);
      setTimeout(() => this.visualizationCache.delete(cacheKey), 15 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error(`Area chart generation error: ${error.message}`);
      throw new Error(`Failed to generate area chart: ${error.message}`);
    }
  }

  /**
   * Determine the best visualization type for data
   * @param {Object} data - The data to visualize
   * @param {string} intent - The query intent
   * @returns {string} - The recommended visualization type
   */
  recommendVisualizationType(data, intent) {
    try {
      // Enhanced recommendation logic for Phase 4
      
      // Time series data detection (improved)
      const hasTimeData = data.labels && 
        data.labels.length > 0 && 
        (
          // ISO date format
          data.labels[0].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) ||
          // Date with time
          data.labels[0].match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/) ||
          // Date only
          data.labels[0].match(/^\d{4}-\d{2}-\d{2}$/) ||
          // Time only
          data.labels[0].match(/^\d{2}:\d{2}/) ||
          // Month/year
          data.labels[0].match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/) ||
          // Quarters
          data.labels[0].match(/^Q[1-4]/)
        );
      
      // Based on intent keywords
      const intentLower = intent ? intent.toLowerCase() : '';
      
      if (intentLower.includes('trend') || 
          intentLower.includes('over time') || 
          intentLower.includes('history') ||
          intentLower.includes('forecast')) {
        
        // For trend/time-based data with volumes, prefer area chart
        if (intentLower.includes('volume') || 
            intentLower.includes('cumulative') || 
            intentLower.includes('total')) {
          return 'areaChart';
        }
        
        // Otherwise use line chart for trends
        return 'lineChart';
      }
      
      // For correlation/relationship data, use scatter plot
      if (intentLower.includes('correlation') || 
          intentLower.includes('relationship') ||
          intentLower.includes('compare') && data.datasets && 
          data.datasets[0] && data.datasets[0].data &&
          data.datasets[0].data[0] && 
          typeof data.datasets[0].data[0] === 'object') {
        return 'scatterPlot';
      }
      
      // For heat or density data, use heat map
      if (intentLower.includes('heat') || 
          intentLower.includes('density') || 
          intentLower.includes('matrix') ||
          intentLower.includes('usage pattern')) {
        return 'heatMap';
      }
      
      // For distribution/composition data with few categories, use pie chart
      if ((intentLower.includes('distribution') || 
           intentLower.includes('composition') ||
           intentLower.includes('breakdown') ||
           intentLower.includes('proportion')) &&
          data.labels && data.labels.length <= 8) {
        return 'pieChart';
      }
      
      // If there's time-based x-axis, prefer line chart
      if (hasTimeData) {
        // If multiple datasets with fill, prefer area chart
        if (data.datasets && data.datasets.length > 1 && 
            intentLower.includes('volume')) {
          return 'areaChart';
        }
        return 'lineChart';
      }
      
      // If there's only one dataset with few categories, prefer pie chart
      if (data.datasets && 
          data.datasets.length === 1 && 
          data.labels && 
          data.labels.length <= 8) {
        return 'pieChart';
      }
      
      // For categorical data with multiple series, prefer bar chart
      if (data.datasets && data.datasets.length >= 1) {
        return 'barChart';
      }
      
      // For tabular data, prefer table
      if (data.headers && data.rows) {
        return 'table';
      }
      
      // Default to bar chart
      return 'barChart';
    } catch (error) {
      logger.error(`Visualization recommendation error: ${error.message}`);
      return 'barChart'; // Default to bar chart on error
    }
  }
  
  /**
   * Get all supported visualization types
   * @returns {Object} - Map of visualization types and their metadata
   */
  getSupportedVisualizationTypes() {
    return this.visualizationTypes;
  }
  
  /**
   * Convert a static visualization to interactive format
   * @param {Object} visualization - The static visualization object
   * @returns {Object} - Enhanced visualization with interactive data
   */
  enhanceWithInteractiveData(visualization) {
    // Skip if already has interactive data
    if (visualization.interactiveData) {
      return visualization;
    }
    
    // Skip if visualization type is not supported
    if (!this.visualizationTypes[visualization.type]) {
      return visualization;
    }
    
    // Create a copy of the visualization
    const enhancedViz = { ...visualization };
    
    try {
      switch (visualization.type) {
        case 'barChart':
        case 'lineChart':
        case 'areaChart':
        case 'scatterPlot':
        case 'pieChart':
        case 'heatMap':
          // These types need data parsing
          // For these complex types, we would need the original data to generate
          // proper interactive data, which we may not have here
          // In a real implementation, this might need to re-process or retrieve the original data
          enhancedViz.metadata = {
            ...(enhancedViz.metadata || {}),
            interactive: true,
            visualizationType: this.visualizationTypes[visualization.type]
          };
          break;
        
        case 'table':
          // Table data can be directly enhanced
          if (typeof visualization.data === 'object' && 
              visualization.data.headers && 
              visualization.data.rows) {
            
            enhancedViz.interactiveData = {
              headers: visualization.data.headers,
              rows: visualization.data.rows,
              options: {
                sortable: true,
                pagination: true,
                pageSize: 10,
                filterable: true,
                exportable: true,
                responsive: true
              }
            };
            
            enhancedViz.metadata = {
              ...(enhancedViz.metadata || {}),
              interactive: true,
              visualizationType: this.visualizationTypes.table
            };
          }
          break;
      }
    } catch (error) {
      logger.error(`Error enhancing visualization: ${error.message}`);
    }
    
    return enhancedViz;
  }
  
  /**
   * Create a visualization template from raw data
   * @param {string} type - The visualization type
   * @param {Object} data - The data to visualize
   * @param {string} title - The visualization title
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The visualization template
   */
  async createVisualizationTemplate(type, data, title, options = {}) {
    try {
      switch (type) {
        case 'barChart':
          return await this.generateBarChart(data, title, options);
        case 'lineChart':
          return await this.generateLineChart(data, title, options);
        case 'pieChart':
          return await this.generatePieChart(data, title, options);
        case 'areaChart':
          return await this.generateAreaChart(data, title, options);
        case 'scatterPlot':
          return await this.generateScatterPlot(data, title, options);
        case 'heatMap':
          return await this.generateHeatMap(data, title, options);
        case 'table':
          return this.formatTable(data.headers, data.rows, title, options);
        default:
          throw new Error(`Unsupported visualization type: ${type}`);
      }
    } catch (error) {
      logger.error(`Visualization template creation error: ${error.message}`);
      throw new Error(`Failed to create visualization template: ${error.message}`);
    }
  }
}

module.exports = new VisualizationService();