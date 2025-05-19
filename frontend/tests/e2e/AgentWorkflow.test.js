// This is an E2E test that requires Jest with Puppeteer or Playwright
// It's meant to be run with the actual application deployed locally

import { test, expect } from '@playwright/test';

// These tests are designed to be run against a running instance of the application
// with a mock or actual API server

test.describe('Agent Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the agent page
    await page.goto('http://localhost:3000/agent');
    
    // Wait for the page to load fully
    await page.waitForSelector('text=AirportAI Agent');
    
    // Mock authentication (in a real scenario, this would log in)
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 'test-user', name: 'Test User' }));
    });
    
    // Reload the page to apply auth
    await page.reload();
    await page.waitForSelector('text=AirportAI Agent');
  });
  
  test('should show the agent chat interface', async ({ page }) => {
    // Check that main elements are visible
    await expect(page.locator('text=AirportAI Agent')).toBeVisible();
    await expect(page.locator('text=Ask a question...')).toBeVisible();
    
    // Should show welcome message
    await expect(page.locator('text=Welcome to the Airport Capacity AI Assistant')).toBeVisible();
  });
  
  test('should send a message and receive a response', async ({ page }) => {
    // Type a message in the chat input
    await page.fill('textarea[placeholder="Ask a question..."]', 'What is the current airport capacity?');
    
    // Click the send button
    await page.click('button[aria-label="Send message"]');
    
    // Check that the user message appears
    await expect(page.locator('text=What is the current airport capacity?')).toBeVisible();
    
    // Wait for the agent to respond (this might take some time)
    await page.waitForSelector('text=Assistant', { timeout: 30000 });
    
    // Check that some relevant capacity-related text appears in the response
    await expect(page.locator('text=/capacity|flights per hour|operations/i')).toBeVisible({ timeout: 10000 });
  });
  
  test('should handle follow-up questions maintaining context', async ({ page }) => {
    // First question
    await page.fill('textarea[placeholder="Ask a question..."]', 'How many stands are available at Terminal 1?');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for the first response
    await page.waitForSelector('text=Assistant', { timeout: 30000 });
    
    // Follow-up question that depends on context
    await page.fill('textarea[placeholder="Ask a question..."]', 'Which ones are suitable for wide-body aircraft?');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for the second response
    await page.waitForSelector('text=Assistant >> nth=1', { timeout: 30000 });
    
    // The second response should contain stand identifiers and aircraft types
    await expect(page.locator('text=/stand|pier|gate|wide.{0,10}body|aircraft type/i >> nth=1')).toBeVisible({ timeout: 10000 });
  });
  
  test('should handle feedback submission', async ({ page }) => {
    // Send a message first
    await page.fill('textarea[placeholder="Ask a question..."]', 'Show me maintenance impact on capacity');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for the agent response
    await page.waitForSelector('text=Assistant', { timeout: 30000 });
    
    // Click the thumbs up button to provide positive feedback
    await page.click('button[aria-label="Helpful"]');
    
    // There should be visual feedback that the feedback was registered
    // (This depends on your UI implementation - look for color change or other indicator)
    await expect(page.locator('button[aria-label="Helpful"][color="success"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('should handle action proposals and approvals', async ({ page }) => {
    // Send a message that would trigger an action proposal
    await page.fill('textarea[placeholder="Ask a question..."]', 'Schedule maintenance for Stand A1 next week');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for the action proposal card to appear
    await page.waitForSelector('text=Create Maintenance Request', { timeout: 30000 });
    
    // Click the Approve button
    await page.click('button:has-text("Approve")');
    
    // Wait for approval confirmation
    await page.waitForSelector('text=Approving action', { timeout: 10000 });
    
    // Wait for the action result
    await page.waitForSelector('text=/successfully|completed|scheduled/i', { timeout: 30000 });
  });
  
  test('should save insights', async ({ page }) => {
    // Send a message first
    await page.fill('textarea[placeholder="Ask a question..."]', 'Analyze the impact of closing 2 stands on capacity');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for the agent response
    await page.waitForSelector('text=Assistant', { timeout: 30000 });
    
    // Click the bookmark/save button
    await page.click('button[aria-label="Save as insight"]');
    
    // Fill out the insight save dialog
    await page.fill('input[name="title"]', 'Stand Closure Impact Analysis');
    await page.selectOption('select[name="category"]', 'capacity');
    await page.fill('textarea[name="notes"]', 'Important analysis for maintenance planning');
    
    // Save the insight
    await page.click('button:has-text("Save")');
    
    // Confirm the insight was saved
    await page.waitForSelector('text=Insight saved', { timeout: 10000 });
    
    // Switch to insights tab
    await page.click('button:has-text("Insights")');
    
    // Verify the saved insight appears in the list
    await expect(page.locator('text=Stand Closure Impact Analysis')).toBeVisible({ timeout: 5000 });
  });
});