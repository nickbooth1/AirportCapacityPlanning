/**
 * End-to-End test for What-If Scenario User Journey
 * Simulates a complete user journey through the what-if analysis
 * This test uses Jest and Puppeteer for e2e testing
 */
const puppeteer = require('puppeteer');
const { toMatchImageSnapshot } = require('jest-image-snapshot');

// Add image snapshot matcher
expect.extend({ toMatchImageSnapshot });

// Test configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  headless: process.env.CI === 'true', // Headless in CI, non-headless for local development
  slowMo: process.env.CI === 'true' ? 0 : 50, // Slow down operations in development mode
  timeout: 30000
};

// Setup global page and browser objects
let browser;
let page;

// Utility functions
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const takeScreenshot = async (page, name) => {
  const screenshot = await page.screenshot({ fullPage: true });
  expect(screenshot).toMatchImageSnapshot({
    customSnapshotIdentifier: name,
    failureThreshold: 0.03, // 3% threshold for differences
    failureThresholdType: 'percent'
  });
};

describe('What-If Scenario User Journey', () => {
  jest.setTimeout(config.timeout);
  
  beforeAll(async () => {
    // Launch browser
    browser = await puppeteer.launch({
      headless: config.headless,
      slowMo: config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create new page
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Setup request interception if needed for authentication
    await page.setRequestInterception(true);
    
    // Handle interception for authentication
    page.on('request', request => {
      if (request.url().includes('/api/auth')) {
        // Mock successful authentication
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            token: 'fake-jwt-token', 
            user: { id: '123', email: 'test@example.com' } 
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Login
    await page.goto(`${config.baseUrl}/login`);
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForNavigation();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('User creates a what-if scenario, visualizes results and compares scenarios', async () => {
    // Step 1: Navigate to the what-if analysis page
    await page.goto(`${config.baseUrl}/agent`);
    
    // Take screenshot of initial state
    await takeScreenshot(page, 'agent-home-initial');
    
    // Click on "Create What-If Scenario" button
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Step 2: Create a new scenario using natural language
    await page.click('input[value="natural"]'); // Select natural language tab
    
    // Enter scenario description
    await page.type('textarea[name="description"]', 'What if we add 5 wide-body stands to Terminal 2?');
    
    // Take screenshot before submission
    await takeScreenshot(page, 'whatif-form-filled');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Step 3: View scenario results
    // Take screenshot of results
    await takeScreenshot(page, 'scenario-results');
    
    // Check for key elements in results
    const capacityElement = await page.$('.capacity-summary');
    expect(capacityElement).not.toBeNull();
    
    const utilizationElement = await page.$('.utilization-chart');
    expect(utilizationElement).not.toBeNull();
    
    // Step 4: Create a second scenario for comparison
    await page.click('button:has-text("Create Another Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Use template this time
    await page.click('input[value="template"]'); // Select template tab
    
    // Select a template
    await page.click('.ant-select-selector'); // Open dropdown
    await page.waitForSelector('.ant-select-dropdown', { visible: true });
    await page.click('.ant-select-item:has-text("Add Terminal Stands")');
    
    // Fill out the form fields
    await page.type('input[name="title"]', 'Optimize T1 Capacity');
    await page.type('textarea[name="description"]', 'Add 3 narrow-body stands to Terminal 1 to optimize capacity');
    
    // Select Terminal 1
    await page.click('select[name="terminal"]');
    await page.select('select[name="terminal"]', 'T1');
    
    // Set stand type to narrow body
    await page.click('select[name="standType"]');
    await page.select('select[name="standType"]', 'narrow_body');
    
    // Set count to 3
    await page.type('input[name="count"]', '3', { delay: 100 });
    
    // Take screenshot before submission
    await takeScreenshot(page, 'second-scenario-form');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Step 5: Compare scenarios
    await page.click('button:has-text("Compare Scenarios")');
    await page.waitForSelector('.scenario-selection', { visible: true });
    
    // Select both scenarios for comparison
    await page.click('input[type="checkbox"][value="scenario1"]');
    await page.click('input[type="checkbox"][value="scenario2"]');
    
    // Click compare button
    await page.click('button:has-text("Compare Selected")');
    
    // Wait for comparison results
    await page.waitForSelector('.comparison-results', { visible: true, timeout: 15000 });
    
    // Take screenshot of comparison
    await takeScreenshot(page, 'scenario-comparison');
    
    // Step 6: Export results
    await page.click('button:has-text("Export Results")');
    await page.waitForSelector('.export-options', { visible: true });
    
    // Select PDF export option
    await page.click('button:has-text("PDF Report")');
    
    // Wait for download to be prepared
    await page.waitForSelector('.download-ready', { visible: true, timeout: 10000 });
    
    // Take final screenshot
    await takeScreenshot(page, 'export-complete');
    
    // Verify results with assertions
    const comparisonText = await page.evaluate(() => {
      const element = document.querySelector('.comparison-summary');
      return element ? element.textContent : '';
    });
    
    expect(comparisonText).toContain('Capacity Difference');
    expect(comparisonText).toContain('Terminal 2');
    expect(comparisonText).toContain('Terminal 1');
  });
});