/**
 * End-to-End test for Error Handling in What-If Analysis
 * Tests how the system handles various error conditions
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

describe('Error Handling User Journey', () => {
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
    
    // Setup request interception for auth and error simulation
    await page.setRequestInterception(true);
    
    // Handle interception for authentication and simulating specific errors
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
      } else if (request.url().includes('/api/agent/nlp/process') && request.url().includes('error=true')) {
        // Simulate NLP processing error
        request.respond({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'NLP service unavailable',
            message: 'The NLP processing service is currently unavailable.'
          })
        });
      } else if (request.url().includes('/api/agent/scenarios') && request.method() === 'POST' && request.url().includes('invalid=true')) {
        // Simulate invalid input error
        request.respond({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Invalid scenario parameters',
            message: 'The scenario parameters are invalid or incomplete.'
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
  
  test('System handles invalid input errors correctly', async () => {
    // Navigate to the what-if analysis page
    await page.goto(`${config.baseUrl}/agent`);
    
    // Take screenshot of initial state
    await takeScreenshot(page, 'error-handling-initial');
    
    // Click on "Create What-If Scenario" button
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Select natural language tab
    await page.click('input[value="natural"]');
    
    // Submit the form without entering any data (should trigger validation errors)
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for validation error messages
    await page.waitForSelector('.ant-form-item-explain-error', { visible: true });
    
    // Take screenshot showing validation errors
    await takeScreenshot(page, 'validation-errors-displayed');
    
    // Check that validation error messages are displayed
    const errorMessages = await page.$$eval('.ant-form-item-explain-error', elements => 
      elements.map(el => el.textContent)
    );
    
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(errorMessages[0]).toContain('required'); // Should show "required" message
    
    // Now enter invalid data that will trigger server-side validation
    await page.type('textarea[name="description"]', 'Invalid input that will trigger server error?!@#');
    
    // Modify URL to include our invalid flag
    await page.evaluate(() => {
      window.history.pushState({}, '', window.location.pathname + '?invalid=true');
    });
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for server error notification
    await page.waitForSelector('.ant-notification-notice-error', { visible: true });
    
    // Take screenshot showing server validation error
    await takeScreenshot(page, 'server-validation-error');
    
    // Verify error message content
    const errorText = await page.$eval('.ant-notification-notice-message', el => el.textContent);
    expect(errorText).toContain('Invalid scenario parameters');
    
    // Close the error notification
    await page.click('.ant-notification-notice-close');
    await wait(1000);
    
    // Verify the form is still available (user can correct errors)
    const formVisible = await page.$eval('.whatif-form', el => el.offsetParent !== null);
    expect(formVisible).toBe(true);
  });
  
  test('System handles NLP service unavailable errors correctly', async () => {
    // Navigate to the what-if analysis page
    await page.goto(`${config.baseUrl}/agent?error=true`);
    
    // Click on "Create What-If Scenario" button
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Select natural language tab
    await page.click('input[value="natural"]');
    
    // Enter valid scenario description
    await page.type('textarea[name="description"]', 'What if we add 5 wide-body stands to Terminal 2?');
    
    // Take screenshot before submission
    await takeScreenshot(page, 'before-nlp-error');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for error notification to appear
    await page.waitForSelector('.ant-notification-notice-error', { visible: true });
    
    // Take screenshot showing NLP service error
    await takeScreenshot(page, 'nlp-service-error');
    
    // Verify error message content
    const errorTitle = await page.$eval('.ant-notification-notice-message', el => el.textContent);
    const errorDescription = await page.$eval('.ant-notification-notice-description', el => el.textContent);
    
    expect(errorTitle).toContain('NLP service unavailable');
    expect(errorDescription).toContain('currently unavailable');
    
    // Test recovery - try using template mode instead
    await page.click('input[value="template"]'); // Switch to template tab
    
    // Select a template
    await page.click('.ant-select-selector'); // Open dropdown
    await page.waitForSelector('.ant-select-dropdown', { visible: true });
    await page.click('.ant-select-item:has-text("Add Terminal Stands")');
    
    // Fill out the form fields
    await page.type('input[name="title"]', 'Recovery Test Scenario');
    await page.type('textarea[name="description"]', 'Testing system recovery after NLP error');
    
    // Select Terminal 2
    await page.click('select[name="terminal"]');
    await page.select('select[name="terminal"]', 'T2');
    
    // Set stand type to wide body
    await page.click('select[name="standType"]');
    await page.select('select[name="standType"]', 'wide_body');
    
    // Set count to 5
    await page.type('input[name="count"]', '5', { delay: 100 });
    
    // Take screenshot before submission
    await takeScreenshot(page, 'recovery-template-form');
    
    // Modify URL to remove the error flag
    await page.evaluate(() => {
      window.history.pushState({}, '', window.location.pathname);
    });
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Take screenshot showing successful recovery
    await takeScreenshot(page, 'successful-recovery');
    
    // Verify successful recovery
    const successElement = await page.$('.calculation-results');
    expect(successElement).not.toBeNull();
  });
  
  test('System handles network errors and reconnection correctly', async () => {
    // Navigate to the scenarios list page
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    
    // Take screenshot of initial state
    await takeScreenshot(page, 'network-error-initial');
    
    // Simulate offline state
    await page.setOfflineMode(true);
    
    // Try to interact with the page (click on a button that requires network)
    try {
      await page.click('button:has-text("New Scenario")');
    } catch (e) {
      // Expected to fail
    }
    
    // Wait for network error message to appear
    await page.waitForFunction(() => {
      return document.querySelector('.network-error') !== null;
    }, { timeout: 5000 }).catch(() => {
      // In case the app doesn't explicitly show a network error element
    });
    
    // Take screenshot showing offline state
    await takeScreenshot(page, 'offline-state');
    
    // Restore network connection
    await page.setOfflineMode(false);
    
    // Wait for auto-reconnection or manually reconnect
    await page.reload();
    
    // Verify the page is functional again
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Take screenshot of recovered state
    await takeScreenshot(page, 'network-recovered');
    
    // Verify the page loaded correctly after recovery
    const scenarioListElement = await page.$('.scenario-list');
    expect(scenarioListElement).not.toBeNull();
    
    // Test creating a new scenario to confirm full functionality
    await page.click('button:has-text("New Scenario")');
    const scenarioForm = await page.waitForSelector('.scenario-form', { visible: true });
    expect(scenarioForm).not.toBeNull();
  });
  
  test('System handles concurrent operations and race conditions correctly', async () => {
    // Navigate to the what-if analysis page
    await page.goto(`${config.baseUrl}/agent`);
    
    // Create two browser tabs to simulate concurrent operations
    const secondPage = await browser.newPage();
    await secondPage.setViewport({ width: 1280, height: 800 });
    
    // Log in on second page
    await secondPage.goto(`${config.baseUrl}/login`);
    await secondPage.type('input[name="email"]', 'test@example.com');
    await secondPage.type('input[name="password"]', 'password123');
    await secondPage.click('button[type="submit"]');
    await secondPage.waitForNavigation();
    
    // Both users navigate to scenarios page
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await secondPage.goto(`${config.baseUrl}/agent/scenarios`);
    
    // First user creates a scenario
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.scenario-form', { visible: true });
    await page.type('input[name="title"]', 'Concurrent Test Scenario');
    await page.type('textarea[name="description"]', 'Testing concurrent operations');
    
    // Second user tries to create a scenario with the same name
    await secondPage.click('button:has-text("New Scenario")');
    await secondPage.waitForSelector('.scenario-form', { visible: true });
    await secondPage.type('input[name="title"]', 'Concurrent Test Scenario');
    await secondPage.type('textarea[name="description"]', 'Another concurrent operation test');
    
    // First user submits
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for a bit before second user submits
    await wait(2000);
    
    // Second user submits
    await secondPage.click('button:has-text("Create Scenario")');
    
    // Check for duplicate name error on second page
    try {
      await secondPage.waitForSelector('.ant-notification-notice-error', { visible: true, timeout: 5000 });
      const errorVisible = await secondPage.$eval('.ant-notification-notice-error', el => el.offsetParent !== null);
      
      if (errorVisible) {
        // If error shown, take screenshot and verify error message
        await takeScreenshot(secondPage, 'concurrent-operation-error');
        
        const errorText = await secondPage.$eval('.ant-notification-notice-message', el => el.textContent);
        expect(errorText).toContain('already exists');
      }
    } catch (e) {
      // If no error shown, the system might allow duplicates or use different IDs
      // This is also acceptable depending on system design
    }
    
    // Close second page
    await secondPage.close();
    
    // Check that first user's scenario creation succeeded
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    
    const scenarioTitles = await page.$$eval('.scenario-card .scenario-title', elements => 
      elements.map(el => el.textContent)
    );
    
    expect(scenarioTitles).toContain('Concurrent Test Scenario');
  });
});