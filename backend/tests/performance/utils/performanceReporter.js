/**
 * Custom Jest reporter for performance tests
 * 
 * This reporter collects performance metrics from tests and generates
 * a report with statistics and visualizations.
 */

const fs = require('fs');
const path = require('path');

class PerformanceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.testResults = [];
    this.performanceData = {
      testSuites: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        slowTests: 0
      },
      metrics: {}
    };
    
    // Create output directory for reports
    this.outputDir = path.resolve(process.cwd(), 'reports/performance');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  onRunStart() {
    console.log('\nStarting performance tests...\n');
    this.startTime = Date.now();
  }
  
  onTestStart(test) {
    // Optional: track test start time if needed
  }
  
  onTestResult(test, testResult) {
    this.testResults.push(testResult);
    
    // Extract performance data
    const suiteName = testResult.testResults[0]?.ancestorTitles[0] || 'Unknown Suite';
    
    if (!this.performanceData.testSuites[suiteName]) {
      this.performanceData.testSuites[suiteName] = {
        tests: [],
        passedTests: 0,
        failedTests: 0,
        duration: 0
      };
    }
    
    // Process individual test results
    testResult.testResults.forEach(result => {
      this.performanceData.summary.totalTests++;
      
      const testData = {
        name: result.title,
        duration: result.duration,
        status: result.status,
        slow: result.duration > 5000 // Consider tests over 5 seconds as slow
      };
      
      // Update suite data
      this.performanceData.testSuites[suiteName].tests.push(testData);
      this.performanceData.testSuites[suiteName].duration += result.duration;
      
      if (result.status === 'passed') {
        this.performanceData.summary.passedTests++;
        this.performanceData.testSuites[suiteName].passedTests++;
      } else {
        this.performanceData.summary.failedTests++;
        this.performanceData.testSuites[suiteName].failedTests++;
      }
      
      if (testData.slow) {
        this.performanceData.summary.slowTests++;
      }
      
      // Extract performance metrics from test output if available
      const consoleOutput = result.console || [];
      consoleOutput.forEach(log => {
        if (log.message.includes('processing time:') || 
            log.message.includes('response time:') || 
            log.message.includes('calculation time:')) {
          
          const matches = log.message.match(/([a-zA-Z\s]+) time: ([0-9.]+)ms/);
          if (matches && matches.length >= 3) {
            const metricName = matches[1].trim();
            const metricValue = parseFloat(matches[2]);
            
            if (!this.performanceData.metrics[metricName]) {
              this.performanceData.metrics[metricName] = [];
            }
            
            this.performanceData.metrics[metricName].push(metricValue);
          }
        }
      });
    });
  }
  
  onRunComplete() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    // Add global metrics
    this.performanceData.summary.duration = totalDuration;
    
    // Calculate statistics for metrics
    Object.keys(this.performanceData.metrics).forEach(metricName => {
      const values = this.performanceData.metrics[metricName];
      
      if (values.length === 0) return;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      this.performanceData.metrics[metricName] = {
        values,
        count: values.length,
        avg,
        min,
        max,
        stdDev
      };
    });
    
    // Print summary to console
    this.printSummary();
    
    // Generate report files
    this.generateReports();
  }
  
  printSummary() {
    const { summary, testSuites } = this.performanceData;
    
    console.log('\n=== Performance Test Summary ===');
    console.log(`Total Duration: ${(summary.duration / 1000).toFixed(2)} seconds`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Slow Tests: ${summary.slowTests}`);
    
    console.log('\nTest Suites:');
    Object.entries(testSuites).forEach(([name, data]) => {
      console.log(`  ${name}:`);
      console.log(`    Tests: ${data.tests.length} (${data.passedTests} passed, ${data.failedTests} failed)`);
      console.log(`    Duration: ${(data.duration / 1000).toFixed(2)} seconds`);
    });
    
    console.log('\nPerformance Metrics:');
    Object.entries(this.performanceData.metrics).forEach(([name, data]) => {
      if (data.count) {
        console.log(`  ${name}:`);
        console.log(`    Avg: ${data.avg.toFixed(2)} ms`);
        console.log(`    Min: ${data.min.toFixed(2)} ms`);
        console.log(`    Max: ${data.max.toFixed(2)} ms`);
        console.log(`    StdDev: ${data.stdDev.toFixed(2)} ms`);
      }
    });
    
    console.log('\nPerformance report generated at:', this.outputDir);
  }
  
  generateReports() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Save JSON report
    const jsonReport = JSON.stringify(this.performanceData, null, 2);
    fs.writeFileSync(
      path.join(this.outputDir, `performance-${timestamp}.json`),
      jsonReport
    );
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    fs.writeFileSync(
      path.join(this.outputDir, `performance-${timestamp}.html`),
      htmlReport
    );
  }
  
  generateHtmlReport() {
    const { summary, testSuites, metrics } = this.performanceData;
    
    // Simple HTML report template
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AirportAI Phase 2 Performance Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metric { margin-bottom: 30px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .passed { color: green; }
        .failed { color: red; }
        .slow { background-color: #fff3cd; }
      </style>
    </head>
    <body>
      <h1>AirportAI Phase 2 Performance Test Report</h1>
      <p>Generated: ${new Date().toISOString()}</p>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>
          <strong>Total Duration:</strong> ${(summary.duration / 1000).toFixed(2)} seconds<br>
          <strong>Total Tests:</strong> ${summary.totalTests}<br>
          <strong>Passed:</strong> ${summary.passedTests}<br>
          <strong>Failed:</strong> ${summary.failedTests}<br>
          <strong>Slow Tests:</strong> ${summary.slowTests}
        </p>
      </div>
      
      <h2>Test Suites</h2>
      ${Object.entries(testSuites).map(([name, data]) => `
        <div class="suite">
          <h3>${name}</h3>
          <p>
            <strong>Tests:</strong> ${data.tests.length} (${data.passedTests} passed, ${data.failedTests} failed)<br>
            <strong>Duration:</strong> ${(data.duration / 1000).toFixed(2)} seconds
          </p>
          
          <table>
            <tr>
              <th>Test</th>
              <th>Duration (ms)</th>
              <th>Status</th>
            </tr>
            ${data.tests.map(test => `
              <tr class="${test.slow ? 'slow' : ''}">
                <td>${test.name}</td>
                <td>${test.duration.toFixed(2)}</td>
                <td class="${test.status}">${test.status}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `).join('')}
      
      <h2>Performance Metrics</h2>
      ${Object.entries(metrics).map(([name, data]) => {
        if (!data.count) return '';
        
        return `
          <div class="metric">
            <h3>${name}</h3>
            <p>
              <strong>Average:</strong> ${data.avg.toFixed(2)} ms<br>
              <strong>Min:</strong> ${data.min.toFixed(2)} ms<br>
              <strong>Max:</strong> ${data.max.toFixed(2)} ms<br>
              <strong>Standard Deviation:</strong> ${data.stdDev.toFixed(2)} ms<br>
              <strong>Sample Count:</strong> ${data.count}
            </p>
            
            <table>
              <tr>
                <th>#</th>
                <th>Value (ms)</th>
              </tr>
              ${data.values.map((value, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${value.toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `;
      }).join('')}
    </body>
    </html>
    `;
  }
}

module.exports = PerformanceReporter;