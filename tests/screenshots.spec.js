// @ts-check
const { test, expect } = require('@playwright/test');

test('capture app screenshots', async ({ page }) => {
  // Set longer timeout for the entire test
  test.setTimeout(40000);
  
  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  console.log('Page loaded');
  
  // Wait for key elements to be loaded - look for help button which should always be visible
  await page.waitForSelector('button.help-button', { state: 'visible', timeout: 3000 });
  await page.waitForTimeout(1000); // Extra wait to ensure page is fully rendered
  console.log('Found help button');
  
  // 1. Screenshot the entire app
  console.log('Taking full app screenshot...');
  await page.screenshot({ path: 'screenshots/01-full-app.png' });
  
  // 2. Screenshot app header with app title and help button
  console.log('Taking header screenshot...');
  const headerContainer = page.locator('#app-header, h1:has-text("Radiocarbon")').first();
  await expect(headerContainer).toBeVisible({ timeout: 5000 });
  await headerContainer.screenshot({ path: 'screenshots/02-app-header.png' });
  
  // 3. Screenshot input form 
  console.log('Taking input form screenshot...');
  const inputForm = page.locator('#calibration-form, form').first();
  await expect(inputForm).toBeVisible({ timeout: 5000 });
  await inputForm.screenshot({ path: 'screenshots/03-input-form.png' });
  
  // 4. Fill out form with sample data
  console.log('Filling form data...');
  await page.locator('input[id="radiocarbon-age"]').fill('5000');
  await page.locator('input[id="uncertainty"]').fill('30');
  await page.locator('input[id="reservoir-correction"]').fill('0');
  await page.waitForTimeout(500);
  
  // 5. Submit form - add waits to ensure proper rendering
  console.log('Submitting form...');
  const calibrateButton = page.locator('#calibrate-button, button.calibrate-button, button:has-text("Calibrate")');
  await calibrateButton.click();
  
  // Wait for results - using class selector which is more reliable
  console.log('Waiting for results to appear...');
  await page.waitForSelector('.results-content, div:has-text("Calibration Results")', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(3000); // Additional wait for animations and rendering
  
  // 6. Screenshot results header
  console.log('Taking results header screenshot...');
  // Using a more reliable selector - any element with "Calibration Results" text
  const resultsHeader = page.locator('div:has-text("Calibration Results")').first();
  await expect(resultsHeader).toBeVisible({ timeout: 3000 });
  await resultsHeader.screenshot({ path: 'screenshots/05-results-header.png' });
  
  // 7. Screenshot calibration chart - using class instead of ID
  console.log('Taking chart screenshot...');
  const chartContainer = page.locator('.chart-container, svg').first();
  await expect(chartContainer).toBeVisible({ timeout: 3000 });
  await chartContainer.screenshot({ path: 'screenshots/06-calibration-chart.png' });
  
  // 8. Screenshot probability ranges section
  console.log('Taking probability ranges screenshot...');
  // Looking for a heading with "Result Summary" or div with "Probability"
  const probRanges = page.locator('div:has-text("Probability"), div:has-text("Result Summary")').first();
  await expect(probRanges).toBeVisible({ timeout: 3000 });
  await probRanges.screenshot({ path: 'screenshots/07-probability-ranges.png' });
  
  // 9. Open help dialog
  console.log('Opening help dialog...');
  await page.locator('button.help-button').click();
  await page.waitForTimeout(2000); // Wait for dialog animation
  
  try {
    // 10. Screenshot help dialog
    console.log('Taking help dialog screenshot...');
    // Using a more general selector
    const helpDialog = await page.locator('div[role="dialog"], .bp4-dialog').first();
    console.log('Found help dialog, capturing screenshot...');
    await expect(helpDialog).toBeVisible({ timeout: 3000 });
    await helpDialog.screenshot({ path: 'screenshots/08-help-dialog.png' });
    
    // 11. Close dialog
    console.log('Closing help dialog...');
    await page.locator('.bp5-dialog-close-button').click();
    await page.waitForTimeout(2000); // Wait for dialog to close
  } catch (e) {
    console.error('Error with help dialog:', e);
    // Continue with the test even if help dialog has issues
  }
  
  console.log('Screenshot capture complete!');
});