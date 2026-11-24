import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scrubTextLocally,
  restoreSecretsInText,
  runDeterministicLocalAction,
  maskSecretValue,
} from './privacyEngine';

test('scrubTextLocally redacts API keys, emails, phones, amounts, companies, and names with 0 leaked bytes', () => {
  const sample = `CONFIDENTIAL MASTER SERVICES AGREEMENT
Between Kestrel Freight Logistics Pvt. Ltd. and Zainab Raza.
1. Primary Contacts & Signatories:
Email: zainab.raza@kestrelfreight.pk, Phone: +92 300 8451920.
Retainer: PKR 4,850,000. Secret: sk-live-99887766554433221100aabbccdd and AIzaSyD98xK2mPqR4vT7wZ1nB6cF3hJ5kL0mN2p.
// Production Payment & Telemetry Worker`;

  const res = scrubTextLocally(sample, false);

  assert.equal(res.leakedBytes, 0);
  assert.ok(res.blockedCount >= 7);
  assert.equal(res.sanitizedText.includes('zainab.raza@kestrelfreight.pk'), false);
  assert.equal(res.sanitizedText.includes('sk-live-99887766554433221100aabbccdd'), false);
  assert.equal(res.sanitizedText.includes('AIzaSyD98xK2mPqR4vT7wZ1nB6cF3hJ5kL0mN2p'), false);
  assert.equal(res.sanitizedText.includes('+92 300 8451920'), false);
  assert.equal(res.sanitizedText.includes('PKR 4,850,000'), false);
  assert.ok(res.sanitizedText.includes('CONFIDENTIAL MASTER SERVICES AGREEMENT'));
  assert.ok(res.sanitizedText.includes('Primary Contacts'));
  assert.ok(res.sanitizedText.includes('Production Payment & Telemetry Worker'));
  assert.ok(res.sanitizedText.includes('[COMPANY_1]'));
  assert.ok(res.sanitizedText.includes('[API_KEY_1]'));
  assert.ok(res.sanitizedText.includes('[EMAIL_1]'));
});

test('scrubTextLocally supports Synthetic Context Mode with realistic dummy personas', () => {
  const sample = `Client: Zainab Raza at Kestrel Freight Logistics Pvt. Ltd. (zainab.raza@kestrelfreight.pk).`;
  const res = scrubTextLocally(sample, true);

  assert.equal(res.leakedBytes, 0);
  assert.equal(res.sanitizedText.includes('Zainab Raza'), false);
  assert.equal(res.sanitizedText.includes('['), false);
  assert.ok(res.sanitizedText.includes('Tariq Mahmood'));
  assert.ok(res.sanitizedText.includes('Metro Freight Lahore'));
});

test('restoreSecretsInText swaps placeholders and synthetic personas back to original secrets accurately', () => {
  const raw = `Dr. Nadia Farooq (EMP-40921) earns USD 22,400 at Crescent BioHealth Systems Ltd. Key: sk-live-1234567890abcdef.`;
  const scrub = scrubTextLocally(raw, false);

  const cloudMockReply = `Recommendation for [PERSON_1] ([ID_1]) at [COMPANY_1]: protect [AMOUNT_1] and rotate [API_KEY_1].`;
  const restored = restoreSecretsInText(cloudMockReply, scrub.vault);

  assert.ok(restored.restoredText.includes('Dr. Nadia Farooq'));
  assert.ok(restored.restoredText.includes('EMP-40921'));
  assert.ok(restored.restoredText.includes('USD 22,400'));
  assert.ok(restored.restoredText.includes('sk-live-1234567890abcdef'));
  assert.ok(restored.segments.some((s) => s.isRestored));
});

test('maskSecretValue conceals sensitive characters safely', () => {
  const maskedKey = maskSecretValue('sk-live-99887766554433221100aabbccdd', 'API_KEY');
  assert.ok(maskedKey.includes('...'));
  assert.equal(maskedKey.includes('99887766554433221100'), false);

  const maskedEmail = maskSecretValue('zainab.raza@kestrelfreight.pk', 'EMAIL');
  assert.ok(maskedEmail.includes('@kestrelfreight.pk'));
  assert.equal(maskedEmail.includes('zainab.raza'), false);
});

test('runDeterministicLocalAction executes grammar, summary, and cloak locally without altering tokens', () => {
  const scrubbed = 'the   [PERSON_1]  recieve payment  from [COMPANY_1] untill friday.';
  const fixed = runDeterministicLocalAction(scrubbed, 'grammar');
  assert.ok(fixed.includes('[PERSON_1]'));
  assert.ok(fixed.includes('[COMPANY_1]'));
  assert.ok(fixed.includes('receive'));

  const summary = runDeterministicLocalAction(
    'Clause 1: [COMPANY_1] has unlimited liability and penalty.\nClause 2: [PERSON_1] termination notice.',
    'summary'
  );
  assert.ok(summary.includes('LOCAL QUICK SUMMARY'));
  assert.ok(summary.includes('[COMPANY_1]'));
  assert.ok(summary.includes('liability'));
  assert.equal(summary.includes('Protected Entities Shielded'), false);
  assert.equal(summary.includes('Key Points Extracted'), false);

  const cloaked = runDeterministicLocalAction(scrubbed, 'cloak');
  assert.equal(cloaked, scrubbed);
});

test('scrubTextLocally honors Keep Visible (Whitelist) terms and leaves them unmasked', () => {
  const sample = `Client Zainab Raza in Karachi using React at Vertex Cloud Partners LLC. Secret: sk-live-99887766554433221100aabbccdd.`;
  const res = scrubTextLocally(sample, false, ['Zainab Raza', 'Karachi', 'React']);

  assert.equal(res.leakedBytes, 0);
  assert.ok(res.sanitizedText.includes('Zainab Raza'));
  assert.ok(res.sanitizedText.includes('Karachi'));
  assert.ok(res.sanitizedText.includes('React'));
  assert.equal(res.sanitizedText.includes('sk-live-99887766554433221100aabbccdd'), false);
  assert.equal(res.sanitizedText.includes('Vertex Cloud Partners LLC'), false);
  assert.equal(
    res.vault.some((v) => v.originalValue === 'Zainab Raza'),
    false
  );
});

test('scrubTextLocally hides Extra Words to Hide (blacklist) and restores them', () => {
  const sample = `We are launching Project Falcon next Tuesday with Project Falcon budget approved.`;
  const res = scrubTextLocally(sample, false, [], ['Project Falcon']);

  assert.equal(res.leakedBytes, 0);
  assert.equal(res.sanitizedText.includes('Project Falcon'), false);
  assert.equal(res.vault.length, 1);
  assert.equal(res.vault[0].category, 'CUSTOM');
  assert.ok(res.sanitizedText.includes('[CUSTOM_1]'));

  const restored = restoreSecretsInText(
    'Deliverable for [CUSTOM_1] is on track.',
    res.vault
  );
  assert.equal(restored.restoredText, 'Deliverable for Project Falcon is on track.');
});

test('scrubTextLocally respects ScrubOptions flags for currency/phones and API keys', () => {
  const sample = `Contact +92 300 8451920 for PKR 4,850,000 invoice. Email: zainab.raza@kestrelfreight.pk, Key: sk-live-99887766554433221100aabbccdd.`;
  const noMoneyPhone = scrubTextLocally(sample, false, [], [], {
    maskApiKeys: true,
    maskCurrencyAndPhones: false,
  });

  assert.ok(noMoneyPhone.sanitizedText.includes('+92 300 8451920'));
  assert.equal(noMoneyPhone.sanitizedText.includes('PKR 4,850,000'), false); // amounts are always detected
  assert.equal(
    noMoneyPhone.sanitizedText.includes('zainab.raza@kestrelfreight.pk'),
    false
  );
  assert.equal(
    noMoneyPhone.sanitizedText.includes('sk-live-99887766554433221100aabbccdd'),
    false
  );

  const noApiMask = scrubTextLocally(sample, false, [], [], {
    maskApiKeys: false,
    maskCurrencyAndPhones: true,
  });
  assert.ok(
    noApiMask.sanitizedText.includes('sk-live-99887766554433221100aabbccdd')
  );
  assert.equal(noApiMask.sanitizedText.includes('PKR 4,850,000'), false);
});


