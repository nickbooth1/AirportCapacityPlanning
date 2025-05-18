const visualizationService = require('../../services/agent/VisualizationService');
const logger = require('../../utils/logger');

/**
 * Controller for Visualization API endpoints
 */
class VisualizationController {
  /**
   * Generate a visualization from data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateVisualization(req, res) {
    try {
      const { type, title, data, options } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Visualization type is required'
        });
      }
      
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Data is required'
        });
      }
      
      let visualization;
      
      switch (type.toLowerCase()) {
        case 'barchart':
          visualization = await visualizationService.generateBarChart(
            data,
            title || 'Bar Chart',
            options || {}
          );
          break;
          
        case 'linechart':
          visualization = await visualizationService.generateLineChart(
            data,
            title || 'Line Chart',
            options || {}
          );
          break;
          
        case 'piechart':
          visualization = await visualizationService.generatePieChart(
            data,
            title || 'Pie Chart',
            options || {}
          );
          break;
          
        case 'table':
          if (!data.headers || !data.rows) {
            return res.status(400).json({
              success: false,
              error: 'Table data must include headers and rows'
            });
          }
          
          visualization = visualizationService.formatTable(
            data.headers,
            data.rows,
            title || 'Table'
          );
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported visualization type: ${type}`
          });
      }
      
      return res.status(200).json({
        success: true,
        data: visualization
      });
    } catch (error) {
      logger.error(`Visualization generation error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to generate visualization: ${error.message}`
      });
    }
  }

  /**
   * Get available visualization templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTemplates(req, res) {
    try {
      // For Phase 1, we'll return a simple list of supported visualization types
      const templates = [
        {
          id: 'barChart',
          name: 'Bar Chart',
          description: 'Displays categorical data with rectangular bars',
          example: {
            type: 'barChart',
            data: {
              labels: ['Category 1', 'Category 2', 'Category 3'],
              datasets: [
                {
                  label: 'Dataset 1',
                  data: [10, 20, 30]
                }
              ]
            },
            options: {
              xAxisLabel: 'Categories',
              yAxisLabel: 'Values'
            }
          }
        },
        {
          id: 'lineChart',
          name: 'Line Chart',
          description: 'Displays information as a series of data points connected by line segments',
          example: {
            type: 'lineChart',
            data: {
              labels: ['January', 'February', 'March'],
              datasets: [
                {
                  label: 'Dataset 1',
                  data: [10, 20, 15]
                }
              ]
            },
            options: {
              xAxisLabel: 'Month',
              yAxisLabel: 'Values'
            }
          }
        },
        {
          id: 'pieChart',
          name: 'Pie Chart',
          description: 'Circular statistical graphic divided into slices to illustrate numerical proportion',
          example: {
            type: 'pieChart',
            data: {
              labels: ['Category 1', 'Category 2', 'Category 3'],
              values: [30, 50, 20]
            },
            options: {
              legendPosition: 'right'
            }
          }
        },
        {
          id: 'table',
          name: 'Table',
          description: 'Displays data in rows and columns',
          example: {
            type: 'table',
            data: {
              headers: ['Column 1', 'Column 2', 'Column 3'],
              rows: [
                ['Row 1, Col 1', 'Row 1, Col 2', 'Row 1, Col 3'],
                ['Row 2, Col 1', 'Row 2, Col 2', 'Row 2, Col 3']
              ]
            }
          }
        }
      ];
      
      return res.status(200).json({
        success: true,
        data: {
          templates
        }
      });
    } catch (error) {
      logger.error(`Template retrieval error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve templates: ${error.message}`
      });
    }
  }

  /**
   * Export a visualization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportVisualization(req, res) {
    try {
      const { format, data } = req.body;
      
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Visualization data is required'
        });
      }
      
      // For Phase 1, we'll support only PNG and JSON formats
      const validFormats = ['png', 'json'];
      const validFormat = format && validFormats.includes(format.toLowerCase()) 
        ? format.toLowerCase() 
        : 'json';
      
      if (validFormat === 'png') {
        // If the data is already a base64 image, just return it
        if (data.format === 'image/png' && data.data) {
          return res.status(200).json({
            success: true,
            data: {
              format: 'image/png',
              data: data.data,
              title: data.title || 'Visualization'
            }
          });
        } else {
          // For table data, generate a simple image (placeholder for Phase 1)
          return res.status(400).json({
            success: false,
            error: 'Cannot export this visualization as PNG'
          });
        }
      } else {
        // JSON format - return the raw data
        return res.status(200).json({
          success: true,
          data: {
            format: 'application/json',
            data: data,
            title: data.title || 'Visualization'
          }
        });
      }
    } catch (error) {
      logger.error(`Visualization export error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to export visualization: ${error.message}`
      });
    }
  }
}

module.exports = new VisualizationController(); 