import assert from 'node:assert/strict';
import {
  userFromRows, mappedRows, buildAreaAliases, resolveArea, programmes, HEADER_SYNONYMS
} from '../lib/data.js';

const users = [
  ['Email', 'Name', 'Role', 'Area', 'Active', 'Google Subject'],
  ['a@example.com', 'A', 'area_secretary', 'Anthony', 'YES', ''],
  ['b@example.com', 'B', 'admin', '', 'YES', 'sub-b']
];
const u1 = userFromRows(users, 'a@example.com', 'any-sub-from-google');
assert.equal(u1.role, 'area_secretary');
const u2 = userFromRows(users, 'b@example.com', 'sub-b');
assert.equal(u2.role, 'admin');
assert.throws(() => userFromRows(users, 'b@example.com', 'wrong-sub'), /does not match/);

const raw = [
  ['Area', 'Category of Church Location', 'Branch Location', 'Teenage Male', 'Teenage Female', 'Parents', 'Total', 'Baptism of the Holy Ghost'],
  ['Enugu', 'Branch', 'Main', '5', '7', '2', '14', '1']
];
const mapped = mappedRows(raw, '');
assert.ok(mapped[0].includes('Holy ghost'));
assert.ok(mapped[0].includes('Teenage male'));

const branches = [
  ['Area', 'Branch', 'Category', 'Alias'],
  ['Enugu Area', 'Main', 'Branch', 'Enugu;ENUGU']
];
const aliases = buildAreaAliases(branches);
assert.equal(resolveArea('Enugu', aliases), 'Enugu Area');
assert.equal(resolveArea('enugu area', aliases), 'Enugu Area');

const progs = programmes([
  ['Key', 'Sheet name', 'Label', 'Scope', 'Active', 'Kind'],
  ['school', 'BACK TO SCHOOL 2026', 'BTS', 'all', 'YES', 'report']
]);
assert.equal(progs.length, 1);
assert.ok(Object.keys(HEADER_SYNONYMS).length > 20);
console.log('check.mjs: ok');
