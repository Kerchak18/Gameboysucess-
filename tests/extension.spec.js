const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '..');

test('Extension loads into Chromium and popup renders correctly', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ]
  });

  // Verify background worker / page
  let [backgroundPage] = context.serviceWorkers();
  if (!backgroundPage) {
    backgroundPage = await context.waitForEvent('serviceworker');
  }
  expect(backgroundPage).toBeTruthy();

  // Test Options Page
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${getBudgetId(backgroundPage.url())}/src/options/options.html`);

  await expect(optionsPage.locator('h1')).toHaveText('Tracker Cop Command Center');

  // Verify Email Security Report section
  const reportTextArea = optionsPage.locator('#reportTextArea');
  await expect(reportTextArea).toBeVisible();
  const reportText = await reportTextArea.inputValue();
  expect(reportText).toContain('TRACKER COP & COOKIE POISONER');

  // Navigate to Settings tab
  await optionsPage.click('button[data-tab="settings"]');
  await expect(optionsPage.locator('#optPoisonMode')).toBeVisible();

  // Test Popup Page
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${getBudgetId(backgroundPage.url())}/src/popup/popup.html`);

  await expect(popupPage.locator('.title')).toHaveText('Tracker Cop');
  await expect(popupPage.locator('#masterToggle')).toBeChecked();
  await expect(popupPage.locator('#statusText')).toHaveText('POLICE PATROL ACTIVE');

  await context.close();
});

function getBudgetId(url) {
  // Extract extension ID from service worker url "chrome-extension://<id>/src/background/service_worker.js"
  const match = url.match(/chrome-extension:\/\/([^\/]+)/);
  return match ? match[1] : '';
}
