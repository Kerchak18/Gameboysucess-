const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runManifestTests() {
  console.log('Running Manifest & Core Files Verification Tests...');

  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.json should exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.strictEqual(manifest.manifest_version, 3, 'Manifest version must be 3');
  assert.strictEqual(manifest.name, 'Tracker Cop & Cookie Poisoner');

  // Check required permissions
  const requiredPermissions = ['storage', 'declarativeNetRequest', 'cookies', 'notifications', 'alarms', 'scripting'];
  requiredPermissions.forEach(perm => {
    assert.strictEqual(manifest.permissions.includes(perm), true, `Permission ${perm} must be present`);
  });

  // Check icons existence
  const iconSizes = ['16', '32', '48', '128'];
  iconSizes.forEach(size => {
    const iconPath = path.join(__dirname, '..', manifest.icons[size]);
    assert.strictEqual(fs.existsSync(iconPath), true, `Icon ${size} file should exist at ${iconPath}`);
  });

  // Check background service worker existence
  const swPath = path.join(__dirname, '..', manifest.background.service_worker);
  assert.strictEqual(fs.existsSync(swPath), true, `Service worker file should exist at ${swPath}`);

  // Check content scripts existence
  manifest.content_scripts.forEach(cs => {
    cs.js.forEach(scriptRel => {
      const scriptPath = path.join(__dirname, '..', scriptRel);
      assert.strictEqual(fs.existsSync(scriptPath), true, `Content script should exist at ${scriptPath}`);
    });
  });

  // Check options page
  const optionsPath = path.join(__dirname, '..', manifest.options_page);
  assert.strictEqual(fs.existsSync(optionsPath), true, `Options page should exist at ${optionsPath}`);

  console.log('✅ Manifest & core files verification tests passed successfully!');
}

runManifestTests();
