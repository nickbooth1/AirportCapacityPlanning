/**
 * End-to-End test for Scenario Management User Journey
 * Simulates a user journey through creating, editing, and managing scenarios
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

describe('Scenario Management User Journey', () => {
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
  
  test('User creates, edits, and manages scenarios', async () => {
    // Step 1: Navigate to the scenario management page
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    
    // Take screenshot of initial state
    await takeScreenshot(page, 'scenario-management-initial');
    
    // Step 2: Create a new scenario
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.scenario-form', { visible: true });
    
    // Fill out the form
    await page.type('input[name="title"]', 'Terminal Capacity Enhancement');
    await page.type('textarea[name="description"]', 'Evaluate the impact of adding new stands to Terminal 2');
    
    // Select template
    await page.click('.ant-select-selector'); // Open dropdown
    await page.waitForSelector('.ant-select-dropdown', { visible: true });
    await page.click('.ant-select-item:has-text("Add Terminal Stands")');
    
    // Fill parameters
    await page.select('select[name="terminal"]', 'T2');
    await page.select('select[name="standType"]', 'wide_body');
    await page.type('input[name="count"]', '5', { delay: 100 });
    
    // Take screenshot before submission
    await takeScreenshot(page, 'create-scenario-form');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for scenario to be created and redirected to details page
    await page.waitForSelector('.scenario-details', { visible: true });
    
    // Take screenshot of scenario details
    await takeScreenshot(page, 'scenario-details');
    
    // Step 3: Edit the scenario
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('.edit-scenario-form', { visible: true });
    
    // Modify the description
    await page.evaluate(() => {
      document.querySelector('textarea[name="description"]').value = '';
    });
    await page.type('textarea[name="description"]', 'Updated: Evaluate adding 7 wide-body stands to Terminal 2');
    
    // Update parameters
    await page.evaluate(() => {
      document.querySelector('input[name="count"]').value = '';
    });
    await page.type('input[name="count"]', '7', { delay: 100 });
    
    // Take screenshot before saving
    await takeScreenshot(page, 'edit-scenario-form');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Wait for changes to be saved
    await page.waitForSelector('.success-message', { visible: true });
    
    // Step 4: Recalculate the scenario
    await page.click('button:has-text("Recalculate")');
    await page.waitForSelector('.calculation-options', { visible: true });
    
    // Select calculation options
    await page.select('select[name="timeHorizon"]', 'week');
    
    // Start calculation
    await page.click('button:has-text("Start Calculation")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 15000 });
    
    // Take screenshot of updated results
    await takeScreenshot(page, 'recalculated-results');
    
    // Step 5: Go back to scenario list
    await page.click('a:has-text("Back to Scenarios")');
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Verify our scenario appears in the list
    const scenarioTitle = await page.evaluate(() => {
      const element = document.querySelector('.scenario-card:first-child .scenario-title');
      return element ? element.textContent : '';
    });
    
    expect(scenarioTitle).toContain('Terminal Capacity Enhancement');
    
    // Step 6: Create a scenario from template
    await page.click('button:has-text("From Template")');
    await page.waitForSelector('.template-list', { visible: true });
    
    // Select a template
    await page.click('.template-card:has-text("Optimize Terminal Allocation")');
    await page.waitForSelector('.template-form', { visible: true });
    
    // Fill out template form
    await page.type('input[name="title"]', 'Terminal Optimization Plan');
    await page.type('textarea[name="description"]', 'Optimize airline allocation to terminals');
    await page.select('select[name="terminalPreference"]', 'balanced');
    await page.select('select[name="optimizationTarget"]', 'utilization');
    
    // Take screenshot
    await takeScreenshot(page, 'template-scenario-form');
    
    // Create the scenario
    await page.click('button:has-text("Create")');
    
    // Wait for scenario to be created
    await page.waitForSelector('.scenario-details', { visible: true });
    
    // Step 7: View all scenarios and compare
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Select scenarios to compare
    await page.click('.scenario-card:first-child input[type="checkbox"]');
    await page.click('.scenario-card:nth-child(2) input[type="checkbox"]');
    
    // Click compare button
    await page.click('button:has-text("Compare Selected")');
    
    // Wait for comparison page
    await page.waitForSelector('.comparison-view', { visible: true });
    
    // Take screenshot of comparison
    await takeScreenshot(page, 'scenario-comparison-view');
    
    // Step 8: Delete a scenario
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Open actions menu for first scenario
    await page.click('.scenario-card:first-child .more-actions');
    await page.waitForSelector('.actions-menu', { visible: true });
    
    // Click delete option
    await page.click('.actions-menu-item:has-text("Delete")');
    
    // Confirm deletion
    await page.waitForSelector('.delete-confirmation', { visible: true });
    await page.click('button:has-text("Confirm")');
    
    // Wait for deletion to complete
    await page.waitForFunction(() => {
      const firstScenarioTitle = document.querySelector('.scenario-card:first-child .scenario-title');
      return firstScenarioTitle && !firstScenarioTitle.textContent.includes('Terminal Capacity Enhancement');
    });
    
    // Take final screenshot
    await takeScreenshot(page, 'after-deletion');
    
    // Verify deletion
    const remainingScenarioTitle = await page.evaluate(() => {
      const element = document.querySelector('.scenario-card:first-child .scenario-title');
      return element ? element.textContent : '';
    });
    
    expect(remainingScenarioTitle).toContain('Terminal Optimization Plan');
    expect(remainingScenarioTitle).not.toContain('Terminal Capacity Enhancement');
  });
});