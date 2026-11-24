import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenVault, sanitize, restore } from './tokenizer.ts';

const run = (t: string, opts = {}, v = new TokenVault()) => ({ v, ...sanitize(t, v, opts) });
const map = (r: ReturnType<typeof run>) => Object.fromEntries(r.entries.map((e) => [e.token, e.value]));

test('spec example: person, email, phone, api key', () => {
  const r = run('Send the agreement to Ahmed Khan at ahmed@example.com. His phone is +92-300-1234567. The API key is sk_test_123456.');
  assert.equal(r.sanitized, 'Send the agreement to [PERSON_1] at [EMAIL_1]. His phone is [PHONE_1]. The API key is [API_KEY_1].');
  assert.deepEqual(map(r), { '[PERSON_1]': 'Ahmed Khan', '[EMAIL_1]': 'ahmed@example.com', '[PHONE_1]': '+92-300-1234567', '[API_KEY_1]': 'sk_test_123456' });
});

test('contract preset', () => {
  const r = run('Write an email to Ahmed Khan at ahmed@company.com about our $15,000 contract.');
  assert.equal(r.sanitized, 'Write an email to [PERSON_1] at [EMAIL_1] about our [AMOUNT_1] contract.');
});

test('api keys preset', () => {
  const r = run("Debug this code. API_KEY=sk-abc123xyz STRIPE_SECRET=sk_live_def456. It's throwing a 401 error.");
  assert.equal(r.sanitized, "Debug this code. API_KEY=[API_KEY_1] STRIPE_SECRET=[API_KEY_2]. It's throwing a 401 error.");
});

test('hr preset', () => {
  const r = run("Draft a reply. Sarah Chen's salary is $95,000, her SSN is 123-45-6789, and she's on a PIP.");
  assert.equal(r.sanitized, "Draft a reply. [PERSON_1]'s salary is [AMOUNT_1], her SSN is [SSN_1], and she's on a PIP.");
});

test('repeated values reuse one token, across runs too', () => {
  const v = new TokenVault();
  const a = run('Ahmed Khan wrote to ahmed@x.io. Ahmed Khan again.', {}, v);
  assert.equal(a.sanitized, '[PERSON_1] wrote to [EMAIL_1]. [PERSON_1] again.');
  const b = run('Follow up with Ahmed Khan and bob@x.io', {}, v);
  assert.equal(b.sanitized, 'Follow up with [PERSON_1] and [EMAIL_2]');
});

test('cards use Luhn; password, bearer token, secret, phone formats', () => {
  const r = run('card 4242 4242 4242 4242, order 1234 5678 9012 3456, password is hunter2xyz, Authorization: Bearer abcDEF1234567890xyz, client_secret=zzTop998877, call (415) 555-0132');
  assert.match(r.sanitized, /card \[CARD_1\]/);
  assert.match(r.sanitized, /order \[ID_1\],/);
  assert.match(r.sanitized, /password is \[PASSWORD_1\]/);
  assert.match(r.sanitized, /Bearer \[ACCESS_TOKEN_1\]/);
  assert.match(r.sanitized, /client_secret=\[SECRET_1\]/);
  assert.match(r.sanitized, /call \[PHONE_1\]/);
});

test('manual protection and configured identifiers', () => {
  const r = run('Project Falcon is led by Omar.', { manual: ['Omar'], configured: ['Project Falcon'] });
  assert.equal(r.sanitized, '[CUSTOM_1] is led by [CUSTOM_2].');
});

test('existing placeholders are never re-tokenized; unknown tokens are not restored', () => {
  const v = new TokenVault();
  const a = run('Mail ahmed@x.io', {}, v);
  const again = sanitize(a.sanitized, v);
  assert.equal(again.sanitized, a.sanitized);
  assert.equal(restore('Hi [EMAIL_1] and [EMAIL_9]', v), 'Hi ahmed@x.io and [EMAIL_9]');
});

test('restore round-trip and punctuation intact', () => {
  const src = 'Pay $1,200.50 to Sarah Chen, then email sarah@corp.com!';
  const r = run(src);
  assert.equal(restore(r.sanitized, r.v), src);
  assert.match(r.sanitized, /\[AMOUNT_1\] to \[PERSON_1\], then email \[EMAIL_1\]!/);
});

test('brief example: single name after a cue, account identifier', () => {
  const r = run('Contact Sarah at sarah@example.com about account 48291.');
  assert.equal(r.sanitized, 'Contact [PERSON_1] at [EMAIL_1] about account [ID_1].');
  assert.deepEqual(map(r), { '[PERSON_1]': 'Sarah', '[EMAIL_1]': 'sarah@example.com', '[ID_1]': '48291' });
});

test('cue heuristic ignores departments and plain words', () => {
  assert.equal(run('Contact Support or Sales Team today.').sanitized, 'Contact Support or Sales Team today.');
});

test('entities from an on-device model are tokenized by category; regex wins overlaps', () => {
  const r = run('Omar from Zenith Labs paid 5 dollars to ahmed@x.io', { extra: [{ value: 'Omar', kind: 'PERSON' }, { value: 'Zenith Labs', kind: 'ORG' }, { value: 'ahmed@x.io', kind: 'CUSTOM' }] });
  assert.equal(r.sanitized, '[PERSON_1] from [ORG_1] paid [AMOUNT_1] to [EMAIL_1]');
});
