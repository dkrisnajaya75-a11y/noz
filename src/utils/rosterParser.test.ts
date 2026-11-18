import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRosterText } from './rosterParser';

test('parseRosterText parses comma, tab, semicolon, and Indonesian/English gender tokens', () => {
  const input = [
    'Nama, Gender, Level',
    '1. Budi Santoso, L, 3',
    'Siti Nurhaliza\tP\t2',
    'Andi Wijaya; M; Mahir',
    '2) Rina Putri | F | Pemula',
    'Dodi Prakoso, Pria, Menengah',
  ].join('\n');

  const parsed = parseRosterText(input);
  assert.equal(parsed.length, 6);

  // Header skipped cleanly
  assert.equal(parsed[0].valid, false);

  assert.deepEqual(
    {
      name: parsed[1].name,
      gender: parsed[1].gender,
      level: parsed[1].level,
      valid: parsed[1].valid,
    },
    { name: 'Budi Santoso', gender: 'M', level: 3, valid: true }
  );

  assert.deepEqual(
    {
      name: parsed[2].name,
      gender: parsed[2].gender,
      level: parsed[2].level,
      valid: parsed[2].valid,
    },
    { name: 'Siti Nurhaliza', gender: 'F', level: 2, valid: true }
  );

  assert.deepEqual(
    {
      name: parsed[3].name,
      gender: parsed[3].gender,
      level: parsed[3].level,
      valid: parsed[3].valid,
    },
    { name: 'Andi Wijaya', gender: 'M', level: 3, valid: true }
  );

  assert.deepEqual(
    {
      name: parsed[4].name,
      gender: parsed[4].gender,
      level: parsed[4].level,
      valid: parsed[4].valid,
    },
    { name: 'Rina Putri', gender: 'F', level: 1, valid: true }
  );

  assert.deepEqual(
    {
      name: parsed[5].name,
      gender: parsed[5].gender,
      level: parsed[5].level,
      valid: parsed[5].valid,
    },
    { name: 'Dodi Prakoso', gender: 'M', level: 2, valid: true }
  );
});

test('parseRosterText flags invalid gender or out-of-range level cleanly', () => {
  const input = 'Tono, X, 3\nRani, P, 4\nDoni, L, 9';
  const parsed = parseRosterText(input);
  assert.equal(parsed[0].valid, false);
  assert.equal(parsed[1].valid, false);
  assert.equal(parsed[2].valid, false);
});
