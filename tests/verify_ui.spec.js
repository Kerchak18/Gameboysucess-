import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '..');

test('Record popup and options UI verification', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    recordVideo: {
      dir: '/home/jules/verification/videos'
    },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ]
  });

  let [backgroundPage] = context.serviceWorkers();
  if (!backgroundPage) {
    backgroundPage = await context.waitForEvent('serviceworker');
  }

  const extId = backgroundPage.url().match(/chrome-extension:\/\/([^\/]+)/)[1];

  // 1. Popup UI Test & Verification Screenshot
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popupPage.waitForTimeout(1000);

  // Take screenshot of Popup UI
  await popupPage.screenshot({ path: '/home/jules/verification/screenshots/verification.png' });

  // Interact with Popup UI
  await popupPage.selectOption('#poisonModeSelect', 'sarcastic');
  await popupPage.waitForTimeout(500);

  // 2. Options UI Test
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extId}/src/options/options.html`);
  await optionsPage.waitForTimeout(1000);

  // Navigate options tabs
  await optionsPage.click('button[data-tab="settings"]');
  await optionsPage.waitForTimeout(500);

  await optionsPage.click('button[data-tab="audit-logs"]');
  await optionsPage.waitForTimeout(500);

  await optionsPage.click('button[data-tab="email-report"]');
  await optionsPage.waitForTimeout(1000);

  await context.close();
});
