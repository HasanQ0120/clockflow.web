import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntities } from './onDevice.ts';

test('parseEntities keeps only verbatim values, maps categories, drops junk', () => {
  const text = 'Omar Rahman of Zenith Labs emailed o@z.io about invoice 7781 for $900. Token [PERSON_1].';
  const raw = 'Sure! ```json\n' + JSON.stringify({ people: ['Omar Rahman', 'Nobody Here'], organizations: ['Zenith Labs'], emails: ['o@z.io'], phones: [], secrets: [], amounts: ['$900'], identifiers: ['7781', '[PERSON_1]', 'x'] }) + '\n```';
  const got = parseEntities(text, raw);
  assert.deepEqual(got.map((e) => [e.kind, e.value]), [['PERSON', 'Omar Rahman'], ['ORG', 'Zenith Labs'], ['EMAIL', 'o@z.io'], ['AMOUNT', '$900'], ['ID', '7781']]);
  assert.deepEqual(parseEntities(text, 'not json at all'), []);
});
