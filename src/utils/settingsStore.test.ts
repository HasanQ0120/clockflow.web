import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  loadSettings,
  saveSettings,
  extractActiveBlacklistTerms,
} from './settingsStore';
import { scrubTextLocally } from './privacyEngine';

test('sanitizeSettings returns defaults on null or invalid input', () => {
  const res = sanitizeSettings(null);
  assert.deepEqual(res, DEFAULT_SETTINGS);

  const badTheme = sanitizeSettings({
    userName: '  Hasan  ',
    theme: 'invalid-theme',
    defaultWhitelist: ['Karachi', 'karachi', '  USD  ', ''],
    autoCloakOnUpload: false,
    maskCurrencyAndPhones: false,
    highlightRestoredDefault: false,
    privacyMode: 'strict',
  });

  assert.equal(badTheme.userName, 'Hasan');
  assert.equal(badTheme.theme, 'obsidian');
  assert.equal(badTheme.privacyMode, 'strict');
  assert.deepEqual(badTheme.defaultWhitelist, ['Karachi', 'USD']);
  assert.equal(badTheme.autoCloakOnUpload, false);
  assert.equal(badTheme.maskCurrencyAndPhones, false);
  assert.equal(badTheme.highlightRestoredDefault, false);
});

test('sanitizeSettings accepts midnight and daylight themes', () => {
  assert.equal(sanitizeSettings({ theme: 'midnight' }).theme, 'midnight');
  assert.equal(sanitizeSettings({ theme: 'daylight' }).theme, 'daylight');
});

test('loadSettings and saveSettings gracefully work without window', () => {
  const defaults = loadSettings();
  assert.equal(defaults.theme, 'obsidian');
  assert.equal(defaults.customRules.length, 2);
  const saved = saveSettings({
    ...defaults,
    userName: 'Founder',
    theme: 'daylight',
  });
  assert.equal(saved.userName, 'Founder');
  assert.equal(saved.theme, 'daylight');
});

test('extractActiveBlacklistTerms applies custom rules in Extra careful mode and hides them in Everyday mode', () => {
  const everydayTerms = extractActiveBlacklistTerms({
    ...DEFAULT_SETTINGS,
    privacyMode: 'everyday',
  });
  assert.deepEqual(everydayTerms, []);

  const strictTerms = extractActiveBlacklistTerms({
    ...DEFAULT_SETTINGS,
    privacyMode: 'strict',
  });
  assert.deepEqual(strictTerms, ['Meridian Labs', 'CF-*']);
  const scrubbed = scrubTextLocally(
    'Meet Meridian Labs about CF-Apollo launch.',
    false,
    [],
    strictTerms
  );
  assert.equal(scrubbed.sanitizedText.includes('Meridian Labs'), false);
  assert.equal(scrubbed.sanitizedText.includes('CF-Apollo'), false);
});
