import test from 'node:test';
import assert from 'node:assert/strict';
import {
  userFromRows, mappedRows, buildAreaAliases, resolveArea, programmes, scopeRows
} from '../lib/data.js';

test('email-first enrolment allows blank subject', () => {
  const rows = [
    ['Email', 'Name', 'Role', 'Area', 'Active', 'Google Subject'],
    ['a@example.com', 'A', 'area_secretary', 'Area A', 'YES', '']
  ];
  const u = userFromRows(rows, 'a@example.com', 'any-google-sub');
  assert.equal(u.role, 'area_secretary');
});

test('bound subject still enforced', () => {
  const rows = [
    ['Email', 'Name', 'Role', 'Area', 'Active', 'Google Subject'],
    ['b@example.com', 'B', 'area_leader', 'Area B', 'YES', 'sub-b']
  ];
  assert.throws(() => userFromRows(rows, 'b@example.com', 'wrong'), /does not match/);
});

test('synonyms normalise varied headers from sample programmes', () => {
  const raw = [
    ['Area', 'Category of Church Location', 'Branch Location', 'Teenage Male', 'Baptism of the Holy Ghost', 'Male'],
    ['Enugu', 'Branch', 'Main', '3', '1', '10']
  ];
  const m = mappedRows(raw, '');
  assert.ok(m[0].includes('Category'));
  assert.ok(m[0].includes('Holy ghost'));
  assert.ok(m[0].includes('Teenage male'));
});

test('area aliases', () => {
  const branches = [
    ['Area', 'Branch', 'Category', 'Alias'],
    ['Enugu Area', 'Main', 'Branch', 'Enugu;ENUGU']
  ];
  const map = buildAreaAliases(branches);
  assert.equal(resolveArea('Enugu', map), 'Enugu Area');
});

test('scope respects aliases', () => {
  const user = { role: 'area_leader', area: 'Enugu Area' };
  const branches = [['Area', 'Branch', 'Category', 'Alias'], ['Enugu Area', 'Main', 'Branch', 'Enugu']];
  const map = buildAreaAliases(branches);
  const records = mappedRows([
    ['Area', 'Total'],
    ['Enugu', '5'],
    ['Anthony', '9']
  ], '', map);
  const scoped = scopeRows(records, user, 'R', 'Area', map);
  assert.equal(scoped.length, 2);
  assert.equal(scoped[1][0], 'Enugu Area');
});

test('programmes kind field', () => {
  const p = programmes([
    ['Key', 'Sheet name', 'Label', 'Scope', 'Active', 'Kind'],
    ['fb', 'FB Tab', 'Feedback', 'all', 'YES', 'feedback']
  ]);
  assert.equal(p[0].kind, 'feedback');
});
