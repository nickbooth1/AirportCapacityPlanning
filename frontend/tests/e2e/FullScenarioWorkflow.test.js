/**
 * End-to-End test for Full Scenario Creation Workflow
 * Tests the complete user journey for creating, analyzing and managing scenarios
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

describe('Full Scenario Creation Workflow', () => {
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
  
  test('Complete workflow from dashboard to scenario creation to visualization', async () => {
    // Step 1: Start from dashboard and navigate to what-if analysis
    await page.goto(`${config.baseUrl}/`);
    
    // Take screenshot of dashboard
    await takeScreenshot(page, 'workflow-dashboard');
    
    // Locate and click the "What-If Analysis" card/link on dashboard
    await page.click('a:has-text("What-If Analysis")');
    
    // Verify navigation to what-if analysis page
    await page.waitForSelector('h1:has-text("What-If Analysis")', { visible: true });
    
    // Take screenshot of what-if analysis page
    await takeScreenshot(page, 'workflow-whatif-page');
    
    // Step 2: Create a new scenario using natural language
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Fill out scenario details
    await page.click('input[value="natural"]'); // Select natural language tab
    await page.type('textarea[name="description"]', 'What if we add 5 wide-body stands to Terminal 2 and relocate 3 airlines from Terminal 1?');
    
    // Fill in optional metadata fields if they exist
    try {
      await page.type('input[name="title"]', 'Terminal 2 Expansion Analysis');
      
      // Add tags if the field exists
      const tagsSelector = '.tags-input';
      const tagsExists = await page.$(tagsSelector);
      if (tagsExists) {
        await page.click(tagsSelector);
        await page.type(tagsSelector, 'capacity');
        await page.keyboard.press('Enter');
        await page.type(tagsSelector, 'expansion');
        await page.keyboard.press('Enter');
      }
    } catch (e) {
      // Fields might not exist, continue
    }
    
    // Take screenshot of filled form
    await takeScreenshot(page, 'workflow-scenario-form');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Step 3: Wait for NLP processing and show processing indicator
    try {
      await page.waitForSelector('.processing-indicator', { visible: true, timeout: 5000 });
      await takeScreenshot(page, 'workflow-processing');
    } catch (e) {
      // Processing might be fast and indicator might not be visible long enough
    }
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Step 4: View scenario results
    await takeScreenshot(page, 'workflow-results');
    
    // Check for key elements in results
    const capacityElement = await page.$('.capacity-summary');
    expect(capacityElement).not.toBeNull();
    
    const visualizationElement = await page.$('.scenario-visualization');
    expect(visualizationElement).not.toBeNull();
    
    // Step 5: Interactive exploration of visualization
    
    // Explore capacity by terminal tab if it exists
    const terminalTabSelector = 'button:has-text("By Terminal")';
    const terminalTabExists = await page.$(terminalTabSelector);
    if (terminalTabExists) {
      await page.click(terminalTabSelector);
      await page.waitForSelector('.terminal-breakdown', { visible: true });
      await takeScreenshot(page, 'workflow-terminal-breakdown');
    }
    
    // Explore capacity by time tab if it exists
    const timeTabSelector = 'button:has-text("By Time")';
    const timeTabExists = await page.$(timeTabSelector);
    if (timeTabExists) {
      await page.click(timeTabSelector);
      await page.waitForSelector('.time-breakdown', { visible: true });
      await takeScreenshot(page, 'workflow-time-breakdown');
    }
    
    // Explore detailed charts if they exist
    const chartsTabSelector = 'button:has-text("Charts")';
    const chartsTabExists = await page.$(chartsTabSelector);
    if (chartsTabExists) {
      await page.click(chartsTabSelector);
      await page.waitForSelector('.charts-view', { visible: true });
      await takeScreenshot(page, 'workflow-charts');
    }
    
    // Step 6: Save and name the scenario
    const saveButtonSelector = 'button:has-text("Save Scenario")';
    const saveButtonExists = await page.$(saveButtonSelector);
    if (saveButtonExists) {
      await page.click(saveButtonSelector);
      
      // Wait for save dialog
      await page.waitForSelector('.save-dialog', { visible: true });
      
      // Enter scenario name if not already entered
      try {
        await page.type('input[name="scenarioName"]', 'Terminal 2 Expansion Scenario');
      } catch (e) {
        // Name might already be set
      }
      
      // Confirm save
      await page.click('button:has-text("Save")');
      
      // Wait for save confirmation
      await page.waitForSelector('.save-confirmation', { visible: true });
      await takeScreenshot(page, 'workflow-saved');
    }
    
    // Step 7: Navigate to scenarios list
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    await takeScreenshot(page, 'workflow-scenario-list');
    
    // Find our scenario in the list
    const scenarioCards = await page.$$('.scenario-card');
    expect(scenarioCards.length).toBeGreaterThan(0);
    
    // Click on our scenario to view details
    const scenarioTitles = await page.$$eval('.scenario-card .scenario-title', elements => elements.map(el => el.textContent));
    const ourScenarioIndex = scenarioTitles.findIndex(title => 
      title.includes('Terminal 2') || title.includes('Expansion')
    );
    
    if (ourScenarioIndex >= 0) {
      await page.click(`.scenario-card:nth-child(${ourScenarioIndex + 1}) a:has-text("View")`);
      
      // Step 8: View detailed scenario analysis
      await page.waitForSelector('.scenario-details', { visible: true });
      await takeScreenshot(page, 'workflow-detailed-analysis');
      
      // Check details page elements
      const scenarioTitle = await page.$eval('h1', el => el.textContent);
      expect(scenarioTitle).toContain('Terminal 2');
      
      // Step 9: Export scenario results
      const exportButtonSelector = 'button:has-text("Export")';
      const exportButtonExists = await page.$(exportButtonSelector);
      if (exportButtonExists) {
        await page.click(exportButtonSelector);
        
        // Wait for export options
        await page.waitForSelector('.export-options', { visible: true });
        await takeScreenshot(page, 'workflow-export-options');
        
        // Select PDF format if available
        const pdfOptionSelector = 'button:has-text("PDF")';
        const pdfOptionExists = await page.$(pdfOptionSelector);
        if (pdfOptionExists) {
          await page.click(pdfOptionSelector);
          
          // Wait for export confirmation
          await page.waitForSelector('.export-confirmation', { visible: true, timeout: 10000 });
          await takeScreenshot(page, 'workflow-export-confirmation');
        }
      }
      
      // Step 10: Share scenario
      const shareButtonSelector = 'button:has-text("Share")';
      const shareButtonExists = await page.$(shareButtonSelector);
      if (shareButtonExists) {
        await page.click(shareButtonSelector);
        
        // Wait for share dialog
        await page.waitForSelector('.share-dialog', { visible: true });
        await takeScreenshot(page, 'workflow-share-dialog');
        
        // Close share dialog
        await page.click('button:has-text("Cancel")');
      }
      
      // Step 11: Return to dashboard
      await page.goto(`${config.baseUrl}/`);
      await takeScreenshot(page, 'workflow-return-dashboard');
      
      // Check that dashboard shows our recently created scenario
      const recentScenarioElement = await page.$('.recent-scenarios');
      if (recentScenarioElement) {
        const recentScenarioText = await page.evaluate(
          element => element.textContent,
          recentScenarioElement
        );
        expect(recentScenarioText).toContain('Terminal 2');
      }
    }
  });
  
  test('Full scenario management workflow including edit and comparison', async () => {
    // Create two scenarios to compare
    
    // Step 1: Create first scenario
    await page.goto(`${config.baseUrl}/agent`);
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Use template this time
    await page.click('input[value="template"]'); // Select template tab
    
    // Select a template
    await page.click('.ant-select-selector'); // Open dropdown
    await page.waitForSelector('.ant-select-dropdown', { visible: true });
    await page.click('.ant-select-item:has-text("Add Terminal Stands")');
    
    // Fill out the form
    await page.type('input[name="title"]', 'Terminal 1 Enhancement');
    await page.type('textarea[name="description"]', 'Add 4 narrow-body stands to Terminal 1');
    
    // Select Terminal 1
    await page.click('select[name="terminal"]');
    await page.select('select[name="terminal"]', 'T1');
    
    // Set stand type to narrow body
    await page.click('select[name="standType"]');
    await page.select('select[name="standType"]', 'narrow_body');
    
    // Set count to 4
    await page.type('input[name="count"]', '4', { delay: 100 });
    
    // Submit
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Step 2: Save this scenario
    const saveButtonSelector = 'button:has-text("Save Scenario")';
    const saveButtonExists = await page.$(saveButtonSelector);
    if (saveButtonExists) {
      await page.click(saveButtonSelector);
      
      // Wait for save dialog and confirm
      await page.waitForSelector('.save-dialog', { visible: true });
      await page.click('button:has-text("Save")');
      
      // Wait for save confirmation
      await page.waitForSelector('.save-confirmation', { visible: true });
    }
    
    // Step 3: Create second scenario
    await page.goto(`${config.baseUrl}/agent`);
    await page.click('button:has-text("Create What-If Scenario")');
    await page.waitForSelector('.whatif-form', { visible: true });
    
    // Use template again
    await page.click('input[value="template"]');
    
    // Select a template
    await page.click('.ant-select-selector');
    await page.waitForSelector('.ant-select-dropdown', { visible: true });
    await page.click('.ant-select-item:has-text("Add Terminal Stands")');
    
    // Fill out the form
    await page.type('input[name="title"]', 'Terminal 2 Enhancement');
    await page.type('textarea[name="description"]', 'Add 3 wide-body stands to Terminal 2');
    
    // Select Terminal 2
    await page.click('select[name="terminal"]');
    await page.select('select[name="terminal"]', 'T2');
    
    // Set stand type to wide body
    await page.click('select[name="standType"]');
    await page.select('select[name="standType"]', 'wide_body');
    
    // Set count to 3
    await page.type('input[name="count"]', '3', { delay: 100 });
    
    // Submit
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Step 4: Save this scenario too
    const saveButton2Exists = await page.$(saveButtonSelector);
    if (saveButton2Exists) {
      await page.click(saveButtonSelector);
      
      // Wait for save dialog and confirm
      await page.waitForSelector('.save-dialog', { visible: true });
      await page.click('button:has-text("Save")');
      
      // Wait for save confirmation
      await page.waitForSelector('.save-confirmation', { visible: true });
    }
    
    // Step 5: Go to scenario list and select scenarios for comparison
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Take screenshot of scenario list
    await takeScreenshot(page, 'management-scenario-list');
    
    // Select both scenarios for comparison (first two in the list)
    await page.click('.scenario-card:nth-child(1) input[type="checkbox"]');
    await page.click('.scenario-card:nth-child(2) input[type="checkbox"]');
    
    // Click compare button
    await page.click('button:has-text("Compare")');
    
    // Wait for comparison view
    await page.waitForSelector('.comparison-view', { visible: true });
    
    // Take screenshot of comparison
    await takeScreenshot(page, 'management-scenario-comparison');
    
    // Check comparison elements are present
    const comparisonCharts = await page.$$('.comparison-chart');
    expect(comparisonCharts.length).toBeGreaterThan(0);
    
    // Step 6: Go back to scenario list
    await page.click('a:has-text("Back to Scenarios")');
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Step 7: Edit a scenario
    await page.click('.scenario-card:nth-child(1) a:has-text("Edit")');
    await page.waitForSelector('.edit-scenario-form', { visible: true });
    
    // Take screenshot of edit form
    await takeScreenshot(page, 'management-edit-scenario');
    
    // Modify parameters
    await page.evaluate(() => {
      document.querySelector('input[name="count"]').value = '';
    });
    await page.type('input[name="count"]', '6', { delay: 100 });
    
    await page.evaluate(() => {
      document.querySelector('textarea[name="description"]').value = '';
    });
    await page.type('textarea[name="description"]', 'Updated: Add 6 narrow-body stands to Terminal 1');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Wait for changes to be saved
    await page.waitForSelector('.success-message', { visible: true });
    
    // Step 8: Recalculate the edited scenario
    await page.click('button:has-text("Recalculate")');
    
    // Wait for calculation to complete
    await page.waitForSelector('.calculation-results', { visible: true, timeout: 20000 });
    
    // Take screenshot of recalculated results
    await takeScreenshot(page, 'management-recalculated');
    
    // Step 9: Delete a scenario
    await page.goto(`${config.baseUrl}/agent/scenarios`);
    await page.waitForSelector('.scenario-list', { visible: true });
    
    // Click delete on the second scenario
    await page.click('.scenario-card:nth-child(2) button:has-text("Delete")');
    
    // Confirm deletion
    await page.waitForSelector('.delete-confirmation', { visible: true });
    await page.click('button:has-text("Confirm")');
    
    // Wait for deletion to complete
    await wait(2000);
    
    // Take screenshot after deletion
    await takeScreenshot(page, 'management-after-deletion');
    
    // Verify scenario was deleted
    const remainingScenarios = await page.$$('.scenario-card');
    expect(remainingScenarios.length).toBe(1);
  });
});