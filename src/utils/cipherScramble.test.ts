import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCipherFrame } from './cipherScramble';

test('computeCipherFrame returns exact target text when progress reaches 1', () => {
  assert.equal(computeCipherFrame('Usman Tariq', 1, 5), 'Usman Tariq');
  assert.equal(computeCipherFrame('[PERSON_1]', 1.2, 9), '[PERSON_1]');
});

test('computeCipherFrame scrambles unsettled characters while preserving length and whitespace', () => {
  const input = 'sk-live 9988';
  const frame = computeCipherFrame(input, 0.25, 3);
  assert.equal(frame.length, input.length);
  assert.equal(frame[7], ' ');
  assert.equal(frame.slice(0, 3), input.slice(0, 3));
  assert.notEqual(frame, input);
});
